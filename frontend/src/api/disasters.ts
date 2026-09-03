import { apiRequest } from "./client";
import type { DisasterEvent, DisasterType } from "@/types/models";

export function simulateDisaster(input: {
  type: DisasterType;
  location: string;
  measurement: number;
  threshold: number;
  secondaryConfirmation: boolean;
}) {
  return apiRequest<DisasterEvent>("/api/disasters/simulate", { method: "POST", body: input });
}

export function triggerDisasterPayouts(eventId: string) {
  return apiRequest<{
    eventId: string;
    type: DisasterType;
    location: string;
    measurement: number;
    threshold: number;
    verified: boolean;
    policiesAffected: number;
    payoutsExecuted: number;
    funded: number;
    stellared: number;
    transactions: { payoutId: string; stellarTransactionHash: string }[];
  }>(`/api/disasters/${eventId}/trigger`, { method: "POST" });
}

export function getDisasterEvent(eventId: string) {
  return apiRequest<DisasterEvent>(`/api/disasters/${eventId}`, { auth: false });
}

export function listDisasterEvents() {
  return apiRequest<DisasterEvent[]>("/api/disasters", { auth: false });
}
