import { createHash } from 'node:crypto';
import type { VerificationAdapter, VerificationRequest, VerificationResult } from './adapter.interface.js';

export class CivilRegistryAdapter implements VerificationAdapter {
  async verify(input: VerificationRequest): Promise<VerificationResult> {
    const verified = input.claimType === 'DEATH';

    return {
      source: 'CIVIL_REGISTRY',
      verified,
      referenceHash: createHash('sha256').update(`civil:${input.claimId}`).digest('hex'),
      metadata: {
        mock: true,
        provider: 'mock-civil-registry-adapter',
        claimType: input.claimType,
      },
    };
  }
}
