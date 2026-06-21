/**
 * Authentication and Authorization Middleware.
 *
 * Three authentication strategies:
 * 1. requireAuth       - Standard JWT bearer token (user sessions)
 * 2. requireDeviceAuth - Device JWT issued on hardware registration
 * 3. requireInternal   - Internal job-worker token (static secret)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { JwtPayload, DeviceJwtPayload } from '../types';

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Validates a user JWT access token.
 * Populates req.user on success.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError('Bearer token is required');
    }

    const payload = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type. Expected access token.');
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Access token has expired'));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid or malformed token'));
    } else {
      next(err);
    }
  }
}

/**
 * Validates a hardware device JWT.
 * Populates req.device on success.
 */
export function requireDeviceAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError('Device bearer token is required');
    }

    const payload = jwt.verify(token, config.auth.jwtSecret) as DeviceJwtPayload;

    if (payload.type !== 'device') {
      throw new UnauthorizedError('Invalid token type. Expected device token.');
    }

    req.device = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Device token has expired. Re-register the device.'));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid device token'));
    } else {
      next(err);
    }
  }
}

/**
 * Validates the internal job worker secret.
 * Used to protect assessment and internal endpoints from external access.
 */
export function requireInternal(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token || token !== config.hardware.internalJobSecret) {
    logger.warn({ ip: req.ip, path: req.path }, 'Unauthorized internal endpoint access attempt');
    next(new ForbiddenError('Internal endpoint access denied'));
    return;
  }
  next();
}

/**
 * Asserts that the authenticated user owns the requested resource.
 * Throws ForbiddenError if ownership check fails.
 */
export function assertOwnership(
  req: Request,
  resourceOwnerId: string,
  resourceType = 'resource',
): void {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  if (req.user.sub !== resourceOwnerId) {
    logger.warn(
      {
        requestUserId: req.user.sub,
        resourceOwnerId,
        resourceType,
        requestId: req.requestId,
      },
      'Ownership check failed',
    );
    throw new ForbiddenError(`You do not have permission to access this ${resourceType}`);
  }
}
