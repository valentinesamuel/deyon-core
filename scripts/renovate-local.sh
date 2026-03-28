#!/usr/bin/env bash
set -euo pipefail

# Load .env
if [ -f .env ]; then
  set -a
  # shellcheck source=.env
  source .env
  set +a
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: GITHUB_TOKEN is not set. Add it to your .env file."
  echo "  GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx"
  exit 1
fi

echo "Running Renovate locally against valentinesamuel/deyon-core..."

docker run --rm \
  -e LOG_LEVEL=debug \
  -e RENOVATE_TOKEN="$GITHUB_TOKEN" \
  renovate/renovate:latest \
  valentinesamuel/deyon-core
