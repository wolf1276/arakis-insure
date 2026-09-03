import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import * as dashboardService from '../services/dashboard.service.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/api/dashboard/stats', async () => {
    return { success: true, data: await dashboardService.getStats() };
  });

  app.get('/api/dashboard/claims', async (request) => {
    const { status, type } = request.query as { status?: string; type?: string };
    return { success: true, data: await dashboardService.listClaimsSummary({ status, type }) };
  });

  app.get('/api/dashboard/payouts', async (request) => {
    const { status, type } = request.query as { status?: string; type?: string };
    return { success: true, data: await dashboardService.listPayoutsSummary({ status, type }) };
  });

  app.get('/api/dashboard/disasters', async () => {
    return { success: true, data: await dashboardService.listDisastersSummary() };
  });

  app.get('/api/dashboard/treasury', async () => {
    return { success: true, data: await dashboardService.getTreasurySummary() };
  });
}
