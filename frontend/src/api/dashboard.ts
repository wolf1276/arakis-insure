import { apiRequest, buildQuery } from "./client";
import type { DashboardStats, Claim, Payout, DisasterEvent, TreasuryBalance } from "@/types/models";

export function getStats() {
  return apiRequest<DashboardStats>("/api/dashboard/stats");
}

export function getClaimsSummary(params?: { status?: string; type?: string }) {
  return apiRequest<Claim[]>(`/api/dashboard/claims${buildQuery(params)}`);
}

export function getPayoutsSummary(params?: { status?: string; type?: string }) {
  return apiRequest<Payout[]>(`/api/dashboard/payouts${buildQuery(params)}`);
}

export function getDisastersSummary() {
  return apiRequest<DisasterEvent[]>("/api/dashboard/disasters");
}

export function getTreasurySummary() {
  return apiRequest<TreasuryBalance>("/api/dashboard/treasury");
}
