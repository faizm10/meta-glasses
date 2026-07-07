#!/usr/bin/env bash
# Redeploy the media plane after editing apps/pipeline/app.py.
# Modal's CLI lives in Homebrew Python (Xcode's python3 doesn't have it).
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")/../apps/pipeline"
exec modal deploy app.py
