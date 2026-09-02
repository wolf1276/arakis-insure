import { PrismaClient } from '@prisma/client';
import { createKeypair, fundTestnetAccountWithRetry } from '../src/stellar/client.js';

const prisma = new PrismaClient();

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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
