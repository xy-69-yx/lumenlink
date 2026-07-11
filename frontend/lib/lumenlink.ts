import {
  StellarWalletsKit,
} from "@creit.tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import {
  rpc,
  type Request as OnChainRequest,
  type RequestInput,
  type RequestPatch,
  Client,
} from "../src/contracts/lumenlink_registry/src/index";

const CONTRACT_ID =
  process.env.NEXT_PUBLIC_LUMENLINK_CONTRACT_ID ??
  "CBCWLMJPKWECI6F2HGNBEQ3KF4PYXBL5E22UNPHLOSEVHSQRZPUB5R5B";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_LUMENLINK_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";
const RPC_URL =
  process.env.NEXT_PUBLIC_LUMENLINK_RPC_URL ??
  "https://soroban-testnet.stellar.org";

let walletKitReady = false;

function ensureWalletKit() {
  if (typeof window === "undefined") {
    return;
  }

  if (!walletKitReady) {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: defaultModules(),
    });
    walletKitReady = true;
  }
}

async function signTransactionWithKit(
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string }
) {
  ensureWalletKit();
  if (typeof window === "undefined") {
    throw new Error("Wallet kit is only available in the browser");
  }

  const address = opts?.address ?? (await StellarWalletsKit.getAddress()).address;
  const { signedTxXdr, signerAddress } = await StellarWalletsKit.signTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
    address,
  });
  return {
    signedTxXdr,
    signerAddress,
  };
}

async function signAuthEntryWithKit(
  authEntry: string,
  opts?: { networkPassphrase?: string; address?: string }
) {
  ensureWalletKit();
  if (typeof window === "undefined") {
    throw new Error("Wallet kit is only available in the browser");
  }

  const address = opts?.address ?? (await StellarWalletsKit.getAddress()).address;
  const { signedAuthEntry, signerAddress } = await StellarWalletsKit.signAuthEntry(authEntry, {
    networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
    address,
  });
  return {
    signedAuthEntry,
    signerAddress,
    error: undefined,
  };
}

export const LUMENLINK = {
  contractId: CONTRACT_ID,
  networkPassphrase: NETWORK_PASSPHRASE,
  rpcUrl: RPC_URL,
} as const;

export type RequestAsset =
  | { kind: "native" }
  | { kind: "credit"; code: string; issuer: string };

export type RequestDraft = {
  recipient: string;
  amount: string;
  decimals: string;
  asset: RequestAsset;
  memo: string;
  label: string;
  description: string;
  message: string;
  expiresInLedgers: string;
};

export type WalletState = {
  address: string;
  connected: boolean;
  networkPassphrase: string;
};

export type RequestLookup = {
  status: "idle" | "loading" | "ready" | "error";
  message: string;
  request?: OnChainRequest;
};

export type RequestList = {
  status: "idle" | "loading" | "ready" | "error";
  message: string;
  requests: OnChainRequest[];
};

export const EMPTY_DRAFT: RequestDraft = {
  recipient: "",
  amount: "250.00",
  decimals: "7",
  asset: { kind: "native" },
  memo: "Invoice-001",
  label: "Design retainer",
  description: "First milestone for June work",
  message: "Pay directly from your Stellar wallet",
  expiresInLedgers: "",
};

export function buildContractClient(publicKey?: string) {
  return new Client({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey,
    signTransaction: async (xdr, opts) =>
      signTransactionWithKit(xdr, {
        networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
        address: opts?.address ?? publicKey,
      }),
    signAuthEntry: async (entryXdr, opts) =>
      signAuthEntryWithKit(entryXdr, {
        networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
        address: opts?.address ?? publicKey,
      }),
  });
}

export function makeRpcServer() {
  return new rpc.Server(RPC_URL);
}

export async function connectWallet(): Promise<WalletState> {
  ensureWalletKit();
  if (typeof window === "undefined") {
    throw new Error("Wallet kit is only available in the browser");
  }

  const { address } = await StellarWalletsKit.authModal();
  return {
    address,
    connected: true,
    networkPassphrase: NETWORK_PASSPHRASE,
  };
}

export function formatAtomicAmount(value: bigint, decimals = 7) {
  const negative = value < BigInt(0);
  const normalized = negative ? -value : value;
  const scale = BigInt(10) ** BigInt(decimals);
  const whole = normalized / scale;
  const fraction = normalized % scale;
  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  const base = fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
  return negative ? `-${base}` : base;
}

export function parseAtomicAmount(amount: string, decimals = 7) {
  const cleaned = amount.trim().replace(/,/g, "");
  if (!cleaned) {
    throw new Error("Amount required");
  }

  const negative = cleaned.startsWith("-");
  const normalized = negative ? cleaned.slice(1) : cleaned;
  const [wholePart, fractionPart = ""] = normalized.split(".");
  if (!/^\d+$/.test(wholePart || "0") || !/^\d*$/.test(fractionPart)) {
    throw new Error("Amount must be numeric");
  }

  const fraction = (fractionPart + "0".repeat(decimals)).slice(0, decimals);
  const atomic = BigInt(`${wholePart || "0"}${fraction || "0"}`);
  return negative ? -atomic : atomic;
}

