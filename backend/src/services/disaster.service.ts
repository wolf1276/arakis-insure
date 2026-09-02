import { prisma } from '../database/prisma.js';
import { AppError } from '../types/errors.js';
import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { z } from 'zod';

export const simulateDisasterSchema = z.object({
  type: z.enum(['FLOOD', 'DROUGHT', 'CYCLONE', 'EARTHQUAKE']),
  location: z.string(),
  measurement: z.number().positive(),
  threshold: z.number().positive(),
  secondaryConfirmation: z.boolean(),
});

export async function simulateDisaster(input: z.infer<typeof simulateDisasterSchema>) {
  const verified = input.measurement > input.threshold && input.secondaryConfirmation;

  if (!verified) {
    return {
      verified: false,
      reason: !input.secondaryConfirmation
        ? 'Secondary confirmation missing'
        : `Measurement ${input.measurement} does not exceed threshold ${input.threshold}`,
    };
  }

  const payload = {
    type: input.type,
    location: input.location,
    measurement: input.measurement,
    threshold: input.threshold,
    secondaryConfirmation: input.secondaryConfirmation,
    timestamp: new Date().toISOString(),
  };

  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const signature = createHash('sha256').update(`sig:${hash}`).digest('hex');
  const attestation = JSON.stringify({
    hash,
    signature,
    publicKey: config.oracle.publicKey || 'mock-oracle-public-key',
    timestamp: payload.timestamp,
  });

  const disasterEvent = await prisma.disasterEvent.create({
    data: {
      type: input.type,
      location: input.location,
      measurement: input.measurement,
      threshold: input.threshold,
      secondaryConfirmation: input.secondaryConfirmation,
      verified: true,
      oracleAttestation: attestation,
      triggeredAt: new Date(),
    },
  });

  return disasterEvent;
}

export async function findAffectedPolicies(disasterEventId: string) {
  const event = await prisma.disasterEvent.findUnique({ where: { id: disasterEventId } });
  if (!event) throw new AppError('EVENT_NOT_FOUND', `Disaster event ${disasterEventId} not found`, 404);

  const policies = await prisma.policy.findMany({
    where: {
      status: 'ACTIVE',
      disasterCoverage: true,
    },
    include: { user: true },
  });

  return policies;
}

export async function createParametricPayouts(disasterEventId: string) {
  const event = await prisma.disasterEvent.findUnique({ where: { id: disasterEventId } });
  if (!event) throw new AppError('EVENT_NOT_FOUND', `Disaster event ${disasterEventId} not found`, 404);
  if (!event.verified) throw new AppError('EVENT_NOT_VERIFIED', 'Disaster event is not verified', 400);

  const policies = await findAffectedPolicies(disasterEventId);

  const payouts: Array<{ policyId: string; payoutId: string; amount: number }> = [];

  for (const policy of policies) {
    const existingPayout = await prisma.payout.findUnique({
      where: { disasterEventId_policyId: { disasterEventId, policyId: policy.id } },
    });

    if (existingPayout) continue;

    const payoutAmount = policy.coverageAmount.toNumber();

    const payout = await prisma.payout.create({
      data: {
        claimId: null as any,
        policyId: policy.id,
        disasterEventId,
        type: 'PARAMETRIC',
        amount: payoutAmount,
        beneficiaryReference: `disaster:${event.type}:${policy.policyNumber}`,
      },
    });

    payouts.push({ policyId: policy.id, payoutId: payout.id, amount: payoutAmount });
  }

  return { event, payouts, totalPolicies: policies.length, totalPayouts: payouts.length };
}

export async function getDisasterEvent(id: string) {
  const event = await prisma.disasterEvent.findUnique({
    where: { id },
    include: { payouts: { include: { policy: { include: { user: true } } } } },
  });
  if (!event) throw new AppError('EVENT_NOT_FOUND', `Disaster event ${id} not found`, 404);
  return event;
}

export async function listDisasterEvents() {
  return prisma.disasterEvent.findMany({
    orderBy: { createdAt: 'desc' },
    include: { payouts: true },
  });
}
