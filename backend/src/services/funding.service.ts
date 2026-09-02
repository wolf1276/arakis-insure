import { prisma } from '../database/prisma.js';
import { AppError, notFound } from '../types/errors.js';
import { config } from '../config.js';
import { MockFundingProvider } from '../funding/mock.provider.js';
import { PreviFundingProvider } from '../funding/previ.provider.js';
import type { FundingProvider } from '../funding/funding-provider.js';

let provider: FundingProvider | null = null;

export function getProvider(): FundingProvider {
  if (!provider) {
    provider = config.fundingProvider === 'previ'
      ? new PreviFundingProvider()
      : new MockFundingProvider();
  }
  return provider;
}

export async function getTreasuryBalance() {
  return getProvider().getBalance();
}

export async function fundPayout(payoutId: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) throw notFound('payout', payoutId);

  if (payout.status !== 'PENDING') {
    throw new AppError('PAYOUT_ALREADY_EXECUTED', 'Payout is not in PENDING status', 400);
  }

  const balance = await getProvider().getBalance();
  if (balance.available < payout.amount.toNumber()) {
    const fundingResult = await getProvider().requestFunding({
      amount: payout.amount.toNumber(),
      asset: payout.asset,
      payoutId,
      beneficiaryReference: payout.beneficiaryReference ?? undefined,
    });

    if (!fundingResult.success) {
      throw new AppError('FUNDING_FAILED', fundingResult.error ?? 'Funding request failed', 400);
    }

    const fundingTx = await prisma.fundingTransaction.create({
      data: {
        provider: config.fundingProvider,
        externalReference: fundingResult.providerReference ?? null,
        amount: payout.amount,
        asset: payout.asset,
        status: 'FUNDED',
        metadata: fundingResult as any,
      },
    });

    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'FUNDING',
        fundingTransactionId: fundingTx.id,
      },
    });

    return { payoutId, funded: true, source: 'provider', fundingTransactionId: fundingTx.id };
  }

  const fundingTx = await prisma.fundingTransaction.create({
    data: {
      provider: 'treasury',
      amount: payout.amount,
      asset: payout.asset,
      status: 'FUNDED',
    },
  });

  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: 'FUNDED',
      fundingTransactionId: fundingTx.id,
    },
  });

  return { payoutId, funded: true, source: 'treasury', fundingTransactionId: fundingTx.id };
}

export async function getFundingStatus(fundingTransactionId: string) {
  const tx = await prisma.fundingTransaction.findUnique({ where: { id: fundingTransactionId } });
  if (!tx) throw notFound('funding transaction', fundingTransactionId);

  if (tx.externalReference) {
    const status = await getProvider().getFundingStatus(tx.externalReference);
    return { id: tx.id, status, provider: tx.provider, externalReference: tx.externalReference };
  }

  return { id: tx.id, status: tx.status, provider: tx.provider };
}

export async function listFundingTransactions(filters?: { status?: string; provider?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.provider) where.provider = filters.provider;

  return prisma.fundingTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}
