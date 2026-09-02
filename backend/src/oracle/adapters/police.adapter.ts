import { createHash } from 'node:crypto';
import type { VerificationAdapter, VerificationRequest, VerificationResult } from './adapter.interface.js';

export class PoliceAdapter implements VerificationAdapter {
  async verify(input: VerificationRequest): Promise<VerificationResult> {
    const verified = input.claimType === 'ACCIDENT' || input.claimType === 'DEATH';

    return {
      source: 'POLICE',
      verified,
      referenceHash: createHash('sha256').update(`police:${input.claimId}`).digest('hex'),
      metadata: {
        mock: true,
        provider: 'mock-police-adapter',
        claimType: input.claimType,
      },
    };
  }
}
