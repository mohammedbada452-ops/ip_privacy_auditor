import { Router } from 'express';
import { auditWebsite } from '../services/siteAudit';
import type { ApiSuccessResponse, ApiErrorResponse, SiteAuditResponse } from '@packages/api-contract';

const router = Router();

router.get('/site-audit', async (req, res) => {
  const raw = typeof req.query.url === 'string' ? req.query.url : '';
  if (!raw.trim()) {
    const payload: ApiErrorResponse = { success: false, error: { code: 'URL_REQUIRED', message: 'A website URL is required.' }, meta: { timestamp: new Date().toISOString(), requestId: req.requestId || 'req_site_audit' } };
    res.status(400).json(payload);
    return;
  }
  try {
    const data = await auditWebsite(raw);
    const payload: ApiSuccessResponse<SiteAuditResponse> = { success: true, data, meta: { timestamp: new Date().toISOString(), requestId: req.requestId || 'req_site_audit' } };
    res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Website audit failed.';
    const payload: ApiErrorResponse = { success: false, error: { code: 'SITE_AUDIT_FAILED', message }, meta: { timestamp: new Date().toISOString(), requestId: req.requestId || 'req_site_audit' } };
    res.status(400).json(payload);
  }
});

export default router;
