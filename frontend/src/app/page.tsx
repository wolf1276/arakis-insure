"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserPolicies, getUserClaims } from "@/api/users";
import { ApiError } from "@/api/client";
import type { Policy, Claim } from "@/types/models";

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

function CoverageBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-brand-soft text-brand" : "bg-border/50 text-muted line-through"
      }`}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-full bg-border/60 px-2.5 py-0.5 text-xs font-medium text-foreground">{status.replace(/_/g, " ")}</span>;
}

export default function HomePage() {
  const { user, ready } = useAuth();
  const [policies, setPolicies] = useState<Load<Policy[]>>({ status: "loading" });
  const [claims, setClaims] = useState<Load<Claim[]>>({ status: "loading" });
  const policyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setPolicies({ status: "loading" });
    getUserPolicies(user.id)
      .then((data) => setPolicies({ status: "ready", data }))
      .catch((err) => setPolicies({ status: "error", message: err instanceof ApiError ? err.message : "Failed to load policies." }));

    setClaims({ status: "loading" });
    getUserClaims(user.id)
      .then((data) => setClaims({ status: "ready", data }))
      .catch((err) => setClaims({ status: "error", message: err instanceof ApiError ? err.message : "Failed to load activity." }));
  }, [user]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <h1 className="mb-3 text-4xl font-semibold tracking-tight">SurakshChain</h1>
        <p className="mb-8 text-lg text-muted">Protection that reaches you when it matters.</p>
        <Link href="/login" className="rounded-full bg-brand px-8 py-3 font-medium text-white">
          Log in to view your coverage
        </Link>
      </div>
    );
  }

  const activePolicy = policies.status === "ready" ? policies.data.find((p) => p.status === "ACTIVE") ?? policies.data[0] : undefined;

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-8 sm:max-w-2xl">
      <p className="text-sm text-muted">Welcome back</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{user.name}</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link
          href="/claims?new=accident"
          className="rounded-2xl bg-brand px-4 py-4 text-center text-sm font-semibold text-white"
        >
          Report Accident
        </Link>
        <Link
          href="/claims?new=death"
          className="rounded-2xl border border-border bg-surface px-4 py-4 text-center text-sm font-semibold"
        >
          Report Death
        </Link>
        <button
          onClick={() => policyRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="col-span-2 rounded-2xl border border-border bg-surface px-4 py-4 text-center text-sm font-semibold sm:col-span-1"
        >
          View Protection
        </button>
      </div>

      <section ref={policyRef} className="mb-8 rounded-2xl border border-border bg-surface p-6 scroll-mt-6">
        <h2 className="mb-4 text-lg font-semibold">Your protection</h2>
        {policies.status === "loading" && <p className="text-sm text-muted">Loading policy…</p>}
        {policies.status === "error" && <p className="text-sm text-red-600">{policies.message}</p>}
        {policies.status === "ready" && !activePolicy && (
          <p className="text-sm text-muted">You don&apos;t have an active policy yet.</p>
        )}
        {policies.status === "ready" && activePolicy && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Policy number</p>
                <p className="font-mono text-sm font-medium">{activePolicy.policyNumber}</p>
              </div>
              <StatusPill status={activePolicy.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted">Coverage</p>
                <p className="text-xl font-semibold">{formatINR(activePolicy.coverageAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Premium</p>
                <p className="text-xl font-semibold">{formatINR(activePolicy.premium)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <CoverageBadge label="Accident" active={activePolicy.accidentCoverage} />
              <CoverageBadge label="Death" active={activePolicy.deathCoverage} />
              <CoverageBadge label="Disaster" active={activePolicy.disasterCoverage} />
            </div>
            <p className="text-xs text-muted">
              {formatDate(activePolicy.startDate)} – {formatDate(activePolicy.endDate)}
            </p>
            {activePolicy.nominee && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted">Nominee</p>
                <p className="text-sm font-medium">
                  {activePolicy.nominee.name} · {activePolicy.nominee.relationship}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mb-10 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
        {claims.status === "loading" && <p className="text-sm text-muted">Loading activity…</p>}
        {claims.status === "error" && <p className="text-sm text-red-600">{claims.message}</p>}
        {claims.status === "ready" && claims.data.length === 0 && (
          <p className="text-sm text-muted">No claims yet.</p>
        )}
        {claims.status === "ready" && claims.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {claims.data.slice(0, 5).map((claim) => (
              <li key={claim.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {claim.claimNumber} · {claim.type}
                  </p>
                  <p className="text-xs text-muted">{formatDate(claim.createdAt)}</p>
                </div>
                <StatusPill status={claim.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-brand-soft p-6 text-sm">
        <p className="mb-2 font-semibold text-brand">Insurance without needing a smartphone</p>
        <p className="mb-4 text-muted">IVR · SMS · USSD</p>
        <p className="mb-2 font-semibold text-brand">Need internet</p>
        <p className="text-muted">WhatsApp · PWA</p>
      </section>
    </div>
  );
}
