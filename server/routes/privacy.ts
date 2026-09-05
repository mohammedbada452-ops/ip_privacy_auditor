import { Router } from 'express';
import { privacyService } from '../services/privacyService';
import { validateBrowserFingerprintPayload, PayloadValidationError } from '../utils/payloadValidator';
import type { ApiResponse, PrivacyScoreAnalysis, AnalyzeBrowserInput, PopulationInsightResponse } from '@packages/api-contract';
import { dbRepository } from '../db/repository';

export const privacyRouter = Router();

/**
 * POST /api/analyze/browser
 * Analyzes browser fingerprint signals combined with server connection state
 * to return consolidated Privacy Score and vulnerability analysis.
 */
privacyRouter.post('/analyze/browser', async (req, res, next) => {
  try {
    const body = (req.body || {}) as AnalyzeBrowserInput;

    let validatedFingerprint = null;
    try {
      validatedFingerprint = validateBrowserFingerprintPayload(body.fingerprint);
    } catch (err: unknown) {
      if (err instanceof PayloadValidationError) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: err instanceof Error ? err.message : 'Invalid request payload.',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId || 'req_untracked',
          },
        };
        return res.status(400).json(errorResponse);
      }
      throw err;
    }

    const result: PrivacyScoreAnalysis = await privacyService.evaluateRequest(req, validatedFingerprint);

    const responsePayload: ApiResponse<PrivacyScoreAnalysis> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'req_untracked',
      },
    };

    return res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/privacy/score
 * Fast server-side evaluation of connection privacy score.
 */
privacyRouter.get('/privacy/score', async (req, res, next) => {
  try {
    const result: PrivacyScoreAnalysis = await privacyService.evaluateRequest(req, null);

    const responsePayload: ApiResponse<PrivacyScoreAnalysis> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'req_untracked',
      },
    };

    return res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
});


privacyRouter.get('/insights/population', async (req, res, next) => {
  try {
    const scoreRaw = Number(req.query.score);
    if (!Number.isFinite(scoreRaw) || scoreRaw < 0 || scoreRaw > 100) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SCORE', message: 'Privacy score must be a number between 0 and 100.' } });
    }
    const result = await dbRepository.getPopulationInsightAsync(scoreRaw, 30);
    const payload: ApiResponse<PopulationInsightResponse> = { success: true, data: result, meta: { timestamp: new Date().toISOString(), requestId: req.requestId || 'req_population' } };
    return res.status(200).json(payload);
  } catch (err) { next(err); }
});
