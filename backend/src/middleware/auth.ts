import type { FastifyRequest } from 'fastify';
import { AppError } from '../types/errors.js';

export async function authenticate(request: FastifyRequest) {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError('UNAUTHORIZED', 'Missing or invalid authorization token', 401);
  }
}
