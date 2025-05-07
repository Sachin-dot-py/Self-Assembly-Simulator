#!/usr/bin/env bash
set -euo pipefail

# === CONFIGURATION ===
REGISTRY="registry.nersc.gov"
PROJECT="m4537"
IMAGE="self-assembly-production"

# Allow override via first argument, default to "latest"
TAG="${1:-latest}"
FULL_IMAGE="${REGISTRY}/${PROJECT}/${IMAGE}:${TAG}"

# === LOGIN ===
echo "⏳ Logging into ${REGISTRY}..."
docker login "${REGISTRY}"

# === BUILD ===
echo "⏳ Building image ${FULL_IMAGE}..."
docker build --platform linux/amd64 -t "${FULL_IMAGE}" .

# === PUSH ===
echo "⏳ Pushing ${FULL_IMAGE}..."
docker push "${FULL_IMAGE}"

echo "✅ Successfully built & pushed ${FULL_IMAGE}"