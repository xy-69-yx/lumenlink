"use client";

import { Check, Loader2, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import {
  connectWallet,
  readRequestById,
  requestToDraft,
  submitStellarPayment,
  type RequestDraft,
  type WalletState,
} from "../../lib/lumenlink";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function PaymentPageClient({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const requestId = firstValue(searchParams.id);
  const validRequestId = Boolean(requestId && /^\d+$/.test(requestId));
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [status, setStatus] = useState(validRequestId ? "Loading request from the contract…" : "This payment link is invalid.");
  const [paying, setPaying] = useState(false);
  const [paidHash, setPaidHash] = useState("");

  useEffect(() => {
    if (!validRequestId) return;
    readRequestById(BigInt(requestId)).then((result) => {
      if (!result.ok) throw new Error(result.message);
      if (!result.request.active) throw new Error("This payment request is no longer active.");
      setDraft(requestToDraft(result.request));
      setStatus("");
    }).catch((error) => setStatus(error instanceof Error ? error.message : "Could not load request"));
  }, [requestId, validRequestId]);

  async function connect() {
    try {
      const connected = await connectWallet();
      setWallet(connected);
      setStatus(connected.address === draft?.recipient ? "You cannot pay a request to your own wallet." : "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not connect wallet");
    }
  }

  async function pay() {
    if (!wallet || !draft) return;
    if (wallet.address === draft.recipient) {
      setStatus("You cannot pay a request to your own wallet.");
      return;
    }
    try {
      setPaying(true);
      setStatus("Confirm the payment in your wallet…");
      const result = await submitStellarPayment(wallet.address, draft);
      setPaidHash(result.hash);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-5 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,.08)] sm:p-10">
          <div className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white"><Zap className="h-4 w-4" /></span>LumenLink</div>
          {paidHash ? (
            <div className="py-14 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-8 w-8" /></span><h1 className="mt-6 text-3xl font-semibold">Payment sent</h1><p className="mt-2 text-sm text-slate-500">The Stellar transaction was submitted successfully.</p><a className="mt-6 inline-block text-sm font-medium text-violet-700" href={`https://stellar.expert/explorer/testnet/tx/${paidHash}`} target="_blank" rel="noreferrer">View transaction</a></div>
          ) : draft ? (
            <div className="mt-10">
              <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-600">Payment request #{requestId}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">{draft.label}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">{draft.description || "You received a Stellar payment request."}</p>
              <div className="my-8 rounded-2xl bg-slate-950 p-6 text-white"><p className="text-xs uppercase tracking-[.2em] text-white/45">Amount due</p><p className="mt-2 text-4xl font-semibold tracking-tight">{draft.amount} <span className="text-xl text-white/60">XLM</span></p>{draft.memo ? <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/60">Memo: {draft.memo}</p> : null}</div>
              <p className="break-all text-xs leading-5 text-slate-400">Payment goes to {draft.recipient}</p>
              {!wallet ? <button onClick={connect} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 text-sm font-semibold text-white"><Wallet className="h-4 w-4" />Connect wallet to pay</button> : <button disabled={paying || wallet.address === draft.recipient} onClick={pay} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 text-sm font-semibold text-white disabled:opacity-50">{paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{paying ? "Sending payment…" : `Pay ${draft.amount} XLM`}</button>}
              {status ? <p className="mt-4 text-center text-sm text-rose-600">{status}</p> : null}
            </div>
          ) : <div className="py-20 text-center">{validRequestId ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" /> : null}<p className="mt-4 text-sm text-slate-500">{status}</p></div>}
        </section>
      </div>
    </main>
  );
}
