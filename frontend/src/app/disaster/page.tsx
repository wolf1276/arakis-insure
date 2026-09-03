"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { simulateDisaster, triggerDisasterPayouts, listDisasterEvents } from "@/api/disasters";
import { runDemoFlood } from "@/api/demo";
import { ApiError } from "@/api/client";
import type { DisasterEvent, DisasterType } from "@/types/models";
import { EventStepper } from "@/components/EventStepper";

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

const DISASTER_TYPES: DisasterType[] = ["FLOOD", "DROUGHT", "CYCLONE", "EARTHQUAKE"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function DemoFloodCard() {
  const [state, setState] = useState<Load<Awaited<ReturnType<typeof runDemoFlood>>> | { status: "idle" }>({ status: "idle" });

  const run = () => {
    setState({ status: "loading" });
    runDemoFlood()
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => setState({ status: "error", message: err instanceof ApiError ? err.message : "Demo run failed." }));
  };

  return (
    <section className="mb-8 rounded-2xl border border-dashed border-accent bg-brand-soft p-6">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">Demo · simulated flood</p>
      <h2 className="mb-2 text-lg font-semibold">Simulate a flood event</h2>
      <p className="mb-4 text-sm text-muted">
        Runs a deterministic flood event (Village-A, simulated measurement 412 vs. threshold 350) through the real
        parametric payout flow — eligible policies are paid and settled on Stellar testnet.
      </p>
      <button
        onClick={run}
        disabled={state.status === "loading"}
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {state.status === "loading" ? "Running…" : "Simulate flood event"}
      </button>
      {state.status === "error" && <p className="mt-3 text-sm text-red-600">{state.message}</p>}
      {state.status === "ready" && (
        <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
          <p className="font-medium">
            {state.data.type} at Village-A · measurement {state.data.measurement} vs threshold {state.data.threshold} ·{" "}
            {state.data.verified ? "verified" : "not verified"}
          </p>
          <p className="mt-1 text-muted">
            Policies affected: {state.data.policiesAffected} · Payouts executed: {state.data.payoutsExecuted}
          </p>
          {state.data.transactions.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {state.data.transactions.map((tx) => (
                <li key={tx.payoutId} className="break-all font-mono text-xs text-muted">
                  {tx.payoutId}: {tx.stellarTransactionHash}
                </li>
              ))}
            </ul>
          )}
          <Link href={`/disaster/${state.data.eventId}`} className="mt-3 inline-block text-sm font-semibold text-brand">
            View event →
          </Link>
        </div>
      )}
    </section>
  );
}

