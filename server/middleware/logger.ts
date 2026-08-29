import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redactUrl } from '../utils/redaction';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.requestId = `req_${crypto.randomUUID()}`;
  req.startTime = Date.now();

  res.on('finish', () => {
    // Only log API routes or actual errors (status >= 400) to avoid spamming Vite dev asset module fetches
    const isApi = req.originalUrl.startsWith('/api');
    const isErrorStatus = res.statusCode >= 400;

    if (isApi || isErrorStatus) {
      const duration = req.startTime ? Date.now() - req.startTime : 0;
      console.log(`[${new Date().toISOString()}] ${req.method} ${redactUrl(req.originalUrl)} ${res.statusCode} - ${duration}ms (${req.requestId})`);
    }
  });

  next();
}
