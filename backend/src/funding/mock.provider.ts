import type { FundingProvider, Balance, FundingRequest, FundingResult, FundingStatus } from './funding-provider.js';

export class MockFundingProvider implements FundingProvider {
  private balance: number;
  private fundings = new Map<string, FundingResult>();

  constructor(initialBalance: number = 1_000_000) {
    this.balance = initialBalance;
  }

  async getBalance(): Promise<Balance> {
    return {
      available: this.balance,
      reserved: 0,
      asset: 'XLM',
    };
  }

  async requestFunding(request: FundingRequest): Promise<FundingResult> {
    if (request.amount > this.balance) {
      return {
        success: false,
        amount: request.amount,
        asset: request.asset,
        error: 'Insufficient mock treasury balance',
      };
    }

    this.balance -= request.amount;

    const providerReference = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const result: FundingResult = {
      success: true,
      providerReference,
      amount: request.amount,
      asset: request.asset,
    };

    this.fundings.set(providerReference, result);
    return result;
  }

  async getFundingStatus(reference: string): Promise<FundingStatus> {
    const funding = this.fundings.get(reference);
    if (!funding) return 'FAILED';
    return funding.success ? 'FUNDED' : 'FAILED';
  }
}
