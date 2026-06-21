/**
 * Middleware: Assigns a unique request ID to every incoming request.
 * Used for log correlation and included in every API response.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestId(req: Request, _res: Response, next: NextFunction): void {
  // Allow forwarded request IDs from a load balancer
  req.requestId = (req.headers['x-request-id'] as string) ?? `req_${uuidv4().replace(/-/g, '')}`;
  next();
}