function ManualSimulateForm({ isStaff }: { isStaff: boolean }) {
  const [type, setType] = useState<DisasterType>("FLOOD");
  const [location, setLocation] = useState("");
  const [measurement, setMeasurement] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(0);
  const [secondaryConfirmation, setSecondaryConfirmation] = useState(false);
  const [event, setEvent] = useState<DisasterEvent | { verified: false; reason: string } | null>(null);
  const [triggerResult, setTriggerResult] = useState<Awaited<ReturnType<typeof triggerDisasterPayouts>> | null>(null);
  const [state, setState] = useState<{ status: "idle" | "loading" | "error"; message?: string }>({ status: "idle" });
  const [triggering, setTriggering] = useState(false);

  if (!isStaff) {
    return (
      <section className="mb-8 rounded-2xl border border-border bg-surface p-6 opacity-70">
        <h2 className="mb-2 text-lg font-semibold">Manual disaster simulation</h2>
        <p className="text-sm text-muted">
          Staff-only. Log in with an insurer/admin account to feed a simulated measurement and trigger payouts.
        </p>
      </section>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setState({ status: "loading" });
    setEvent(null);
    setTriggerResult(null);
    simulateDisaster({ type, location, measurement, threshold, secondaryConfirmation })
      .then((data) => {
        setEvent(data);
        setState({ status: "idle" });
      })
      .catch((err) => setState({ status: "error", message: err instanceof ApiError ? err.message : "Simulation failed." }));
  };

  const trigger = () => {
    if (!event || !("id" in event)) return;
    setTriggering(true);
    triggerDisasterPayouts(event.id)
      .then(setTriggerResult)
      .catch((err) => setState({ status: "error", message: err instanceof ApiError ? err.message : "Trigger failed." }))
      .finally(() => setTriggering(false));
  };

  return (
    <section className="mb-8 rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-1 text-lg font-semibold">Manual disaster simulation</h2>
      <p className="mb-4 text-sm text-muted">
        Measurement and threshold are simulated demo sensor input, not live weather or government data.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="text-sm font-medium">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DisasterType)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
          >
            {DISASTER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            placeholder="e.g. Village-B"
          />
        </label>
        <div className="flex gap-4">
          <label className="flex-1 text-sm font-medium">
            Measurement
            <input
              type="number"
              value={measurement}
              onChange={(e) => setMeasurement(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            />
          </label>
          <label className="flex-1 text-sm font-medium">
            Threshold
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={secondaryConfirmation}
            onChange={(e) => setSecondaryConfirmation(e.target.checked)}
          />
          Secondary source confirms
        </label>

        {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}

        <button
          type="submit"
          disabled={state.status === "loading"}
          className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {state.status === "loading" ? "Simulating…" : "Simulate event"}
        </button>
      </form>

      {event && (
        <div className="mt-4 rounded-xl bg-brand-soft p-4 text-sm">
          {"id" in event ? (
            <>
              <p className="font-medium">
                {event.type} at {event.location} — {event.verified ? "verified" : "not verified"}
              </p>
              {event.verified && !triggerResult && (
                <button
                  onClick={trigger}
                  disabled={triggering}
                  className="mt-3 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {triggering ? "Triggering…" : "Trigger payouts"}
                </button>
              )}
              {triggerResult && (
                <div className="mt-3">
                  <p>
                    Policies affected: {triggerResult.policiesAffected} · Payouts executed:{" "}
                    {triggerResult.payoutsExecuted} · Funded: {triggerResult.funded} · Settled: {triggerResult.stellared}
                  </p>
                  <Link href={`/disaster/${event.id}`} className="mt-2 inline-block font-semibold text-brand">
                    View event →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p>Not verified: {event.reason}</p>
          )}
        </div>
      )}
    </section>
  );
}

function EventHistory() {
  const [events, setEvents] = useState<Load<DisasterEvent[]>>({ status: "loading" });

  useEffect(() => {
    listDisasterEvents()
      .then((data) => setEvents({ status: "ready", data }))
      .catch((err) => setEvents({ status: "error", message: err instanceof ApiError ? err.message : "Failed to load events." }));
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-4 text-lg font-semibold">Event history</h2>
      {events.status === "loading" && <p className="text-sm text-muted">Loading…</p>}
      {events.status === "error" && <p className="text-sm text-red-600">{events.message}</p>}
      {events.status === "ready" && events.data.length === 0 && <p className="text-sm text-muted">No disaster events yet.</p>}
      {events.status === "ready" && events.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {events.data.map((ev) => (
            <li key={ev.id}>
              <Link
                href={`/disaster/${ev.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 hover:bg-brand-soft"
              >
                <div>
                  <p className="text-sm font-medium">
                    {ev.type} · {ev.location}
                  </p>
                  <p className="text-xs text-muted">
                    {ev.measurement} vs {ev.threshold} · {formatDate(ev.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-border/60 px-2.5 py-0.5 text-xs font-medium">
                  {ev.verified ? "Verified" : "Not verified"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DisasterPage() {
  const { user } = useAuth();
  const isStaff = user?.role === "INSURER" || user?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-8 sm:max-w-2xl">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Disaster</h1>
      <p className="mb-6 text-sm text-muted">
        Parametric coverage: when a verified event crosses a threshold, eligible policies are paid automatically —
        no individual claim required.
      </p>

      <DemoFloodCard />
      <ManualSimulateForm isStaff={isStaff} />
      <EventHistory />
    </div>
  );
}
