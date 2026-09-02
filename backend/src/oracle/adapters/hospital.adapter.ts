import { createHash } from 'node:crypto';
import type { VerificationAdapter, VerificationRequest, VerificationResult } from './adapter.interface.js';

export class HospitalAdapter implements VerificationAdapter {
  async verify(input: VerificationRequest): Promise<VerificationResult> {
    const verified = input.claimType === 'ACCIDENT' || input.claimType === 'DEATH';

    return {
      source: 'HOSPITAL',
      verified,
      referenceHash: createHash('sha256').update(`hospital:${input.claimId}`).digest('hex'),
      metadata: {
        mock: true,
        provider: 'mock-hospital-adapter',
        claimType: input.claimType,
      },
    };
  }
}
