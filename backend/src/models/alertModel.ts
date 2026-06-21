/**
 * Alert Model - Data access layer for the alerts table.
 * Uses PostGIS for geographic storage and proximity queries.
 */

import { getPool } from '../config/database';
import { Alert, AlertStatus, RiskLevel, RiskAssessment, Location } from '../types';
import { generateId } from '../utils/crypto';
import { DatabaseError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface CreateAlertInput {
  user_id: string;
  device_id: string;
  device_name?: string;
  timestamp: Date;
  lat: number;
  lon: number;
  location_accuracy?: number;
  altitude_meters?: number;
  satellites_used?: number;
  hdop?: number;
  location_status?: 'real-time' | 'cached' | 'unknown';
}

export interface ListAlertsQuery {
  userId: string;
  page: number;
  limit: number;
  sort?: string;
  status?: AlertStatus[];
  startDate?: Date;
  endDate?: Date;
  riskLevel?: RiskLevel[];
  locationRadiusKm?: number;
}

interface AlertRow {
  alert_id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  status: AlertStatus;
  timestamp: Date;
  lat: number;
  lon: number;
  location_accuracy_m: number | null;
  altitude_meters: number | null;
  satellites_used: number | null;
  hdop: number | null;
  address: string | null;
  location_status: string;
  risk_level: RiskLevel | null;
  risk_score: number | null;
  risk_assessment_json: string | null;
  resolution_json: string | null;
  created_at: Date;
  updated_at: Date;
}

function rowToAlert(row: AlertRow): Alert {
  const location: Location = {
    lat: row.lat,
    lon: row.lon,
    accuracy_meters: row.location_accuracy_m ?? undefined,
    address: row.address ?? undefined,
    altitude_meters: row.altitude_meters ?? undefined,
    satellites_used: row.satellites_used ?? undefined,
    hdop: row.hdop ?? undefined,
  };

  return {
    alert_id: row.alert_id,
    user_id: row.user_id,
    device_id: row.device_id,
    device_name: row.device_name ?? undefined,
    status: row.status,
    timestamp: row.timestamp,
    location,
    location_status: (row.location_status as Alert['location_status']) ?? 'unknown',
    risk_assessment: row.risk_assessment_json
      ? (JSON.parse(row.risk_assessment_json) as RiskAssessment)
      : undefined,
    resolution: row.resolution_json
      ? JSON.parse(row.resolution_json) as Alert['resolution']
      : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createAlert(input: CreateAlertInput): Promise<Alert> {
  const pool = getPool();
  const alertId = generateId('alert');

  try {
    const result = await pool.query<AlertRow>(
      `INSERT INTO alerts (
         alert_id, user_id, device_id, device_name, status, timestamp,
         location, lat, lon, location_accuracy_m, altitude_meters,
         satellites_used, hdop, location_status
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         ST_SetSRID(ST_MakePoint($8, $7), 4326), $7, $8, $9, $10,
         $11, $12, $13
       )
       RETURNING
         alert_id, user_id, device_id, device_name, status, timestamp,
         ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat,
         location_accuracy_m, altitude_meters, satellites_used, hdop,
         address, location_status, risk_level, risk_score,
         risk_assessment_json, resolution_json, created_at, updated_at`,
      [
        alertId,
        input.user_id,
        input.device_id,
        input.device_name ?? null,
        AlertStatus.RECEIVED,
        input.timestamp,
        input.lat,
        input.lon,
        input.location_accuracy ?? null,
        input.altitude_meters ?? null,
        input.satellites_used ?? null,
        input.hdop ?? null,
        input.location_status ?? 'unknown',
      ],
    );

    const row = result.rows[0];
    if (!row) throw new DatabaseError('Failed to create alert — no row returned');

    logger.info({ alertId, userId: input.user_id, deviceId: input.device_id }, 'Alert created');
    return rowToAlert(row);
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(`Failed to create alert: ${String(err)}`);
  }
}

export async function findAlertById(alertId: string): Promise<Alert> {
  const pool = getPool();

  try {
    const result = await pool.query<AlertRow>(
      `SELECT
         alert_id, user_id, device_id, device_name, status, timestamp,
         ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat,
         location_accuracy_m, altitude_meters, satellites_used, hdop,
         address, location_status, risk_level, risk_score,
         risk_assessment_json, resolution_json, created_at, updated_at
       FROM alerts
       WHERE alert_id = $1`,
      [alertId],
    );

    if (result.rows.length === 0) throw new NotFoundError('Alert', alertId);
    const row = result.rows[0];
    if (!row) throw new NotFoundError('Alert', alertId);
    return rowToAlert(row);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to find alert: ${String(err)}`);
  }
}

export async function listAlerts(
  query: ListAlertsQuery,
): Promise<{ alerts: Alert[]; total: number }> {
  const pool = getPool();
  const conditions: string[] = ['user_id = $1'];
  const params: unknown[] = [query.userId];
  let paramIndex = 2;

  if (query.status && query.status.length > 0) {
    conditions.push(`status = ANY($${paramIndex++})`);
    params.push(query.status);
  }

  if (query.startDate) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    params.push(query.startDate);
  }

  if (query.endDate) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    params.push(query.endDate);
  }

  if (query.riskLevel && query.riskLevel.length > 0) {
    conditions.push(`risk_level = ANY($${paramIndex++})`);
    params.push(query.riskLevel);
  }

  const whereClause = conditions.join(' AND ');

  // Determine sort order (default: newest first)
  const sortField = query.sort?.startsWith('-') ? query.sort.slice(1) : query.sort;
  const sortDir = query.sort?.startsWith('-') ? 'DESC' : 'ASC';
  const allowedSortFields = ['timestamp', 'created_at', 'status', 'risk_level'];
  const safeSortField = allowedSortFields.includes(sortField ?? '') ? sortField : 'timestamp';
  const orderClause = `${safeSortField} ${sortDir}`;

  const offset = (query.page - 1) * query.limit;

  try {
    const [countResult, dataResult] = await Promise.all([
      pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM alerts WHERE ${whereClause}`,
        params,
      ),
      pool.query<AlertRow>(
        `SELECT
           alert_id, user_id, device_id, device_name, status, timestamp,
           ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat,
           location_accuracy_m, altitude_meters, satellites_used, hdop,
           address, location_status, risk_level, risk_score,
           risk_assessment_json, resolution_json, created_at, updated_at
         FROM alerts
         WHERE ${whereClause}
         ORDER BY ${orderClause}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, query.limit, offset],
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
    const alerts = dataResult.rows.map(rowToAlert);

    return { alerts, total };
  } catch (err) {
    throw new DatabaseError(`Failed to list alerts: ${String(err)}`);
  }
}

export async function updateAlertStatus(
  alertId: string,
  status: AlertStatus,
  resolutionNote?: string,
): Promise<Alert> {
  const pool = getPool();

  try {
    const resolution =
      status === AlertStatus.CLOSED
        ? JSON.stringify({
            status: 'closed',
            resolved_at: new Date().toISOString(),
            resolved_by: 'user',
            resolution_note: resolutionNote,
          })
        : null;

    const result = await pool.query<AlertRow>(
      `UPDATE alerts
       SET status = $2,
           resolution_json = COALESCE($3::jsonb, resolution_json),
           updated_at = NOW()
       WHERE alert_id = $1
       RETURNING
         alert_id, user_id, device_id, device_name, status, timestamp,
         ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat,
         location_accuracy_m, altitude_meters, satellites_used, hdop,
         address, location_status, risk_level, risk_score,
         risk_assessment_json, resolution_json, created_at, updated_at`,
      [alertId, status, resolution],
    );

    if (result.rows.length === 0) throw new NotFoundError('Alert', alertId);
    const row = result.rows[0];
    if (!row) throw new NotFoundError('Alert', alertId);
    return rowToAlert(row);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to update alert: ${String(err)}`);
  }
}

export async function saveRiskAssessment(
  alertId: string,
  assessment: RiskAssessment,
): Promise<void> {
  const pool = getPool();

  try {
    await pool.query(
      `UPDATE alerts
       SET risk_level = $2,
           risk_score = $3,
           risk_assessment_json = $4::jsonb,
           status = CASE WHEN status = 'received' THEN 'assessing'::alert_status ELSE status END,
           updated_at = NOW()
       WHERE alert_id = $1`,
      [alertId, assessment.risk_level, assessment.risk_score, JSON.stringify(assessment)],
    );
    logger.info({ alertId, riskLevel: assessment.risk_level }, 'Risk assessment saved');
  } catch (err) {
    throw new DatabaseError(`Failed to save risk assessment: ${String(err)}`);
  }
}

export async function updateAlertAddress(alertId: string, address: string): Promise<void> {
  const pool = getPool();
  try {
    await pool.query('UPDATE alerts SET address = $2, updated_at = NOW() WHERE alert_id = $1', [
      alertId,
      address,
    ]);
  } catch (err) {
    throw new DatabaseError(`Failed to update alert address: ${String(err)}`);
  }
}

export async function getAlertStatistics(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  totalAlerts: number;
  byRiskLevel: { high: number; medium: number; low: number };
  avgResponseTimeSec: number;
  falseAlarmRate: number;
  byDevice: Array<{ device_id: string; device_name: string; alerts: number }>;
}> {
  const pool = getPool();

  try {
    const [statsResult, deviceResult] = await Promise.all([
      pool.query<{
        total: string;
        high: string;
        medium: string;
        low: string;
        avg_response: string;
        false_alarms: string;
      }>(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high,
           COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium,
           COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low,
           AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response,
           COUNT(CASE WHEN resolution_json->>'resolution_note' ILIKE '%false alarm%' THEN 1 END) as false_alarms
         FROM alerts
         WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3`,
        [userId, startDate, endDate],
      ),
      pool.query<{ device_id: string; device_name: string; alerts: string }>(
        `SELECT device_id, device_name, COUNT(*) as alerts
         FROM alerts
         WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
         GROUP BY device_id, device_name
         ORDER BY alerts DESC`,
        [userId, startDate, endDate],
      ),
    ]);

    const s = statsResult.rows[0];
    const total = parseInt(s?.total ?? '0', 10);

    return {
      totalAlerts: total,
      byRiskLevel: {
        high: parseInt(s?.high ?? '0', 10),
        medium: parseInt(s?.medium ?? '0', 10),
        low: parseInt(s?.low ?? '0', 10),
      },
      avgResponseTimeSec: Math.round(parseFloat(s?.avg_response ?? '0')),
      falseAlarmRate: total > 0 ? parseInt(s?.false_alarms ?? '0', 10) / total : 0,
      byDevice: deviceResult.rows.map((r) => ({
        device_id: r.device_id,
        device_name: r.device_name,
        alerts: parseInt(r.alerts, 10),
      })),
    };
  } catch (err) {
    throw new DatabaseError(`Failed to get statistics: ${String(err)}`);
  }
}
