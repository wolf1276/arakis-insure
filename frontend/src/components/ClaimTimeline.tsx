import type { ClaimStatus } from "@/types/models";

const STAGES: { status: ClaimStatus; label: string }[] = [
  { status: "SUBMITTED", label: "Submitted" },
  { status: "VERIFYING", label: "Verifying" },
  { status: "PRELIMINARILY_VERIFIED", label: "2/3 Verified" },
  { status: "ADVANCE_ELIGIBLE", label: "Advance Eligible" },
  { status: "ADVANCE_PAID", label: "Advance Paid" },
  { status: "FULL_VERIFICATION", label: "Final Verification" },
  { status: "APPROVED", label: "Approved" },
  { status: "FINAL_PAID", label: "Final Payout" },
];

const TERMINAL_BAD: ClaimStatus[] = ["REJECTED", "FRAUD"];

export function ClaimTimeline({ status }: { status: ClaimStatus }) {
  if (TERMINAL_BAD.includes(status)) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        Claim {status === "FRAUD" ? "flagged for fraud" : "rejected"}
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.status === status);

  return (
    <ol className="flex flex-col gap-0">
      {STAGES.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={stage.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 shrink-0 rounded-full ${
                  done || active ? "bg-brand" : "bg-border"
                } ${active ? "ring-4 ring-brand-soft" : ""}`}
              />
              {i < STAGES.length - 1 && (
                <div className={`w-px flex-1 ${done ? "bg-brand" : "bg-border"}`} style={{ minHeight: 20 }} />
              )}
            </div>
            <p className={`pb-5 text-sm ${active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted"}`}>
              {stage.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
