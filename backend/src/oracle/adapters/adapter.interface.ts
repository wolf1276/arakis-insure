export interface VerificationRequest {
  claimId: string;
  claimType: string;
  userId: string;
  policyId: string;
}

export interface VerificationResult {
  source: 'HOSPITAL' | 'POLICE' | 'CIVIL_REGISTRY';
  verified: boolean;
  referenceHash?: string;
  metadata?: Record<string, unknown>;
}

export interface VerificationAdapter {
  verify(input: VerificationRequest): Promise<VerificationResult>;
}
