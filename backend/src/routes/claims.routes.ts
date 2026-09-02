import type { FastifyInstance } from 'fastify';
import * as claimService from '../services/claim.service.js';

export async function claimRoutes(app: FastifyInstance) {
  app.post('/api/claims', async (request, reply) => {
    const claim = await claimService.createClaim(request.body as any);
    return reply.status(201).send({ success: true, data: claim });
  });

  app.get('/api/claims', async (request) => {
    const { status, type } = request.query as { status?: string; type?: string };
    const claims = await claimService.listClaims({ status, type });
    return { success: true, data: claims };
  });

  app.get('/api/claims/:id', async (request) => {
    const { id } = request.params as { id: string };
    const claim = await claimService.getClaim(id);
    return { success: true, data: claim };
  });

  app.post('/api/claims/:id/start-verification', async (request) => {
    const { id } = request.params as { id: string };
    const claim = await claimService.startVerification(id);
    return { success: true, data: claim };
  });

  app.post('/api/claims/:id/verify', async (request) => {
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
    const { id } = request.params as { id: string };
    const claim = await claimService.evaluateVerification(id);
    return { success: true, data: claim };
  });

  app.post('/api/claims/:id/authorize-advance', async (request) => {
    const { id } = request.params as { id: string };
    const result = await claimService.authorizeAdvance(id);
    return { success: true, data: result };
  });

  app.post('/api/claims/:id/approve', async (request) => {
    const { id } = request.params as { id: string };
    const claim = await claimService.approveClaim(id);
    return { success: true, data: claim };
  });

  app.post('/api/claims/:id/payout', async (request) => {
    const { id } = request.params as { id: string };
    const { type, amount } = request.body as { type: 'ADVANCE' | 'FINAL'; amount: number };
    const payout = await claimService.createPayout(id, type, amount);
    return { success: true, data: payout };
  });

  app.get('/api/claims/:id/verifications', async (request) => {
    const { id } = request.params as { id: string };
    const verifs = await claimService.getClaimVerifications(id);
    return { success: true, data: verifs };
  });
}
