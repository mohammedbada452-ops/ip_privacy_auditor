import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbRepository } from './server/db/repository';
import { createApiApp } from './server/app';
import { errorHandler } from './server/middleware/errorHandler';
import { closePool } from './server/db/postgres';
import { initializeDatabase } from './server/db/init';
import { getFoundationConfig, getSecuritySaltConfig, getProductionSecurityConfig, getAdminAuthConfig } from './server/config';

const config = getFoundationConfig();
if (config.nodeEnv === 'production') {
  getSecuritySaltConfig();
  getProductionSecurityConfig();
  getAdminAuthConfig();
}
const PORT = config.port;
const HOST = '0.0.0.0';

// Trust proxy headers only through explicitly configured ingress networks in production.
if (process.env.NODE_ENV === 'production' && !process.env.TRUSTED_PROXY_CIDRS && !process.env.TRUSTED_PROXIES) {
  console.warn('[SECURITY] TRUSTED_PROXY_CIDRS is not configured; proxy headers will not be trusted.');
}

async function startServer() {
  // Initialize Database Persistence Layer (PostgreSQL or fallback)
  const dbInit = await initializeDatabase();
  if (process.env.NODE_ENV === 'production' && dbInit.status !== 'connected') {
    throw new Error(
      `Production database initialization failed: ${dbInit.error || 'PostgreSQL persistence is unavailable.'}`
    );
  }

  const app = createApiApp({ includeErrorHandler: false });

  // 8. Vite Middleware in Development vs Static Serving in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 9. Centralized Error Handling
  app.use(errorHandler);

  // Operational retention: keep session records bounded and telemetry privacy-safe.
  const retentionTimer: NodeJS.Timeout = setInterval(() => {
    const postgresRepo = dbRepository.getPostgresRepository();
    if (!postgresRepo) return;
    void postgresRepo.cleanupExpiredSessions().catch((err) => console.error('[DATABASE] Session cleanup failed:', err));
    void postgresRepo.purgeOldRecords(90).catch((err) => console.error('[DATABASE] Telemetry retention cleanup failed:', err));
  }, 6 * 60 * 60 * 1000);
  retentionTimer.unref?.();

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[SERVER] ${signal} received; shutting down gracefully.`);
    clearInterval(retentionTimer);
    server.close(() => {
      void closePool()
        .catch((err) => console.error('[DATABASE] Failed to close PostgreSQL pool:', err))
        .finally(() => process.exit(0));
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
