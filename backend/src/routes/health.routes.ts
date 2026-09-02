import type { FastifyInstance } from 'fastify';
import { prisma } from '../database/prisma.js';
import { config } from '../config.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    let database = 'connected';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'disconnected';
    }

    return {
      status: 'ok',
      database,
      stellar: 'connected',
      fundingProvider: config.fundingProvider,
    };
  });

  app.get('/ready', async () => ({ status: 'ok' }));
}
