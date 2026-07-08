"""Auteur media plane — Modal app.

Phase 4: probe + proxy + poster, then understanding — scene detection
(PySceneDetect), speech transcription (faster-whisper), and CLIP
embeddings for every scene frame so the archive is semantically
searchable. All models are open-source and run here; no external AI
keys involved.

Contract with the control plane (packages/api/src/pipeline.ts):
  POST /submit  {token, job: {media_id, kind, original_key, proxy_key,
                              poster_key, scene_prefix}}
                -> {status: "spawned", call_id}   (returns instantly)
  POST /result  {token, call_id}
                -> {status: "pending" | "done" | "failed", result?, error?}
  POST /embed   {token, text}
                -> {embedding: float[512]}        (CLIP text tower, for Ask)

`token` must equal $AUTEUR_PIPELINE_SECRET (TLS end to end). Bytes move
only between Modal and R2 — never through the control plane.
"""

import json
import os
import re
import subprocess
import tempfile

import modal

app = modal.App("auteur-pipeline")

CLIP_MODEL = "ViT-B-32"
CLIP_PRETRAINED = "laion2b_s34b_b79k"
WHISPER_MODEL = "small"


def _download_models():
    """Runs at image build — bakes model weights into the image so cold
    starts don't download half a gigabyte."""
    from faster_whisper import WhisperModel

    WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    import open_clip

    open_clip.create_model_and_transforms(CLIP_MODEL, pretrained=CLIP_PRETRAINED)


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg", "fonts-dejavu-core")
    .pip_install(
        "boto3~=1.34",
        "fastapi[standard]~=0.115",
        "scenedetect[opencv-headless]~=0.6",
        "faster-whisper~=1.1",
        "open_clip_torch~=2.30",
        "torch~=2.5",
        "pillow~=11.0",
    )
    .run_function(_download_models)
)

secret = modal.Secret.from_name("auteur-pipeline")

_cache: dict = {}


def _clip():
    if "clip" not in _cache:
        import open_clip
        import torch

        model, _, preprocess = open_clip.create_model_and_transforms(
            CLIP_MODEL, pretrained=CLIP_PRETRAINED
        )
        tokenizer = open_clip.get_tokenizer(CLIP_MODEL)
        model.eval()
        torch.set_grad_enabled(False)
        _cache["clip"] = (model, preprocess, tokenizer)
    return _cache["clip"]


def _whisper():
    if "whisper" not in _cache:
        from faster_whisper import WhisperModel

        _cache["whisper"] = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _cache["whisper"]


def _r2():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def _probe(path: str) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    data = json.loads(out)
    fmt = data.get("format", {})
    video = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    has_audio = any(s.get("codec_type") == "audio" for s in data.get("streams", []))

    result = {
        "duration_ms": int(float(fmt["duration"]) * 1000) if fmt.get("duration") else None,
        "width": video.get("width") if video else None,
        "height": video.get("height") if video else None,
        "codec": video.get("codec_name") if video else None,
        "fps": None,
        "lat": None,
        "lng": None,
        "_has_audio": has_audio,
    }
    # fps only means something for real video (ffprobe claims 25 for stills).
    if (
        result["duration_ms"]
        and video
        and video.get("avg_frame_rate")
        and video["avg_frame_rate"] != "0/0"
    ):
        num, den = video["avg_frame_rate"].split("/")
        if float(den) > 0:
            result["fps"] = round(float(num) / float(den), 3)

    # Ray-Ban / iPhone footage carries ISO 6709 location in QuickTime tags.
    tags = {**fmt.get("tags", {}), **((video or {}).get("tags", {}))}
    iso = tags.get("com.apple.quicktime.location.ISO6709") or tags.get("location")
    if iso:
        m = re.match(r"^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)", iso)
        if m:
            result["lat"] = float(m.group(1))
            result["lng"] = float(m.group(2))
    return result


MAX_SCENE_MS = 12_000
MIN_TAIL_MS = 4_000


