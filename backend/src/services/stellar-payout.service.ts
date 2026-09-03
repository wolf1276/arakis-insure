import { prisma } from '../database/prisma.js';
import { AppError, notFound } from '../types/errors.js';
import { sendPayment } from '../stellar/transactions.js';

export async function executeStellarPayout(payoutId: string) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: {
      claim: { include: { policy: { include: { nominee: true, user: true } } } },
      policy: { include: { nominee: true, user: true } },
    },
  });

  if (!payout) throw notFound('payout', payoutId);

  if (payout.stellarTransactionHash) {
    throw new AppError('PAYOUT_ALREADY_EXECUTED', 'Payout already has a Stellar transaction', 400);
  }

  if (payout.status !== 'FUNDED') {
    throw new AppError('INVALID_TRANSITION', 'Payout must be FUNDED before Stellar settlement', 400);
  }

  const policy = payout.claim?.policy ?? payout.policy;

  let destination: string | null = null;

  if (policy?.nominee?.accountReference) {
    destination = policy.nominee.accountReference;
  } else if (policy?.user?.stellarAccount) {
    destination = policy.user.stellarAccount;
  }

  if (!destination) {
    throw new AppError(
      'STELLAR_TRANSACTION_FAILED',
      'No Stellar destination address found for beneficiary',
      400
    );
  }

  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: 'SUBMITTING' },
  });

  try {
    const result = await sendPayment(
      destination,
      payout.amount.toNumber(),
      `payout:${payoutId}`
    );

    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        stellarTransactionHash: result.hash,
        status: result.successful ? 'CONFIRMED' : 'FAILED',
        completedAt: result.successful ? new Date() : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'PAYOUT',
        entityId: payoutId,
        action: result.successful ? 'STELLAR_TRANSACTION_CONFIRMED' : 'STELLAR_TRANSACTION_FAILED',
        actor: 'stellar-settlement',
        metadata: {
          hash: result.hash,
          ledger: result.ledger,
          amount: payout.amount.toNumber(),
          destination,
        },
      },
    });

    return {
      payoutId,
      stellarTransactionHash: result.hash,
      amount: payout.amount.toNumber(),
      status: result.successful ? 'CONFIRMED' : 'FAILED',
      ledger: result.ledger,
    };
  } catch (err) {
    await prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'FAILED' },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'PAYOUT',
        entityId: payoutId,
        action: 'STELLAR_TRANSACTION_FAILED',
        actor: 'stellar-settlement',
        metadata: { error: (err as Error).message },
      },
    });

    throw err;
  }
}
