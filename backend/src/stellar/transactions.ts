import {
  TransactionBuilder,
  Operation,
  Asset,
  Keypair,
  Memo,
} from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase, getTreasuryKeypair } from './client.js';
import { AppError } from '../types/errors.js';

export async function sendPayment(
  destination: string,
  amount: number,
  memo?: string
): Promise<{ hash: string; ledger: number; successful: boolean }> {
  const server = getServer();
  const keypair = getTreasuryKeypair();
  const sourceAccount = await server.loadAccount(keypair.publicKey());

  const builder = new TransactionBuilder(sourceAccount, {
    fee: String(await server.fetchBaseFee()),
    networkPassphrase: getNetworkPassphrase(),
  });

  builder.addOperation(
    Operation.payment({
      destination,
      asset: Asset.native(),
      amount: amount.toFixed(7),
    })
  );

  if (memo) {
    builder.addMemo(Memo.text(memo.slice(0, 28)));
  }

  const tx = builder.setTimeout(180).build();
  tx.sign(keypair);

  try {
    const result = await server.submitTransaction(tx);

    if (!result.successful) {
      throw new AppError(
        'STELLAR_TRANSACTION_FAILED',
        `Stellar transaction failed: ${result.result_xdr}`,
        500
      );
    }

    return {
      hash: result.hash,
      ledger: result.ledger,
      successful: result.successful,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      'STELLAR_TRANSACTION_FAILED',
      `Stellar submission error: ${(err as Error).message}`,
      500
    );
  }
}

export async function getTransactionStatus(hash: string) {
  const server = getServer();

  try {
    const tx = await server.transactions().transaction(hash).call();
    return {
      hash: String(tx.hash),
      successful: tx.successful,
      ledger: Number(tx.ledger),
      created_at: String(tx.created_at),
    };
  } catch (err) {
    throw new AppError(
      'STELLAR_TRANSACTION_FAILED',
      `Transaction ${hash} not found: ${(err as Error).message}`,
      404
    );
  }
}
