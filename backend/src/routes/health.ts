/**
 * Health Check Route - /health
 * Returns the operational status of all system dependencies.
 * Used by load balancers, monitoring systems, and Docker healthchecks.
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { getRedisClient } from '../config/redis';
import { wsServer } from '../websocket/wsServer';
import { logger } from '../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_seconds: number;
  version: string;
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    websocket: 'ok';
  };
  connections: {
    ws_clients: number;
  };
}

router.get('/health', async (_req: Request, res: Response) => {
  const checks: HealthStatus['checks'] = {
    database: 'error',
    redis: 'error',
    websocket: 'ok',
  };

  // Check database
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    checks.database = 'ok';
  } catch (err) {
    logger.error({ err }, 'Health check: database failed');
  }

  // Check Redis
  try {
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = 'ok';
  } catch (err) {
    logger.error({ err }, 'Health check: Redis failed');
  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok');
  const status: HealthStatus['status'] = allHealthy ? 'healthy' : 'degraded';
  const httpStatus = allHealthy ? 200 : 503;

  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    version: process.env['npm_package_version'] ?? '0.1.0',
    checks,
    connections: {
      ws_clients: wsServer.getConnectedClientCount(),
    },
  };

  res.status(httpStatus).json(health);
});

// Simple liveness probe (no dependency checks)
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness probe (checks dependencies)
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await getPool().query('SELECT 1');
    await getRedisClient().ping();
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
  }
});

export default router;
