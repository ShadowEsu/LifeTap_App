/**
 * Rate limiting middleware using express-rate-limit.
 * Different limits are applied per endpoint tier.
 * Headers (X-RateLimit-*) are returned to all clients.
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { sendError } from '../utils/response';
import { Request, Response } from 'express';

const rateLimitHandler = (_req: Request, res: Response) => {
  const resetTime = res.getHeader('X-RateLimit-Reset');
  const retryAfter = resetTime
    ? Math.ceil((Number(resetTime) * 1000 - Date.now()) / 1000)
    : 60;

  sendError(res, 429, 'RATE_LIMIT_EXCEEDED', `Too many requests. Limit exceeded.`, {
    retry_after: retryAfter,
  });
};

// General API rate limit (200 req/hour per IP)
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxGeneral,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.ip ?? 'unknown',
});

// Alert creation: 100 per minute (hardware devices)
export const alertCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.maxAlerts,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: 'Alert creation rate limit exceeded',
});

// Contact management: 50 per hour (user actions)
export const contactMutationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.rateLimit.maxContacts,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.ip ?? 'unknown',
});

// Auth endpoints: 10 attempts per 15 minutes (brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.ip ?? 'unknown',
  skipSuccessfulRequests: true, // Only count failed attempts
});
