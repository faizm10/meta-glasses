"""Auteur media plane — Modal app.

Phase 3b: probe + 720p proxy + poster frame for every daily.

Contract with the control plane (packages/api/src/pipeline.ts):
  POST /submit  {token, job: {media_id, kind, original_key, proxy_key, poster_key}}
                -> {status: "spawned", call_id}   (returns instantly)
  POST /result  {token, call_id}
                -> {status: "pending" | "done" | "failed", result?, error?}

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

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install("boto3~=1.34", "fastapi[standard]~=0.115")
)

secret = modal.Secret.from_name("auteur-pipeline")


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

    result = {
        "duration_ms": int(float(fmt["duration"]) * 1000) if fmt.get("duration") else None,
        "width": video.get("width") if video else None,
        "height": video.get("height") if video else None,
        "codec": video.get("codec_name") if video else None,
        "fps": None,
        "lat": None,
        "lng": None,
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


@app.function(image=image, secrets=[secret], timeout=900)
def ingest_media(job: dict) -> dict:
    """Download original -> probe -> proxy + poster -> upload -> metadata."""
    r2 = _r2()
    bucket = os.environ["R2_BUCKET"]
    kind = job["kind"]

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "original")
        r2.download_file(bucket, job["original_key"], src)

        probe = _probe(src)
        produced: dict = {}

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

            at = min(1.0, (probe["duration_ms"] or 4000) / 1000 * 0.25)
            poster = os.path.join(tmp, "poster.jpg")
            subprocess.run(
                ["ffmpeg", "-v", "error", "-ss", f"{at:.2f}", "-i", src,
                 "-frames:v", "1", "-vf", "scale=-2:720", "-y", poster],
                check=True,
            )
            r2.upload_file(poster, bucket, job["poster_key"],
                           ExtraArgs={"ContentType": "image/jpeg"})
            produced["poster_key"] = job["poster_key"]

        elif kind == "photo":
            # Browser-safe thumb; also rescues HEIC when ffmpeg can decode it.
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
            else:
                # Undecodable photo: library falls back to the original.
                produced["poster_error"] = proc.stderr[-300:]

    return {"ok": True, "media_id": job["media_id"], **probe, **produced}


def _authed(body: dict) -> bool:
    expected = os.environ.get("AUTEUR_PIPELINE_SECRET", "")
    return bool(expected) and body.get("token") == expected


@app.function(image=image, secrets=[secret])
@modal.fastapi_endpoint(method="POST")
def submit(body: dict):
    if not _authed(body):
        return {"status": "unauthorized"}
    call = ingest_media.spawn(body["job"])
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
