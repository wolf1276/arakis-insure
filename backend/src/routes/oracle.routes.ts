import type { FastifyInstance } from 'fastify';
import * as verificationEngine from '../oracle/verification-engine.js';
import * as attestation from '../oracle/attestation.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export async function oracleRoutes(app: FastifyInstance) {
  app.post('/api/oracle/verify/:claimId', {
    preHandler: [authenticate, authorize('INSURER', 'ADMIN', 'ORACLE')],
  }, async (request) => {
    const { claimId } = request.params as { claimId: string };
    const result = await verificationEngine.runVerification(claimId);
    return { success: true, data: result };
  });

  app.post('/api/oracle/attest/:claimId', {
    preHandler: [authenticate, authorize('INSURER', 'ADMIN', 'ORACLE')],
  }, async (request) => {
    const { claimId } = request.params as { claimId: string };
    const result = await attestation.createAttestation(claimId);
    return { success: true, data: result };
  });

  app.get('/api/oracle/attestation/:claimId', async (request) => {
    const { claimId } = request.params as { claimId: string };
    const result = await attestation.verifyAttestation(claimId);
    return { success: true, data: result };
  });
}
