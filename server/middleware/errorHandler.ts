import type { Request, Response, NextFunction } from 'express';
import { getRequestEnv } from '../config/requestEnv';
import { redactUrl } from '../utils/redaction';
import type { ApiErrorResponse } from '@packages/api-contract';

export function errorHandler(
  err: Error & { status?: number; statusCode?: number; code?: string; type?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let status = err.status || err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred on the server';

  // Handle Express body-parser entity too large error
  if (err.type === 'entity.too.large' || status === 413) {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload exceeds maximum allowed limit of 100KB.';
  }

  // Handle malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    status = 400;
    code = 'INVALID_JSON_BODY';
    message = 'Malformed JSON syntax in request body.';
  }

  const requestId = req.requestId || 'unknown';

  // In production, mask internal server error details to prevent reconnaissance
  if (getRequestEnv('NODE_ENV') === 'production' && status >= 500) {
    message = 'An unexpected internal server error occurred. Please contact system administrator.';
  }

  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  if (getRequestEnv('NODE_ENV') !== 'production') {
    console.error(`[Error Handler] ${req.method} ${redactUrl(req.originalUrl)}:`, err instanceof Error ? err.message : 'Unhandled error');
  }

  res.status(status).json(errorResponse);
}
