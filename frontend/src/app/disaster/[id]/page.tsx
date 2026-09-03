"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getDisasterEvent, triggerDisasterPayouts } from "@/api/disasters";
import { ApiError } from "@/api/client";
import { EventStepper } from "@/components/EventStepper";
import { useAuth } from "@/hooks/useAuth";
import type { DisasterEvent } from "@/types/models";

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DisasterDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const isStaff = user?.role === "INSURER" || user?.role === "ADMIN";
  const [event, setEvent] = useState<Load<DisasterEvent>>({ status: "loading" });
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const load = useCallback(() => {
    getDisasterEvent(params.id)
      .then((data) => setEvent({ status: "ready", data }))
      .catch((err) => setEvent({ status: "error", message: err instanceof ApiError ? err.message : "Failed to load event." }));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (event.status === "loading") return <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted">Loading…</div>;
  if (event.status === "error") return <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-red-600">{event.message}</div>;

  const ev = event.data;
  const payouts = ev.payouts ?? [];

  const trigger = () => {
    setTriggering(true);
    setTriggerError(null);
    triggerDisasterPayouts(ev.id)
      .then(load)
      .catch((err) => setTriggerError(err instanceof ApiError ? err.message : "Trigger failed."))
      .finally(() => setTriggering(false));
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-8 sm:max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {ev.type} · {ev.location}
      </h1>
      <p className="mb-6 text-sm text-muted">{formatDate(ev.createdAt)}</p>

      <section className="mb-6 rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          Simulated measurement <span className="font-medium text-foreground">{ev.measurement}</span> vs threshold{" "}
          <span className="font-medium text-foreground">{ev.threshold}</span> · secondary confirmation{" "}
          {ev.secondaryConfirmation ? "yes" : "no"}
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Status</h2>
        <EventStepper event={ev} />
        {ev.verified && payouts.length === 0 && (
          <p className="mt-2 text-sm text-muted">
            Affected policies are shown here once payouts are triggered.
          </p>
        )}
        {ev.verified && payouts.length === 0 && isStaff && (
          <button
            onClick={trigger}
            disabled={triggering}
            className="mt-3 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {triggering ? "Triggering…" : "Trigger payouts"}
          </button>
        )}
        {triggerError && <p className="mt-2 text-sm text-red-600">{triggerError}</p>}
      </section>

      {payouts.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">Payouts ({payouts.length})</h2>
          <ul className="flex flex-col gap-3">
            {payouts.map((p) => (
              <li key={p.id} className="rounded-xl border border-border px-4 py-3 text-sm">
                <p className="font-medium">
                  ₹{p.amount.toLocaleString("en-IN")} — {p.status}
                </p>
                {p.stellarTransactionHash && (
                  <p className="mt-1 break-all font-mono text-xs text-muted">{p.stellarTransactionHash}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
