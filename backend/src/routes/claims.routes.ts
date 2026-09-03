import type { FastifyInstance } from 'fastify';
import * as claimService from '../services/claim.service.js';
import * as policyService from '../services/policy.service.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../types/errors.js';

const STAFF_ROLES = ['INSURER', 'ADMIN', 'ORACLE'];

function requireStaff(request: any) {
  const requester = request.user as { userId: string; role: string };
  if (!STAFF_ROLES.includes(requester.role)) {
    throw new AppError('FORBIDDEN', 'Requires staff role', 403);
  }
}

async function requireClaimOwnerOrStaff(request: any, claimId: string) {
  const requester = request.user as { userId: string; role: string };
  const claim = await claimService.getClaim(claimId);
  if (claim.policy.userId !== requester.userId && !STAFF_ROLES.includes(requester.role)) {
    throw new AppError('FORBIDDEN', 'Not your claim', 403);
  }
  return claim;
}

export async function claimRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post('/api/claims', async (request, reply) => {
    const body = request.body as any;
    const requester = request.user as { userId: string; role: string };
    const policy = await policyService.getPolicy(body.policyId);
    if (policy.userId !== requester.userId && !STAFF_ROLES.includes(requester.role)) {
      throw new AppError('FORBIDDEN', 'Not your policy', 403);
    }
    const claim = await claimService.createClaim(body);
    return reply.status(201).send({ success: true, data: claim });
  });

  app.get('/api/claims', async (request) => {
    requireStaff(request);
    const { status, type } = request.query as { status?: string; type?: string };
    const claims = await claimService.listClaims({ status, type });
    return { success: true, data: claims };
  });

  app.get('/api/claims/:id', async (request) => {
    const { id } = request.params as { id: string };
    const claim = await requireClaimOwnerOrStaff(request, id);
    return { success: true, data: claim };
  });

  app.post('/api/claims/:id/start-verification', async (request) => {
    requireStaff(request);
    const { id } = request.params as { id: string };
    const claim = await claimService.startVerification(id);
    return { success: true, data: claim };
  });

  app.post('/api/claims/:id/verify', async (request) => {
    requireStaff(request);
    const { id } = request.params as { id: string };
    const { source, verified, metadata } = request.body as {
      source: 'HOSPITAL' | 'POLICE' | 'CIVIL_REGISTRY';
      verified: boolean;
      metadata?: Record<string, unknown>;
    };
    const verif = await claimService.recordVerification(id, source, verified, metadata);
    return { success: true, data: verif };
  });

  app.post('/api/claims/:id/evaluate', async (request) => {
    requireStaff(request);
    const { id } = request.params as { id: string };
    const claim = await claimService.evaluateVerification(id);
    return { success: true, data: claim };
  });

  app.post('/api/claims/:id/authorize-advance', async (request) => {
    requireStaff(request);
    const { id } = request.params as { id: string };
    const result = await claimService.authorizeAdvance(id);
    return { success: true, data: result };
  });

  app.post('/api/claims/:id/approve', async (request) => {
    requireStaff(request);
    const { id } = request.params as { id: string };
    const claim = await claimService.approveClaim(id);
    return { success: true, data: claim };
  });

  app.post('/api/claims/:id/payout', async (request) => {
    requireStaff(request);
    const { id } = request.params as { id: string };
    const { type, amount } = request.body as { type: 'ADVANCE' | 'FINAL'; amount: number };
    const payout = await claimService.createPayout(id, type, amount);
    return { success: true, data: payout };
  });

  app.get('/api/claims/:id/verifications', async (request) => {
    const { id } = request.params as { id: string };
    await requireClaimOwnerOrStaff(request, id);
    const verifs = await claimService.getClaimVerifications(id);
    return { success: true, data: verifs };
  });
}
