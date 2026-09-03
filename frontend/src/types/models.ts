export type UserRole = "USER" | "ORACLE" | "INSURER" | "ADMIN";
export type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: UserRole;
  language?: string;
  kycStatus?: KycStatus;
  stellarAccount?: string | null;
}

export interface Nominee {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  accountReference?: string | null;
  verified: boolean;
}

export type PolicyStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";

export interface Policy {
  id: string;
  policyNumber: string;
  userId: string;
  nomineeId?: string | null;
  nominee?: Nominee | null;
  coverageAmount: number;
  premium: number;
  disasterCoverage: boolean;
  accidentCoverage: boolean;
  deathCoverage: boolean;
  startDate: string;
  endDate: string;
  status: PolicyStatus;
}

export type ClaimType = "ACCIDENT" | "DEATH" | "FLOOD" | "DROUGHT";

export type ClaimStatus =
  | "SUBMITTED"
  | "VERIFYING"
  | "PRELIMINARILY_VERIFIED"
  | "ADVANCE_ELIGIBLE"
  | "ADVANCE_PAID"
  | "FULL_VERIFICATION"
  | "APPROVED"
  | "REJECTED"
  | "FRAUD"
  | "FINAL_PAID";

export type VerificationSource = "HOSPITAL" | "POLICE" | "CIVIL_REGISTRY";

export interface Verification {
  id: string;
  claimId: string;
  source: VerificationSource;
  verified: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type PayoutType = "ADVANCE" | "FINAL" | "PARAMETRIC";
export type PayoutStatus =
  | "PENDING"
  | "FUNDING"
  | "FUNDED"
  | "SUBMITTING"
  | "SUBMITTED"
  | "CONFIRMED"
  | "FAILED";

export interface Payout {
  id: string;
  claimId?: string | null;
  type: PayoutType;
  amount: number;
  status: PayoutStatus;
  stellarTransactionHash?: string | null;
  createdAt: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  policy?: Policy & { user?: User; nominee?: Nominee };
  type: ClaimType;
  description?: string | null;
  requestedAmount: number;
  advanceAmount?: number | null;
  finalAmount?: number | null;
  status: ClaimStatus;
  verifications?: Verification[];
  payouts?: Payout[];
  createdAt: string;
  resolvedAt?: string | null;
}

export type DisasterType = "FLOOD" | "DROUGHT" | "CYCLONE" | "EARTHQUAKE";

export interface DisasterEvent {
  id: string;
  type: DisasterType;
  location: string;
  measurement: number;
  threshold: number;
  secondaryConfirmation: boolean;
  verified: boolean;
  payouts?: Payout[];
  createdAt: string;
}

export interface TreasuryBalance {
  available: number;
  reserved: number;
  asset: string;
  totalFunded?: number;
}

export interface FundingTransaction {
  id: string;
  payoutId: string;
  status: string;
  provider: string;
  fundingTransactionId?: string | null;
  createdAt: string;
}

export interface DashboardStats {
  claims: { byStatus: Record<string, number> };
  payouts: { byStatus: Record<string, number>; totalPaid: number };
  disasters: { total: number; verified: number };
  policies: { byStatus: Record<string, number> };
}
