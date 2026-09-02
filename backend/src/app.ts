import Fastify from 'fastify';
import { healthRoutes } from './routes/health.routes.js';
import { userRoutes } from './routes/users.routes.js';
import { policyRoutes } from './routes/policies.routes.js';
import { claimRoutes } from './routes/claims.routes.js';
import { errorHandler } from './middleware/error-handler.js';

export function buildApp() {
  const app = Fastify({ logger: true });

  errorHandler(app);
  app.register(healthRoutes);
  app.register(userRoutes);
  app.register(policyRoutes);
  app.register(claimRoutes);

  return app;
}
