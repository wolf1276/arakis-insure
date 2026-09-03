import { prisma } from '../database/prisma.js';
import { listDisasterEvents } from './disaster.service.js';
import { getTreasuryBalance } from './funding.service.js';

function countsByStatus(rows: Array<{ status: string; _count: { _all: number } }>) {
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}

export async function getStats() {
  const [claimsByStatus, payoutsByStatus, disasterCount, verifiedDisasterCount, policiesByStatus] =
    await prisma.$transaction([
      prisma.claim.groupBy({ by: ['status'], orderBy: { status: 'asc' }, _count: { _all: true } }),
      prisma.payout.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.disasterEvent.count(),
      prisma.disasterEvent.count({ where: { verified: true } }),
      prisma.policy.groupBy({ by: ['status'], orderBy: { status: 'asc' }, _count: { _all: true } }),
    ]);

  return {
    claims: { byStatus: countsByStatus(claimsByStatus as any) },
    payouts: {
      byStatus: countsByStatus(payoutsByStatus as any),
      totalPaid: payoutsByStatus.reduce((sum, r) => sum + Number(r._sum?.amount ?? 0), 0),
    },
    disasters: { total: disasterCount, verified: verifiedDisasterCount },
    policies: { byStatus: countsByStatus(policiesByStatus as any) },
  };
}

export async function listClaimsSummary(filters: { status?: string; type?: string }) {
  return prisma.claim.findMany({
    where: {
      ...(filters.status ? { status: filters.status as any } : {}),
      ...(filters.type ? { type: filters.type as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      claimNumber: true,
      status: true,
      type: true,
      requestedAmount: true,
      finalAmount: true,
      resolvedAt: true,
      createdAt: true,
      policy: { select: { policyNumber: true } },
    },
  });
}

export async function listPayoutsSummary(filters: { status?: string; type?: string }) {
  return prisma.payout.findMany({
    where: {
      ...(filters.status ? { status: filters.status as any } : {}),
      ...(filters.type ? { type: filters.type as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      status: true,
      amount: true,
      asset: true,
      claimId: true,
      disasterEventId: true,
      policyId: true,
      stellarTransactionHash: true,
      createdAt: true,
      completedAt: true,
    },
  });
}

export async function listDisastersSummary() {
  return listDisasterEvents();
}

export async function getTreasurySummary() {
  const [balance, totalFunded] = await Promise.all([
    getTreasuryBalance(),
    prisma.fundingTransaction.aggregate({ _sum: { amount: true }, where: { status: 'FUNDED' } }),
  ]);

  return {
    ...balance,
    totalFunded: Number(totalFunded._sum.amount ?? 0),
  };
}
