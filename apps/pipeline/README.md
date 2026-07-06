# @auteur/pipeline — the media plane

All pixel and audio work lives here, deployed on [Modal](https://modal.com):
probing, proxy/HLS transcode, scene detection, frame analysis, face
embedding, and film rendering. The TypeScript control plane never touches
media bytes (ARCHITECTURE.md, R2/R3).

## Status

Phase 0 skeleton — deployable shell, no real functions yet. First real
function (`probe`) lands in Phase 3.

## Contract with the control plane

- Invoked over HTTPS (Modal web endpoints), authenticated with a shared
  HMAC secret (`PIPELINE_SIGNING_SECRET`).
- Every job is async: the request returns immediately; completion calls
  back to the workflow webhook URL passed in the job payload.
- Payload shapes are defined in `packages/contracts` (Zod) and mirrored
  here as Pydantic models in `common/schemas.py` — if you change one,
  change both (a codegen check lands in Phase 3).

## Local development

```sh
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
modal setup          # once, authenticates your Modal account
modal serve app.py   # hot-reloading dev deployment
modal deploy app.py  # production
```
