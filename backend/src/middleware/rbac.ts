import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../types/errors.js';

type UserRole = 'USER' | 'ORACLE' | 'INSURER' | 'ADMIN';

export function authorize(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string; role: UserRole } | undefined;

    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
      throw new AppError(
        'FORBIDDEN',
        `Access denied. Required role: ${roles.join(' or ')}`,
        403
      );
    }
  };
}
