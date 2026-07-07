"use client";

import Image from "next/image";
import { useEffect, useState, useTransition, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { ArrowUpRight, Check, Copy, Loader2, ShieldCheck, Sparkles, Trash2, Wallet } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  buildPaymentUri,
  connectWallet,
  contractAddress,
  deleteOnChainRequest,
  createOnChainRequest,
  EMPTY_DRAFT,
  formatAtomicAmount,
  networkPassphrase,
  parseAtomicAmount,
  readContractVersion,
  readRequestById,
  readRequestsByOwner,
  requestToDraft,
  updateOnChainRequest,
  type RequestDraft,
  type RequestLookup,
  type RequestList,
  type WalletState,
} from "../lib/lumenlink";

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2 block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-white">{label}</span>
        {hint ? <span className="text-[11px] uppercase tracking-[0.24em] text-white/38">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-emerald-300/60 focus:bg-white/[0.05] ${props.className ?? ""}`}
    />
  );
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-emerald-300/60 focus:bg-white/[0.05] ${props.className ?? ""}`}
    />
  );
}

function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const variantClass =
    variant === "primary"
      ? "bg-white text-slate-950 hover:bg-emerald-200"
      : variant === "secondary"
        ? "border border-white/12 bg-white/[0.05] text-white hover:bg-white/[0.09]"
        : "bg-transparent text-white/78 hover:bg-white/[0.04]";

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-strong rounded-[2rem] p-5 md:p-6 ${className}`}>
      <div className="mb-5 space-y-2">
        <div className="text-[11px] uppercase tracking-[0.36em] text-white/40">{eyebrow}</div>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="max-w-xl text-sm leading-6 text-white/66">{description}</p>
      </div>
      {children}
    </section>
  );
}

function AssetPreview({ draft }: { draft: RequestDraft }) {
  const uri = buildPaymentUri(draft);

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#060b10] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(143,241,214,0.2),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(255,139,110,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-white/40">Payment link</div>
          <div className="mt-2 text-lg font-semibold text-white">
            {uri ? "web+stellar:pay" : "Waiting for recipient"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/12 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-white/50">
          SEP-0007
        </div>
      </div>

      <div className="relative mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-between">
          <div className="rounded-3xl border border-white/10 bg-black/45 p-3">
            {uri ? (
              <QRCodeSVG value={uri} size={176} bgColor="transparent" fgColor="#F4EFE5" level="M" />
            ) : (
              <div className="flex h-[176px] w-[176px] items-center justify-center rounded-2xl border border-dashed border-white/14 text-center text-sm text-white/40">
                Add recipient
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/38">Destination</div>
              <div className="mt-2 break-all font-mono text-sm text-white">{draft.recipient || "G..."}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/38">Amount</div>
                <div className="mt-2 text-sm text-white">{draft.amount || "0.00"} {draft.asset.kind === "native" ? "XLM" : draft.asset.code || "asset"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/38">Memo</div>
                <div className="mt-2 text-sm text-white">{draft.memo || "None"}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#091018] p-4 mono text-[12px] leading-6 text-emerald-100/90 break-all">
              {uri || "web+stellar:pay"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({
    address: "",
    connected: false,
    networkPassphrase,
  });
  const [draft, setDraft] = useState<RequestDraft>(EMPTY_DRAFT);
  const [contractVersion, setContractVersion] = useState<string>("…");
  const [contractStatus, setContractStatus] = useState<string>("Loading contract…");
  const [copied, setCopied] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<string>("Connect Freighter to write on-chain.");
  const [saveTxHash, setSaveTxHash] = useState<string>("");
  const [lookup, setLookup] = useState<RequestLookup>({
    status: "idle",
    message: "",
  });
  const [listing, setListing] = useState<RequestList>({
    status: "idle",
    message: "",
    requests: [],
  });
  const [requestId, setRequestId] = useState<string>("1");
  const [ownerAddress, setOwnerAddress] = useState<string>("");
  const [editingRequestId, setEditingRequestId] = useState<bigint | null>(null);

  const paymentUri = buildPaymentUri(draft);

  useEffect(() => {
    let mounted = true;

    startTransition(() => {
      readContractVersion()
        .then((version) => {
          if (!mounted) {
            return;
          }
          setContractVersion(String(version));
          setContractStatus("Contract live on testnet");
        })
        .catch((error: Error) => {
          if (!mounted) {
            return;
          }
          setContractStatus(error.message);
        });
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleConnect() {
    try {
      const nextWallet = await connectWallet();
      setWallet(nextWallet);
      setOwnerAddress(nextWallet.address);
      setContractStatus("Freighter connected");
    } catch (error) {
      setContractStatus(error instanceof Error ? error.message : "Wallet connection failed");
    }
  }

  async function handleSaveOnChain() {
    try {
      const activeWallet = wallet.connected && wallet.address ? wallet : await (async () => {
        const nextWallet = await connectWallet();
        setWallet(nextWallet);
        setOwnerAddress(nextWallet.address);
        setContractStatus("Freighter connected");
        return nextWallet;
      })();

      setSaveStatus("Building contract call…");
      setSaveTxHash("");
      const response = editingRequestId
        ? await updateOnChainRequest(activeWallet.address, editingRequestId, draft)
        : await createOnChainRequest(activeWallet.address, draft);
      if (!response.ok) {
        setSaveStatus(response.message);
        return;
      }

      setSaveStatus(editingRequestId ? "Request updated on-chain" : "Request saved on-chain");
      setSaveTxHash(response.hash);
      if (response.request) {
        setDraft(requestToDraft(response.request));
        setEditingRequestId(response.request.id);
      }
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Submit failed");
    }
  }

  async function handleDeleteOnChain(id: bigint) {
    try {
      const activeWallet = wallet.connected && wallet.address ? wallet : await (async () => {
        const nextWallet = await connectWallet();
        setWallet(nextWallet);
        setOwnerAddress(nextWallet.address);
        setContractStatus("Freighter connected");
        return nextWallet;
      })();

      setSaveStatus("Deleting request…");
      setSaveTxHash("");
      const response = await deleteOnChainRequest(activeWallet.address, id);
      if (!response.ok) {
        setSaveStatus(response.message);
        return;
      }

      setSaveStatus("Request deleted on-chain");
      setSaveTxHash(response.hash);
      if (editingRequestId === id) {
        setDraft(EMPTY_DRAFT);
        setEditingRequestId(null);
      }
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Delete failed");
    }
  }

  function loadRequestIntoForm(request: NonNullable<RequestLookup["request"]>) {
    setDraft(requestToDraft(request));
    setEditingRequestId(request.id);
    setRequestId(request.id.toString());
    setSaveStatus(`Editing request #${request.id.toString()}`);
  }

  async function handleLookupRequest() {
    try {
      setLookup({ status: "loading", message: "Loading request…" });
      const id = BigInt(requestId || "0");
      const response = await readRequestById(id);
      if (!response.ok) {
        setLookup({ status: "error", message: response.message });
        return;
      }

      setLookup({
        status: "ready",
        message: "Request loaded",
        request: response.request,
      });
      loadRequestIntoForm(response.request);
    } catch (error) {
      setLookup({
        status: "error",
        message: error instanceof Error ? error.message : "Lookup failed",
      });
    }
  }

  async function handleListRequests() {
    const owner = ownerAddress.trim();
    if (!owner) {
      setListing({
        status: "error",
        message: "Set owner address first.",
        requests: [],
      });
      return;
    }

    try {
      setListing({
        status: "loading",
        message: "Loading list…",
        requests: [],
      });
      const response = await readRequestsByOwner(owner, BigInt(8));
      if (!response.ok) {
        setListing({
          status: "error",
          message: response.message,
          requests: [],
        });
        return;
      }

      setListing({
        status: "ready",
        message: "On-chain requests loaded",
        requests: response.requests,
      });
    } catch (error) {
      setListing({
        status: "error",
        message: error instanceof Error ? error.message : "List failed",
        requests: [],
      });
    }
  }

  async function copyToClipboard(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  }

  let amountAtomic = BigInt(0);
  try {
    amountAtomic = parseAtomicAmount(draft.amount, Number(draft.decimals || "7"));
  } catch {
    amountAtomic = BigInt(0);
  }
  let quotedAmount = "0";
  const decimals = Number(draft.decimals || "7");
  if (draft.amount.trim()) {
    try {
      quotedAmount = formatAtomicAmount(amountAtomic, decimals);
    } catch {
      quotedAmount = draft.amount;
    }
  }
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 copy-grid opacity-60" />
      <div className="pointer-events-none absolute -top-20 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(143,241,214,0.12),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-5rem] top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,139,110,0.16),transparent_62%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-[-6rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(248,201,131,0.12),transparent_60%)] blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="glass fade-in rounded-[2rem] px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2">
                <Image src="/lumenlink-mark.svg" alt="LumenLink" fill className="object-cover" priority />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.36em] text-white/40">LumenLink</div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Request money on Stellar without losing the plot.</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Stat label="Contract" value={contractAddress} />
              <Stat label="Network" value={networkPassphrase.split(" ; ")[0]} />
              <Stat label="Status" value={contractStatus} />
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-strong fade-in-delay rounded-[2.5rem] p-6 md:p-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-emerald-100/90">
                <Sparkles className="h-4 w-4" />
                Contract-backed payment requests
              </div>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
                Modern request screen. Stellar rails under glass.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/66 md:text-lg">
                Build a SEP-0007 payment link, render a QR, and register the same intent on-chain through your deployed
                LumenLink contract. Read it, list it, share it, or sign it with Freighter.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Stat label="Finality" value="~5 seconds" />
              <Stat label="Fee model" value="Sub-cent" />
              <Stat label="Trust" value="No keys in app" />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Button onClick={handleConnect} variant="secondary">
                <Wallet className="h-4 w-4" />
                {wallet.connected ? "Wallet connected" : "Connect Freighter"}
              </Button>
              <Button
                onClick={() => copyToClipboard(paymentUri, "payment-link")}
                variant="ghost"
                disabled={!paymentUri}
              >
                <Copy className="h-4 w-4" />
                Copy payment link
              </Button>
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Wallet</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {wallet.connected ? wallet.address : "Disconnected"}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-white/48">
                    {wallet.connected ? "Ready" : "Optional"}
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/30 p-3 mono text-[12px] leading-6 text-white/72">
                  {saveStatus}
                  {saveTxHash ? (
                    <div className="mt-2 break-all text-emerald-200">
                      Tx hash: {saveTxHash}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={handleSaveOnChain} disabled={isPending} className="min-w-40">
                    <ShieldCheck className="h-4 w-4" />
                    {editingRequestId ? "Update on-chain" : "Save on-chain"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDraft(EMPTY_DRAFT);
                      setEditingRequestId(null);
                      setSaveStatus("Ready for new request.");
                      setSaveTxHash("");
                    }}
                  >
                    New request
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => copyToClipboard(contractAddress, "contract-id")}
                  >
                    <Copy className="h-4 w-4" />
                    Copy contract ID
                  </Button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[#071018] p-4">
                <AssetPreview draft={draft} />
              </div>
            </div>
          </div>

          <div className="glass-strong fade-in-delay rounded-[2.5rem] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Request builder</div>
                <h3 className="mt-2 text-2xl font-semibold text-white">Shape payment intent</h3>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-white/45">
                Live preview
              </div>
            </div>

            <div className="grid gap-4">
              <Field label="Recipient" hint="G address">
                <Input
                  value={draft.recipient}
                  onChange={(event) => setDraft((current) => ({ ...current, recipient: event.target.value }))}
                  placeholder="G..."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                <Field label="Amount" hint="Decimal units">
                  <Input
                    value={draft.amount}
                    onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="250.00"
                  />
                </Field>
                <Field label="Decimals" hint="Token precision">
                  <Input
                    inputMode="numeric"
                    value={draft.decimals}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, decimals: event.target.value.replace(/[^\d]/g, "") }))
                    }
                    placeholder="7"
                  />
                </Field>
              </div>

              <Field label="Asset" hint="Native or token">
                <div className="grid gap-3 sm:grid-cols-[0.7fr_1fr_1fr]">
                  <select
                    value={draft.asset.kind}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        asset:
                          event.target.value === "native"
                            ? { kind: "native" }
                            : {
                                kind: "credit",
                                code: current.asset.kind === "credit" ? current.asset.code : "USDC",
                                issuer:
                                  current.asset.kind === "credit"
                                    ? current.asset.issuer
                                    : "GDKR5KNNYJCUJXU6O5YPPOZ6C6M7JEV3S6JZV3Y3D2R5R6QJ6Q2W2A7M",
                              },
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="native">XLM</option>
                    <option value="credit">Token</option>
                  </select>
                  <Input
                    value={draft.asset.kind === "credit" ? draft.asset.code : ""}
                    onChange={(event) =>
                      setDraft((current) =>
                        current.asset.kind === "credit"
                          ? { ...current, asset: { ...current.asset, code: event.target.value } }
                          : current
                      )
                    }
                    placeholder="USDC"
                    disabled={draft.asset.kind === "native"}
                  />
                  <Input
                    value={draft.asset.kind === "credit" ? draft.asset.issuer : ""}
                    onChange={(event) =>
                      setDraft((current) =>
                        current.asset.kind === "credit"
                          ? { ...current, asset: { ...current.asset, issuer: event.target.value } }
                          : current
                      )
                    }
                    placeholder="Issuer G..."
                    disabled={draft.asset.kind === "native"}
                  />
                </div>
              </Field>

              <Field label="Memo" hint="On-chain note">
                <Input
                  value={draft.memo}
                  onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))}
                  placeholder="Invoice-001"
                />
              </Field>

              <Field label="Label" hint="Short title">
                <Input
                  value={draft.label}
                  onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Design retainer"
                />
              </Field>

              <Field label="Description" hint="Human-readable detail">
                <TextArea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="June milestone"
                />
              </Field>

              <Field label="Message" hint="SEP-7 msg">
                <TextArea
                  value={draft.message}
                  onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Pay directly from your Stellar wallet"
                />
              </Field>

              <Field label="Expires in ledgers" hint="Optional">
                <Input
                  value={draft.expiresInLedgers}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, expiresInLedgers: event.target.value.replace(/[^\d]/g, "") }))
                  }
                  placeholder="Leave blank"
                />
              </Field>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => copyToClipboard(paymentUri, "payment-link")} disabled={!paymentUri}>
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button variant="secondary" onClick={handleSaveOnChain}>
                <ArrowUpRight className="h-4 w-4" />
                {editingRequestId ? "Update request on-chain" : "Save request on-chain"}
              </Button>
            </div>

            <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-black/35 p-4 mono text-[12px] leading-6 text-white/72">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/38">Atomic amount</div>
              <div className="mt-2 break-all text-emerald-100">
                {quotedAmount} units
              </div>
              <div className="mt-3 break-all text-white/56">{paymentUri || "web+stellar:pay"}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel
            eyebrow="Registry explorer"
            title="Read deployed contract"
            description="Look up a request by id or list requests by owner. The same contract that powers this app is the one deployed on testnet."
          >
            <div className="grid gap-4">
              <Field label="Request ID" hint="u64">
                <div className="flex gap-3">
                  <Input value={requestId} onChange={(event) => setRequestId(event.target.value)} />
                  <Button onClick={handleLookupRequest} disabled={lookup.status === "loading"}>
                    {lookup.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Load
                  </Button>
                </div>
              </Field>

              <Field label="Owner address" hint="For list view">
                <div className="flex gap-3">
                  <Input
                    value={ownerAddress}
                    onChange={(event) => setOwnerAddress(event.target.value)}
                    placeholder="G..."
                  />
                  <Button onClick={handleListRequests} disabled={listing.status === "loading"}>
                    {listing.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    List
                  </Button>
                </div>
              </Field>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/38">Contract version</div>
                <div className="mt-2 text-lg font-semibold text-white">{contractVersion}</div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/38">Lookup result</div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/48">
                    {lookup.status}
                  </div>
                </div>
                <div className="mt-3 text-sm text-white/72">{lookup.message || "Use a request id."}</div>
                {lookup.request ? (
                  <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/70">
                        #{lookup.request.id.toString()}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/70">
                        {lookup.request.active ? "active" : "paused"}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/70">
                        {lookup.request.asset.tag}
                      </span>
                    </div>
                    <div className="grid gap-3 text-sm text-white/80">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Recipient</div>
                        <div className="mt-1 break-all font-mono text-[12px] text-white/78">{lookup.request.recipient}</div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Amount</div>
                          <div className="mt-1 text-white">{formatAtomicAmount(BigInt(lookup.request.amount), 7)}</div>
                        </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Memo</div>
                        <div className="mt-1 text-white">{lookup.request.memo ?? "None"}</div>
                      </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Description</div>
                        <div className="mt-1 text-white/76">{lookup.request.description}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button
                        variant="secondary"
                        onClick={() => loadRequestIntoForm(lookup.request!)}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        Edit in form
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteOnChain(lookup.request!.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel
            eyebrow="On-chain list"
            title="Browse requests by owner"
            description="List the latest requests for a wallet or loaded account. This makes the contract feel alive, not buried behind a form."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-white/55">
                  {listing.status}
                </div>
                <div>{listing.message || "Load an owner."}</div>
              </div>

              <div className="grid gap-4">
                {listing.requests.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-white/46">
                    No requests loaded yet. Connect Freighter or paste an owner address.
                  </div>
                ) : null}
                {listing.requests.map((item) => (
                  <article
                    key={item.id.toString()}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-white/34">Request #{item.id.toString()}</div>
                        <div className="mt-2 text-lg font-semibold text-white">{item.label}</div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/50">
                        {item.active ? "active" : "off"}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Recipient</div>
                        <div className="mt-1 break-all font-mono text-[12px] text-white/76">{item.recipient}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Amount</div>
                        <div className="mt-1 text-white">{formatAtomicAmount(BigInt(item.amount), 7)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-white/68">{item.description}</div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="secondary" onClick={() => loadRequestIntoForm(item)}>
                        <ArrowUpRight className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => handleDeleteOnChain(item.id)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        <footer className="flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/56 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-300" />
            {copied ? `Copied ${copied}` : "Ready for wallet handoff and QR sharing"}
          </div>
          <div className="mono text-[11px] uppercase tracking-[0.24em] text-white/38">
            {contractAddress} · {networkPassphrase}
          </div>
        </footer>
      </div>
    </main>
  );
}
