import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiSuccessResponse, HealthzResponse } from '@packages/api-contract';
import { dbRepository } from '../db/repository';

const router = Router();
const startTime = Date.now();

router.get('/healthz', async (req: Request, res: Response) => {
  const postgres = dbRepository.getPostgresRepository();
  let status: HealthzResponse['status'] = 'ok';
  if (process.env.NODE_ENV === 'production') {
    if (!postgres) status = 'unhealthy';
    else { try { status = (await postgres.checkHealth()) ? 'ok' : 'unhealthy'; } catch { status = 'unhealthy'; } }
  }
  const data: HealthzResponse = {
    status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    service: 'privacy-intelligence-auditor-api',
    environment: process.env.NODE_ENV || 'development',
  };

  const response: ApiSuccessResponse<HealthzResponse> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'req_health',
      version: '1.0.0',
    },
  };

  res.status(status === 'ok' ? 200 : 503).json({ ...response, success: status === 'ok' });
});

export default router;


router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: 'ok', service: 'privacy-intelligence-auditor-api' } });
});

router.get('/health/ready', async (req: Request, res: Response) => {
  const postgres = dbRepository.getPostgresRepository();
  if (!postgres) {
    const ok = process.env.NODE_ENV !== 'production';
    res.status(ok ? 200 : 503).json({ success: ok, data: { status: ok ? 'ready-development' : 'not-ready', database: 'not-configured' }, meta: { timestamp: new Date().toISOString(), requestId: req.requestId || 'req_health_ready' } });
    return;
  }
  try {
    const healthy = await postgres.checkHealth();
    res.status(healthy ? 200 : 503).json({ success: healthy, data: { status: healthy ? 'ready' : 'not-ready', database: healthy ? 'ok' : 'unavailable' }, meta: { timestamp: new Date().toISOString(), requestId: req.requestId || 'req_health_ready' } });
  } catch {
    res.status(503).json({ success: false, data: { status: 'not-ready', database: 'unavailable' }, meta: { timestamp: new Date().toISOString(), requestId: req.requestId || 'req_health_ready' } });
  }
});
