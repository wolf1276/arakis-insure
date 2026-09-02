import type { FastifyInstance, FastifyError } from 'fastify';
import { AppError } from '../types/errors.js';

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    let appErr: AppError | null = null;

    if (error instanceof AppError) {
      appErr = error;
    } else if (error.cause instanceof AppError) {
      appErr = error.cause;
    } else if (error.cause && typeof error.cause === 'object' && 'statusCode' in error.cause && 'code' in error.cause) {
      appErr = error.cause as AppError;
    }

    if (appErr) {
      return reply.status(appErr.statusCode).send({
        success: false,
        error: {
          code: appErr.code,
          message: appErr.message,
        },
      });
    }

    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code ?? 'CLIENT_ERROR',
          message: error.message,
        },
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
}
