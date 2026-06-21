/**
 * Request validation middleware using Zod schemas.
 * Validates req.body, req.params, and req.query against provided schemas.
 * Returns structured 422 errors on validation failure.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type RequestTarget = 'body' | 'params' | 'query';

export function validate(schema: ZodSchema, target: RequestTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const zodError = result.error as ZodError;
      const details: Record<string, string[]> = {};

      zodError.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!details[field]) {
          details[field] = [];
        }
        details[field].push(err.message);
      });

      next(
        new ValidationError('Request validation failed', {
          fields: details,
        }),
      );
      return;
    }

    // Replace the request target with the parsed (and coerced) values
    req[target] = result.data as typeof req[typeof target];
    next();
  };
}
