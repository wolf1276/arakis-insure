import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Keypair } from '@stellar/stellar-sdk';
import { fundTestnetAccount, resetServer } from '../src/stellar/client.js';

const prisma = new PrismaClient();
let app: FastifyInstance;

async function req(method: string, url: string, body?: unknown, headers?: Record<string, string>) {
  const res = await app.inject({ method, url, payload: body, headers });
  return { status: res.statusCode, body: res.json() };
}

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/surakshchain_test';
  process.env.STELLAR_NETWORK = 'testnet';
  process.env.STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org';
  process.env.FUNDING_PROVIDER = 'mock';
  process.env.MOCK_MODE = 'true';
  process.env.JWT_SECRET = 'test-jwt-secret';

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

describe('Auth - Register', () => {
  it('registers a new user and returns token', async () => {
    const result = await req('POST', '/api/auth/register', {
      name: 'Auth Test User',
      phone: '+919800000001',
      password: 'password123',
    });

    expect(result.status).toBe(201);
    expect(result.body.success).toBe(true);
    expect(result.body.data.user.id).toBeTruthy();
    expect(result.body.data.user.name).toBe('Auth Test User');
    expect(result.body.data.user.role).toBe('USER');
    expect(result.body.data.token).toBeTruthy();
  });

  it('rejects duplicate phone', async () => {
    const result = await req('POST', '/api/auth/register', {
      name: 'Duplicate',
      phone: '+919800000001',
      password: 'password123',
    });

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe('USER_EXISTS');
  });

  it('rejects short password', async () => {
    const result = await req('POST', '/api/auth/register', {
      name: 'Short Pass',
      phone: '+919800000099',
      password: '123',
    });

    expect(result.status).toBe(400);
    expect(['VALIDATION_ERROR', 'FST_ERR_VALIDATION']).toContain(result.body.error.code);
  });
});

describe('Auth - Login', () => {
  it('logs in with correct credentials', async () => {
    const result = await req('POST', '/api/auth/login', {
      phone: '+919800000001',
      password: 'password123',
    });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.token).toBeTruthy();
    expect(result.body.data.user.id).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const result = await req('POST', '/api/auth/login', {
      phone: '+919800000001',
      password: 'wrongpassword',
    });

    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects non-existent user', async () => {
    const result = await req('POST', '/api/auth/login', {
      phone: '+919999999999',
      password: 'password123',
    });

    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('Auth - Me', () => {
  it('returns current user with valid token', async () => {
    const login = await req('POST', '/api/auth/login', {
      phone: '+919800000001',
      password: 'password123',
    });

    const me = await req('GET', '/api/auth/me', undefined, {
      authorization: `Bearer ${login.body.data.token}`,
    });

    expect(me.status).toBe(200);
    expect(me.body.data.userId).toBeTruthy();
    expect(me.body.data.role).toBe('USER');
  });

  it('rejects request without token', async () => {
    const me = await req('GET', '/api/auth/me');
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('RBAC - Authorization', () => {
  it('RBAC middleware exports authorize function', async () => {
    const { authorize } = await import('../src/middleware/rbac.js');
    expect(typeof authorize).toBe('function');
  });

  it('authorize returns middleware that allows matching role', async () => {
    const { authorize } = await import('../src/middleware/rbac.js');
    const middleware = authorize('ADMIN', 'INSURER');

    const mockRequest = { user: { userId: 'u1', role: 'ADMIN' } };
    const mockReply = {};

    await expect(middleware(mockRequest as any, mockReply as any)).resolves.toBeUndefined();
  });

  it('authorize returns middleware that rejects non-matching role', async () => {
    const { authorize } = await import('../src/middleware/rbac.js');
    const middleware = authorize('ADMIN');

    const mockRequest = { user: { userId: 'u1', role: 'USER' } };
    const mockReply = {};

    await expect(middleware(mockRequest as any, mockReply as any)).rejects.toThrow('Access denied');
  });

  it('authorize rejects unauthenticated request', async () => {
    const { authorize } = await import('../src/middleware/rbac.js');
    const middleware = authorize('USER');

    const mockRequest = {};
    const mockReply = {};

    await expect(middleware(mockRequest as any, mockReply as any)).rejects.toThrow('Authentication required');
  });
});

describe('Swagger - Documentation', () => {
  it('GET /docs returns Swagger UI', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs' });
    expect(res.statusCode).toBe(200);
  });

  it('GET /docs/json returns OpenAPI spec', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(res.statusCode).toBe(200);
    const spec = res.json();
    expect(spec.info.title).toBe('SurakshChain API');
    expect(spec.paths['/api/auth/register']).toBeTruthy();
    expect(spec.paths['/api/auth/login']).toBeTruthy();
  });
});

describe('Notifications - Mock Providers', () => {
  it('MockSMSProvider sends and records', async () => {
    const { MockSMSProvider } = await import('../src/notifications/mock-sms.provider.js');
    const provider = new MockSMSProvider();
    const result = await provider.send({ to: '+919800000001', message: 'test', channel: 'sms' });
    expect(result.sent).toBe(true);
    expect(result.provider).toBe('mock-sms');
    expect(provider.getSent()).toHaveLength(1);
  });

  it('MockWhatsAppProvider sends and records', async () => {
    const { MockWhatsAppProvider } = await import('../src/notifications/mock-whatsapp.provider.js');
    const provider = new MockWhatsAppProvider();
    const result = await provider.send({ to: '+919800000001', message: 'test', channel: 'whatsapp' });
    expect(result.sent).toBe(true);
    expect(result.provider).toBe('mock-whatsapp');
    expect(provider.getSent()).toHaveLength(1);
  });

  it('notification service sends to both providers', async () => {
    const { register } = await import('../src/services/auth.service.js');
    const newUser = await register({ name: 'Notif User', phone: '+919800000099', password: 'password123' });
    const { notifyPayoutCompleted } = await import('../src/notifications/notification.service.js');
    const result = await notifyPayoutCompleted(newUser.id, 'CLM-TEST', 1000, 'abc123');
    expect(result.sms).toBe(true);
    expect(result.whatsapp).toBe(true);
  });

  it('renderMessage produces correct output', async () => {
    const { renderMessage } = await import('../src/notifications/notification-provider.js');
    const msg = renderMessage('payout_completed', { claimNumber: 'CLM-001', amount: 5000, txHash: 'tx123' });
    expect(msg).toContain('CLM-001');
    expect(msg).toContain('5000');
    expect(msg).toContain('tx123');
  });
});
