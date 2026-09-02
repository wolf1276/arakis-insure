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

async function setupClaim(type: string = 'ACCIDENT', suffix: string = 'oracle') {
  const user = await req('POST', '/api/users', {
    name: `Oracle User ${suffix}`,
    phone: `+919000002${suffix}`,
  });
  const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
    name: `Oracle Nom ${suffix}`,
    phone: `+919000003${suffix}`,
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
    type,
    requestedAmount: 100000,
  });

  // Transition to VERIFYING
  await req('POST', `/api/claims/${claim.body.data.id}/start-verification`);

  return { user: user.body.data, policy: policy.body.data, claim: claim.body.data };
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

describe('Oracle Adapters', () => {
  it('HospitalAdapter verifies ACCIDENT claims', async () => {
    const { HospitalAdapter } = await import('../src/oracle/adapters/hospital.adapter.js');
    const adapter = new HospitalAdapter();
    const result = await adapter.verify({ claimId: 'test', claimType: 'ACCIDENT', userId: '', policyId: '' });
    expect(result.source).toBe('HOSPITAL');
    expect(result.verified).toBe(true);
    expect(result.referenceHash).toBeTruthy();
  });

  it('HospitalAdapter verifies DEATH claims', async () => {
    const { HospitalAdapter } = await import('../src/oracle/adapters/hospital.adapter.js');
    const adapter = new HospitalAdapter();
    const result = await adapter.verify({ claimId: 'test', claimType: 'DEATH', userId: '', policyId: '' });
    expect(result.verified).toBe(true);
  });

  it('PoliceAdapter verifies ACCIDENT claims', async () => {
    const { PoliceAdapter } = await import('../src/oracle/adapters/police.adapter.js');
    const adapter = new PoliceAdapter();
    const result = await adapter.verify({ claimId: 'test', claimType: 'ACCIDENT', userId: '', policyId: '' });
    expect(result.source).toBe('POLICE');
    expect(result.verified).toBe(true);
  });

  it('CivilRegistryAdapter rejects ACCIDENT claims', async () => {
    const { CivilRegistryAdapter } = await import('../src/oracle/adapters/civil-registry.adapter.js');
    const adapter = new CivilRegistryAdapter();
    const result = await adapter.verify({ claimId: 'test', claimType: 'ACCIDENT', userId: '', policyId: '' });
    expect(result.source).toBe('CIVIL_REGISTRY');
    expect(result.verified).toBe(false);
  });

  it('CivilRegistryAdapter verifies DEATH claims', async () => {
    const { CivilRegistryAdapter } = await import('../src/oracle/adapters/civil-registry.adapter.js');
    const adapter = new CivilRegistryAdapter();
    const result = await adapter.verify({ claimId: 'test', claimType: 'DEATH', userId: '', policyId: '' });
    expect(result.verified).toBe(true);
  });
});

describe('Verification Engine', () => {
  it('ACCIDENT claim: 2 of 3 verified (hospital + police)', async () => {
    const { claim } = await setupClaim('ACCIDENT', 'veng1');
    const { status, body } = await req('POST', `/api/oracle/verify/${claim.id}`);

    expect(status).toBe(200);
    expect(body.data.verifiedCount).toBe(2);
    expect(body.data.passed).toBe(true);
    expect(body.data.results).toHaveLength(3);

    const verified = body.data.results.filter((r: any) => r.verified);
    expect(verified).toHaveLength(2);
    expect(verified.map((r: any) => r.source).sort()).toEqual(['HOSPITAL', 'POLICE']);
  });

  it('DEATH claim: 3 of 3 verified', async () => {
    const { claim } = await setupClaim('DEATH', 'veng2');
    const { status, body } = await req('POST', `/api/oracle/verify/${claim.id}`);

    expect(status).toBe(200);
    expect(body.data.verifiedCount).toBe(3);
    expect(body.data.passed).toBe(true);
  });

  it('writes Verification records to DB', async () => {
    const { claim } = await setupClaim('ACCIDENT', 'veng3');
    await req('POST', `/api/oracle/verify/${claim.id}`);

    const verifs = await prisma.verification.findMany({ where: { claimId: claim.id } });
    expect(verifs).toHaveLength(3);

    const verifiedCount = verifs.filter((v) => v.verified).length;
    expect(verifiedCount).toBe(2);
  });

  it('returns 404 for invalid claim', async () => {
    const { status, body } = await req('POST', '/api/oracle/verify/nonexistent');
    expect(status).toBe(404);
    expect(body.error.code).toBe('CLAIM_NOT_FOUND');
  });
});

