/**
 * Hardware Device Model - Data access layer for the hardware_devices table.
 */

import { getPool } from '../config/database';
import { HardwareDevice, DeviceStatus, SystemStatus } from '../types';
import { generateId, hashSecret } from '../utils/crypto';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface RegisterDeviceInput {
  device_serial: string;
  device_name: string;
  device_type: string;
  location: string;
  user_id: string;
  secret_token: string;
}

interface DeviceRow {
  device_id: string;
  user_id: string;
  device_serial: string;
  device_name: string;
  device_type: string;
  location: string;
  secret_token_hash: string;
  status: DeviceStatus;
  last_heartbeat_at: Date | null;
  firmware_version: string | null;
  created_at: Date;
  updated_at: Date;
}

function rowToDevice(row: DeviceRow): HardwareDevice {
  return {
    device_id: row.device_id,
    user_id: row.user_id,
    device_serial: row.device_serial,
    device_name: row.device_name,
    device_type: row.device_type,
    location: row.location,
    secret_token_hash: row.secret_token_hash,
    status: row.status,
    last_heartbeat_at: row.last_heartbeat_at ?? undefined,
    firmware_version: row.firmware_version ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function registerDevice(input: RegisterDeviceInput): Promise<HardwareDevice> {
  const pool = getPool();
  const deviceId = generateId('rpi');
  const tokenHash = await hashSecret(input.secret_token);

  try {
    const result = await pool.query<DeviceRow>(
      `INSERT INTO hardware_devices (
         device_id, user_id, device_serial, device_name, device_type,
         location, secret_token_hash, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        deviceId,
        input.user_id,
        input.device_serial,
        input.device_name,
        input.device_type,
        input.location,
        tokenHash,
        DeviceStatus.ONLINE,
      ],
    );

    const row = result.rows[0];
    if (!row) throw new DatabaseError('Failed to register device');

    logger.info({ deviceId, userId: input.user_id }, 'Hardware device registered');
    return rowToDevice(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      throw new ConflictError('Device with this serial number is already registered', {
        device_serial: input.device_serial,
      });
    }
    throw new DatabaseError(`Failed to register device: ${String(err)}`);
  }
}

export async function findDeviceBySerial(serial: string): Promise<HardwareDevice | null> {
  const pool = getPool();

  try {
    const result = await pool.query<DeviceRow>(
      'SELECT * FROM hardware_devices WHERE device_serial = $1',
      [serial],
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row) return null;
    return rowToDevice(row);
  } catch (err) {
    throw new DatabaseError(`Failed to find device: ${String(err)}`);
  }
}

export async function findDeviceById(deviceId: string): Promise<HardwareDevice> {
  const pool = getPool();

  try {
    const result = await pool.query<DeviceRow>(
      'SELECT * FROM hardware_devices WHERE device_id = $1',
      [deviceId],
    );

    if (result.rows.length === 0) throw new NotFoundError('Device', deviceId);
    const row = result.rows[0];
    if (!row) throw new NotFoundError('Device', deviceId);
    return rowToDevice(row);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to find device: ${String(err)}`);
  }
}

export async function updateHeartbeat(deviceId: string, systemStatus: SystemStatus): Promise<void> {
  const pool = getPool();

  try {
    await pool.query(
      `UPDATE hardware_devices
       SET status = $2, last_heartbeat_at = NOW(), updated_at = NOW()
       WHERE device_id = $1`,
      [deviceId, DeviceStatus.ONLINE],
    );

    // Log system status separately for monitoring
    await pool.query(
      `INSERT INTO device_heartbeats (device_id, system_status, recorded_at)
       VALUES ($1, $2::jsonb, NOW())`,
      [deviceId, JSON.stringify(systemStatus)],
    );
  } catch (err) {
    throw new DatabaseError(`Failed to update heartbeat: ${String(err)}`);
  }
}

export async function markDevicesOffline(thresholdMs: number): Promise<string[]> {
  const pool = getPool();

  try {
    const result = await pool.query<{ device_id: string }>(
      `UPDATE hardware_devices
       SET status = $1, updated_at = NOW()
       WHERE status = $2
         AND last_heartbeat_at < NOW() - ($3 || ' milliseconds')::INTERVAL
       RETURNING device_id`,
      [DeviceStatus.OFFLINE, DeviceStatus.ONLINE, thresholdMs.toString()],
    );

    return result.rows.map((r) => r.device_id);
  } catch (err) {
    throw new DatabaseError(`Failed to mark devices offline: ${String(err)}`);
  }
}

export async function logDeviceError(
  deviceId: string,
  errorType: string,
  message: string,
  recoveryAttempted: boolean,
): Promise<void> {
  const pool = getPool();

  try {
    await pool.query(
      `INSERT INTO device_error_logs (device_id, error_type, message, recovery_attempted, occurred_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [deviceId, errorType, message, recoveryAttempted],
    );
  } catch (err) {
    throw new DatabaseError(`Failed to log device error: ${String(err)}`);
  }
}
