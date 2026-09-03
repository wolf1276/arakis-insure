"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getStats, getClaimsSummary, getPayoutsSummary } from "@/api/dashboard";
import { getTreasuryBalance, listFundingTransactions } from "@/api/funding";
import { ApiError } from "@/api/client";
import type { Claim, Payout, DashboardStats, TreasuryBalance, FundingTransaction } from "@/types/models";

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

const CLAIM_STATUSES = [
  "SUBMITTED",
  "VERIFYING",
  "PRELIMINARILY_VERIFIED",
  "ADVANCE_ELIGIBLE",
  "ADVANCE_PAID",
  "FULL_VERIFICATION",
  "APPROVED",
  "REJECTED",
  "FRAUD",
  "FINAL_PAID",
];
const CLAIM_TYPES = ["ACCIDENT", "DEATH", "FLOOD", "DROUGHT"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function errMessage(err: unknown) {
  return err instanceof ApiError ? err.message : "Something went wrong.";
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatsPanel() {
  const [state, setState] = useState<Load<DashboardStats>>({ status: "loading" });

  useEffect(() => {
    getStats()
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => setState({ status: "error", message: errMessage(err) }));
  }, []);

  if (state.status === "loading") return <p className="text-sm text-muted">Loading KPIs…</p>;
  if (state.status === "error") return <p className="text-sm text-red-600">{state.message}</p>;

  const { claims, payouts, disasters, policies } = state.data;
  const activePolicies = policies.byStatus["ACTIVE"] ?? 0;
  const totalPolicies = Object.values(policies.byStatus).reduce((a, b) => a + b, 0);
  const pendingVerification =
    (claims.byStatus["SUBMITTED"] ?? 0) + (claims.byStatus["VERIFYING"] ?? 0) + (claims.byStatus["FULL_VERIFICATION"] ?? 0);
  const totalClaims = Object.values(claims.byStatus).reduce((a, b) => a + b, 0);

  return (
    <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Active policies" value={`${activePolicies} / ${totalPolicies}`} />
      <StatTile label="Total claims" value={totalClaims} />
      <StatTile label="Pending verification" value={pendingVerification} />
      <StatTile label="Payouts paid" value={payouts.byStatus["CONFIRMED"] ?? 0} />
      <StatTile label="Total paid" value={payouts.totalPaid.toLocaleString("en-IN")} />
      <StatTile label="Disaster events" value={`${disasters.verified} / ${disasters.total}`} />
    </section>
  );
}

function ClaimsTable() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [state, setState] = useState<Load<Claim[]>>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
    getClaimsSummary({ status: status || undefined, type: type || undefined })
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => setState({ status: "error", message: errMessage(err) }));
  }, [status, type]);

  return (
    <section className="mb-8 rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Claims</h2>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1 text-sm">
            <option value="">All statuses</option>
            {CLAIM_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1 text-sm">
            <option value="">All types</option>
            {CLAIM_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      {state.status === "loading" && <p className="text-sm text-muted">Loading claims…</p>}
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      {state.status === "ready" && state.data.length === 0 && <p className="text-sm text-muted">No claims match this filter.</p>}
      {state.status === "ready" && state.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Claim</th>
                <th className="py-2 pr-4">Policy</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Requested</th>
                <th className="py-2 pr-4">Final</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((c) => (
                <tr key={c.id} className="border-b border-line/60">
                  <td className="py-2 pr-4">
                    <Link href={`/claims/${c.id}`} className="font-medium text-brand hover:underline">{c.claimNumber}</Link>
                  </td>
                  <td className="py-2 pr-4 text-muted">{c.policy?.policyNumber ?? "—"}</td>
                  <td className="py-2 pr-4">{c.type}</td>
                  <td className="py-2 pr-4">{c.requestedAmount.toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-4">{c.finalAmount != null ? c.finalAmount.toLocaleString("en-IN") : "—"}</td>
                  <td className="py-2 pr-4">{c.status}</td>
                  <td className="py-2 pr-4 text-muted">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Per-claim oracle verification and attestation detail is available on each claim&apos;s page — there is no
        aggregate oracle status endpoint yet.
      </p>
    </section>
  );
}

function PayoutsAndAuditTable() {
  const [state, setState] = useState<Load<Payout[]>>({ status: "loading" });

  useEffect(() => {
    getPayoutsSummary()
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => setState({ status: "error", message: errMessage(err) }));
  }, []);

  return (
    <section className="mb-8 rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-lg font-semibold">Payouts &amp; Stellar audit trail</h2>
      {state.status === "loading" && <p className="text-sm text-muted">Loading payouts…</p>}
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      {state.status === "ready" && state.data.length === 0 && <p className="text-sm text-muted">No payouts recorded yet.</p>}
      {state.status === "ready" && state.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Stellar transaction</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((p) => (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="py-2 pr-4">
                    {p.claimId ? (
                      <Link href={`/claims/${p.claimId}`} className="font-medium text-brand hover:underline">{p.claimId.slice(0, 10)}…</Link>
                    ) : (
                      <span className="text-muted">{p.id.slice(0, 10)}…</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{p.type}</td>
                  <td className="py-2 pr-4">{p.amount.toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-4">
                    {p.status === "CONFIRMED" ? (
                      <span className="text-green-700">Stellar transaction confirmed</span>
                    ) : (
                      p.status
                    )}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted">
                    {p.stellarTransactionHash ? `${p.stellarTransactionHash.slice(0, 14)}…` : "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TreasuryPanel() {
  const [balance, setBalance] = useState<Load<TreasuryBalance>>({ status: "loading" });
  const [txns, setTxns] = useState<Load<FundingTransaction[]>>({ status: "loading" });

  useEffect(() => {
    getTreasuryBalance()
      .then((data) => setBalance({ status: "ready", data }))
      .catch((err) => setBalance({ status: "error", message: errMessage(err) }));
    listFundingTransactions()
      .then((data) => setTxns({ status: "ready", data }))
      .catch((err) => setTxns({ status: "error", message: errMessage(err) }));
  }, []);

  return (
    <section className="mb-8 rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Treasury</h2>
      {balance.status === "loading" && <p className="text-sm text-muted">Loading treasury balance…</p>}
      {balance.status === "error" && <p className="text-sm text-red-600">{balance.message}</p>}
      {balance.status === "ready" && (
        <div className="mb-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Available</p>
            <p className="text-xl font-semibold">{balance.data.available.toLocaleString("en-IN")} {balance.data.asset}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Reserved</p>
            <p className="text-xl font-semibold">{balance.data.reserved.toLocaleString("en-IN")} {balance.data.asset}</p>
          </div>
          <p className="max-w-xs self-end text-xs text-muted">
            Funding provider balance, not a persistent treasury ledger — resets with the funding provider.
          </p>
        </div>
      )}
      {txns.status === "ready" && txns.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Payout</th>
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {txns.data.map((t) => (
                <tr key={t.id} className="border-b border-line/60">
                  <td className="py-2 pr-4 font-mono text-xs">{t.payoutId.slice(0, 10)}…</td>
                  <td className="py-2 pr-4">{t.provider}</td>
                  <td className="py-2 pr-4">{t.status}</td>
                  <td className="py-2 pr-4 text-muted">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function OperationsPage() {
  const { user, ready } = useAuth();

  if (!ready) return <main className="p-6 text-sm text-muted">Loading…</main>;

  const isStaff = user && (user.role === "INSURER" || user.role === "ADMIN" || user.role === "ORACLE");

  if (!isStaff) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Operations access requires a staff account</h1>
        <p className="mb-6 text-sm text-muted">Sign in with an insurer, admin, or oracle role to view this dashboard.</p>
        <Link href="/login" className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white">Sign in</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8" style={{ minWidth: 0 }}>
      <h1 className="mb-1 text-2xl font-semibold">Operations</h1>
      <p className="mb-6 text-sm text-muted">Claims, payouts, treasury, and Stellar settlement across SurakshChain.</p>
      <StatsPanel />
      <ClaimsTable />
      <PayoutsAndAuditTable />
      <TreasuryPanel />
    </main>
  );
}
