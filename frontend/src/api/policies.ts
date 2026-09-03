import { apiRequest } from "./client";
import type { Policy } from "@/types/models";

export function createPolicy(input: {
  userId: string;
  nomineeId?: string;
  coverageAmount: number;
  premium: number;
  disasterCoverage?: boolean;
  accidentCoverage?: boolean;
  deathCoverage?: boolean;
  startDate: string;
  endDate: string;
}) {
  return apiRequest<Policy>("/api/policies", { method: "POST", body: input });
}

export function getPolicy(id: string) {
  return apiRequest<Policy>(`/api/policies/${id}`);
}

export function activatePolicy(id: string) {
  return apiRequest<Policy>(`/api/policies/${id}/activate`, { method: "POST" });
}
