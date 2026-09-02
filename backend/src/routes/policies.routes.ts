import type { FastifyInstance } from 'fastify';
import * as policyService from '../services/policy.service.js';

export async function policyRoutes(app: FastifyInstance) {
  app.post('/api/policies', async (request, reply) => {
    const policy = await policyService.createPolicy(request.body as any);
    return reply.status(201).send({ success: true, data: policy });
  });

  app.get('/api/policies/:id', async (request) => {
    const { id } = request.params as { id: string };
    const policy = await policyService.getPolicy(id);
    return { success: true, data: policy };
  });

  app.post('/api/policies/:id/activate', async (request) => {
    const { id } = request.params as { id: string };
    const policy = await policyService.activatePolicy(id);
    return { success: true, data: policy };
  });
}
