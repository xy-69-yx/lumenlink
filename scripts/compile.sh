#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE="${PACKAGE:-lumenlink_registry}"

cd "$ROOT_DIR"
stellar contract build \
  --manifest-path Cargo.toml \
  --package "$PACKAGE" \
  --optimize

echo "Built target/wasm32v1-none/release/${PACKAGE}.wasm"
