import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let app: FastifyInstance;

async function req(method: string, url: string, body?: unknown) {
  const res = await app.inject({ method, url, payload: body });
  return { status: res.statusCode, body: res.json() };
}

async function createClaimWithPayout(type: string = 'ADVANCE', suffix: string = 'fund') {
  const user = await req('POST', '/api/users', {
    name: `Fund User ${suffix}`,
    phone: `+919000004${suffix}`,
  });
  const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
    name: `Fund Nom ${suffix}`,
    phone: `+919000005${suffix}`,
    relationship: 'wife',
  });
  const policy = await req('POST', '/api/policies', {
    userId: user.body.data.id,
    nomineeId: nominee.body.data.id,
    coverageAmount: 100000,
    premium: 500,
    accidentCoverage: true,
    deathCoverage: true,
    disasterCoverage: true,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
  });
  await req('POST', `/api/policies/${policy.body.data.id}/activate`);

  const claim = await req('POST', '/api/claims', {
    policyId: policy.body.data.id,
    type: 'ACCIDENT',
    requestedAmount: 100000,
  });
  const cid = claim.body.data.id;

  // Full verification flow
  await req('POST', `/api/claims/${cid}/start-verification`);
  await req('POST', `/api/oracle/verify/${cid}`);
  await req('POST', `/api/claims/${cid}/authorize-advance`);

  // Create payout
  const payout = await req('POST', `/api/claims/${cid}/payout`, {
    type,
    amount: type === 'ADVANCE' ? 10000 : 90000,
  });

  return { claim: claim.body.data, payout: payout.body.data, policy: policy.body.data };
}

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  await prisma.payout.deleteMany();
  await prisma.fundingTransaction.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.disasterEvent.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.nominee.deleteMany();
  await prisma.treasury.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.payout.deleteMany();
  await prisma.fundingTransaction.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.disasterEvent.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.nominee.deleteMany();
  await prisma.treasury.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await app.close();
  await prisma.$disconnect();
});

describe('MockFundingProvider', () => {
  it('returns initial balance', async () => {
    const { MockFundingProvider } = await import('../src/funding/mock.provider.js');
    const provider = new MockFundingProvider(500_000);
    const balance = await provider.getBalance();
    expect(balance.available).toBe(500_000);
    expect(balance.asset).toBe('XLM');
  });

  it('funds request and deducts balance', async () => {
    const { MockFundingProvider } = await import('../src/funding/mock.provider.js');
    const provider = new MockFundingProvider(100_000);
    const result = await provider.requestFunding({
      amount: 10_000,
      asset: 'XLM',
      payoutId: 'test-payout',
    });
    expect(result.success).toBe(true);
    expect(result.providerReference).toBeTruthy();

    const balance = await provider.getBalance();
    expect(balance.available).toBe(90_000);
  });

  it('rejects if insufficient balance', async () => {
    const { MockFundingProvider } = await import('../src/funding/mock.provider.js');
    const provider = new MockFundingProvider(1_000);
    const result = await provider.requestFunding({
      amount: 10_000,
      asset: 'XLM',
      payoutId: 'test-payout',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('Funding API', () => {
  it('GET /api/funding/balance - returns treasury balance', async () => {
    const { status, body } = await req('GET', '/api/funding/balance');
    expect(status).toBe(200);
    expect(body.data.available).toBeGreaterThanOrEqual(0);
    expect(body.data.asset).toBe('XLM');
  });

  it('POST /api/funding/payout/:payoutId - funds a payout from treasury', async () => {
    const { payout } = await createClaimWithPayout('ADVANCE', 'fund1');

    const { status, body } = await req('POST', `/api/funding/payout/${payout.id}`);
    expect(status).toBe(200);
    expect(body.data.funded).toBe(true);
    expect(body.data.fundingTransactionId).toBeTruthy();
  });

  it('creates FundingTransaction record', async () => {
    const { payout } = await createClaimWithPayout('ADVANCE', 'fund2');
    await req('POST', `/api/funding/payout/${payout.id}`);

    const fundingTx = await prisma.fundingTransaction.findFirst({
      where: { amount: payout.amount },
    });
    expect(fundingTx).toBeTruthy();
    expect(fundingTx!.status).toBe('FUNDED');
  });

  it('updates payout status after funding', async () => {
    const { payout } = await createClaimWithPayout('ADVANCE', 'fund3');
    await req('POST', `/api/funding/payout/${payout.id}`);

    const updatedPayout = await prisma.payout.findUnique({ where: { id: payout.id } });
    expect(updatedPayout!.status).toBe('FUNDED');
    expect(updatedPayout!.fundingTransactionId).toBeTruthy();
  });

  it('rejects funding for non-PENDING payout', async () => {
    const { payout } = await createClaimWithPayout('ADVANCE', 'fund4');
    await req('POST', `/api/funding/payout/${payout.id}`);

    const { status, body } = await req('POST', `/api/funding/payout/${payout.id}`);
    expect(status).toBe(400);
    expect(body.error.code).toBe('PAYOUT_ALREADY_EXECUTED');
  });

  it('GET /api/funding/transactions - lists transactions', async () => {
    const { payout } = await createClaimWithPayout('ADVANCE', 'fund5');
    await req('POST', `/api/funding/payout/${payout.id}`);

    const { status, body } = await req('GET', '/api/funding/transactions');
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/funding/transactions?status=FUNDED - filters by status', async () => {
    const { status, body } = await req('GET', '/api/funding/transactions?status=FUNDED');
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /api/funding/transactions/:id - returns funding status', async () => {
    const { payout } = await createClaimWithPayout('ADVANCE', 'fund6');
    const fundRes = await req('POST', `/api/funding/payout/${payout.id}`);

    const { status, body } = await req('GET', `/api/funding/transactions/${fundRes.body.data.fundingTransactionId}`);
    expect(status).toBe(200);
    expect(body.data.status).toBe('FUNDED');
    expect(body.data.provider).toBeTruthy();
  });
});

describe('Funding Flow E2E', () => {
  it('full flow: create claim -> create payout -> fund payout -> verify funded', async () => {
    const { payout } = await createClaimWithPayout('ADVANCE', 'e2e1');

    // Fund the payout
    const fundRes = await req('POST', `/api/funding/payout/${payout.id}`);
    expect(fundRes.body.data.funded).toBe(true);

    // Verify payout status
    const payoutRes = await prisma.payout.findUnique({ where: { id: payout.id } });
    expect(payoutRes!.status).toBe('FUNDED');
    expect(payoutRes!.fundingTransactionId).toBeTruthy();

    // Verify funding transaction
    const fundTx = await prisma.fundingTransaction.findUnique({
      where: { id: payoutRes!.fundingTransactionId! },
    });
    expect(fundTx!.status).toBe('FUNDED');
    expect(['mock', 'treasury']).toContain(fundTx!.provider);
  });

  it('multiple payouts funded independently', async () => {
    const { payout: payout1 } = await createClaimWithPayout('ADVANCE', 'multi1');
    const { payout: payout2 } = await createClaimWithPayout('ADVANCE', 'multi2');

    await req('POST', `/api/funding/payout/${payout1.id}`);
    await req('POST', `/api/funding/payout/${payout2.id}`);

    const updated1 = await prisma.payout.findUnique({ where: { id: payout1.id } });
    const updated2 = await prisma.payout.findUnique({ where: { id: payout2.id } });

    expect(updated1!.status).toBe('FUNDED');
    expect(updated2!.status).toBe('FUNDED');
  });
});
