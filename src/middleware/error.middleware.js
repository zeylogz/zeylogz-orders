import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Global error-handling middleware.
 * Must be registered AFTER all routes (Express identifies it by the 4-param signature).
 */
export function errorHandler(err, _req, res, _next) {
  logger.error('Unhandled error', {
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Never expose internals to the client
  const statusCode = err.statusCode || 500;
  const response = {
    error: {
      message: env.NODE_ENV === 'production'
        ? 'Something went wrong. Please try again later.'
        : err.message,
    },
  };

  res.status(statusCode).json(response);
}

/**
 * 404 handler for unknown routes.
 */
export function notFoundHandler(_req, res) {
  res.status(404).json({
    error: { message: 'Not found' },
  });
}
