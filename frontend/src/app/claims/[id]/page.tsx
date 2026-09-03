"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getClaim } from "@/api/claims";
import * as claimsApi from "@/api/claims";
import * as oracleApi from "@/api/oracle";
import { ApiError } from "@/api/client";
import { ClaimTimeline } from "@/components/ClaimTimeline";
import type { Claim, PayoutType } from "@/types/models";

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StaffActions({ claim, onChanged }: { claim: Claim; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<number>(claim.advanceAmount ?? 0);
  const [finalAmount, setFinalAmount] = useState<number>(claim.finalAmount ?? 0);

  useEffect(() => {
    setAdvanceAmount(claim.advanceAmount ?? 0);
    setFinalAmount(claim.finalAmount ?? 0);
  }, [claim.advanceAmount, claim.finalAmount]);

  const run = (name: string, fn: () => Promise<unknown>) => {
    setBusy(name);
    setError(null);
    fn()
      .then(() => {
        setBusy(null);
        onChanged();
      })
      .catch((err) => {
        setBusy(null);
        setError(err instanceof ApiError ? `${err.code}: ${err.message}` : "Action failed.");
      });
  };

  const btn = "rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-brand-soft disabled:opacity-50";

  return (
    <section className="mt-8 rounded-2xl border border-accent/40 bg-brand-soft/40 p-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-accent">Staff actions</p>
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={!!busy} onClick={() => run("start-verification", () => claimsApi.startVerification(claim.id))}>
          {busy === "start-verification" ? "…" : "Start Verification"}
        </button>
        <button className={btn} disabled={!!busy} onClick={() => run("oracle-verify", () => oracleApi.runOracleVerification(claim.id))}>
          {busy === "oracle-verify" ? "…" : "Run Oracle Verification"}
        </button>
        <button className={btn} disabled={!!busy} onClick={() => run("attest", () => oracleApi.createAttestation(claim.id))}>
          {busy === "attest" ? "…" : "Attest"}
        </button>
        <button className={btn} disabled={!!busy} onClick={() => run("authorize-advance", () => claimsApi.authorizeAdvance(claim.id))}>
          {busy === "authorize-advance" ? "…" : "Authorize Advance"}
        </button>
        <button className={btn} disabled={!!busy} onClick={() => run("approve", () => claimsApi.approveClaim(claim.id))}>
          {busy === "approve" ? "…" : "Approve"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium">
          Advance amount
          <input
            type="number"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(Number(e.target.value))}
            className="mt-1 block w-32 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </label>
        <button
          className={btn}
          disabled={!!busy}
          onClick={() => run("payout-advance", () => claimsApi.createPayout(claim.id, "ADVANCE" as PayoutType, advanceAmount))}
        >
          {busy === "payout-advance" ? "…" : "Create Advance Payout"}
        </button>

        <label className="text-xs font-medium">
          Final amount
          <input
            type="number"
            value={finalAmount}
            onChange={(e) => setFinalAmount(Number(e.target.value))}
            className="mt-1 block w-32 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </label>
        <button
          className={btn}
          disabled={!!busy}
          onClick={() => run("payout-final", () => claimsApi.createPayout(claim.id, "FINAL" as PayoutType, finalAmount))}
        >
          {busy === "payout-final" ? "…" : "Create Final Payout"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}

export default function ClaimDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, ready } = useAuth();
  const [claim, setClaim] = useState<Load<Claim>>({ status: "loading" });

  const load = useCallback(() => {
    setClaim({ status: "loading" });
    getClaim(params.id)
      .then((data) => setClaim({ status: "ready", data }))
      .catch((err) => setClaim({ status: "error", message: err instanceof ApiError ? `${err.code}: ${err.message}` : "Failed to load claim." }));
  }, [params.id]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!ready) return null;
  if (!user) return <p className="mx-auto max-w-md px-4 py-24 text-center text-muted">Log in to view this claim.</p>;
  if (claim.status === "loading") return <p className="mx-auto max-w-md px-4 py-24 text-center text-muted">Loading claim…</p>;
  if (claim.status === "error") return <p className="mx-auto max-w-md px-4 py-24 text-center text-red-600">{claim.message}</p>;

  const c = claim.data;
  const isStaff = user.role === "INSURER" || user.role === "ADMIN" || user.role === "ORACLE";

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-8 sm:max-w-2xl">
      <p className="text-sm text-muted">Claim</p>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{c.claimNumber}</h1>
      <p className="mb-6 text-sm text-muted">{c.type} · Submitted {formatDate(c.createdAt)}</p>

      <div className="mb-8 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-muted">Requested</p>
          <p className="text-sm font-semibold">{formatINR(c.requestedAmount)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-muted">Advance</p>
          <p className="text-sm font-semibold">{c.advanceAmount != null ? formatINR(c.advanceAmount) : "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-muted">Final</p>
          <p className="text-sm font-semibold">{c.finalAmount != null ? formatINR(c.finalAmount) : "—"}</p>
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Status</h2>
        <ClaimTimeline status={c.status} />
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Oracle verification</h2>
        {(!c.verifications || c.verifications.length === 0) && <p className="text-sm text-muted">No verification records yet.</p>}
        {c.verifications && c.verifications.length > 0 && (
          <ul className="flex flex-col gap-2">
            {c.verifications.map((v) => (
              <li key={v.id} className="flex items-center justify-between text-sm">
                <span>{v.source.replace(/_/g, " ")}</span>
                <span className={v.verified ? "font-medium text-brand" : "font-medium text-red-600"}>
                  {v.verified ? "Verified" : "Not verified"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Payouts</h2>
        {(!c.payouts || c.payouts.length === 0) && <p className="text-sm text-muted">No payouts yet.</p>}
        {c.payouts && c.payouts.length > 0 && (
          <ul className="flex flex-col gap-4">
            {c.payouts.map((p) => (
              <li key={p.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.type} · {formatINR(p.amount)}</span>
                  <span className="rounded-full bg-border/60 px-2.5 py-0.5 text-xs font-medium">{p.status}</span>
                </div>
                {p.stellarTransactionHash && (
                  <p className="mt-1 break-all font-mono text-xs text-muted">Stellar tx: {p.stellarTransactionHash}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isStaff && <StaffActions claim={c} onChanged={load} />}
    </div>
  );
}
