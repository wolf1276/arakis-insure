import type { FastifyInstance } from 'fastify';
import * as userService from '../services/user.service.js';

export async function userRoutes(app: FastifyInstance) {
  app.post('/api/users', async (request, reply) => {
    const user = await userService.createUser(request.body as any);
    return reply.status(201).send({ success: true, data: user });
  });

  app.get('/api/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await userService.getUser(id);
    return { success: true, data: user };
  });

  app.post('/api/users/:id/nominee', async (request, reply) => {
    const { id } = request.params as { id: string };
    const nominee = await userService.addNominee(id, request.body as any);
    return reply.status(201).send({ success: true, data: nominee });
  });

  app.get('/api/users/:id/nominees', async (request) => {
    const { id } = request.params as { id: string };
    const nominees = await userService.getUserNominees(id);
    return { success: true, data: nominees };
  });

  app.get('/api/users/:id/policies', async (request) => {
    const { id } = request.params as { id: string };
    const policies = await userService.getUserPolicies(id);
    return { success: true, data: policies };
  });

  app.get('/api/users/:id/claims', async (request) => {
    const { id } = request.params as { id: string };
    const claims = await userService.getUserClaims(id);
    return { success: true, data: claims };
  });
}
