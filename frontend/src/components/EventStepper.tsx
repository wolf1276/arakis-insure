import type { DisasterEvent } from "@/types/models";

const STAGES = ["Event", "Threshold breached", "Verified", "Eligible policies", "Payout authorized", "Settlement"];

export function EventStepper({ event }: { event: DisasterEvent }) {
  const breached = event.measurement > event.threshold;
  const payouts = event.payouts ?? [];
  const settled = payouts.filter((p) => p.status === "CONFIRMED").length;

  let currentIndex = 0;
  if (breached) currentIndex = 1;
  if (event.verified) currentIndex = 2;
  if (event.verified && payouts.length > 0) currentIndex = 3;
  if (event.verified && payouts.length > 0) currentIndex = 4;
  if (event.verified && settled > 0) currentIndex = 5;

  return (
    <ol className="flex flex-col gap-0">
      {STAGES.map((label, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 shrink-0 rounded-full ${done || active ? "bg-brand" : "bg-border"} ${
                  active ? "ring-4 ring-brand-soft" : ""
                }`}
              />
              {i < STAGES.length - 1 && (
                <div className={`w-px flex-1 ${done ? "bg-brand" : "bg-border"}`} style={{ minHeight: 20 }} />
              )}
            </div>
            <p className={`pb-5 text-sm ${active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted"}`}>
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
