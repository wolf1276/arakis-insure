import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { AppError, notFound } from '../types/errors.js';
import { HospitalAdapter, PoliceAdapter, CivilRegistryAdapter } from './adapters/index.js';
import type { VerificationResult } from './adapters/adapter.interface.js';

const adapters = [
  new HospitalAdapter(),
  new PoliceAdapter(),
  new CivilRegistryAdapter(),
];

export async function runVerification(claimId: string) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw notFound('claim', claimId);

  if (claim.status !== 'VERIFYING') {
    throw new AppError('INVALID_TRANSITION', 'Claim must be in VERIFYING status', 400);
  }

  const request = {
    claimId,
    claimType: claim.type,
    userId: '',
    policyId: claim.policyId,
  };

  const results: VerificationResult[] = await Promise.all(
    adapters.map((a) => a.verify(request))
  );

  const verifiedCount = results.filter((r) => r.verified).length;

  await prisma.verification.createMany({
    data: results.map((r) => ({
      claimId,
      source: r.source,
      verified: r.verified,
      referenceHash: r.referenceHash ?? null,
      metadata: (r.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      verifiedAt: r.verified ? new Date() : undefined,
    })),
  });

  const passed = verifiedCount >= 2;

  if (passed) {
    await prisma.claim.update({
      where: { id: claimId },
      data: { status: 'PRELIMINARILY_VERIFIED' },
    });
  }

  return { results, verifiedCount, passed };
}
