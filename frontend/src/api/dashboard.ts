import { apiRequest } from "./client";
import type { DashboardStats, Claim, Payout, DisasterEvent, TreasuryBalance } from "@/types/models";

export function getStats() {
  return apiRequest<DashboardStats>("/api/dashboard/stats");
}

export function getClaimsSummary(params?: { status?: string; type?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiRequest<Claim[]>(`/api/dashboard/claims${qs ? `?${qs}` : ""}`);
}

export function getPayoutsSummary(params?: { status?: string; type?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiRequest<Payout[]>(`/api/dashboard/payouts${qs ? `?${qs}` : ""}`);
}

export function getDisastersSummary() {
  return apiRequest<DisasterEvent[]>("/api/dashboard/disasters");
}

export function getTreasurySummary() {
  return apiRequest<TreasuryBalance>("/api/dashboard/treasury");
}
