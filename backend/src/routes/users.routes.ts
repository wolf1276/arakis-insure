import type { FastifyInstance } from 'fastify';
import * as userService from '../services/user.service.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../types/errors.js';

const STAFF_ROLES = ['INSURER', 'ADMIN'];

function requireSelfOrStaff(request: any, id: string) {
  const requester = request.user as { userId: string; role: string };
  if (requester.userId !== id && !STAFF_ROLES.includes(requester.role)) {
    throw new AppError('FORBIDDEN', 'Not your account', 403);
  }
}

export async function userRoutes(app: FastifyInstance) {
  app.post('/api/users', async (request, reply) => {
    const user = await userService.createUser(request.body as any);
    return reply.status(201).send({ success: true, data: user });
  });

  app.register(async (scoped) => {
    scoped.addHook('preHandler', authenticate);

    scoped.get('/api/users/:id', async (request) => {
      const { id } = request.params as { id: string };
      requireSelfOrStaff(request, id);
      const user = await userService.getUser(id);
      return { success: true, data: user };
    });

    scoped.post('/api/users/:id/nominee', async (request, reply) => {
      const { id } = request.params as { id: string };
      requireSelfOrStaff(request, id);
      const nominee = await userService.addNominee(id, request.body as any);
      return reply.status(201).send({ success: true, data: nominee });
    });

    scoped.get('/api/users/:id/nominees', async (request) => {
      const { id } = request.params as { id: string };
      requireSelfOrStaff(request, id);
      const nominees = await userService.getUserNominees(id);
      return { success: true, data: nominees };
    });

    scoped.get('/api/users/:id/policies', async (request) => {
      const { id } = request.params as { id: string };
      requireSelfOrStaff(request, id);
      const policies = await userService.getUserPolicies(id);
      return { success: true, data: policies };
    });

    scoped.get('/api/users/:id/claims', async (request) => {
      const { id } = request.params as { id: string };
      requireSelfOrStaff(request, id);
      const claims = await userService.getUserClaims(id);
      return { success: true, data: claims };
    });
  });
}
