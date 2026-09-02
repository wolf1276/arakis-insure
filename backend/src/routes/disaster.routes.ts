import { FastifyInstance } from 'fastify';
import {
  simulateDisasterSchema,
  simulateDisaster,
  createParametricPayouts,
  getDisasterEvent,
  listDisasterEvents,
} from '../services/disaster.service.js';
import { fundPayout } from '../services/funding.service.js';
import { executeStellarPayout } from '../services/stellar-payout.service.js';

export async function disasterRoutes(app: FastifyInstance) {
  app.post('/api/disasters/simulate', async (request, reply) => {
    const parsed = simulateDisasterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      });
    }

    const result = await simulateDisaster(parsed.data);

    if ('verified' in result && !result.verified) {
      return reply.status(200).send({ success: true, data: result });
    }

    return reply.status(201).send({ success: true, data: result });
  });

  app.post('/api/disasters/:eventId/trigger', async (request, reply) => {
    const { eventId } = request.params as { eventId: string };

    const result = await createParametricPayouts(eventId);

    const funded = [];
    const stellared = [];

    for (const p of result.payouts) {
      try {
        await fundPayout(p.payoutId);
        funded.push(p.payoutId);
      } catch {
        // funding may fail if treasury empty — continue
      }

      try {
        const stellarResult = await executeStellarPayout(p.payoutId);
        stellared.push({ ...stellarResult, payoutId: p.payoutId });
      } catch {
        // Stellar may fail — continue
      }
    }

    return reply.status(200).send({
      success: true,
      data: {
        eventId,
        type: result.event.type,
        location: result.event.location,
        measurement: Number(result.event.measurement),
        threshold: Number(result.event.threshold),
        verified: result.event.verified,
        policiesAffected: result.totalPolicies,
        payoutsExecuted: result.totalPayouts,
        funded: funded.length,
        stellared: stellared.length,
        transactions: stellared,
      },
    });
  });

  app.get('/api/disasters/:eventId', async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const event = await getDisasterEvent(eventId);
    return reply.send({ success: true, data: event });
  });

  app.get('/api/disasters', async (_request, reply) => {
    const events = await listDisasterEvents();
    return reply.send({ success: true, data: events });
  });
}