export function buildPaymentUri(draft: RequestDraft) {
  if (!draft.recipient.trim()) {
    return "";
  }

  const params = new URLSearchParams();
  params.set("destination", draft.recipient.trim());
  params.set("amount", draft.amount.trim());
  if (draft.asset.kind === "credit") {
    params.set("asset_code", draft.asset.code.trim());
    params.set("asset_issuer", draft.asset.issuer.trim());
  }
  if (draft.memo.trim()) {
    params.set("memo", draft.memo.trim());
    params.set("memo_type", "text");
  }
  if (draft.message.trim()) {
    params.set("msg", draft.message.trim());
  }
  return `web+stellar:pay?${params.toString()}`;
}

export function toRequestInput(
  draft: RequestDraft,
  recipient: string,
  currentLedger?: number
): RequestInput {
  const amount = parseAtomicAmount(draft.amount, Number(draft.decimals || "7"));

  const asset =
    draft.asset.kind === "native"
      ? { tag: "Native" as const, values: undefined }
      : {
          tag: "Credit" as const,
          values: [draft.asset.code.trim(), draft.asset.issuer.trim()] as const,
        };

  const expiresAtLedger = draft.expiresInLedgers.trim()
    ? currentLedger
      ? currentLedger + Number(draft.expiresInLedgers.trim())
      : Number(draft.expiresInLedgers.trim())
    : undefined;

  return {
    recipient,
    asset,
    amount,
    memo: draft.memo.trim() ? draft.memo.trim() : undefined,
    label: draft.label.trim(),
    description: draft.description.trim(),
    expires_at_ledger: expiresAtLedger,
  };
}

export function requestToDraft(request: OnChainRequest): RequestDraft {
  return {
    recipient: request.recipient,
    amount: formatAtomicAmount(BigInt(request.amount), 7),
    decimals: "7",
    asset:
      request.asset.tag === "Native"
        ? { kind: "native" }
        : {
            kind: "credit",
            code: request.asset.values[0],
            issuer: request.asset.values[1],
          },
    memo: request.memo ?? "",
    label: request.label,
    description: request.description,
    message: "",
    expiresInLedgers: "",
  };
}

export function toRequestPatch(draft: RequestDraft): RequestPatch {
  const amount = parseAtomicAmount(draft.amount, Number(draft.decimals || "7"));

  return {
    recipient: draft.recipient.trim() || undefined,
    amount,
    memo: draft.memo.trim() ? draft.memo.trim() : undefined,
    label: draft.label.trim() || undefined,
    description: draft.description.trim() || undefined,
    expires_at_ledger: undefined,
    active: undefined,
  };
}

export async function readContractVersion() {
  const client = buildContractClient();
  const tx = await client.version();
  return Number(tx.result);
}

export async function readRequestById(id: bigint) {
  const client = buildContractClient();
  const tx = await client.get_request({ id });
  if (tx.result.isErr()) {
    return {
      ok: false as const,
      message: tx.result.unwrapErr().message,
    };
  }

  return {
    ok: true as const,
    request: tx.result.unwrap(),
  };
}

export async function readRequestsByOwner(owner: string, limit = BigInt(10)) {
  const client = buildContractClient();
  const tx = await client.list_requests({
    owner,
    start_after: BigInt(0),
    limit: Number(limit),
  });

  if (tx.result.isErr()) {
    return {
      ok: false as const,
      message: tx.result.unwrapErr().message,
    };
  }

  return {
    ok: true as const,
    requests: tx.result.unwrap(),
  };
}

export async function createOnChainRequest(
  owner: string,
  draft: RequestDraft
) {
  const client = buildContractClient(owner);
  const requestInput = toRequestInput(draft, owner);
  const tx = await client.create_request({
    owner,
    input: requestInput,
  });
  const sent = await tx.signAndSend();
  if (sent.result.isErr()) {
    return {
      ok: false as const,
      message: sent.result.unwrapErr().message,
      hash: sent.sendTransactionResponse?.hash ?? "",
    };
  }

  return {
    ok: true as const,
    request: sent.result.unwrap(),
    hash: sent.sendTransactionResponse?.hash ?? "",
  };
}

export async function updateOnChainRequest(
  actor: string,
  id: bigint,
  draft: RequestDraft
) {
  const client = buildContractClient(actor);
  const tx = await client.update_request({
    actor,
    id,
    patch: toRequestPatch(draft),
  });
  const sent = await tx.signAndSend();
  if (sent.result.isErr()) {
    return {
      ok: false as const,
      message: sent.result.unwrapErr().message,
      hash: sent.sendTransactionResponse?.hash ?? "",
    };
  }

  return {
    ok: true as const,
    request: sent.result.unwrap(),
    hash: sent.sendTransactionResponse?.hash ?? "",
  };
}

export async function deleteOnChainRequest(actor: string, id: bigint) {
  const client = buildContractClient(actor);
  const tx = await client.delete_request({
    actor,
    id,
  });
  const sent = await tx.signAndSend();
  if (sent.result.isErr()) {
    return {
      ok: false as const,
      message: sent.result.unwrapErr().message,
      hash: sent.sendTransactionResponse?.hash ?? "",
    };
  }

  return {
    ok: true as const,
    request: sent.result.unwrap(),
    hash: sent.sendTransactionResponse?.hash ?? "",
  };
}

export async function requireWalletAddress() {
  ensureWalletKit();
  if (typeof window === "undefined") {
    throw new Error("Wallet kit is only available in the browser");
  }
  const { address } = await StellarWalletsKit.getAddress();
  return address;
}

export const contractAddress = CONTRACT_ID;
export const networkPassphrase = NETWORK_PASSPHRASE;
export const rpcUrl = RPC_URL;
