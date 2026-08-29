import express from 'express';
import type { Request } from 'express';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import {
  securityHeaders,
  corsMiddleware,
  createRateLimitMiddleware,
  publicApiRateLimiter,
  analyzeBrowserRateLimiter,
  adminApiRateLimiter,
} from './middleware/security';
import healthRouter from './routes/health';
import ipRouter from './routes/ip';
import headersRouter from './routes/headers';
import { privacyRouter } from './routes/privacy';
import { adminRouter } from './routes/admin';
import siteAuditRouter from './routes/siteAudit';
import { dbRepository } from './db/repository';
import { extractClientIp } from './utils/ipExtractor';


/**
 * Worker-safe request body parser.
 *
 * Express 4's built-in express.json()/express.urlencoded() delegate to
 * body-parser -> raw-body -> iconv-lite. That dependency chain is not needed
 * for this application and can trigger a Cloudflare Workers validation/runtime
 * incompatibility. The Worker bridge already exposes a readable request body,
 * so parse only the content types the API actually accepts here.
 */
function createWorkerSafeBodyParser(maxBytes: number): import('express').RequestHandler {
  return (req, res, next) => {
    if (req.body !== undefined) {
      next();
      return;
    }

    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      req.body = {};
      next();
      return;
    }

    const rawContentType = req.headers['content-type'];
    const contentType = typeof rawContentType === 'string'
      ? rawContentType.split(';', 1)[0].trim().toLowerCase()
      : '';

    const isJson = contentType === 'application/json' || contentType.endsWith('+json');
    const isForm = contentType === 'application/x-www-form-urlencoded';

    if (!isJson && !isForm) {
      req.body = {};
      next();
      return;
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    const fail = (status: number, message: string) => {
      if (settled) return;
      settled = true;
      res.status(status).json({
        success: false,
        error: {
          code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_BODY',
          message,
        },
      });
    };

    req.on('data', (chunk: Buffer | string) => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > maxBytes) {
        fail(413, `Request body exceeds the ${Math.floor(maxBytes / 1024)}KB limit.`);
        req.resume();
        return;
      }
      chunks.push(buffer);
    });

    req.on('error', (error: unknown) => {
      if (settled) return;
      settled = true;
      next(error);
    });

    req.on('end', () => {
      if (settled) return;

      try {
        const text = Buffer.concat(chunks).toString('utf8');
        if (!text.trim()) {
          req.body = {};
          settled = true;
          next();
          return;
        }

        req.body = isJson
          ? JSON.parse(text)
          : Object.fromEntries(new URLSearchParams(text).entries());

        settled = true;
        next();
      } catch (error) {
        settled = true;
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BODY',
            message: 'The request body is not valid JSON or form data.',
          },
        });
      }
    });
  };
}

export interface CreateApiAppOptions {
  includeErrorHandler?: boolean;
  beforeRoutes?: import('express').RequestHandler;
}

/** Shared API/middleware stack used by the native Node server and Cloudflare adapter. */
export function createApiApp(options: CreateApiAppOptions = {}): express.Express {
  const app = express();

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(createWorkerSafeBodyParser(100 * 1024));
  app.use(requestLogger);

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      if (req.path.startsWith('/api/')) {
        void dbRepository.recordPerformanceMetricAsync({
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTimeMs: durationMs,
        }).catch((err) => console.error('[DATABASE] Performance metric persistence failed:', err));
      } else if (req.method === 'GET' && (req.headers.accept || '').includes('text/html')) {
        const lang = (req.headers['accept-language'] || 'en').split(',')[0].split('-')[0];
        const ua = (req.headers['user-agent'] || '').toLowerCase();
        const uaCategory = ua.includes('mobile') ? 'Mobile' : 'Desktop';
        void dbRepository.recordPageViewAsync({
          route: req.path,
          language: ['en', 'es', 'fr', 'tr', 'pt', 'ar'].includes(lang) ? lang : 'en',
          userAgentCategory: uaCategory,
          durationMs,
        }).catch((err) => console.error('[DATABASE] Page view persistence failed:', err));
      }
    });
    next();
  });

  app.use('/api/analyze/browser', createRateLimitMiddleware(analyzeBrowserRateLimiter, 'Browser Analysis API'));
  app.use('/api/admin', createRateLimitMiddleware(adminApiRateLimiter, 'Admin API'));
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/analyze/browser') || req.path.startsWith('/admin')) return next();
    return createRateLimitMiddleware(publicApiRateLimiter, 'Public API')(req, res, next);
  });

  if (options.beforeRoutes) app.use(options.beforeRoutes);

  app.use('/api', healthRouter);
  app.use('/api', ipRouter);
  app.use('/api', headersRouter);
  app.use('/api', privacyRouter);
  app.use('/api', siteAuditRouter);
  app.use('/api', adminRouter);

  if (options.includeErrorHandler) app.use(errorHandler);
  return app;
}

export function recordRequestFailure(req: Request, error: unknown): void {
  const clientIp = extractClientIp(req).ip;
  console.error('[REQUEST] Unhandled request failure', {
    path: req.path,
    method: req.method,
    ip: clientIp,
    error: error instanceof Error ? error.message : String(error),
  });
}
