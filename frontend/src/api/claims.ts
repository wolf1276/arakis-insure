import { apiRequest } from "./client";
import type { Claim, ClaimType, Verification, VerificationSource, Payout, PayoutType } from "@/types/models";

export function createClaim(input: { policyId: string; type: ClaimType; description?: string; requestedAmount: number }) {
  return apiRequest<Claim>("/api/claims", { method: "POST", body: input });
}

export function listClaims(params?: { status?: string; type?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiRequest<Claim[]>(`/api/claims${qs ? `?${qs}` : ""}`);
}

export function getClaim(id: string) {
  return apiRequest<Claim>(`/api/claims/${id}`);
}

export function startVerification(id: string) {
  return apiRequest<Claim>(`/api/claims/${id}/start-verification`, { method: "POST" });
}

export function recordVerification(id: string, source: VerificationSource, verified: boolean, metadata?: Record<string, unknown>) {
  return apiRequest<Verification>(`/api/claims/${id}/verify`, { method: "POST", body: { source, verified, metadata } });
}

export function evaluateVerification(id: string) {
  return apiRequest<Claim>(`/api/claims/${id}/evaluate`, { method: "POST" });
}

export function authorizeAdvance(id: string) {
  return apiRequest<{ claimId: string; advanceAmount: number; advancePercent: number }>(`/api/claims/${id}/authorize-advance`, {
    method: "POST",
  });
}

export function approveClaim(id: string) {
  return apiRequest<Claim>(`/api/claims/${id}/approve`, { method: "POST" });
}

export function createPayout(id: string, type: PayoutType, amount: number) {
  return apiRequest<Payout>(`/api/claims/${id}/payout`, { method: "POST", body: { type, amount } });
}

export function getClaimVerifications(id: string) {
  return apiRequest<Verification[]>(`/api/claims/${id}/verifications`);
}
