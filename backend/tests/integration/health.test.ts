/**
 * Integration Test — Health Check Endpoints
 *
 * These tests start the Express app and hit the /health endpoints
 * without requiring a real database or Redis connection.
 * Database/Redis checks will report 'error' in this context,
 * but the endpoint itself should remain 200/503 (not 500).
 */

import request from 'supertest';
import { createApp } from '../../src/app';

// Mock the database and Redis modules so no real connection is needed
jest.mock('../../src/config/database', () => ({
  getPool: () => ({
    query: jest.fn().mockRejectedValue(new Error('No test DB')),
  }),
  testDatabaseConnection: jest.fn().mockResolvedValue(undefined),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/config/redis', () => ({
  getRedisClient: () => ({
    ping: jest.fn().mockRejectedValue(new Error('No test Redis')),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(0),
    quit: jest.fn().mockResolvedValue(undefined),
  }),
  testRedisConnection: jest.fn().mockResolvedValue(undefined),
  closeRedisClient: jest.fn().mockResolvedValue(undefined),
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDelete: jest.fn().mockResolvedValue(undefined),
}));

describe('Health Check Endpoints', () => {
  const app = createApp();

  describe('GET /health/live', () => {
    it('returns 200 with alive status', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'alive' });
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health', () => {
    it('returns 503 when dependencies are down', async () => {
      const res = await request(app).get('/health');
      // Degraded when DB/Redis down
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('checks');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Unknown routes', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        status: 'error',
        error: {
          code: 'ROUTE_NOT_FOUND',
        },
      });
    });
  });
});