describe('Attestation', () => {
  it('creates attestation for PRELIMINARILY_VERIFIED claim', async () => {
    const { claim } = await setupClaim('ACCIDENT', 'att1');
    await req('POST', `/api/oracle/verify/${claim.id}`);

    const { status, body } = await req('POST', `/api/oracle/attest/${claim.id}`);
    expect(status).toBe(200);
    expect(body.data.hash).toBeTruthy();
    expect(body.data.signature).toBeTruthy();
    expect(body.data.publicKey).toBeTruthy();
    expect(body.data.timestamp).toBeTruthy();
  });

  it('attestation hash is stored on claim', async () => {
    const { claim } = await setupClaim('ACCIDENT', 'att2');
    await req('POST', `/api/oracle/verify/${claim.id}`);
    await req('POST', `/api/oracle/attest/${claim.id}`);

    const updatedClaim = await prisma.claim.findUnique({ where: { id: claim.id } });
    expect(updatedClaim!.oracleAttestation).toBeTruthy();

    const attestation = JSON.parse(updatedClaim!.oracleAttestation!);
    expect(attestation.hash).toBeTruthy();
    expect(attestation.signature).toBeTruthy();
  });

  it('verifies valid attestation', async () => {
    const { claim } = await setupClaim('ACCIDENT', 'att3');
    await req('POST', `/api/oracle/verify/${claim.id}`);
    await req('POST', `/api/oracle/attest/${claim.id}`);

    const { status, body } = await req('GET', `/api/oracle/attestation/${claim.id}`);
    expect(status).toBe(200);
    expect(body.data.valid).toBe(true);
  });

  it('rejects attestation on non-verified claim', async () => {
    const { claim } = await setupClaim('ACCIDENT', 'att4');
    const { status, body } = await req('POST', `/api/oracle/attest/${claim.id}`);
    expect(status).toBe(400);
    expect(body.error.code).toBe('INVALID_TRANSITION');
  });

  it('returns 404 for invalid claim', async () => {
    const { status, body } = await req('GET', '/api/oracle/attestation/nonexistent');
    expect(status).toBe(404);
  });
});

describe('Full Oracle Flow E2E', () => {
  it('ACCIDENT: verify -> attest -> verify attestation', async () => {
    const { claim } = await setupClaim('ACCIDENT', 'flow1');

    // Step 1: Run verification
    const verifyRes = await req('POST', `/api/oracle/verify/${claim.id}`);
    expect(verifyRes.body.data.passed).toBe(true);
    expect(verifyRes.body.data.verifiedCount).toBe(2);

    // Step 2: Create attestation
    const attestRes = await req('POST', `/api/oracle/attest/${claim.id}`);
    expect(attestRes.body.data.hash).toBeTruthy();

    // Step 3: Verify attestation
    const verifyAttRes = await req('GET', `/api/oracle/attestation/${claim.id}`);
    expect(verifyAttRes.body.data.valid).toBe(true);

    // Step 4: Check claim state
    const claimRes = await req('GET', `/api/claims/${claim.id}`);
    expect(claimRes.body.data.status).toBe('PRELIMINARILY_VERIFIED');
    expect(claimRes.body.data.oracleAttestation).toBeTruthy();
  });

  it('DEATH: full verification with 3 sources', async () => {
    const { claim } = await setupClaim('DEATH', 'flow2');

    const verifyRes = await req('POST', `/api/oracle/verify/${claim.id}`);
    expect(verifyRes.body.data.verifiedCount).toBe(3);

    const attestRes = await req('POST', `/api/oracle/attest/${claim.id}`);
    expect(attestRes.status).toBe(200);

    const verifyAttRes = await req('GET', `/api/oracle/attestation/${claim.id}`);
    expect(verifyAttRes.body.data.valid).toBe(true);
  });
});
