import type { FastifyInstance } from 'fastify';
import * as stellarPayoutService from '../services/stellar-payout.service.js';
import { getTransactionStatus } from '../stellar/transactions.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export async function stellarRoutes(app: FastifyInstance) {
  app.post('/api/stellar/payout/:payoutId', {
    preHandler: [authenticate, authorize('INSURER', 'ADMIN')],
  }, async (request) => {
    const { payoutId } = request.params as { payoutId: string };
    const result = await stellarPayoutService.executeStellarPayout(payoutId);
    return { success: true, data: result };
  });

  app.get('/api/stellar/transaction/:hash', async (request) => {
    const { hash } = request.params as { hash: string };
    const result = await getTransactionStatus(hash);
    return { success: true, data: result };
  });
}
