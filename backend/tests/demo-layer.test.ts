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

  // Fund the demo user's Stellar account on testnet
  const demoUserKeypair = Keypair.random();
  await fundTestnetAccount(demoUserKeypair.publicKey());
  await new Promise((r) => setTimeout(r, 2000));

  // Seed demo user + policy
  const user = await req('POST', '/api/users', {
    name: 'Demo Farmer',
    phone: '+919000000001',
    stellarAccount: demoUserKeypair.publicKey(),
  });

  const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
    name: 'Demo Nominee',
    phone: '+919000000002',
    relationship: 'wife',
  });

  const policy = await req('POST', '/api/policies', {
    userId: user.body.data.id,
    nomineeId: nominee.body.data.id,
    coverageAmount: 1000,
    premium: 50,
    disasterCoverage: true,
    accidentCoverage: true,
    deathCoverage: false,
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2027-09-01T00:00:00.000Z',
  });

  await req('POST', `/api/policies/${policy.body.data.id}/activate`);
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

describe('Demo Accident - Full Lifecycle', () => {
  it('POST /api/demo/accident runs full claim lifecycle with Stellar', async () => {
    const result = await req('POST', '/api/demo/accident');

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.claimId).toBeTruthy();
    expect(result.body.data.status).toBe('FINAL_PAID');
    expect(result.body.data.verification.passed).toBe(true);
    expect(result.body.data.advance.stellarTransactionHash).toBeTruthy();
    expect(result.body.data.finalPayout.stellarTransactionHash).toBeTruthy();
    expect(result.body.data.advance.amount).toBeGreaterThan(0);
    expect(result.body.data.finalPayout.amount).toBeGreaterThan(0);
  }, 120000);
});

describe('Demo Flood - Full Lifecycle', () => {
  it('POST /api/demo/flood triggers parametric payouts with Stellar', async () => {
    const result = await req('POST', '/api/demo/flood');

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.eventId).toBeTruthy();
    expect(result.body.data.type).toBe('FLOOD');
    expect(result.body.data.measurement).toBe(412);
    expect(result.body.data.threshold).toBe(350);
    expect(result.body.data.verified).toBe(true);
    expect(result.body.data.policiesAffected).toBeGreaterThanOrEqual(1);
    expect(result.body.data.payoutsExecuted).toBeGreaterThanOrEqual(1);
  }, 120000);
});
