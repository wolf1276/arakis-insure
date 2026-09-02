import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Keypair } from '@stellar/stellar-sdk';
import { fundTestnetAccount, resetServer } from '../src/stellar/client.js';

const prisma = new PrismaClient();
let app: FastifyInstance;

async function req(method: string, url: string, body?: unknown) {
  const res = await app.inject({ method, url, payload: body });
  return { status: res.statusCode, body: res.json() };
}

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/surakshchain_test';
  process.env.STELLAR_NETWORK = 'testnet';
  process.env.STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org';
  process.env.FUNDING_PROVIDER = 'mock';
  process.env.MOCK_MODE = 'true';

  const treasuryKeypair = Keypair.random();
  await fundTestnetAccount(treasuryKeypair.publicKey());
  await new Promise((r) => setTimeout(r, 2000));
  process.env.STELLAR_TREASURY_PUBLIC_KEY = treasuryKeypair.publicKey();
  process.env.STELLAR_TREASURY_SECRET_KEY = treasuryKeypair.secret();
  resetServer();

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
}, 60000);

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

describe('Disaster Engine - Simulate', () => {
  it('verifies disaster when measurement > threshold and secondary confirmation', async () => {
    const result = await req('POST', '/api/disasters/simulate', {
      type: 'FLOOD',
      location: 'Village-A',
      measurement: 412,
      threshold: 350,
      secondaryConfirmation: true,
    });

    expect(result.status).toBe(201);
    expect(result.body.success).toBe(true);
    expect(result.body.data.verified).toBe(true);
    expect(result.body.data.type).toBe('FLOOD');
    expect(result.body.data.oracleAttestation).toBeTruthy();
  });

  it('rejects when measurement <= threshold', async () => {
    const result = await req('POST', '/api/disasters/simulate', {
      type: 'FLOOD',
      location: 'Village-B',
      measurement: 200,
      threshold: 350,
      secondaryConfirmation: true,
    });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.verified).toBe(false);
  });

  it('rejects when secondary confirmation missing', async () => {
    const result = await req('POST', '/api/disasters/simulate', {
      type: 'DROUGHT',
      location: 'Village-C',
      measurement: 500,
      threshold: 350,
      secondaryConfirmation: false,
    });

    expect(result.status).toBe(200);
    expect(result.body.data.verified).toBe(false);
  });
});

describe('Disaster Engine - Trigger Payouts', () => {
  it('creates parametric payouts for eligible policies', async () => {
    const user = await req('POST', '/api/users', {
      name: 'Disaster Test User',
      phone: '+919000009001',
    });

    const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
      name: 'Disaster Nominee',
      phone: '+919000009002',
      relationship: 'wife',
    });

    const policy = await req('POST', '/api/policies', {
      userId: user.body.data.id,
      nomineeId: nominee.body.data.id,
      coverageAmount: 50000,
      premium: 250,
      disasterCoverage: true,
      accidentCoverage: false,
      deathCoverage: false,
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2027-09-01T00:00:00.000Z',
    });

    await req('POST', `/api/policies/${policy.body.data.id}/activate`);

    const simulate = await req('POST', '/api/disasters/simulate', {
      type: 'FLOOD',
      location: 'TestVillage',
      measurement: 412,
      threshold: 350,
      secondaryConfirmation: true,
    });

    const trigger = await req('POST', `/api/disasters/${simulate.body.data.id}/trigger`);

    expect(trigger.status).toBe(200);
    expect(trigger.body.data.policiesAffected).toBeGreaterThanOrEqual(1);
    expect(trigger.body.data.payoutsExecuted).toBeGreaterThanOrEqual(1);
    expect(trigger.body.data.verified).toBe(true);
  }, 120000);
});

describe('Disaster Engine - Get/List', () => {
  it('GET /api/disasters/:id returns event with payouts', async () => {
    const simulate = await req('POST', '/api/disasters/simulate', {
      type: 'DROUGHT',
      location: 'TestGet',
      measurement: 500,
      threshold: 300,
      secondaryConfirmation: true,
    });

    const get = await req('GET', `/api/disasters/${simulate.body.data.id}`);
    expect(get.status).toBe(200);
    expect(get.body.data.id).toBe(simulate.body.data.id);
    expect(get.body.data.payouts).toBeDefined();
  });

  it('GET /api/disasters returns list', async () => {
    const list = await req('GET', '/api/disasters');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
  });
});
