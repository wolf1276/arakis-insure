export interface Balance {
  available: number;
  reserved: number;
  asset: string;
}

export interface FundingRequest {
  amount: number;
  asset: string;
  payoutId: string;
  beneficiaryReference?: string;
}

export interface FundingResult {
  success: boolean;
  providerReference?: string;
  amount: number;
  asset: string;
  error?: string;
}

export interface FundingProvider {
  getBalance(): Promise<Balance>;
  requestFunding(request: FundingRequest): Promise<FundingResult>;
  getFundingStatus(reference: string): Promise<FundingStatus>;
}

export type FundingStatus = 'PENDING' | 'REQUESTED' | 'FUNDED' | 'FAILED';
