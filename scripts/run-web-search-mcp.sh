#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${ROOT_DIR}/.external-tools/web-search-mcp"
ENTRYPOINT="${INSTALL_DIR}/dist/index.js"

if [[ ! -f "${ENTRYPOINT}" ]]; then
  echo "[web-search-mcp] Missing ${ENTRYPOINT}. Run scripts/setup-web-search-mcp.sh first." >&2
  exit 1
fi

export MAX_CONTENT_LENGTH="${MAX_CONTENT_LENGTH:-12000}"
export DEFAULT_TIMEOUT="${DEFAULT_TIMEOUT:-5000}"
export MAX_BROWSERS="${MAX_BROWSERS:-2}"
export BROWSER_HEADLESS="${BROWSER_HEADLESS:-true}"
export BROWSER_FALLBACK_THRESHOLD="${BROWSER_FALLBACK_THRESHOLD:-2}"
export FORCE_MULTI_ENGINE_SEARCH="${FORCE_MULTI_ENGINE_SEARCH:-false}"

exec node "${ENTRYPOINT}"
