#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE="${PACKAGE:-lumenlink_registry}"
NETWORK="${NETWORK:-testnet}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-}"
CONTRACT_ALIAS="${CONTRACT_ALIAS:-lumenlink-registry}"
DEFAULT_WASM="target/wasm32v1-none/release/${PACKAGE}.wasm"
OPT_WASM="${DEFAULT_WASM%.wasm}.optimized.wasm"
WASM_PATH="${WASM_PATH:-$DEFAULT_WASM}"

if [[ -z "$SOURCE_ACCOUNT" ]]; then
  echo "SOURCE_ACCOUNT is required" >&2
  exit 1
fi

cd "$ROOT_DIR"
if [[ -f "$OPT_WASM" ]]; then
  WASM_PATH="$OPT_WASM"
fi

if [[ ! -f "$WASM_PATH" ]]; then
  echo "Missing wasm: $WASM_PATH" >&2
  echo "Run ./scripts/compile.sh first." >&2
  exit 1
fi

WASM_HASH="$(
  stellar contract upload \
    --wasm "$WASM_PATH" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
  | tail -n1
)"

stellar contract deploy \
  --wasm-hash "$WASM_HASH" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  --alias "$CONTRACT_ALIAS"
