/**
 * Unit Tests — Utility Functions
 * Tests for response builders, error classes, and crypto utilities.
 */

import { buildPaginationMeta } from '../../src/utils/response';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  UnauthorizedError,
} from '../../src/utils/errors';
import { generateId, generateVerificationCode } from '../../src/utils/crypto';
import { calculateDistanceKm } from '../../src/services/mapsService';

// ---- Response Utilities ------------------------------------

describe('buildPaginationMeta', () => {
  it('returns correct pagination for first page', () => {
    const meta = buildPaginationMeta(1, 20, 45, '/api/v1/alerts');
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(20);
    expect(meta.total).toBe(45);
    expect(meta.pages).toBe(3);
    expect(meta.has_next).toBe(true);
    expect(meta.has_previous).toBe(false);
    expect(meta.next_page_url).toContain('page=2');
    expect(meta.previous_page_url).toBeNull();
  });

  it('returns correct pagination for last page', () => {
    const meta = buildPaginationMeta(3, 20, 45, '/api/v1/alerts');
    expect(meta.has_next).toBe(false);
    expect(meta.has_previous).toBe(true);
    expect(meta.next_page_url).toBeNull();
    expect(meta.previous_page_url).toContain('page=2');
  });

  it('handles single page result', () => {
    const meta = buildPaginationMeta(1, 20, 5, '/api/v1/alerts');
    expect(meta.pages).toBe(1);
    expect(meta.has_next).toBe(false);
    expect(meta.has_previous).toBe(false);
  });

  it('handles empty result set', () => {
    const meta = buildPaginationMeta(1, 20, 0, '/api/v1/alerts');
    expect(meta.pages).toBe(0);
    expect(meta.total).toBe(0);
  });
});

// ---- Error Classes -----------------------------------------

describe('Error classes', () => {
  it('creates a 404 NotFoundError with correct properties', () => {
    const err = new NotFoundError('Alert', 'alert_123');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('RESOURCE_NOT_FOUND');
    expect(err.message).toContain('alert_123');
    expect(err.isOperational).toBe(true);
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('creates a 422 ValidationError', () => {
    const err = new ValidationError('Invalid email');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('creates a 403 ForbiddenError', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('MISSING_PERMISSION');
  });

  it('creates a 401 UnauthorizedError', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('INVALID_TOKEN');
    expect(err.message).toBe('Token expired');
  });
});

// ---- Crypto Utilities --------------------------------------

describe('generateId', () => {
  it('generates an ID with the given prefix', () => {
    const id = generateId('alert');
    expect(id).toMatch(/^alert_[a-f0-9]{24}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('test')));
    expect(ids.size).toBe(100);
  });
});

describe('generateVerificationCode', () => {
  it('generates a 6-digit numeric code', () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('generates different codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateVerificationCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ---- Maps Service ------------------------------------------

describe('calculateDistanceKm', () => {
  it('calculates distance between New York and Los Angeles', () => {
    // NYC: 40.7128, -74.0060
    // LAX: 34.0522, -118.2437
    const distance = calculateDistanceKm(40.7128, -74.0060, 34.0522, -118.2437);
    // Expect roughly 3940-3960 km
    expect(distance).toBeGreaterThan(3900);
    expect(distance).toBeLessThan(4000);
  });

  it('returns 0 for identical coordinates', () => {
    const distance = calculateDistanceKm(40.7128, -74.0060, 40.7128, -74.0060);
    expect(distance).toBe(0);
  });

  it('calculates short distances correctly', () => {
    // About 1 km apart
    const distance = calculateDistanceKm(40.7128, -74.0060, 40.7218, -74.0060);
    expect(distance).toBeGreaterThan(0.9);
    expect(distance).toBeLessThan(1.1);
  });
});
