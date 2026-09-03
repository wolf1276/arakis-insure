export type ErrorCode =
  | 'USER_NOT_FOUND'
  | 'POLICY_NOT_FOUND'
  | 'POLICY_NOT_ACTIVE'
  | 'POLICY_ALREADY_ACTIVE'
  | 'CLAIM_NOT_FOUND'
  | 'CLAIM_ALREADY_PAID'
  | 'INSUFFICIENT_VERIFICATION'
  | 'INVALID_ATTESTATION'
  | 'PAYOUT_ALREADY_EXECUTED'
  | 'FUNDING_FAILED'
  | 'FUNDING_PENDING'
  | 'STELLAR_TRANSACTION_FAILED'
  | 'INSUFFICIENT_TREASURY'
  | 'INVALID_DISASTER_EVENT'
  | 'INVALID_TRANSITION'
  | 'ADVANCE_ALREADY_PAID'
  | 'NOMINEE_REQUIRED'
  | 'EVENT_NOT_FOUND'
  | 'EVENT_NOT_VERIFIED'
  | 'NO_DEMO_USER'
  | 'NO_DEMO_POLICY'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'USER_EXISTS'
  | 'PASSWORD_REQUIRED';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(entity: string, id: string): AppError {
  return new AppError(`${entity.toUpperCase()}_NOT_FOUND` as ErrorCode, `${entity} ${id} not found`, 404);
}
