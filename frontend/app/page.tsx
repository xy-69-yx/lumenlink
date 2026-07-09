"use client";

import { useEffect, useState, useTransition, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { ArrowUpRight, Check, Copy, FilePlus2, LayoutGrid, Loader2, PanelLeft, Search, ShieldCheck, Trash2, Wallet, Zap } from "lucide-react";
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
          <p className="preview-copy">
            {uri ? "Scan the QR or copy the payment link to share the request." : "Add a recipient to generate the QR and payment link."}
          </p>
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
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><Zap className="h-5 w-5" /></div>
        <nav aria-label="Primary navigation">
          <a href="#workspace" className="nav-item active" aria-label="Workspace"><LayoutGrid /></a>
          <a href="#registry" className="nav-item" aria-label="Registry"><Search /></a>
        </nav>
        <button className="nav-item" onClick={handleConnect} aria-label="Connect wallet"><Wallet /></button>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div className="topbar-title">
            <PanelLeft className="h-5 w-5" />
            <span>LumenLink</span>
            <span className="network-pill"><i /> Testnet</span>
          </div>
          <div className="topbar-actions">
            <span className="contract-state">v{contractVersion} · {contractStatus}</span>
            <span className={`wallet-chip ${wallet.connected ? "connected" : ""}`}>
              <i />
              {wallet.connected ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "Freighter idle"}
            </span>
            <Button onClick={handleConnect} variant={wallet.connected ? "secondary" : "primary"}>
              <Wallet className="h-4 w-4" />
              {wallet.connected ? `${wallet.address.slice(0, 5)}…${wallet.address.slice(-4)}` : "Connect wallet"}
            </Button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="page-heading">
            <div>
              <span className="kicker">Payment request</span>
              <h1>{editingRequestId ? `Edit request #${editingRequestId}` : "Create a payment link"}</h1>
              <p>Set payment details, check preview, then share or save on-chain.</p>
              <div className="hero-chips">
                <span className="hero-chip">Testnet ready</span>
                <span className="hero-chip">QR + link</span>
                <span className="hero-chip">On-chain registry</span>
              </div>
            </div>
            <button
              className="new-request"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setEditingRequestId(null);
                setSaveStatus("Ready for new request.");
                setSaveTxHash("");
              }}
            >
              <FilePlus2 className="h-4 w-4" /> New request
            </button>
          </section>

          <section id="workspace" className="workspace-grid">
            <div className="editor-card">
              <div className="section-head">
                <div><span>01</span><h2>Payment</h2></div>
                <span>Required</span>
              </div>

              <div className="form-grid">
                <Field label="Recipient address" hint="Stellar G address">
                  <Input value={draft.recipient} onChange={(event) => setDraft((current) => ({ ...current, recipient: event.target.value }))} placeholder="G..." />
                </Field>
                <div className="split-fields">
                  <Field label="Amount" hint="Decimal value">
                    <Input value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="250.00" />
                  </Field>
                  <Field label="Asset" hint="Native or token">
                    <select
                      value={draft.asset.kind}
                      onChange={(event) => setDraft((current) => ({
                        ...current,
                        asset: event.target.value === "native" ? { kind: "native" } : {
                          kind: "credit",
                          code: current.asset.kind === "credit" ? current.asset.code : "USDC",
                          issuer: current.asset.kind === "credit" ? current.asset.issuer : "",
                        },
                      }))}
                      >
                      <option value="native">XLM · Native</option>
                      <option value="credit">Custom token</option>
                    </select>
                  </Field>
                  <Field label="Decimals" hint="Atomic scale">
                    <Input inputMode="numeric" value={draft.decimals} onChange={(event) => setDraft((current) => ({ ...current, decimals: event.target.value.replace(/[^\d]/g, "") }))} />
                  </Field>
                </div>
                {draft.asset.kind === "credit" ? (
                  <div className="split-fields token-fields">
                    <Field label="Token code"><Input value={draft.asset.code} onChange={(event) => setDraft((current) => current.asset.kind === "credit" ? { ...current, asset: { ...current.asset, code: event.target.value } } : current)} placeholder="USDC" /></Field>
                    <Field label="Issuer address"><Input value={draft.asset.issuer} onChange={(event) => setDraft((current) => current.asset.kind === "credit" ? { ...current, asset: { ...current.asset, issuer: event.target.value } } : current)} placeholder="G..." /></Field>
                  </div>
                ) : null}
              </div>

              <div className="section-head details-head">
                <div><span>02</span><h2>Details</h2></div>
                <span>Shown to payer</span>
              </div>
              <div className="form-grid">
                <div className="split-fields two">
                  <Field label="Title"><Input value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Design retainer" /></Field>
                  <Field label="Memo"><Input value={draft.memo} onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))} placeholder="Invoice-001" /></Field>
                </div>
                <Field label="Description"><TextArea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What this payment covers" /></Field>
                <div className="split-fields two">
                  <Field label="Wallet message" hint="SEP-7"><Input value={draft.message} onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))} placeholder="Payment note" /></Field>
                  <Field label="Expires in ledgers" hint="Optional"><Input value={draft.expiresInLedgers} onChange={(event) => setDraft((current) => ({ ...current, expiresInLedgers: event.target.value.replace(/[^\d]/g, "") }))} placeholder="No expiry" /></Field>
                </div>
              </div>
            </div>

            <aside className="preview-column">
              <div className="preview-sticky">
                <div className="preview-title"><span>Preview</span><span className="live-dot">Live</span></div>
                <AssetPreview draft={draft} />
                <div className="amount-readout">
                  <span>Atomic amount</span><strong>{quotedAmount}</strong>
                </div>
                <div className="action-stack">
                  <Button onClick={handleSaveOnChain} disabled={isPending} className="w-full">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {editingRequestId ? "Update on-chain" : "Save on-chain"}
                  </Button>
                  <Button variant="secondary" onClick={() => copyToClipboard(paymentUri, "payment link")} disabled={!paymentUri} className="w-full">
                    <Copy className="h-4 w-4" /> Copy payment link
                  </Button>
                </div>
                <div className="save-message">
                  <span className={saveTxHash ? "ok" : ""} />
                  <div>{saveStatus}{saveTxHash ? <small>Tx: {saveTxHash}</small> : null}</div>
                </div>
              </div>
            </aside>
          </section>

          <section id="registry" className="registry-section">
            <div className="registry-heading">
              <div><span className="kicker">Contract registry</span><h2>Find saved requests</h2></div>
              <button className="contract-copy" onClick={() => copyToClipboard(contractAddress, "contract ID")}><Copy className="h-4 w-4" /> {contractAddress.slice(0, 12)}…</button>
            </div>
            <div className="registry-tools">
              <div className="lookup-box">
                <Field label="Request ID">
                  <div className="input-action"><Input value={requestId} onChange={(event) => setRequestId(event.target.value)} /><Button onClick={handleLookupRequest} disabled={lookup.status === "loading"}>{lookup.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find</Button></div>
                </Field>
                <p className="tool-status">{lookup.message || "Enter an on-chain request ID."}</p>
                {lookup.request ? (
                  <article className="request-row featured">
                    <div className="request-id">#{lookup.request.id.toString()}</div>
                    <div><strong>{lookup.request.label}</strong><span>{formatAtomicAmount(BigInt(lookup.request.amount), 7)} · {lookup.request.memo ?? "No memo"}</span></div>
                    <div className="row-actions"><button onClick={() => loadRequestIntoForm(lookup.request!)}><ArrowUpRight /></button><button onClick={() => handleDeleteOnChain(lookup.request!.id)}><Trash2 /></button></div>
                  </article>
                ) : null}
              </div>
              <div className="owner-box">
                <Field label="Owner address">
                  <div className="input-action"><Input value={ownerAddress} onChange={(event) => setOwnerAddress(event.target.value)} placeholder="G..." /><Button onClick={handleListRequests} disabled={listing.status === "loading"}>{listing.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Load</Button></div>
                </Field>
                <p className="tool-status">{listing.message || "Load requests for a wallet."}</p>
                <div className="request-list">
                  {listing.requests.length === 0 ? <div className="empty-state">No requests loaded.</div> : null}
                  {listing.requests.map((item) => (
                    <article className="request-row" key={item.id.toString()}>
                      <div className="request-id">#{item.id.toString()}</div>
                      <div><strong>{item.label}</strong><span>{formatAtomicAmount(BigInt(item.amount), 7)} · {item.active ? "Active" : "Off"}</span></div>
                      <div className="row-actions"><button onClick={() => loadRequestIntoForm(item)}><ArrowUpRight /></button><button onClick={() => handleDeleteOnChain(item.id)}><Trash2 /></button></div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <footer><span><Check className="h-4 w-4" /> {copied ? `Copied ${copied}` : "Ready"}</span><span>{networkPassphrase.split(" ; ")[0]}</span></footer>
        </div>
      </div>
    </main>
  );
}
