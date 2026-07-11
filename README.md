# LumenLink

Modern Stellar payment requests with a Soroban-backed registry and a Freighter-powered frontend.

## Project Overview

LumenLink lets you create, preview, save, look up, update, and delete payment requests on Stellar testnet. The app generates a clean payment-link flow in the browser, while the Soroban contract stores request metadata and enforces ownership and validation rules.

## Live Links

- Live app: `ADD_LIVE_LINK_HERE`
- Demo video: `ADD_DEMO_VIDEO_LINK_HERE`

## What It Does

- Builds a payment request from a recipient, asset, amount, memo, and description.
- Generates a `web+stellar:pay` payment URI and QR code for quick sharing.
- Saves requests on-chain through the `lumenlink_registry` Soroban contract.
- Lets you search a request by ID and list requests by owner.
- Supports editing and deleting existing requests when you are authorized.

## Use Cases

- Freelancers sending payment requests for invoices and milestones.
- Teams collecting testnet payments during Stellar/Soroban prototyping.
- Demos where you want a polished payment-link flow with on-chain storage.
- Internal tools that need a simple registry for payment requests.

## Screenshots

Place screenshots here once they are ready.

- `docs/screenshots/home.png` - main workspace and preview
- `docs/screenshots/registry.png` - on-chain request lookup and listing
- `docs/screenshots/mobile.png` - mobile layout

## Project Structure

```text
.
├── Cargo.toml
├── Cargo.lock
├── contracts/
│   └── lumenlink_registry/
│       ├── Cargo.toml
│       ├── Makefile
│       ├── src/
│       │   ├── lib.rs
│       │   └── test.rs
│       └── test_snapshots/
├── frontend/
│   ├── app/
│   ├── lib/
│   ├── public/
│   ├── src/contracts/lumenlink_registry/
│   ├── package.json
│   └── next.config.ts
└── scripts/
    ├── compile.sh
    └── deploy.sh
```

## Tech Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Freighter API for wallet signing
- Stellar SDK for payment-link and contract interactions
- Soroban smart contract for request storage

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open the local app in your browser.

### Checks

```bash
cd frontend
npm run build
npm run lint
```

## Contract Workflow

The root workspace contains the Soroban contract and helper scripts.

### Build the contract

```bash
./scripts/compile.sh
```

### Deploy the contract

```bash
export SOURCE_ACCOUNT=alice
export NETWORK=testnet
./scripts/deploy.sh
```

If you already have a WASM path or want to override the alias:

```bash
export WASM_PATH=target/wasm32v1-none/release/lumenlink_registry.wasm
export CONTRACT_ALIAS=lumenlink-registry
./scripts/deploy.sh
```

## Contract Details

- Contract name: `lumenlink_registry`
- Network: `testnet`
- Network passphrase: `Test SDF Network ; September 2015`
- Default contract ID: `CBCWLMJPKWECI6F2HGNBEQ3KF4PYXBL5E22UNPHLOSEVHSQRZPUB5R5B`
- Contract status: versioned and test-covered

### Main Contract Methods

- `initialize(admin)` - sets the admin and initializes storage
- `version()` - returns the contract version
- `get_admin()` - reads the current admin
- `set_admin(admin, new_admin)` - rotates admin privileges
- `create_request(owner, input)` - creates a new payment request
- `get_request(id)` - reads one request
- `list_requests(owner, start_after, limit)` - lists requests for one owner
- `update_request(actor, id, patch)` - updates a request
- `delete_request(actor, id)` - deletes a request

### Validation Rules

- Amount must be positive.
- Memo is limited to 28 bytes.
- Label is limited to 64 bytes.
- Description is limited to 512 bytes.
- Expiry is validated before being stored.

## Tests

The contract workspace includes snapshot-backed tests for:

- create / read / update / delete flow
- input validation
- owner-filtered listing
- admin rotation

Run contract tests from the root workspace with `cargo test`. The repository includes snapshots under `contracts/lumenlink_registry/test_snapshots/`.

## Frontend Configuration

The frontend uses these optional environment variables:

- `NEXT_PUBLIC_LUMENLINK_CONTRACT_ID`
- `NEXT_PUBLIC_LUMENLINK_NETWORK_PASSPHRASE`
- `NEXT_PUBLIC_LUMENLINK_RPC_URL`

If they are not set, the app falls back to the testnet values listed above.

## Notes

- The browser app expects the Freighter extension for signing.
- The default contract target is Stellar testnet.
- The live app UI is designed to work on desktop and mobile.