def _detect_scenes(path: str, duration_ms: int) -> tuple[list[tuple[int, int]], str | None]:
    """Scene spans in ms. Cuts come from the detector; glasses footage is
    mostly one continuous take, so long spans are then chunked into
    ~12s moments — that's the granularity Ask and the editor work at."""
    from scenedetect import AdaptiveDetector, detect

    debug = None
    try:
        found = detect(path, AdaptiveDetector())
        spans = [
            (int(s.get_seconds() * 1000), int(e.get_seconds() * 1000)) for s, e in found
        ]
        if not spans:
            debug = "no cuts — continuous take"
    except Exception as err:
        spans = []
        debug = f"scene detect failed: {err!r}"[:300]
    if not spans:
        spans = [(0, duration_ms)]

    chunked: list[tuple[int, int]] = []
    for start, end in spans:
        at = start
        while end - at > MAX_SCENE_MS + MIN_TAIL_MS:
            chunked.append((at, at + MAX_SCENE_MS))
            at += MAX_SCENE_MS
        chunked.append((at, end))
    return chunked, debug


def _extract_frame(src: str, at_ms: int, out_path: str) -> None:
    subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", f"{at_ms / 1000:.2f}", "-i", src,
         "-frames:v", "1", "-vf", "scale=-2:min(720\\,ih)", "-update", "1", "-y", out_path],
        check=True,
    )


def _embed_images(paths: list[str]) -> list[list[float]]:
    import torch
    from PIL import Image

    model, preprocess, _ = _clip()
    batch = torch.stack([preprocess(Image.open(p).convert("RGB")) for p in paths])
    feats = model.encode_image(batch)
    feats = feats / feats.norm(dim=-1, keepdim=True)
    return [f.tolist() for f in feats]


def _transcribe(src: str, tmp: str) -> list[dict]:
    wav = os.path.join(tmp, "audio.wav")
    extract = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-y", wav],
        capture_output=True,
    )
    if extract.returncode != 0:  # no audio track
        return []
    segments, _info = _whisper().transcribe(wav, vad_filter=True)
    return [
        {"start_ms": int(s.start * 1000), "end_ms": int(s.end * 1000), "text": s.text.strip()}
        for s in segments
        if s.text.strip()
    ]


