#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="${ROOT_DIR}/.external-tools"
INSTALL_DIR="${TOOLS_DIR}/web-search-mcp"
REPO_URL="https://github.com/mrkrsl/web-search-mcp.git"

mkdir -p "${TOOLS_DIR}"

if [[ -d "${INSTALL_DIR}/.git" ]]; then
  echo "[web-search-mcp] Updating existing checkout in ${INSTALL_DIR}"
  git -C "${INSTALL_DIR}" fetch --tags origin
  git -C "${INSTALL_DIR}" pull --ff-only origin main
else
  echo "[web-search-mcp] Cloning ${REPO_URL} into ${INSTALL_DIR}"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

echo "[web-search-mcp] Installing dependencies"
npm --prefix "${INSTALL_DIR}" install

echo "[web-search-mcp] Installing Playwright browsers"
npx --yes --prefix "${INSTALL_DIR}" playwright install

echo "[web-search-mcp] Building project"
npm --prefix "${INSTALL_DIR}" run build

cat <<EOF

[web-search-mcp] Ready.

Binary:
  ${INSTALL_DIR}/dist/index.js

Run manually:
  ${ROOT_DIR}/scripts/run-web-search-mcp.sh
EOF
