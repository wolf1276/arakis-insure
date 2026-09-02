import { prisma } from '../database/prisma.js';
import { Prisma } from '@prisma/client';
import { AppError, notFound } from '../types/errors.js';
import { z } from 'zod';

export const createClaimSchema = z.object({
  policyId: z.string(),
  type: z.enum(['ACCIDENT', 'DEATH', 'FLOOD', 'DROUGHT']),
  description: z.string().optional(),
  requestedAmount: z.number().positive(),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['VERIFYING'],
  VERIFYING: ['PRELIMINARILY_VERIFIED', 'REJECTED'],
  PRELIMINARILY_VERIFIED: ['ADVANCE_ELIGIBLE'],
  ADVANCE_ELIGIBLE: ['ADVANCE_PAID'],
  ADVANCE_PAID: ['FULL_VERIFICATION'],
  FULL_VERIFICATION: ['APPROVED', 'REJECTED', 'FRAUD'],
  APPROVED: ['FINAL_PAID'],
  REJECTED: [],
  FRAUD: [],
  FINAL_PAID: [],
};

function validateTransition(current: string, next: string) {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `Cannot transition from ${current} to ${next}`,
      400
    );
  }
}

export async function createClaim(input: z.infer<typeof createClaimSchema>) {
  const policy = await prisma.policy.findUnique({ where: { id: input.policyId } });
  if (!policy) throw notFound('policy', input.policyId);
  if (policy.status !== 'ACTIVE') {
    throw new AppError('POLICY_NOT_ACTIVE', 'Policy must be active to file a claim', 400);
  }

  const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return prisma.claim.create({
    data: {
      claimNumber,
      policyId: input.policyId,
      type: input.type,
      description: input.description,
      requestedAmount: input.requestedAmount,
      status: 'SUBMITTED',
    },
  });
}

export async function getClaim(id: string) {
  const claim = await prisma.claim.findUnique({
    where: { id },
    include: {
      policy: { include: { user: true, nominee: true } },
      verifications: true,
      payouts: true,
    },
  });
  if (!claim) throw notFound('claim', id);
  return claim;
}

export async function transitionClaim(id: string, toStatus: string) {
  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) throw notFound('claim', id);
  validateTransition(claim.status, toStatus);

  const data: Record<string, unknown> = { status: toStatus };
  if (toStatus === 'REJECTED' || toStatus === 'FRAUD' || toStatus === 'FINAL_PAID') {
    data.resolvedAt = new Date();
  }

  return prisma.claim.update({ where: { id }, data });
}

export async function startVerification(id: string) {
  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) throw notFound('claim', id);

  const target = claim.status === 'ADVANCE_PAID' ? 'FULL_VERIFICATION' : 'VERIFYING';
  return transitionClaim(id, target);
}

export async function recordVerification(
  claimId: string,
  source: 'HOSPITAL' | 'POLICE' | 'CIVIL_REGISTRY',
  verified: boolean,
  metadata?: Record<string, unknown>
) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw notFound('claim', claimId);

  return prisma.verification.create({
    data: {
      claimId,
      source,
      verified,
      metadata: metadata as Prisma.InputJsonValue | undefined,
      verifiedAt: verified ? new Date() : undefined,
    },
  });
}

export async function evaluateVerification(claimId: string) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw notFound('claim', claimId);

  if (claim.status !== 'VERIFYING') {
    throw new AppError('INVALID_TRANSITION', 'Claim must be in VERIFYING status', 400);
  }

  const verifications = await prisma.verification.findMany({ where: { claimId } });
  const verifiedCount = verifications.filter((v) => v.verified).length;

  if (verifiedCount >= 2) {
    return transitionClaim(claimId, 'PRELIMINARILY_VERIFIED');
  }

  return claim;
}

export async function authorizeAdvance(claimId: string) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw notFound('claim', claimId);

  if (claim.status !== 'PRELIMINARILY_VERIFIED') {
    throw new AppError('INVALID_TRANSITION', 'Claim must be PRELIMINARILY_VERIFIED', 400);
  }

  const existingAdvance = await prisma.payout.findFirst({
    where: { claimId, type: 'ADVANCE' },
  });
  if (existingAdvance) {
    throw new AppError('ADVANCE_ALREADY_PAID', 'Advance already paid for this claim', 400);
  }

  const policy = await prisma.policy.findUnique({ where: { id: claim.policyId } });
  const coverage = policy!.coverageAmount.toNumber();

  let advancePercent: number;
  if (claim.type === 'DEATH') {
    advancePercent = 0.20;
  } else {
    advancePercent = 0.10;
  }

  const advanceAmount = Math.floor(coverage * advancePercent);

  await prisma.claim.update({
    where: { id: claimId },
    data: { advanceAmount, status: 'ADVANCE_ELIGIBLE' },
  });

  return { claimId, advanceAmount, advancePercent };
}

export async function createPayout(
  claimId: string,
  type: 'ADVANCE' | 'FINAL',
  amount: number
) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw notFound('claim', claimId);

  if (type === 'ADVANCE' && claim.status !== 'ADVANCE_ELIGIBLE') {
    throw new AppError('INVALID_TRANSITION', 'Claim must be ADVANCE_ELIGIBLE', 400);
  }

  if (type === 'FINAL' && claim.status !== 'APPROVED') {
    throw new AppError('INVALID_TRANSITION', 'Claim must be APPROVED', 400);
  }

  const payout = await prisma.payout.create({
    data: {
      claimId,
      policyId: claim.policyId,
      type,
      amount,
      beneficiaryReference: claim.beneficiaryReference,
    },
  });

  if (type === 'ADVANCE') {
    await prisma.claim.update({ where: { id: claimId }, data: { status: 'ADVANCE_PAID' } });
  } else {
    await transitionClaim(claimId, 'FINAL_PAID');
  }

  return payout;
}

export async function approveClaim(claimId: string) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw notFound('claim', claimId);

  if (claim.status !== 'FULL_VERIFICATION') {
    throw new AppError('INVALID_TRANSITION', 'Claim must be FULL_VERIFICATION', 400);
  }

  const policy = await prisma.policy.findUnique({ where: { id: claim.policyId } });
  const coverage = policy!.coverageAmount.toNumber();
  const finalAmount = coverage - (claim.advanceAmount?.toNumber() ?? 0);

  return prisma.claim.update({
    where: { id: claimId },
    data: {
      status: 'APPROVED',
      finalAmount,
    },
  });
}

export async function getClaimVerifications(claimId: string) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw notFound('claim', claimId);
  return prisma.verification.findMany({ where: { claimId } });
}

export async function listClaims(filters?: { status?: string; type?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.type) where.type = filters.type;

  return prisma.claim.findMany({
    where,
    include: { policy: { include: { user: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
