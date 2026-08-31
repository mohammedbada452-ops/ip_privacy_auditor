import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiSuccessResponse, HeadersAnalysisResponse } from '@packages/api-contract';
import { HeaderCollector, HeaderClassifier } from '../headers';
import { extractClientIp } from '../utils/ipExtractor';

const router = Router();

/**
 * Common handler for headers analysis
 */
const handleHeadersAnalysis = (req: Request, res: Response) => {
  const extracted = extractClientIp(req);
  const entries = HeaderCollector.collect(req);
  const serverDerivedMetadata = HeaderCollector.collectServerDerivedMetadata(req);
  const analysis = HeaderClassifier.analyze(entries, extracted.isInfrastructureProxy, serverDerivedMetadata);

  const response: ApiSuccessResponse<HeadersAnalysisResponse> = {
    success: true,
    data: { ...analysis, scoreScope: 'HEADERS_ONLY' },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId || `req_${Date.now()}`,
      version: '1.0.0',
    },
  };

  res.status(200).json(response);
};

/**
 * GET /api/headers
 * GET /api/check/headers
 * Analyzes incoming HTTP request headers, classifies security/privacy status,
 * redacts sensitive credentials, and returns structured metadata.
 */
router.get('/headers', handleHeadersAnalysis);
router.get('/check/headers', handleHeadersAnalysis);

/**
 * GET /api/headers/raw
 * Direct text dump of formatted HTTP request headers for diagnostics.
 */
router.get('/headers/raw', (req: Request, res: Response) => {
  const extracted = extractClientIp(req);
  const entries = HeaderCollector.collect(req);
  const serverDerivedMetadata = HeaderCollector.collectServerDerivedMetadata(req);
  const analysis = HeaderClassifier.analyze(entries, extracted.isInfrastructureProxy, serverDerivedMetadata);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(analysis.rawExport.rawHttp);
});

export default router;
