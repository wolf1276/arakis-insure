import { PrismaClient } from '@prisma/client';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createKeypair, fundTestnetAccountWithRetry } from '../src/stellar/client.js';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const DEMO_PASSWORD = 'demo1234';

async function main() {
  const treasuryCount = await prisma.treasury.count();
  if (treasuryCount === 0) {
    await prisma.treasury.create({
      data: {
        provider: 'MOCK',
        stellarAddress: process.env.STELLAR_TREASURY_PUBLIC_KEY || 'GDEMO_TREASURY',
        asset: 'XLM',
        availableBalance: 100000,
      },
    });
    console.log('Seeded treasury');
  }

  const farmerKeypair = createKeypair();
  await fundTestnetAccountWithRetry(farmerKeypair.publicKey());

  const nomineeKeypair = createKeypair();
  await fundTestnetAccountWithRetry(nomineeKeypair.publicKey());

  const user = await prisma.user.upsert({
    where: { phone: '+919999900001' },
    update: {},
    create: {
      name: 'Ramesh Kumar',
      phone: '+919999900001',
      language: 'hi',
      kycStatus: 'VERIFIED',
      stellarAccount: farmerKeypair.publicKey(),
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: 'USER',
    },
  });

  const opsUser = await prisma.user.upsert({
    where: { phone: '+919999900099' },
    update: {},
    create: {
      name: 'Ops Admin',
      phone: '+919999900099',
      language: 'en',
      kycStatus: 'VERIFIED',
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: 'ADMIN',
    },
  });

  const nominee = await prisma.nominee.upsert({
    where: { id: `${user.id}-demo-nominee` },
    update: {},
    create: {
      id: `${user.id}-demo-nominee`,
      userId: user.id,
      name: 'Sita Kumar',
      phone: '+919999900002',
      relationship: 'Spouse',
      accountReference: nomineeKeypair.publicKey(),
      verified: true,
    },
  });

  const policy = await prisma.policy.upsert({
    where: { policyNumber: 'DEMO-POL-0001' },
    update: {},
    create: {
      policyNumber: 'DEMO-POL-0001',
      userId: user.id,
      nomineeId: nominee.id,
      coverageAmount: 50000,
      premium: 500,
      disasterCoverage: true,
      accidentCoverage: true,
      deathCoverage: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
    },
  });

  console.log('Seeded demo user, nominee, policy:', { userId: user.id, policyId: policy.id });
  console.log('Demo login: +919999900001 / demo1234 (beneficiary)');
  console.log('Ops login: +919999900099 / demo1234 (admin), opsUserId:', opsUser.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
