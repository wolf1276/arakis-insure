import type { FastifyInstance } from 'fastify';
import * as policyService from '../services/policy.service.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../types/errors.js';

const STAFF_ROLES = ['INSURER', 'ADMIN'];

export async function policyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post('/api/policies', async (request, reply) => {
    const body = request.body as any;
    const requester = request.user as { userId: string; role: string };
    if (body.userId !== requester.userId && !STAFF_ROLES.includes(requester.role)) {
      throw new AppError('FORBIDDEN', 'Cannot create a policy for another user', 403);
    }
    const policy = await policyService.createPolicy(body);
    return reply.status(201).send({ success: true, data: policy });
  });

  app.get('/api/policies/:id', async (request) => {
    const { id } = request.params as { id: string };
    const policy = await policyService.getPolicy(id);
    const requester = request.user as { userId: string; role: string };
    if (policy.userId !== requester.userId && !STAFF_ROLES.includes(requester.role)) {
      throw new AppError('FORBIDDEN', 'Not your policy', 403);
    }
    return { success: true, data: policy };
  });

  app.post('/api/policies/:id/activate', async (request) => {
    const { id } = request.params as { id: string };
    const requester = request.user as { userId: string; role: string };
    const existing = await policyService.getPolicy(id);
    if (existing.userId !== requester.userId && !STAFF_ROLES.includes(requester.role)) {
      throw new AppError('FORBIDDEN', 'Not your policy', 403);
    }
    const policy = await policyService.activatePolicy(id);
    return { success: true, data: policy };
  });
}
