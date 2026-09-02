import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Keypair } from '@stellar/stellar-sdk';
import { fundTestnetAccount, getServer, getTreasuryKeypair, resetServer } from '../src/stellar/client.js';
import { sendPayment, getTransactionStatus } from '../src/stellar/transactions.js';

const prisma = new PrismaClient();
let app: FastifyInstance;
let treasuryKeypair: Keypair;

async function req(method: string, url: string, body?: unknown) {
  const res = await app.inject({ method, url, payload: body });
  return { status: res.statusCode, body: res.json() };
}

async function setupClaimWithStellarAddress(suffix: string) {
  const recipientKeypair = Keypair.random();

  // Fund the recipient on testnet so the account exists
  await fundTestnetAccount(recipientKeypair.publicKey());
  await new Promise((r) => setTimeout(r, 2000));

  const user = await req('POST', '/api/users', {
    name: `Stellar User ${suffix}`,
    phone: `+919000006${suffix}`,
  });

  const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
    name: `Stellar Nom ${suffix}`,
    phone: `+919000007${suffix}`,
    relationship: 'wife',
  });

  // Set stellar account on user for receiving payouts
  await prisma.user.update({
    where: { id: user.body.data.id },
    data: { stellarAccount: recipientKeypair.publicKey() },
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

  // Full verification
  await req('POST', `/api/claims/${cid}/start-verification`);
  await req('POST', `/api/oracle/verify/${cid}`);
  await req('POST', `/api/claims/${cid}/authorize-advance`);

  // Create payout
  const payout = await req('POST', `/api/claims/${cid}/payout`, {
    type: 'ADVANCE',
    amount: 1,
  });

  // Fund payout
  await req('POST', `/api/funding/payout/${payout.body.data.id}`);

  return {
    user: user.body.data,
    policy: policy.body.data,
    claim: claim.body.data,
    payout: payout.body.data,
    recipientKeypair,
  };
}

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  // Create fresh treasury for this test suite
  treasuryKeypair = Keypair.random();
  await fundTestnetAccount(treasuryKeypair.publicKey());

  // Update config to use test treasury
  process.env.STELLAR_TREASURY_PUBLIC_KEY = treasuryKeypair.publicKey();
  process.env.STELLAR_TREASURY_SECRET_KEY = treasuryKeypair.secret();

  // Reset server singleton so it picks up the new config
  resetServer();
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
}, 30000);

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

describe('Stellar Client', () => {
  it('creates and funds a testnet account via friendbot', async () => {
    const keypair = Keypair.random();
    await fundTestnetAccount(keypair.publicKey());

    const server = getServer();
    const account = await server.loadAccount(keypair.publicKey());
    expect(account.account_id).toBe(keypair.publicKey());

    const balance = account.balances.find((b) => b.asset_type === 'native');
    expect(Number(balance?.balance)).toBeGreaterThan(0);
  }, 30000);

  it('funded account has ~10,000 XLM', async () => {
    const keypair = Keypair.random();
    await fundTestnetAccount(keypair.publicKey());

    const server = getServer();
    const account = await server.loadAccount(keypair.publicKey());
    const balance = account.balances.find((b) => b.asset_type === 'native');
    expect(Number(balance?.balance)).toBeGreaterThanOrEqual(9999);
  }, 30000);
});

describe('Stellar Transactions - Real Testnet', () => {
  it('sends 1 XLM from treasury to recipient', async () => {
    const recipient = Keypair.random();
    await fundTestnetAccount(recipient.publicKey());

    // Small delay for Horizon indexing
    await new Promise((r) => setTimeout(r, 1000));

    const result = await sendPayment(recipient.publicKey(), 1, 'test-payment');
    expect(result.hash).toBeTruthy();
    expect(result.successful).toBe(true);
    expect(result.ledger).toBeGreaterThan(0);

    // Verify on Horizon
    const server = getServer();
    const tx = await server.transactions().transaction(result.hash).call();
    expect(tx.successful).toBe(true);
  }, 60000);

  it('gets transaction status from Horizon', async () => {
    const recipient = Keypair.random();
    await fundTestnetAccount(recipient.publicKey());
    await new Promise((r) => setTimeout(r, 2000));

    const result = await sendPayment(recipient.publicKey(), 0.5, 'status-check');
    await new Promise((r) => setTimeout(r, 3000));
    const status = await getTransactionStatus(result.hash);

    expect(status.hash).toBe(result.hash);
    expect(status.successful).toBe(true);
    expect(status.ledger).toBeDefined();
    expect(status.created_at).toBeDefined();
  }, 60000);
});

