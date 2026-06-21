/**
 * PostgreSQL connection pool configuration.
 * Uses pg-pool for connection management with PostGIS support.
 */

import { Pool, PoolClient } from 'pg';
import { config } from './env';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected PostgreSQL pool error');
    });

    pool.on('connect', () => {
      logger.debug('New PostgreSQL client connected to pool');
    });
  }

  return pool;
}

/**
 * Tests the database connection and verifies PostGIS is available.
 * Called on startup to fail fast if the database is unreachable.
 */
export async function testDatabaseConnection(): Promise<void> {
  const pool = getPool();

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT version(), PostGIS_Version()');
      const row = result.rows[0] as { version: string; postgis_version: string };
      logger.info(
        { postgresVersion: row.version, postgisVersion: row.postgis_version },
        'Database connection verified',
      );
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database');
    throw err;
  }
}

/**
 * Runs a query within a transaction.
 * Automatically rolls back on error and releases the client.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Gracefully closes the database connection pool.
 * Called during application shutdown.
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