@app.function(image=image, secrets=[secret], cpu=8.0, memory=8192, timeout=1800)
def ingest_media(job: dict) -> dict:
    """original -> probe -> proxy/poster -> scenes -> frames -> CLIP -> whisper."""
    r2 = _r2()
    bucket = os.environ["R2_BUCKET"]
    kind = job["kind"]

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "original")
        r2.download_file(bucket, job["original_key"], src)

        probe = _probe(src)
        has_audio = probe.pop("_has_audio", False)
        produced: dict = {"scenes": [], "transcript": []}

        if kind == "video":
            proxy = os.path.join(tmp, "proxy.mp4")
            subprocess.run(
                ["ffmpeg", "-v", "error", "-i", src,
                 "-vf", "scale=-2:min(720\\,ih)",
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                 "-c:a", "aac", "-b:a", "128k",
                 "-movflags", "+faststart", "-y", proxy],
                check=True,
            )
            r2.upload_file(proxy, bucket, job["proxy_key"],
                           ExtraArgs={"ContentType": "video/mp4"})
            produced["proxy_key"] = job["proxy_key"]

            duration_ms = probe["duration_ms"] or 4000
            at = min(1000, int(duration_ms * 0.25))
            poster = os.path.join(tmp, "poster.jpg")
            _extract_frame(src, at, poster)
            r2.upload_file(poster, bucket, job["poster_key"],
                           ExtraArgs={"ContentType": "image/jpeg"})
            produced["poster_key"] = job["poster_key"]

            # Understanding: scenes from the proxy (fast), frames from the original.
            spans, scene_debug = _detect_scenes(proxy, duration_ms)
            if scene_debug:
                produced["scene_debug"] = scene_debug
            frame_paths = []
            for i, (start_ms, end_ms) in enumerate(spans):
                fp = os.path.join(tmp, f"scene{i}.jpg")
                _extract_frame(src, (start_ms + end_ms) // 2, fp)
                frame_paths.append(fp)
            embeddings = _embed_images(frame_paths)
            for i, ((start_ms, end_ms), emb) in enumerate(zip(spans, embeddings)):
                frame_key = f"{job['scene_prefix']}/{i}.jpg"
                r2.upload_file(frame_paths[i], bucket, frame_key,
                               ExtraArgs={"ContentType": "image/jpeg"})
                produced["scenes"].append(
                    {"idx": i, "start_ms": start_ms, "end_ms": end_ms,
                     "frame_key": frame_key, "embedding": emb}
                )

            if has_audio:
                produced["transcript"] = _transcribe(src, tmp)

        elif kind == "photo":
            poster = os.path.join(tmp, "poster.jpg")
            proc = subprocess.run(
                ["ffmpeg", "-v", "error", "-i", src,
                 "-vf", "scale=-2:min(720\\,ih)", "-frames:v", "1", "-update", "1",
                 "-y", poster],
                capture_output=True,
                text=True,
            )
            if proc.returncode == 0:
                r2.upload_file(poster, bucket, job["poster_key"],
                               ExtraArgs={"ContentType": "image/jpeg"})
                produced["poster_key"] = job["poster_key"]
                # A photo is one scene — searchable like everything else.
                emb = _embed_images([poster])[0]
                frame_key = f"{job['scene_prefix']}/0.jpg"
                r2.upload_file(poster, bucket, frame_key,
                               ExtraArgs={"ContentType": "image/jpeg"})
                produced["scenes"].append(
                    {"idx": 0, "start_ms": 0, "end_ms": 0,
                     "frame_key": frame_key, "embedding": emb}
                )
            else:
                produced["poster_error"] = proc.stderr[-300:]

        elif kind == "audio":
            produced["transcript"] = _transcribe(src, tmp)

    return {"ok": True, "media_id": job["media_id"], **probe, **produced}


SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
CANVAS = "1280x720"
FPS = 24


def _drawtext_escape(text: str) -> str:
    return text.replace("\\", "").replace("'", "’").replace(":", "\\:").replace("%", "")


def _card(tmp: str, name: str, seconds: float, lines: list[tuple[str, str, int]]) -> str:
    """A silent title/credit card: black canvas, centered stacked text
    lines (text, font, size), gentle fade in and out."""
    out = os.path.join(tmp, name)
    draws = []
    n = len(lines)
    for i, (text, font, size) in enumerate(lines):
        y = f"(h-text_h)/2+{(i - (n - 1) / 2):.1f}*{int(size * 2.2)}"
        draws.append(
            f"drawtext=fontfile={font}:text='{_drawtext_escape(text)}'"
            f":fontsize={size}:fontcolor=0xF2EFE9:x=(w-text_w)/2:y={y}"
        )
    fade = f"fade=t=in:st=0:d=0.7,fade=t=out:st={seconds - 0.7:.2f}:d=0.7"
    vf = ",".join(draws + [fade])
    subprocess.run(
        ["ffmpeg", "-v", "error",
         "-f", "lavfi", "-i", f"color=c=0x0B0B0C:duration={seconds}:size={CANVAS}:rate={FPS}",
         "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:duration={seconds}",
         "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
         "-c:a", "aac", "-b:a", "128k", "-shortest", "-y", out],
        check=True,
    )
    return out


def _segment(tmp: str, i: int, src: str, in_ms: int, out_ms: int) -> str:
    """One clip of the cut, normalized to the film canvas. Sources
    without audio get silence so concat stays uniform."""
    out = os.path.join(tmp, f"seg{i}.mp4")
    dur = max(0.2, (out_ms - in_ms) / 1000)
    has_audio = bool(
        subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
             "stream=codec_type", "-of", "csv=p=0", src],
            capture_output=True, text=True,
        ).stdout.strip()
    )
    vf = (
        f"scale={CANVAS.split('x')[0]}:{CANVAS.split('x')[1]}:force_original_aspect_ratio=decrease,"
        f"pad={CANVAS.split('x')[0]}:{CANVAS.split('x')[1]}:(ow-iw)/2:(oh-ih)/2:color=0x0B0B0C,"
        f"fps={FPS},setsar=1"
    )
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{in_ms / 1000:.3f}", "-t", f"{dur:.3f}", "-i", src]
    if not has_audio:
        cmd += ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    cmd += ["-map", "0:v:0", "-map", "0:a:0" if has_audio else "1:a:0",
            "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-y", out]
    subprocess.run(cmd, check=True)
    return out


