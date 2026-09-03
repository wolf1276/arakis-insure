export interface NotificationProvider {
  send(input: {
    to: string;
    message: string;
    channel: 'sms' | 'whatsapp';
  }): Promise<{ sent: boolean; provider: string; reference?: string }>;
}

export interface NotificationMessage {
  recipientPhone: string;
  recipientName: string;
  type: 'claim_submitted' | 'claim_verified' | 'payout_initiated' | 'payout_completed' | 'disaster_alert';
  data: Record<string, unknown>;
}

const TEMPLATES: Record<string, (data: Record<string, unknown>) => string> = {
  claim_submitted: (d) =>
    `SurakshChain: Your ${d.claimType} claim #${d.claimNumber} has been submitted. We'll verify it shortly.`,
  claim_verified: (d) =>
    `SurakshChain: Your claim #${d.claimNumber} has been verified. Payout of ₹${d.amount} is being processed.`,
  payout_initiated: (d) =>
    `SurakshChain: Your payout of ₹${d.amount} for claim #${d.claimNumber} has been initiated via Stellar.`,
  payout_completed: (d) =>
    `SurakshChain: ₹${d.amount} for claim #${d.claimNumber} has been sent to your Stellar wallet. Tx: ${d.txHash}`,
  disaster_alert: (d) =>
    `SurakshChain ALERT: ${d.eventType} detected in ${d.location}. Measurement: ${d.measurement}. Parametric payouts are being processed.`,
};

export function renderMessage(type: NotificationMessage['type'], data: Record<string, unknown>): string {
  const template = TEMPLATES[type];
  if (!template) return `SurakshChain notification: ${JSON.stringify(data)}`;
  return template(data);
}
