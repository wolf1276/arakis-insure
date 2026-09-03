import type { FastifyInstance } from 'fastify';
import * as fundingService from '../services/funding.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export async function fundingRoutes(app: FastifyInstance) {
  app.get('/api/funding/balance', {
    preHandler: [authenticate, authorize('INSURER', 'ADMIN')],
  }, async () => {
    const balance = await fundingService.getTreasuryBalance();
    return { success: true, data: balance };
  });

  app.post('/api/funding/payout/:payoutId', {
    preHandler: [authenticate, authorize('INSURER', 'ADMIN')],
  }, async (request) => {
    const { payoutId } = request.params as { payoutId: string };
    const result = await fundingService.fundPayout(payoutId);
    return { success: true, data: result };
  });

  app.get('/api/funding/transactions', {
    preHandler: [authenticate, authorize('INSURER', 'ADMIN')],
  }, async (request) => {
    const { status, provider } = request.query as { status?: string; provider?: string };
    const transactions = await fundingService.listFundingTransactions({ status, provider });
    return { success: true, data: transactions };
  });

  app.get('/api/funding/transactions/:id', {
    preHandler: [authenticate, authorize('INSURER', 'ADMIN')],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const result = await fundingService.getFundingStatus(id);
    return { success: true, data: result };
  });
}
