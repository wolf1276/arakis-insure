import { apiRequest, buildQuery } from "./client";
import type { TreasuryBalance, FundingTransaction } from "@/types/models";

export function getTreasuryBalance() {
  return apiRequest<TreasuryBalance>("/api/funding/balance");
}

export function fundPayout(payoutId: string) {
  return apiRequest<{ payoutId: string; funded: boolean; source: "provider" | "treasury"; fundingTransactionId: string }>(
    `/api/funding/payout/${payoutId}`,
    { method: "POST" }
  );
}

export function listFundingTransactions(params?: { status?: string; provider?: string }) {
  return apiRequest<FundingTransaction[]>(`/api/funding/transactions${buildQuery(params)}`);
}

export function getFundingTransaction(id: string) {
  return apiRequest<FundingTransaction>(`/api/funding/transactions/${id}`);
}
