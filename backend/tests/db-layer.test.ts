import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function cleanDb() {
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
}

describe('Database Layer E2E', () => {
  beforeAll(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
  });

  describe('User', () => {
    it('creates and retrieves a user', async () => {
      const user = await prisma.user.create({
        data: {
          externalId: 'EXT-001',
          name: 'Ramesh Kumar',
          phone: '+919876543210',
          language: 'hi',
        },
      });

      expect(user.id).toBeTruthy();
      expect(user.name).toBe('Ramesh Kumar');
      expect(user.kycStatus).toBe('PENDING');

      const found = await prisma.user.findUnique({ where: { id: user.id } });
      expect(found).toBeTruthy();
      expect(found!.phone).toBe('+919876543210');
    });

    it('enforces unique phone', async () => {
      await expect(
        prisma.user.create({
          data: {
            name: 'Duplicate',
            phone: '+919876543210',
          },
        })
      ).rejects.toThrow();
    });

    it('enforces unique externalId', async () => {
      await expect(
        prisma.user.create({
          data: {
            externalId: 'EXT-001',
            name: 'Another',
            phone: '+919999999999',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Nominee', () => {
    it('creates nominee linked to user', async () => {
      const user = await prisma.user.create({
        data: { name: 'Suresh', phone: '+911111111111' },
      });

      const nominee = await prisma.nominee.create({
        data: {
          userId: user.id,
          name: 'Priya',
          phone: '+912222222222',
          relationship: 'wife',
        },
      });

      expect(nominee.id).toBeTruthy();
      expect(nominee.userId).toBe(user.id);
      expect(nominee.verified).toBe(false);
    });

    it('queries nominees by userId', async () => {
      const user = await prisma.user.create({
        data: { name: 'MultiNom', phone: '+913333333333' },
      });

      await prisma.nominee.createMany({
        data: [
          { userId: user.id, name: 'N1', phone: '+914444444441', relationship: 'son' },
          { userId: user.id, name: 'N2', phone: '+914444444442', relationship: 'daughter' },
        ],
      });

      const nominees = await prisma.nominee.findMany({ where: { userId: user.id } });
      expect(nominees).toHaveLength(2);
    });
  });

  describe('Policy', () => {
    it('creates policy with user and nominee', async () => {
      const user = await prisma.user.create({
        data: { name: 'PolicyUser', phone: '+915555555555' },
      });

      const nominee = await prisma.nominee.create({
        data: {
          userId: user.id,
          name: 'PolicyNominee',
          phone: '+916666666666',
          relationship: 'husband',
        },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-001',
          userId: user.id,
          nomineeId: nominee.id,
          coverageAmount: 100000,
          premium: 500,
          accidentCoverage: true,
          deathCoverage: true,
          disasterCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });

      expect(policy.policyNumber).toBe('POL-001');
      expect(policy.status).toBe('ACTIVE');
      expect(policy.coverageAmount.toNumber()).toBe(100000);
    });

    it('queries policies by userId (index test)', async () => {
      const user = await prisma.user.create({
        data: { name: 'IndexUser', phone: '+917777777777' },
      });

      await prisma.policy.createMany({
        data: [
          {
            policyNumber: 'POL-IDX-001',
            userId: user.id,
            coverageAmount: 50000,
            premium: 250,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 86400000),
          },
          {
            policyNumber: 'POL-IDX-002',
            userId: user.id,
            coverageAmount: 75000,
            premium: 375,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 86400000),
          },
        ],
      });

      const policies = await prisma.policy.findMany({ where: { userId: user.id } });
      expect(policies).toHaveLength(2);
    });

    it('queries policies by status (index test)', async () => {
      const activePolicies = await prisma.policy.findMany({
        where: { status: 'ACTIVE' },
        take: 5,
      });
      expect(Array.isArray(activePolicies)).toBe(true);
    });

    it('enforces unique policyNumber', async () => {
      const user = await prisma.user.create({
        data: { name: 'DupPolicy', phone: '+918888888888' },
      });

      await prisma.policy.create({
        data: {
          policyNumber: 'POL-DUP',
          userId: user.id,
          coverageAmount: 10000,
          premium: 100,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
      });

      await expect(
        prisma.policy.create({
          data: {
            policyNumber: 'POL-DUP',
            userId: user.id,
            coverageAmount: 20000,
            premium: 200,
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Claim', () => {
    it('creates claim linked to policy', async () => {
      const user = await prisma.user.create({
        data: { name: 'ClaimUser', phone: '+910000000001' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-CLM-001',
          userId: user.id,
          coverageAmount: 100000,
          premium: 500,
          accidentCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
      });

      const claim = await prisma.claim.create({
        data: {
          claimNumber: 'CLM-001',
          policyId: policy.id,
          type: 'ACCIDENT',
          description: 'Road accident near village',
          requestedAmount: 100000,
          status: 'SUBMITTED',
        },
      });

      expect(claim.claimNumber).toBe('CLM-001');
      expect(claim.type).toBe('ACCIDENT');
      expect(claim.status).toBe('SUBMITTED');
    });

    it('queries claims by policyId (index test)', async () => {
      const user = await prisma.user.create({
        data: { name: 'ClmIdx', phone: '+910000000002' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-CLM-IDX',
          userId: user.id,
          coverageAmount: 50000,
          premium: 250,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
      });

      await prisma.claim.createMany({
        data: [
          {
            claimNumber: 'CLM-IDX-001',
            policyId: policy.id,
            type: 'ACCIDENT',
            requestedAmount: 50000,
          },
          {
            claimNumber: 'CLM-IDX-002',
            policyId: policy.id,
            type: 'DEATH',
            requestedAmount: 50000,
          },
        ],
      });

      const claims = await prisma.claim.findMany({ where: { policyId: policy.id } });
      expect(claims).toHaveLength(2);
    });

    it('queries claims by status (index test)', async () => {
      const submittedClaims = await prisma.claim.findMany({
        where: { status: 'SUBMITTED' },
        take: 5,
      });
      expect(Array.isArray(submittedClaims)).toBe(true);
    });

    it('enforces unique claimNumber', async () => {
      const user = await prisma.user.create({
        data: { name: 'DupClaim', phone: '+910000000003' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-DUP-CLM',
          userId: user.id,
          coverageAmount: 10000,
          premium: 100,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
      });

      await prisma.claim.create({
        data: {
          claimNumber: 'CLM-DUP',
          policyId: policy.id,
          type: 'ACCIDENT',
          requestedAmount: 10000,
        },
      });

      await expect(
        prisma.claim.create({
          data: {
            claimNumber: 'CLM-DUP',
            policyId: policy.id,
            type: 'DEATH',
            requestedAmount: 10000,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Verification', () => {
    it('creates verification linked to claim', async () => {
      const user = await prisma.user.create({
        data: { name: 'VerifUser', phone: '+910000000004' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-VER-001',
          userId: user.id,
          coverageAmount: 100000,
          premium: 500,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
      });

      const claim = await prisma.claim.create({
        data: {
          claimNumber: 'CLM-VER-001',
          policyId: policy.id,
          type: 'ACCIDENT',
          requestedAmount: 100000,
        },
      });

      const verif = await prisma.verification.create({
        data: {
          claimId: claim.id,
          source: 'HOSPITAL',
          verified: true,
          referenceHash: 'abc123',
          verifiedAt: new Date(),
        },
      });

      expect(verif.source).toBe('HOSPITAL');
      expect(verif.verified).toBe(true);
    });

    it('queries verifications by claimId (index test)', async () => {
      const user = await prisma.user.create({
        data: { name: 'VerIdx', phone: '+910000000005' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-VER-IDX',
          userId: user.id,
          coverageAmount: 50000,
          premium: 250,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
      });

      const claim = await prisma.claim.create({
        data: {
          claimNumber: 'CLM-VER-IDX',
          policyId: policy.id,
          type: 'ACCIDENT',
          requestedAmount: 50000,
        },
      });

      await prisma.verification.createMany({
        data: [
          { claimId: claim.id, source: 'HOSPITAL', verified: true },
          { claimId: claim.id, source: 'POLICE', verified: true },
          { claimId: claim.id, source: 'CIVIL_REGISTRY', verified: false },
        ],
      });

      const verifs = await prisma.verification.findMany({ where: { claimId: claim.id } });
      expect(verifs).toHaveLength(3);

      const verifiedCount = verifs.filter((v) => v.verified).length;
      expect(verifiedCount).toBe(2);
    });
  });

  describe('DisasterEvent', () => {
    it('creates disaster event', async () => {
      const event = await prisma.disasterEvent.create({
        data: {
          type: 'FLOOD',
          location: 'Village-A',
          measurement: 412,
          threshold: 350,
          secondaryConfirmation: true,
          verified: true,
        },
      });

      expect(event.type).toBe('FLOOD');
      expect(event.verified).toBe(true);
      expect(event.measurement.toNumber()).toBe(412);
    });
  });

  describe('Treasury', () => {
    it('creates treasury record', async () => {
      const treasury = await prisma.treasury.create({
        data: {
          provider: 'mock',
          stellarAddress: 'GABC1234567890',
          asset: 'XLM',
          availableBalance: 1000000,
          reservedBalance: 0,
          status: 'ACTIVE',
        },
      });

      expect(treasury.availableBalance.toNumber()).toBe(1000000);
      expect(treasury.status).toBe('ACTIVE');
    });
  });

  describe('FundingTransaction', () => {
    it('creates funding transaction', async () => {
      const tx = await prisma.fundingTransaction.create({
        data: {
          provider: 'mock',
          amount: 10000,
          asset: 'XLM',
          status: 'PENDING',
        },
      });

      expect(tx.provider).toBe('mock');
      expect(tx.status).toBe('PENDING');
    });

    it('queries by provider+status (index test)', async () => {
      const txs = await prisma.fundingTransaction.findMany({
        where: { provider: 'mock', status: 'PENDING' },
        take: 5,
      });
      expect(Array.isArray(txs)).toBe(true);
    });
  });

  describe('Payout - CRITICAL financial invariants', () => {
    it('creates payout linked to claim', async () => {
      const user = await prisma.user.create({
        data: { name: 'PayUser', phone: '+910000000006' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-PAY-001',
          userId: user.id,
          coverageAmount: 100000,
          premium: 500,
          accidentCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
      });

      const claim = await prisma.claim.create({
        data: {
          claimNumber: 'CLM-PAY-001',
          policyId: policy.id,
          type: 'ACCIDENT',
          requestedAmount: 100000,
        },
      });

      const payout = await prisma.payout.create({
        data: {
          claimId: claim.id,
          policyId: policy.id,
          type: 'ADVANCE',
          amount: 10000,
          beneficiaryReference: user.id,
        },
      });

      expect(payout.type).toBe('ADVANCE');
      expect(payout.amount.toNumber()).toBe(10000);
      expect(payout.status).toBe('PENDING');
    });

    it('ENFORCES: no double ADVANCE payout for same claim', async () => {
      const user = await prisma.user.create({
        data: { name: 'DoubleAdv', phone: '+910000000007' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-DBL-ADV',
          userId: user.id,
          coverageAmount: 100000,
          premium: 500,
          accidentCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
      });

      const claim = await prisma.claim.create({
        data: {
          claimNumber: 'CLM-DBL-ADV',
          policyId: policy.id,
          type: 'ACCIDENT',
          requestedAmount: 100000,
        },
      });

      await prisma.payout.create({
        data: {
          claimId: claim.id,
          policyId: policy.id,
          type: 'ADVANCE',
          amount: 10000,
        },
      });

      // Second ADVANCE for same claim MUST fail
      await expect(
        prisma.payout.create({
          data: {
            claimId: claim.id,
            policyId: policy.id,
            type: 'ADVANCE',
            amount: 10000,
          },
        })
      ).rejects.toThrow();
    });

    it('ALLOWS: ADVANCE + FINAL for same claim (different types)', async () => {
      const user = await prisma.user.create({
        data: { name: 'AdvFinal', phone: '+910000000008' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-ADV-FIN',
          userId: user.id,
          coverageAmount: 100000,
          premium: 500,
          accidentCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
      });

      const claim = await prisma.claim.create({
        data: {
          claimNumber: 'CLM-ADV-FIN',
          policyId: policy.id,
          type: 'ACCIDENT',
          requestedAmount: 100000,
        },
      });

      await prisma.payout.create({
        data: {
          claimId: claim.id,
          policyId: policy.id,
          type: 'ADVANCE',
          amount: 10000,
        },
      });

      const finalPayout = await prisma.payout.create({
        data: {
          claimId: claim.id,
          policyId: policy.id,
          type: 'FINAL',
          amount: 90000,
        },
      });

      expect(finalPayout.type).toBe('FINAL');
      expect(finalPayout.amount.toNumber()).toBe(90000);
    });

    it('ENFORCES: no double FINAL payout for same claim', async () => {
      const user = await prisma.user.create({
        data: { name: 'DoubleFinal', phone: '+910000000009' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-DBL-FIN',
          userId: user.id,
          coverageAmount: 100000,
          premium: 500,
          accidentCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
      });

      const claim = await prisma.claim.create({
        data: {
          claimNumber: 'CLM-DBL-FIN',
          policyId: policy.id,
          type: 'ACCIDENT',
          requestedAmount: 100000,
        },
      });

      await prisma.payout.create({
        data: {
          claimId: claim.id,
          policyId: policy.id,
          type: 'FINAL',
          amount: 90000,
        },
      });

      await expect(
        prisma.payout.create({
          data: {
            claimId: claim.id,
            policyId: policy.id,
            type: 'FINAL',
            amount: 90000,
          },
        })
      ).rejects.toThrow();
    });

    it('ENFORCES: no double payout for same disaster+policy', async () => {
      const user = await prisma.user.create({
        data: { name: 'DisasterPay', phone: '+910000000010' },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-DIS-PAY',
          userId: user.id,
          coverageAmount: 100000,
          premium: 500,
          disasterCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
      });

      const disaster = await prisma.disasterEvent.create({
        data: {
          type: 'FLOOD',
          location: 'Village-B',
          measurement: 412,
          threshold: 350,
          secondaryConfirmation: true,
          verified: true,
        },
      });

      await prisma.payout.create({
        data: {
          disasterEventId: disaster.id,
          policyId: policy.id,
          type: 'PARAMETRIC',
          amount: 100000,
          beneficiaryReference: user.id,
        },
      });

      // Second payout for same disaster+policy MUST fail
      await expect(
        prisma.payout.create({
          data: {
            disasterEventId: disaster.id,
            policyId: policy.id,
            type: 'PARAMETRIC',
            amount: 100000,
          },
        })
      ).rejects.toThrow();
    });

    it('ALLOWS: different policies for same disaster', async () => {
      const user = await prisma.user.create({
        data: { name: 'MultiPol', phone: '+910000000011' },
      });

      const policy1 = await prisma.policy.create({
        data: {
          policyNumber: 'POL-MULTI-1',
          userId: user.id,
          coverageAmount: 50000,
          premium: 250,
          disasterCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
      });

      const policy2 = await prisma.policy.create({
        data: {
          policyNumber: 'POL-MULTI-2',
          userId: user.id,
          coverageAmount: 75000,
          premium: 375,
          disasterCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
      });

      const disaster = await prisma.disasterEvent.create({
        data: {
          type: 'FLOOD',
          location: 'Village-C',
          measurement: 500,
          threshold: 350,
          secondaryConfirmation: true,
          verified: true,
        },
      });

      await prisma.payout.create({
        data: {
          disasterEventId: disaster.id,
          policyId: policy1.id,
          type: 'PARAMETRIC',
          amount: 50000,
        },
      });

      const payout2 = await prisma.payout.create({
        data: {
          disasterEventId: disaster.id,
          policyId: policy2.id,
          type: 'PARAMETRIC',
          amount: 75000,
        },
      });

      expect(payout2.amount.toNumber()).toBe(75000);
    });

    it('queries payouts by claimId (index test)', async () => {
      const payouts = await prisma.payout.findMany({
        where: { claimId: { not: null } },
        take: 5,
      });
      expect(Array.isArray(payouts)).toBe(true);
    });

    it('queries payouts by status (index test)', async () => {
      const pendingPayouts = await prisma.payout.findMany({
        where: { status: 'PENDING' },
        take: 5,
      });
      expect(Array.isArray(pendingPayouts)).toBe(true);
    });
  });

  describe('AuditLog', () => {
    it('creates audit log', async () => {
      const log = await prisma.auditLog.create({
        data: {
          entityType: 'USER',
          entityId: 'user-123',
          action: 'USER_CREATED',
          actor: 'system',
          metadata: { source: 'api' },
        },
      });

      expect(log.entityType).toBe('USER');
      expect(log.action).toBe('USER_CREATED');
    });

    it('queries audit logs by entityType+entityId (composite index test)', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { entityType: 'USER', entityId: 'user-123' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Relations - full lifecycle', () => {
    it('user -> nominee -> policy -> claim -> verification -> payout chain', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'FullChain',
          phone: '+910000000012',
          externalId: 'FULL-CHAIN-001',
        },
      });

      const nominee = await prisma.nominee.create({
        data: {
          userId: user.id,
          name: 'Chain Nominee',
          phone: '+910000000013',
          relationship: 'son',
        },
      });

      const policy = await prisma.policy.create({
        data: {
          policyNumber: 'POL-FULL-CHAIN',
          userId: user.id,
          nomineeId: nominee.id,
          coverageAmount: 100000,
          premium: 500,
          accidentCoverage: true,
          deathCoverage: true,
          disasterCoverage: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 86400000),
          status: 'ACTIVE',
        },
      });

      const claim = await prisma.claim.create({
        data: {
          claimNumber: 'CLM-FULL-CHAIN',
          policyId: policy.id,
          type: 'ACCIDENT',
          description: 'Test accident',
          requestedAmount: 100000,
        },
      });

      const [hosp, police, civil] = await Promise.all([
        prisma.verification.create({
          data: { claimId: claim.id, source: 'HOSPITAL', verified: true, verifiedAt: new Date() },
        }),
        prisma.verification.create({
          data: { claimId: claim.id, source: 'POLICE', verified: true, verifiedAt: new Date() },
        }),
        prisma.verification.create({
          data: { claimId: claim.id, source: 'CIVIL_REGISTRY', verified: false },
        }),
      ]);

      expect(hosp.verified).toBe(true);
      expect(police.verified).toBe(true);
      expect(civil.verified).toBe(false);

      const verifiedCount = [hosp, police, civil].filter((v) => v.verified).length;
      expect(verifiedCount).toBe(2);

      const advancePayout = await prisma.payout.create({
        data: {
          claimId: claim.id,
          policyId: policy.id,
          type: 'ADVANCE',
          amount: 10000,
          beneficiaryReference: nominee.id,
        },
      });

      const finalPayout = await prisma.payout.create({
        data: {
          claimId: claim.id,
          policyId: policy.id,
          type: 'FINAL',
          amount: 90000,
          beneficiaryReference: nominee.id,
        },
      });

      expect(advancePayout.amount.toNumber()).toBe(10000);
      expect(finalPayout.amount.toNumber()).toBe(90000);

      // Verify include chain works
      const fullClaim = await prisma.claim.findUnique({
        where: { id: claim.id },
        include: {
          policy: { include: { user: true, nominee: true } },
          verifications: true,
          payouts: true,
        },
      });

      expect(fullClaim!.policy.user.name).toBe('FullChain');
      expect(fullClaim!.policy.nominee!.name).toBe('Chain Nominee');
      expect(fullClaim!.verifications).toHaveLength(3);
      expect(fullClaim!.payouts).toHaveLength(2);
    });
  });
});
