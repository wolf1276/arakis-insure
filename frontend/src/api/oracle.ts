import { apiRequest } from "./client";
import type { VerificationSource } from "@/types/models";

export function runOracleVerification(claimId: string) {
  return apiRequest<{
    results: { source: VerificationSource; verified: boolean; referenceHash: string; metadata: Record<string, unknown> }[];
    verifiedCount: number;
    passed: boolean;
  }>(`/api/oracle/verify/${claimId}`, { method: "POST" });
}

export function createAttestation(claimId: string) {
  return apiRequest<{ hash: string; signature: string; publicKey: string; timestamp: string }>(`/api/oracle/attest/${claimId}`, {
    method: "POST",
  });
}

export function verifyAttestation(claimId: string) {
  return apiRequest<{ valid: boolean; hash: string; publicKey: string }>(`/api/oracle/attestation/${claimId}`);
}
