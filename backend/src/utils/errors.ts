/**
 * Custom application error classes.
 * Distinguishes between operational errors (expected, handleable)
 * and programmer errors (bugs, crash the process).
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      404,
      'RESOURCE_NOT_FOUND',
      id ? `${resource} with ID '${id}' not found` : `${resource} not found`,
      id ? { resource, id } : { resource },
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'INVALID_TOKEN', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to access this resource') {
    super(403, 'MISSING_PERMISSION', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(409, 'DUPLICATE_RESOURCE', message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class ExternalApiError extends AppError {
  constructor(service: string, message: string) {
    super(500, 'EXTERNAL_API_ERROR', `${service} API error: ${message}`, { service });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, 'DATABASE_ERROR', `Database error: ${message}`);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;
  constructor(retryAfter: number) {
    super(429, 'RATE_LIMIT_EXCEEDED', `Too many requests. Retry after ${retryAfter} seconds`);
    this.retryAfter = retryAfter;
  }
}