@app.function(image=image, secrets=[secret], cpu=8.0, memory=8192, timeout=1800)
def render_film(job: dict) -> dict:
    """EDL clips -> title card + segments + credits -> one film in R2."""
    r2 = _r2()
    bucket = os.environ["R2_BUCKET"]

    with tempfile.TemporaryDirectory() as tmp:
        proxies: dict[str, str] = {}
        for clip in job["clips"]:
            key = clip["proxy_key"]
            if key not in proxies:
                local = os.path.join(tmp, f"src{len(proxies)}.mp4")
                r2.download_file(bucket, key, local)
                proxies[key] = local

        parts = [
            _card(tmp, "title.mp4", 3.0, [
                (job["title"], SERIF, 56),
                (job["credit"].lower(), SANS, 16),
            ])
        ]
        for i, clip in enumerate(job["clips"]):
            parts.append(_segment(tmp, i, proxies[clip["proxy_key"]], clip["in_ms"], clip["out_ms"]))
        parts.append(
            _card(tmp, "credits.mp4", 2.5, [
                (job["credit"].lower(), SERIF, 30),
                ("edited with auteur", SANS, 14),
            ])
        )

        listfile = os.path.join(tmp, "list.txt")
        with open(listfile, "w") as f:
            f.writelines(f"file '{p}'\n" for p in parts)
        out = os.path.join(tmp, "film.mp4")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0", "-i", listfile,
             "-c", "copy", "-movflags", "+faststart", "-y", out],
            check=True,
        )
        duration_ms = int(float(json.loads(subprocess.run(
            ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", out],
            capture_output=True, text=True, check=True,
        ).stdout)["format"]["duration"]) * 1000)

        r2.upload_file(out, bucket, job["output_key"],
                       ExtraArgs={"ContentType": "video/mp4"})

    return {"ok": True, "film_id": job["film_id"],
            "film_key": job["output_key"], "duration_ms": duration_ms}


@app.function(image=image, secrets=[secret])
def make_fixture(key: str) -> dict:
    """Self-test asset: 8s two-scene synthetic clip with a tone, straight
    into R2. Lets CI (and Claude) exercise the full video path without
    real footage."""
    with tempfile.TemporaryDirectory() as tmp:
        a = os.path.join(tmp, "a.mp4")
        b = os.path.join(tmp, "b.mp4")
        out = os.path.join(tmp, "fixture.mp4")
        subprocess.run(
            ["ffmpeg", "-v", "error",
             "-f", "lavfi", "-i", "color=c=blue:duration=4:size=640x360:rate=24",
             "-f", "lavfi", "-i", "sine=frequency=440:duration=4",
             "-c:v", "libx264", "-c:a", "aac", "-y", a],
            check=True,
        )
        subprocess.run(
            ["ffmpeg", "-v", "error",
             "-f", "lavfi", "-i", "color=c=orange:duration=4:size=640x360:rate=24",
             "-f", "lavfi", "-i", "sine=frequency=880:duration=4",
             "-c:v", "libx264", "-c:a", "aac", "-y", b],
            check=True,
        )
        with open(os.path.join(tmp, "list.txt"), "w") as f:
            f.write(f"file '{a}'\nfile '{b}'\n")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0",
             "-i", os.path.join(tmp, "list.txt"), "-c", "copy", "-y", out],
            check=True,
        )
        _r2().upload_file(out, os.environ["R2_BUCKET"], key,
                          ExtraArgs={"ContentType": "video/mp4"})
        return {"ok": True, "key": key, "bytes": os.path.getsize(out)}


def _authed(body: dict) -> bool:
    expected = os.environ.get("AUTEUR_PIPELINE_SECRET", "")
    return bool(expected) and body.get("token") == expected


@app.function(image=image, secrets=[secret])
@modal.fastapi_endpoint(method="POST")
def submit(body: dict):
    if not _authed(body):
        return {"status": "unauthorized"}
    task = body.get("task", "ingest")
    fn = {"ingest": ingest_media, "render": render_film}.get(task)
    if fn is None:
        return {"status": "unknown_task"}
    call = fn.spawn(body["job"])
    return {"status": "spawned", "call_id": call.object_id}


@app.function(image=image, secrets=[secret])
@modal.fastapi_endpoint(method="POST")
def result(body: dict):
    if not _authed(body):
        return {"status": "unauthorized"}
    call = modal.FunctionCall.from_id(body["call_id"])
    try:
        return {"status": "done", "result": call.get(timeout=0)}
    except TimeoutError:
        return {"status": "pending"}
    except Exception as err:  # the job itself failed
        return {"status": "failed", "error": str(err)[:500]}


@app.function(image=image, secrets=[secret])
@modal.fastapi_endpoint(method="POST")
def embed(body: dict):
    """CLIP text tower — powers Ask ('every sunset' -> vector)."""
    if not _authed(body):
        return {"status": "unauthorized"}
    model, _, tokenizer = _clip()
    tokens = tokenizer([body["text"]])
    feats = model.encode_text(tokens)
    feats = feats / feats.norm(dim=-1, keepdim=True)
    return {"status": "done", "embedding": feats[0].tolist()}
