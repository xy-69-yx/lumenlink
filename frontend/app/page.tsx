"use client";

import { Check, Copy, Loader2, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import {
  buildRequestPaymentPageUrl,
  connectWallet,
  createOnChainRequest,
  EMPTY_DRAFT,
  networkPassphrase,
  readContractVersion,
  type RequestDraft,
  type WalletState,
} from "../lib/lumenlink";

const initialDraft: RequestDraft = {
  ...EMPTY_DRAFT,
  recipient: "",
  amount: "",
  memo: "",
  label: "",
  description: "",
  message: "",
  expiresInLedgers: "",
  asset: { kind: "native" },
};

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: "", connected: false, networkPassphrase });
  const [draft, setDraft] = useState<RequestDraft>(initialDraft);
  const [contractVersion, setContractVersion] = useState("…");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    readContractVersion().then((value) => setContractVersion(String(value))).catch(() => setContractVersion("offline"));
  }, []);

  async function handleConnect() {
    try {
      setStatus("");
      const connected = await connectWallet();
      setWallet(connected);
      setDraft((current) => ({ ...current, recipient: connected.address }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not connect wallet");
    }
  }

  async function handleCreate() {
    if (!wallet.connected) {
      setStatus("Connect your wallet first.");
      return;
    }
    if (!draft.amount.trim() || !draft.label.trim()) {
      setStatus("Add an amount and request title.");
      return;
    }

    try {
      setSaving(true);
      setStatus("Saving your request on Stellar…");
      const result = await createOnChainRequest(wallet.address, draft);
      if (!result.ok) {
        setStatus(result.message);
        return;
      }
      const path = buildRequestPaymentPageUrl(result.request.id);
      setShareLink(`${window.location.origin}${path}`);
      setStatus("Payment link ready");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create request");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white"><Zap className="h-5 w-5" /></span>
            LumenLink
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:block">Testnet · Contract v{contractVersion}</span>
            <button onClick={handleConnect} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-700">
              <Wallet className="h-4 w-4" />
              {wallet.connected ? `${wallet.address.slice(0, 5)}…${wallet.address.slice(-4)}` : "Connect wallet"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[.85fr_1.15fr] lg:py-20">
        <section className="pt-3">
          <p className="text-xs font-semibold uppercase tracking-[.25em] text-violet-600">Get paid on Stellar</p>
          <h1 className="mt-5 max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-.05em] sm:text-6xl">Create a payment request in one minute.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-600">Connect your wallet, enter what you are requesting, and share the generated link. Your request is stored on-chain.</p>
          <div className="mt-9 space-y-4 text-sm text-slate-600">
            {["Connect your Stellar wallet", "Save the request on the contract", "Send the link and receive payment"].map((item, index) => (
              <div key={item} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">{index + 1}</span>{item}</div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,.08)] sm:p-9">
          {!wallet.connected ? (
            <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Wallet className="h-7 w-7" /></span>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight">Start with your wallet</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Your connected wallet becomes the address that receives the payment.</p>
              <button onClick={handleConnect} className="mt-7 rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-700">Connect wallet</button>
              {status ? <p className="mt-4 text-sm text-rose-600">{status}</p> : null}
            </div>
          ) : shareLink ? (
            <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-8 w-8" /></span>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">Your link is ready</h2>
              <p className="mt-2 text-sm text-slate-500">Send this link to the person who needs to pay you.</p>
              <div className="mt-7 flex w-full max-w-lg items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 pl-4">
                <span className="min-w-0 flex-1 truncate text-left font-mono text-xs text-slate-600">{shareLink}</span>
                <button onClick={copyLink} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy"}</button>
              </div>
              <button onClick={() => { setShareLink(""); setDraft({ ...initialDraft, recipient: wallet.address }); setStatus(""); }} className="mt-6 text-sm font-medium text-violet-700">Create another request</button>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-600">New request</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">What are you requesting?</h2>
              <div className="mt-8 grid gap-5">
                <label className="grid gap-2 text-sm font-medium">Receiving wallet<input readOnly value={draft.recipient} className="bg-slate-100 font-mono text-xs text-slate-500" /></label>
                <div className="grid gap-5 sm:grid-cols-[1fr_150px]">
                  <label className="grid gap-2 text-sm font-medium">Amount<input inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="250.00" /></label>
                  <label className="grid gap-2 text-sm font-medium">Asset<input readOnly value="XLM" className="bg-slate-100 text-slate-500" /></label>
                </div>
                <label className="grid gap-2 text-sm font-medium">Request title<input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Website design" maxLength={64} /></label>
                <label className="grid gap-2 text-sm font-medium">Description <span className="font-normal text-slate-400">(optional)</span><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What is this payment for?" maxLength={512} /></label>
                <label className="grid gap-2 text-sm font-medium">Memo <span className="font-normal text-slate-400">(optional)</span><input value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} placeholder="Invoice-001" maxLength={28} /></label>
              </div>
              {status ? <p className={`mt-5 text-sm ${status.includes("Saving") ? "text-slate-500" : "text-rose-600"}`}>{status}</p> : null}
              <button disabled={saving} onClick={handleCreate} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? "Saving on-chain…" : "Create payment link"}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
