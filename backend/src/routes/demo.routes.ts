import { FastifyInstance } from 'fastify';
import { prisma } from '../database/prisma.js';
import { runVerification } from '../oracle/verification-engine.js';
import { createAttestation } from '../oracle/attestation.js';
import {
  authorizeAdvance,
  createPayout,
  approveClaim,
} from '../services/claim.service.js';
import { fundPayout } from '../services/funding.service.js';
import { executeStellarPayout } from '../services/stellar-payout.service.js';
import { simulateDisaster, createParametricPayouts } from '../services/disaster.service.js';
import { notifyClaimSubmitted, notifyPayoutCompleted, notifyDisasterAlert } from '../notifications/notification.service.js';
import { AppError } from '../types/errors.js';
import { config } from '../config.js';

export async function demoRoutes(app: FastifyInstance) {
  app.post('/api/demo/accident', async (_request, reply) => {
    const steps: Record<string, unknown> = {};

    const user = await prisma.user.findFirst({ where: { phone: '+919999900001' } });
    if (!user) throw new AppError('NO_DEMO_USER', 'Run seed script first', 400);

    const policy = await prisma.policy.findFirst({
      where: { userId: user.id, status: 'ACTIVE', accidentCoverage: true },
    });
    if (!policy) throw new AppError('NO_DEMO_POLICY', 'No active accident policy for demo user', 400);

    steps.userId = user.id;
    steps.policyId = policy.id;

    const claim = await prisma.claim.create({
      data: {
        claimNumber: `DEMO-ACC-${Date.now()}`,
        policyId: policy.id,
        type: 'ACCIDENT',
        description: 'Simulated accident for hackathon demo',
        requestedAmount: policy.coverageAmount,
        status: 'VERIFYING',
      },
    });
    steps.claimId = claim.id;

    await notifyClaimSubmitted(user.id, claim.claimNumber, 'ACCIDENT');

    const verification = await runVerification(claim.id);
    steps.verification = verification;

    const attestation = await createAttestation(claim.id);
    steps.attestation = attestation;

    const advance = await authorizeAdvance(claim.id);
    steps.advance = advance;

    const advancePayout = await createPayout(claim.id, 'ADVANCE', advance.advanceAmount);
    steps.advancePayoutId = advancePayout.id;

    await fundPayout(advancePayout.id);

    const stellarAdvance = await executeStellarPayout(advancePayout.id);
    steps.stellarAdvance = stellarAdvance;

    await prisma.claim.update({ where: { id: claim.id }, data: { status: 'FULL_VERIFICATION' } });

    const approved = await approveClaim(claim.id);
    steps.approved = { finalAmount: Number(approved.finalAmount) };

    const finalPayout = await createPayout(claim.id, 'FINAL', Number(approved.finalAmount));
    steps.finalPayoutId = finalPayout.id;

    await fundPayout(finalPayout.id);

    const stellarFinal = await executeStellarPayout(finalPayout.id);
    steps.stellarFinal = stellarFinal;

    await notifyPayoutCompleted(user.id, claim.claimNumber, Number(approved.finalAmount), stellarFinal.stellarTransactionHash);

    await prisma.auditLog.create({
      data: {
        entityType: 'CLAIM',
        entityId: claim.id,
        action: 'DEMO_ACCIDENT_COMPLETE',
        actor: 'demo',
        metadata: {
          advanceHash: stellarAdvance.stellarTransactionHash,
          finalHash: stellarFinal.stellarTransactionHash,
        },
      },
    });

    return reply.status(200).send({
      success: true,
      data: {
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        status: 'FINAL_PAID',
        verification: {
          hospital: verification.results[0]?.verified ?? false,
          police: verification.results[1]?.verified ?? false,
          civilRegistry: verification.results[2]?.verified ?? false,
          passed: verification.passed,
        },
        advance: {
          amount: advance.advanceAmount,
          status: stellarAdvance.status,
          stellarTransactionHash: stellarAdvance.stellarTransactionHash,
        },
        finalPayout: {
          amount: Number(approved.finalAmount),
          status: stellarFinal.status,
          stellarTransactionHash: stellarFinal.stellarTransactionHash,
        },
      },
    });
  });

  app.post('/api/demo/flood', async (_request, reply) => {
    const simulated = await simulateDisaster({
      type: 'FLOOD',
      location: 'Village-A',
      measurement: 412,
      threshold: 350,
      secondaryConfirmation: true,
    });
    if (!('id' in simulated)) {
      throw new AppError('INVALID_DISASTER_EVENT', simulated.reason, 400);
    }
    const event = simulated;

    const result = await createParametricPayouts(event.id);

    const usersWithDisasterCoverage = await prisma.policy.findMany({
      where: { status: 'ACTIVE', disasterCoverage: true },
      select: { userId: true },
    });
    const uniqueUserIds = [...new Set(usersWithDisasterCoverage.map((p) => p.userId))];
    for (const uid of uniqueUserIds) {
      await notifyDisasterAlert(uid, 'FLOOD', 'Village-A', 412);
    }

    const transactions: unknown[] = [];

    for (const p of result.payouts) {
      try {
        await fundPayout(p.payoutId);
      } catch { /* continue */ }

      try {
        const stellar = await executeStellarPayout(p.payoutId);
        transactions.push({ ...stellar, payoutId: p.payoutId });
      } catch { /* continue */ }
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'DISASTER_EVENT',
        entityId: event.id,
        action: 'DEMO_FLOOD_COMPLETE',
        actor: 'demo',
        metadata: {
          policiesAffected: result.totalPolicies,
          payoutsExecuted: result.totalPayouts,
          transactionsCount: transactions.length,
        },
      },
    });

    return reply.status(200).send({
      success: true,
      data: {
        eventId: event.id,
        type: event.type,
        measurement: Number(event.measurement),
        threshold: Number(event.threshold),
        verified: event.verified,
        policiesAffected: result.totalPolicies,
        payoutsExecuted: result.totalPayouts,
        transactions,
      },
    });
  });
}
