"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getUserPolicies, getUserClaims } from "@/api/users";
import { createClaim } from "@/api/claims";
import { runDemoAccident } from "@/api/demo";
import { ApiError } from "@/api/client";
import type { Policy, Claim, ClaimType } from "@/types/models";

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-full bg-border/60 px-2.5 py-0.5 text-xs font-medium">{status.replace(/_/g, " ")}</span>;
}

function DemoCard() {
  const [state, setState] = useState<Load<Awaited<ReturnType<typeof runDemoAccident>>> | { status: "idle" }>({ status: "idle" });

  const run = () => {
    setState({ status: "loading" });
    runDemoAccident()
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => setState({ status: "error", message: err instanceof ApiError ? err.message : "Demo run failed." }));
  };

  return (
    <section className="mb-8 rounded-2xl border border-dashed border-accent bg-brand-soft p-6">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">Demo · simulated flow</p>
      <h2 className="mb-2 text-lg font-semibold">Run a full accident claim</h2>
      <p className="mb-4 text-sm text-muted">
        Executes the entire lifecycle on the server — verification, advance, and final payout — with real Stellar
        testnet settlement. This is not something a real beneficiary triggers day-to-day.
      </p>
      <button
        onClick={run}
        disabled={state.status === "loading"}
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {state.status === "loading" ? "Running…" : "Run demo: full accident claim"}
      </button>
      {state.status === "error" && <p className="mt-3 text-sm text-red-600">{state.message}</p>}
      {state.status === "ready" && (
        <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
          <p className="font-medium">{state.data.claimNumber} — {state.data.status.replace(/_/g, " ")}</p>
          <p className="mt-1 text-muted">
            Verification: Hospital {state.data.verification.hospital ? "✓" : "✗"} · Police{" "}
            {state.data.verification.police ? "✓" : "✗"} · Civil Registry {state.data.verification.civilRegistry ? "✓" : "✗"}
          </p>
          <p className="mt-1 text-muted">Advance ₹{state.data.advance.amount.toLocaleString("en-IN")} — {state.data.advance.status}</p>
          <p className="break-all font-mono text-xs text-muted">{state.data.advance.stellarTransactionHash}</p>
          <p className="mt-1 text-muted">
            Final ₹{state.data.finalPayout.amount.toLocaleString("en-IN")} — {state.data.finalPayout.status}
          </p>
          <p className="break-all font-mono text-xs text-muted">{state.data.finalPayout.stellarTransactionHash}</p>
          <Link href={`/claims/${state.data.claimId}`} className="mt-3 inline-block text-sm font-semibold text-brand">
            View claim →
          </Link>
        </div>
      )}
    </section>
  );
}

function CreateClaimForm({ policies, defaultType }: { policies: Policy[]; defaultType: ClaimType | null }) {
  const router = useRouter();
  const [type, setType] = useState<ClaimType>(defaultType ?? "ACCIDENT");
  const [policyId, setPolicyId] = useState(policies[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [requestedAmount, setRequestedAmount] = useState<number>(policies[0]?.coverageAmount ?? 0);
  const [state, setState] = useState<{ status: "idle" | "loading" | "error"; message?: string }>({ status: "idle" });

  if (policies.length === 0) {
    return (
      <section className="mb-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-2 text-lg font-semibold">Submit a claim</h2>
        <p className="text-sm text-muted">You need an active policy before you can submit a claim.</p>
      </section>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setState({ status: "loading" });
    createClaim({ policyId, type, description: description || undefined, requestedAmount })
      .then((claim) => router.push(`/claims/${claim.id}`))
      .catch((err) => setState({ status: "error", message: err instanceof ApiError ? err.message : "Could not submit claim." }));
  };

  return (
    <section className="mb-8 rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-4 text-lg font-semibold">Submit a claim</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          {(["ACCIDENT", "DEATH"] as ClaimType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium ${
                type === t ? "border-brand bg-brand-soft text-brand" : "border-border"
              }`}
            >
              {t === "ACCIDENT" ? "Report Accident" : "Report Death"}
            </button>
          ))}
        </div>

        <label className="text-sm font-medium">
          Policy
          <select
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
          >
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.policyNumber} — ₹{p.coverageAmount.toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          What happened
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            placeholder="Brief description"
          />
        </label>

        <label className="text-sm font-medium">
          Requested amount (₹)
          <input
            type="number"
            min={1}
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
          />
        </label>

        {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}

        <button
          type="submit"
          disabled={state.status === "loading"}
          className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {state.status === "loading" ? "Submitting…" : "Submit claim"}
        </button>
      </form>
    </section>
  );
}

export default function ClaimsPage() {
  return (
    <Suspense fallback={null}>
      <ClaimsPageInner />
    </Suspense>
  );
}

function ClaimsPageInner() {
  const { user, ready } = useAuth();
  const searchParams = useSearchParams();
  const newParam = searchParams.get("new");
  const defaultType: ClaimType | null = newParam === "accident" ? "ACCIDENT" : newParam === "death" ? "DEATH" : null;

  const [policies, setPolicies] = useState<Load<Policy[]>>({ status: "loading" });
  const [claims, setClaims] = useState<Load<Claim[]>>({ status: "loading" });

  useEffect(() => {
    if (!user) return;
    getUserPolicies(user.id)
      .then((data) => setPolicies({ status: "ready", data: data.filter((p) => p.status === "ACTIVE") }))
      .catch((err) => setPolicies({ status: "error", message: err instanceof ApiError ? err.message : "Failed to load policies." }));
    getUserClaims(user.id)
      .then((data) => setClaims({ status: "ready", data }))
      .catch((err) => setClaims({ status: "error", message: err instanceof ApiError ? err.message : "Failed to load claims." }));
  }, [user]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-lg text-muted">
          <Link href="/login" className="font-semibold text-brand">
            Log in
          </Link>{" "}
          to submit or track a claim.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-8 sm:max-w-2xl">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Claims</h1>

      <DemoCard />

      {policies.status === "loading" && <p className="mb-8 text-sm text-muted">Loading your policies…</p>}
      {policies.status === "error" && <p className="mb-8 text-sm text-red-600">{policies.message}</p>}
      {policies.status === "ready" && <CreateClaimForm policies={policies.data} defaultType={defaultType} />}

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Your claims</h2>
        {claims.status === "loading" && <p className="text-sm text-muted">Loading…</p>}
        {claims.status === "error" && <p className="text-sm text-red-600">{claims.message}</p>}
        {claims.status === "ready" && claims.data.length === 0 && <p className="text-sm text-muted">No claims yet.</p>}
        {claims.status === "ready" && claims.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {claims.data.map((claim) => (
              <li key={claim.id}>
                <Link
                  href={`/claims/${claim.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 hover:bg-brand-soft"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {claim.claimNumber} · {claim.type}
                    </p>
                    <p className="text-xs text-muted">{formatDate(claim.createdAt)}</p>
                  </div>
                  <StatusPill status={claim.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
