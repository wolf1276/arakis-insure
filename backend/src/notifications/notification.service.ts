import type { NotificationProvider, NotificationMessage } from './notification-provider.js';
import { MockSMSProvider } from './mock-sms.provider.js';
import { MockWhatsAppProvider } from './mock-whatsapp.provider.js';
import { renderMessage } from './notification-provider.js';
import { prisma } from '../database/prisma.js';

let smsProvider: NotificationProvider | null = null;
let whatsappProvider: NotificationProvider | null = null;

export function getSMSProvider(): NotificationProvider {
  if (!smsProvider) smsProvider = new MockSMSProvider();
  return smsProvider;
}

export function getWhatsAppProvider(): NotificationProvider {
  if (!whatsappProvider) whatsappProvider = new MockWhatsAppProvider();
  return whatsappProvider;
}

export function resetProviders() {
  smsProvider = null;
  whatsappProvider = null;
}

export async function notifyUser(
  userId: string,
  message: NotificationMessage
): Promise<{ sms: boolean; whatsapp: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { sms: false, whatsapp: false };

  const text = renderMessage(message.type, message.data);

  let smsSent = false;
  let whatsappSent = false;

  try {
    const result = await getSMSProvider().send({
      to: user.phone,
      message: text,
      channel: 'sms',
    });
    smsSent = result.sent;
  } catch { /* continue */ }

  try {
    const result = await getWhatsAppProvider().send({
      to: user.phone,
      message: text,
      channel: 'whatsapp',
    });
    whatsappSent = result.sent;
  } catch { /* continue */ }

  return { sms: smsSent, whatsapp: whatsappSent };
}

export async function notifyClaimSubmitted(userId: string, claimNumber: string, claimType: string) {
  return notifyUser(userId, {
    recipientPhone: '',
    recipientName: '',
    type: 'claim_submitted',
    data: { claimNumber, claimType },
  });
}

export async function notifyPayoutCompleted(userId: string, claimNumber: string, amount: number, txHash: string) {
  return notifyUser(userId, {
    recipientPhone: '',
    recipientName: '',
    type: 'payout_completed',
    data: { claimNumber, amount, txHash },
  });
}

export async function notifyDisasterAlert(userId: string, eventType: string, location: string, measurement: number) {
  return notifyUser(userId, {
    recipientPhone: '',
    recipientName: '',
    type: 'disaster_alert',
    data: { eventType, location, measurement },
  });
}
