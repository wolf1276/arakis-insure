import Fastify from 'fastify';
import { healthRoutes } from './routes/health.routes.js';
import { userRoutes } from './routes/users.routes.js';
import { policyRoutes } from './routes/policies.routes.js';
import { claimRoutes } from './routes/claims.routes.js';
import { oracleRoutes } from './routes/oracle.routes.js';
import { fundingRoutes } from './routes/funding.routes.js';
import { stellarRoutes } from './routes/stellar.routes.js';
import { disasterRoutes } from './routes/disaster.routes.js';
import { demoRoutes } from './routes/demo.routes.js';
import { AppError } from './types/errors.js';

export function buildApp() {
  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    let appErr: AppError | null = null;

    if (error instanceof AppError) {
      appErr = error;
    } else if (error.cause instanceof AppError) {
      appErr = error.cause;
    }

    if (appErr) {
      return reply.status(appErr.statusCode).send({
        success: false,
        error: { code: appErr.code, message: appErr.message },
      });
    }

    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({
        success: false,
        error: { code: (error as any).code ?? 'CLIENT_ERROR', message: error.message },
      });
    }

    if ((error as any).code?.startsWith('P')) {
      return reply.status(400).send({
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message },
      });
    }

    return reply.status(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'An unexpected error occurred' },
    });
  });

  app.register(healthRoutes);
  app.register(userRoutes);
  app.register(policyRoutes);
  app.register(claimRoutes);
  app.register(oracleRoutes);
  app.register(fundingRoutes);
  app.register(stellarRoutes);
  app.register(disasterRoutes);
  app.register(demoRoutes);

  return app;
}
