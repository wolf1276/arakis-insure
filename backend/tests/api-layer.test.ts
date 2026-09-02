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

describe('Health', () => {
  it('GET /health', async () => {
    const { status, body } = await req('GET', '/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
  });

  it('GET /ready', async () => {
    const { status } = await req('GET', '/ready');
    expect(status).toBe(200);
  });
});

describe('User API', () => {
  it('POST /api/users - creates user', async () => {
    const { status, body } = await req('POST', '/api/users', {
      name: 'Ravi Kumar',
      phone: '+919000000001',
      language: 'hi',
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Ravi Kumar');
    expect(body.data.id).toBeTruthy();
  });

  it('GET /api/users/:id - retrieves user', async () => {
    const create = await req('POST', '/api/users', {
      name: 'Get User',
      phone: '+919000000002',
    });
    const { status, body } = await req('GET', `/api/users/${create.body.data.id}`);
    expect(status).toBe(200);
    expect(body.data.name).toBe('Get User');
  });

  it('GET /api/users/:id - 404 for missing user', async () => {
    const { status, body } = await req('GET', '/api/users/nonexistent');
    expect(status).toBe(404);
    expect(body.error.code).toBe('USER_NOT_FOUND');
  });

  it('POST /api/users/:id/nominee - adds nominee', async () => {
    const user = await req('POST', '/api/users', {
      name: 'Nominee User',
      phone: '+919000000003',
    });
    const { status, body } = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
      name: 'Sunita',
      phone: '+919000000004',
      relationship: 'wife',
    });
    expect(status).toBe(201);
    expect(body.data.relationship).toBe('wife');
  });

  it('GET /api/users/:id/nominees - lists nominees', async () => {
    const user = await req('POST', '/api/users', {
      name: 'List Nom',
      phone: '+919000000005',
    });
    await req('POST', `/api/users/${user.body.data.id}/nominee`, {
      name: 'N1',
      phone: '+919000000006',
      relationship: 'son',
    });
    const { status, body } = await req('GET', `/api/users/${user.body.data.id}/nominees`);
    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});

describe('Policy API', () => {
  it('POST /api/policies - creates policy', async () => {
    const user = await req('POST', '/api/users', {
      name: 'Policy User',
      phone: '+919000000010',
    });
    const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
      name: 'Policy Nominee',
      phone: '+919000000011',
      relationship: 'husband',
    });
    const { status, body } = await req('POST', '/api/policies', {
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
    expect(status).toBe(201);
    expect(body.data.policyNumber).toBeTruthy();
    expect(body.data.status).toBe('DRAFT');
  });

  it('POST /api/policies - rejects if user not found', async () => {
    const { status, body } = await req('POST', '/api/policies', {
      userId: 'nonexistent',
      coverageAmount: 10000,
      premium: 100,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(status).toBe(404);
    expect(body.error.code).toBe('USER_NOT_FOUND');
  });

  it('POST /api/policies/:id/activate - activates policy', async () => {
    const user = await req('POST', '/api/users', {
      name: 'Activate User',
      phone: '+919000000012',
    });
    const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
      name: 'Act Nom',
      phone: '+919000000013',
      relationship: 'daughter',
    });
    const policy = await req('POST', '/api/policies', {
      userId: user.body.data.id,
      nomineeId: nominee.body.data.id,
      coverageAmount: 50000,
      premium: 250,
      accidentCoverage: true,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
    const { status, body } = await req('POST', `/api/policies/${policy.body.data.id}/activate`);
    expect(status).toBe(200);
    expect(body.data.status).toBe('ACTIVE');
  });

  it('POST /api/policies/:id/activate - rejects if already active', async () => {
    const user = await req('POST', '/api/users', {
      name: 'Already Active',
      phone: '+919000000014',
    });
    const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
      name: 'AA Nom',
      phone: '+919000000015',
      relationship: 'brother',
    });
    const policy = await req('POST', '/api/policies', {
      userId: user.body.data.id,
      nomineeId: nominee.body.data.id,
      coverageAmount: 50000,
      premium: 250,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
    await req('POST', `/api/policies/${policy.body.data.id}/activate`);
    const { status, body } = await req('POST', `/api/policies/${policy.body.data.id}/activate`);
    expect(status).toBe(400);
    expect(body.error.code).toBe('POLICY_ALREADY_ACTIVE');
  });

  it('POST /api/policies/:id/activate - rejects without nominee', async () => {
    const user = await req('POST', '/api/users', {
      name: 'No Nom User',
      phone: '+919000000016',
    });
    const policy = await req('POST', '/api/policies', {
      userId: user.body.data.id,
      coverageAmount: 50000,
      premium: 250,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
    const { status, body } = await req('POST', `/api/policies/${policy.body.data.id}/activate`);
    expect(status).toBe(400);
    expect(body.error.code).toBe('NOMINEE_REQUIRED');
  });

  it('GET /api/policies/:id - retrieves policy with relations', async () => {
    const user = await req('POST', '/api/users', {
      name: 'Get Policy',
      phone: '+919000000017',
    });
    const policy = await req('POST', '/api/policies', {
      userId: user.body.data.id,
      coverageAmount: 75000,
      premium: 375,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
    const { status, body } = await req('GET', `/api/policies/${policy.body.data.id}`);
    expect(status).toBe(200);
    expect(body.data.user.name).toBe('Get Policy');
  });
});

describe('Claim API', () => {
  async function setupActivePolicy(suffix: string) {
    const user = await req('POST', '/api/users', {
      name: `Claim User ${suffix}`,
      phone: `+919000000${suffix}`,
    });
    const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
      name: `Claim Nom ${suffix}`,
      phone: `+919000001${suffix}`,
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
    return { user: user.body.data, policy: policy.body.data };
  }

  it('POST /api/claims - creates claim', async () => {
    const { policy } = await setupActivePolicy('200');
    const { status, body } = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'ACCIDENT',
      description: 'Road accident',
      requestedAmount: 100000,
    });
    expect(status).toBe(201);
    expect(body.data.claimNumber).toBeTruthy();
    expect(body.data.status).toBe('SUBMITTED');
  });

  it('POST /api/claims - rejects if policy not active', async () => {
    const user = await req('POST', '/api/users', {
      name: 'Inactive Claim',
      phone: '+919000000201',
    });
    const policy = await req('POST', '/api/policies', {
      userId: user.body.data.id,
      coverageAmount: 10000,
      premium: 100,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    });
    const { status, body } = await req('POST', '/api/claims', {
      policyId: policy.body.data.id,
      type: 'ACCIDENT',
      requestedAmount: 10000,
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe('POLICY_NOT_ACTIVE');
  });

  it('GET /api/claims/:id - retrieves claim with relations', async () => {
    const { policy } = await setupActivePolicy('202');
    const claim = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'ACCIDENT',
      requestedAmount: 100000,
    });
    const { status, body } = await req('GET', `/api/claims/${claim.body.data.id}`);
    expect(status).toBe(200);
    expect(body.data.policy).toBeTruthy();
    expect(body.data.verifications).toHaveLength(0);
  });

  it('POST /api/claims/:id/start-verification - transitions to VERIFYING', async () => {
    const { policy } = await setupActivePolicy('203');
    const claim = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'ACCIDENT',
      requestedAmount: 100000,
    });
    const { status, body } = await req('POST', `/api/claims/${claim.body.data.id}/start-verification`);
    expect(status).toBe(200);
    expect(body.data.status).toBe('VERIFYING');
  });

  it('POST /api/claims/:id/verify - records verification', async () => {
    const { policy } = await setupActivePolicy('204');
    const claim = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'ACCIDENT',
      requestedAmount: 100000,
    });
    await req('POST', `/api/claims/${claim.body.data.id}/start-verification`);

    const { status, body } = await req('POST', `/api/claims/${claim.body.data.id}/verify`, {
      source: 'HOSPITAL',
      verified: true,
    });
    expect(status).toBe(200);
    expect(body.data.source).toBe('HOSPITAL');
    expect(body.data.verified).toBe(true);
  });

  it('2-of-3 verification flow', async () => {
    const { policy } = await setupActivePolicy('205');
    const claim = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'ACCIDENT',
      requestedAmount: 100000,
    });
    const cid = claim.body.data.id;

    await req('POST', `/api/claims/${cid}/start-verification`);

    await req('POST', `/api/claims/${cid}/verify`, { source: 'HOSPITAL', verified: true });
    await req('POST', `/api/claims/${cid}/verify`, { source: 'POLICE', verified: true });
    await req('POST', `/api/claims/${cid}/verify`, { source: 'CIVIL_REGISTRY', verified: false });

    const { status, body } = await req('POST', `/api/claims/${cid}/evaluate`);
    expect(status).toBe(200);
    expect(body.data.status).toBe('PRELIMINARILY_VERIFIED');
  });

  it('1-of-3 verification does NOT advance', async () => {
    const { policy } = await setupActivePolicy('206');
    const claim = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'ACCIDENT',
      requestedAmount: 100000,
    });
    const cid = claim.body.data.id;

    await req('POST', `/api/claims/${cid}/start-verification`);

    await req('POST', `/api/claims/${cid}/verify`, { source: 'HOSPITAL', verified: true });
    await req('POST', `/api/claims/${cid}/verify`, { source: 'POLICE', verified: false });
    await req('POST', `/api/claims/${cid}/verify`, { source: 'CIVIL_REGISTRY', verified: false });

    const { body } = await req('POST', `/api/claims/${cid}/evaluate`);
    expect(body.data.status).toBe('VERIFYING');
  });

  it('authorize advance - 10% for accident', async () => {
    const { policy } = await setupActivePolicy('207');
    const claim = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'ACCIDENT',
      requestedAmount: 100000,
    });
    const cid = claim.body.data.id;

    await req('POST', `/api/claims/${cid}/start-verification`);
    await req('POST', `/api/claims/${cid}/verify`, { source: 'HOSPITAL', verified: true });
    await req('POST', `/api/claims/${cid}/verify`, { source: 'POLICE', verified: true });
    await req('POST', `/api/claims/${cid}/evaluate`);
    const { status, body } = await req('POST', `/api/claims/${cid}/authorize-advance`);

    expect(status).toBe(200);
    expect(body.data.advanceAmount).toBe(10000);
    expect(body.data.advancePercent).toBe(0.10);
  });

  it('authorize advance - 20% for death', async () => {
    const { policy } = await setupActivePolicy('208');
    const claim = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'DEATH',
      requestedAmount: 100000,
    });
    const cid = claim.body.data.id;

    await req('POST', `/api/claims/${cid}/start-verification`);
    await req('POST', `/api/claims/${cid}/verify`, { source: 'HOSPITAL', verified: true });
    await req('POST', `/api/claims/${cid}/verify`, { source: 'POLICE', verified: true });
    await req('POST', `/api/claims/${cid}/evaluate`);
    const { body } = await req('POST', `/api/claims/${cid}/authorize-advance`);

    expect(body.data.advanceAmount).toBe(20000);
    expect(body.data.advancePercent).toBe(0.20);
  });

  it('cannot double-advance', async () => {
    const { policy } = await setupActivePolicy('209');
    const claim = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'ACCIDENT',
      requestedAmount: 100000,
    });
    const cid = claim.body.data.id;

    await req('POST', `/api/claims/${cid}/start-verification`);
    await req('POST', `/api/claims/${cid}/verify`, { source: 'HOSPITAL', verified: true });
    await req('POST', `/api/claims/${cid}/verify`, { source: 'POLICE', verified: true });
    await req('POST', `/api/claims/${cid}/evaluate`);
    await req('POST', `/api/claims/${cid}/authorize-advance`);

    const { status, body } = await req('POST', `/api/claims/${cid}/authorize-advance`);
    expect(status).toBe(400);
    expect(body.error.code).toBe('INVALID_TRANSITION');
  });

  it('full accident lifecycle: SUBMITTED -> FINAL_PAID', async () => {
    const { policy } = await setupActivePolicy('300');
    const claim = await req('POST', '/api/claims', {
      policyId: policy.id,
      type: 'ACCIDENT',
      requestedAmount: 100000,
    });
    const cid = claim.body.data.id;

    // Start verification
    await req('POST', `/api/claims/${cid}/start-verification`);

    // 2-of-3 verification
    await req('POST', `/api/claims/${cid}/verify`, { source: 'HOSPITAL', verified: true });
    await req('POST', `/api/claims/${cid}/verify`, { source: 'POLICE', verified: true });
    await req('POST', `/api/claims/${cid}/verify`, { source: 'CIVIL_REGISTRY', verified: false });

    // Evaluate -> PRELIMINARILY_VERIFIED
    await req('POST', `/api/claims/${cid}/evaluate`);

    // Authorize advance
    await req('POST', `/api/claims/${cid}/authorize-advance`);

    // Create advance payout
    const advancePayout = await req('POST', `/api/claims/${cid}/payout`, {
      type: 'ADVANCE',
      amount: 10000,
    });
    expect(advancePayout.body.data.type).toBe('ADVANCE');

    // Transition to FULL_VERIFICATION
    await req('POST', `/api/claims/${cid}/start-verification`);

    // Approve claim (this sets finalAmount = coverage - advance = 90000)
    const approved = await req('POST', `/api/claims/${cid}/approve`);
    expect(approved.body.data.status).toBe('APPROVED');
    expect(Number(approved.body.data.finalAmount)).toBe(90000);

    // Create final payout
    const finalPayout = await req('POST', `/api/claims/${cid}/payout`, {
      type: 'FINAL',
      amount: 90000,
    });
    expect(finalPayout.body.data.type).toBe('FINAL');

    // Verify final state
    const final = await req('GET', `/api/claims/${cid}`);
    expect(final.body.data.status).toBe('FINAL_PAID');
    expect(final.body.data.payouts).toHaveLength(2);
    expect(final.body.data.resolvedAt).toBeTruthy();
  });

  it('GET /api/claims - lists claims', async () => {
    const { status, body } = await req('GET', '/api/claims');
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /api/claims?status=SUBMITTED - filters by status', async () => {
    const { status, body } = await req('GET', '/api/claims?status=SUBMITTED');
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('Error handling', () => {
  it('returns structured error for invalid transition', async () => {
    const user = await req('POST', '/api/users', {
      name: 'Err User',
      phone: '+919000000900',
    });
    const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
      name: 'Err Nominee',
      phone: '+919000000901',
      relationship: 'wife',
    });
    const policy = await req('POST', '/api/policies', {
      userId: user.body.data.id,
      nomineeId: nominee.body.data.id,
      coverageAmount: 10000,
      premium: 100,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    });
    await req('POST', `/api/policies/${policy.body.data.id}/activate`);
    const claim = await req('POST', '/api/claims', {
      policyId: policy.body.data.id,
      type: 'ACCIDENT',
      requestedAmount: 10000,
    });

    // Try to approve a SUBMITTED claim directly
    const { status, body } = await req('POST', `/api/claims/${claim.body.data.id}/approve`);
    expect(status).toBe(400);
    expect(body.error.code).toBe('INVALID_TRANSITION');
  });
});
