import { apiRequest } from "./client";

export function executeStellarPayout(payoutId: string) {
  return apiRequest<{ payoutId: string; stellarTransactionHash: string; amount: number; status: string; ledger: number }>(
    `/api/stellar/payout/${payoutId}`,
    { method: "POST" }
  );
}

export function getStellarTransaction(hash: string) {
  return apiRequest<{ hash: string; successful: boolean; ledger: number; created_at: string }>(
    `/api/stellar/transaction/${hash}`,
    { auth: false }
  );
}
