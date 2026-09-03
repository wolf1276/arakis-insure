import type { FastifyInstance } from 'fastify';
import * as authService from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      body: {
        type: 'object',
        required: ['name', 'phone', 'password'],
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['USER', 'ORACLE', 'INSURER', 'ADMIN'], default: 'USER' },
        },
      },
      response: {
        201: {
          description: 'User registered successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object', properties: { id: {}, name: {}, phone: {}, role: {} } },
                token: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const parsed = authService.registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      });
    }

    const user = await authService.register(parsed.data);
    const token = app.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '24h' });

    return reply.status(201).send({
      success: true,
      data: { user, token },
    });
  });

  app.post('/api/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login with phone and password',
      body: {
        type: 'object',
        required: ['phone', 'password'],
        properties: {
          phone: { type: 'string' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Login successful',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object', properties: { id: {}, name: {}, phone: {}, role: {} } },
                token: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const parsed = authService.loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      });
    }

    const user = await authService.login(parsed.data);
    const token = app.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '24h' });

    return reply.status(200).send({
      success: true,
      data: { user, token },
    });
  });

  app.get('/api/auth/me', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Get current user info',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Current user',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: { userId: { type: 'string' }, role: { type: 'string' } },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { userId, role } = request.user as any;
    return { success: true, data: { userId, role } };
  });
}
