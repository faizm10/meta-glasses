"""Auteur media plane — Modal app entrypoint.

Phase 0: a deployable shell proving the plane exists. Real functions
(probe, transcode, scenes, faces, render) arrive in Phases 3-5, each in
its own module under functions/.
"""

import modal

app = modal.App("auteur-pipeline")

image = modal.Image.debian_slim(python_version="3.12").pip_install("pydantic>=2")


@app.function(image=image)
def healthcheck() -> dict:
    """Smoke-test function: `modal run app.py::healthcheck`."""
    return {"plane": "media", "status": "ready"}
