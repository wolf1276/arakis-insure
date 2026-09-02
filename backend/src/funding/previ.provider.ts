import type { FundingProvider, Balance, FundingRequest, FundingResult, FundingStatus } from './funding-provider.js';
import { config } from '../config.js';

export class PreviFundingProvider implements FundingProvider {
  private apiUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiUrl = config.previ.apiUrl;
    this.apiKey = config.previ.apiKey;
    this.apiSecret = config.previ.apiSecret;

    if (!this.apiUrl) {
      throw new Error('PREVI_API_URL is required for Previ funding provider');
    }
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async getBalance(): Promise<Balance> {
    const res = await fetch(`${this.apiUrl}/balance`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Previ balance check failed: ${res.status}`);
    const data = await res.json() as any;
    return { available: data.available, reserved: data.reserved ?? 0, asset: data.asset ?? 'XLM' };
  }

  async requestFunding(request: FundingRequest): Promise<FundingResult> {
    const res = await fetch(`${this.apiUrl}/funding`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        amount: request.amount,
        asset: request.asset,
        reference: request.payoutId,
        beneficiary: request.beneficiaryReference,
      }),
    });

    if (!res.ok) {
      return { success: false, amount: request.amount, asset: request.asset, error: `Previ funding failed: ${res.status}` };
    }

    const data = await res.json() as any;
    return {
      success: true,
      providerReference: data.reference,
      amount: request.amount,
      asset: request.asset,
    };
  }

  async getFundingStatus(reference: string): Promise<FundingStatus> {
    const res = await fetch(`${this.apiUrl}/funding/${reference}`, { headers: this.headers() });
    if (!res.ok) return 'FAILED';
    const data = await res.json() as any;
    return data.status as FundingStatus;
  }
}
