import type { NotificationProvider } from './notification-provider.js';

export class MockWhatsAppProvider implements NotificationProvider {
  private sent: Array<{ to: string; message: string; timestamp: Date }> = [];

  async send(input: { to: string; message: string; channel: 'sms' | 'whatsapp' }) {
    this.sent.push({ to: input.to, message: input.message, timestamp: new Date() });
    return { sent: true, provider: 'mock-whatsapp', reference: `wa-${Date.now()}` };
  }

  getSent() {
    return [...this.sent];
  }
}
