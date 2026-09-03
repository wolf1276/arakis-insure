import { apiRequest } from "./client";
import type { DisasterType } from "@/types/models";

export function runDemoAccident() {
  return apiRequest<{
    claimId: string;
    claimNumber: string;
    status: "FINAL_PAID";
    verification: { hospital: boolean; police: boolean; civilRegistry: boolean; passed: boolean };
    advance: { amount: number; status: string; stellarTransactionHash: string };
    finalPayout: { amount: number; status: string; stellarTransactionHash: string };
  }>("/api/demo/accident", { method: "POST", auth: false });
}

export function runDemoFlood() {
  return apiRequest<{
    eventId: string;
    type: DisasterType;
    measurement: number;
    threshold: number;
    verified: boolean;
    policiesAffected: number;
    payoutsExecuted: number;
    transactions: { payoutId: string; stellarTransactionHash: string }[];
  }>("/api/demo/flood", { method: "POST", auth: false });
}