describe('Stellar Payout Service - Real Testnet', () => {
  it('full flow: payout -> fund -> stellar -> confirmed', async () => {
    const { payout, recipientKeypair } = await setupClaimWithStellarAddress('stellar1');

    const result = await req('POST', `/api/stellar/payout/${payout.id}`);
    expect(result.status).toBe(200);
    expect(result.body.data.stellarTransactionHash).toBeTruthy();
    expect(result.body.data.status).toBe('CONFIRMED');
    expect(result.body.data.amount).toBe(1);

    // Verify payout in DB
    const dbPayout = await prisma.payout.findUnique({ where: { id: payout.id } });
    expect(dbPayout!.stellarTransactionHash).toBeTruthy();
    expect(dbPayout!.status).toBe('CONFIRMED');
    expect(dbPayout!.completedAt).toBeTruthy();

    // Verify Stellar transaction
    const txStatus = await getTransactionStatus(dbPayout!.stellarTransactionHash!);
    expect(txStatus.successful).toBe(true);
  }, 120000);

  it('rejects payout that was already executed', async () => {
    const { payout } = await setupClaimWithStellarAddress('stellar2');

    // First execution succeeds
    const first = await req('POST', `/api/stellar/payout/${payout.id}`);
    expect(first.status).toBe(200);

    // Second execution is rejected
    const { status, body } = await req('POST', `/api/stellar/payout/${payout.id}`);
    expect(status).toBe(400);
    expect(body.error.code).toBe('PAYOUT_ALREADY_EXECUTED');
  }, 120000);

  it('rejects payout with no stellar destination', async () => {
    const user = await req('POST', '/api/users', {
      name: 'No Stellar',
      phone: '+919000008001',
    });
    const nominee = await req('POST', `/api/users/${user.body.data.id}/nominee`, {
      name: 'No Stellar Nom',
      phone: '+919000008002',
      relationship: 'son',
    });
    const policy = await req('POST', '/api/policies', {
      userId: user.body.data.id,
      nomineeId: nominee.body.data.id,
      coverageAmount: 100000,
      premium: 500,
      accidentCoverage: true,
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

    await req('POST', `/api/claims/${cid}/start-verification`);
    await req('POST', `/api/oracle/verify/${cid}`);
    await req('POST', `/api/claims/${cid}/authorize-advance`);

    const payout = await req('POST', `/api/claims/${cid}/payout`, {
      type: 'ADVANCE',
      amount: 10000,
    });
    await req('POST', `/api/funding/payout/${payout.body.data.id}`);

    const { status, body } = await req('POST', `/api/stellar/payout/${payout.body.data.id}`);
    expect(status).toBe(400);
    expect(body.error.code).toBe('STELLAR_TRANSACTION_FAILED');
  }, 120000);

  it('GET /api/stellar/transaction/:hash - checks real tx', async () => {
    const recipient = Keypair.random();
    await fundTestnetAccount(recipient.publicKey());
    await new Promise((r) => setTimeout(r, 1000));

    const sent = await sendPayment(recipient.publicKey(), 1, 'route-check');

    const { status, body } = await req('GET', `/api/stellar/transaction/${sent.hash}`);
    expect(status).toBe(200);
    expect(body.data.successful).toBe(true);
    expect(body.data.hash).toBe(sent.hash);
  }, 60000);
});
