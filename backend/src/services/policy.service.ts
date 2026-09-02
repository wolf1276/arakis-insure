import { prisma } from '../database/prisma.js';
import { AppError, notFound } from '../types/errors.js';
import { z } from 'zod';

export const createPolicySchema = z.object({
  userId: z.string(),
  nomineeId: z.string().optional(),
  coverageAmount: z.number().positive(),
  premium: z.number().positive(),
  disasterCoverage: z.boolean().default(false),
  accidentCoverage: z.boolean().default(false),
  deathCoverage: z.boolean().default(false),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
});

export async function createPolicy(input: z.infer<typeof createPolicySchema>) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw notFound('user', input.userId);

  if (input.nomineeId) {
    const nominee = await prisma.nominee.findUnique({ where: { id: input.nomineeId } });
    if (!nominee || nominee.userId !== input.userId) {
      throw new AppError('NOMINEE_REQUIRED', 'Nominee not found or does not belong to user', 400);
    }
  }

  const policyNumber = `POL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return prisma.policy.create({
    data: {
      policyNumber,
      userId: input.userId,
      nomineeId: input.nomineeId,
      coverageAmount: input.coverageAmount,
      premium: input.premium,
      disasterCoverage: input.disasterCoverage,
      accidentCoverage: input.accidentCoverage,
      deathCoverage: input.deathCoverage,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'DRAFT',
    },
  });
}

export async function getPolicy(id: string) {
  const policy = await prisma.policy.findUnique({
    where: { id },
    include: { user: true, nominee: true, claims: true },
  });
  if (!policy) throw notFound('policy', id);
  return policy;
}

export async function activatePolicy(id: string) {
  const policy = await prisma.policy.findUnique({ where: { id } });
  if (!policy) throw notFound('policy', id);

  if (policy.status === 'ACTIVE') {
    throw new AppError('POLICY_ALREADY_ACTIVE', 'Policy is already active', 400);
  }

  if (policy.status !== 'DRAFT') {
    throw new AppError('INVALID_TRANSITION', `Cannot activate policy in ${policy.status} status`, 400);
  }

  if (!policy.nomineeId) {
    throw new AppError('NOMINEE_REQUIRED', 'Policy must have a nominee before activation', 400);
  }

  if (policy.endDate <= new Date()) {
    throw new AppError('INVALID_TRANSITION', 'Policy end date is in the past', 400);
  }

  return prisma.policy.update({
    where: { id },
    data: { status: 'ACTIVE' },
  });
}
