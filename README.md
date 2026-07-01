# LumenLink Registry

Soroban contract workspace for LumenLink payment-request records.

## What it does

- Stores payment-request metadata on-chain
- Supports create, read, update, delete, and owner-filtered listing
- Enforces auth for owner/admin mutations
- Validates memo length, label size, amount, and expiry

## Layout

```text
.
├── contracts
│   └── lumenlink_registry
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── scripts
│   ├── compile.sh
│   └── deploy.sh
└── Cargo.toml
```

## Build

```bash
./scripts/compile.sh
```

## Deploy

```bash
export SOURCE_ACCOUNT=alice
export NETWORK=testnet
./scripts/deploy.sh
```

If you use a custom wasm path or alias:

```bash
export WASM_PATH=target/wasm32-unknown-unknown/release/lumenlink_registry.wasm
export CONTRACT_ALIAS=lumenlink-registry
./scripts/deploy.sh
```
