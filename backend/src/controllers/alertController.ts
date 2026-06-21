/**
 * Alert Controller - Handles all /api/v1/alerts endpoints.
 * Creates alerts, retrieves them, lists with filtering, and updates status.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createAlert,
  findAlertById,
  listAlerts,
  updateAlertStatus,
  getAlertStatistics,
} from '../models/alertModel';
import { reverseGeocode } from '../services/mapsService';
import { updateAlertAddress } from '../models/alertModel';
import { riskAssessmentQueue } from '../jobs/queues';
import { wsServer } from '../websocket/wsServer';
import { sendSuccess, buildPaginationMeta } from '../utils/response';
import { assertOwnership } from '../middleware/auth';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { AlertStatus, RiskLevel } from '../types';
import { logger } from '../utils/logger';

// ---- Validation Schemas ------------------------------------

export const createAlertSchema = z.object({
  device_id: z.string().min(1, 'device_id is required'),
  timestamp: z.string().datetime('timestamp must be a valid ISO 8601 datetime'),
  lat: z.number().min(-90).max(90, 'lat must be between -90 and 90'),
  lon: z.number().min(-180).max(180, 'lon must be between -180 and 180'),
  location_accuracy: z.number().positive().optional(),
  device_name: z.string().max(100).optional(),
  altitude_meters: z.number().optional(),
  satellites_used: z.number().int().positive().optional(),
  hdop: z.number().positive().optional(),
  location_status: z.enum(['real-time', 'cached', 'unknown']).optional(),
});

export const updateAlertSchema = z.object({
  status: z.nativeEnum(AlertStatus),
  resolution_note: z.string().max(500).optional(),
});

export const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional().default('-timestamp'),
  status: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) as AlertStatus[] : undefined)),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  risk_level: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) as RiskLevel[] : undefined)),
});

// ---- Handlers ----------------------------------------------

export async function createAlertHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const device = req.device;
    if (!device) throw new BadRequestError('Device authentication required');

    const body = req.body as z.infer<typeof createAlertSchema>;

    // Verify the device_id in the body matches the authenticated device
    if (body.device_id !== device.sub) {
      throw new BadRequestError('device_id does not match authenticated device');
    }

    // Create the alert record
    const alert = await createAlert({
      user_id: device.user_id,
      device_id: body.device_id,
      device_name: body.device_name,
      timestamp: new Date(body.timestamp),
      lat: body.lat,
      lon: body.lon,
      location_accuracy: body.location_accuracy,
      altitude_meters: body.altitude_meters,
      satellites_used: body.satellites_used,
      hdop: body.hdop,
      location_status: body.location_status ?? 'unknown',
    });

    // Broadcast immediately to connected WebSocket clients
    wsServer.broadcastToUser(device.user_id, {
      type: 'alert_created',
      data: {
        alert_id: alert.alert_id,
        user_id: alert.user_id,
        device_id: alert.device_id,
        timestamp: alert.timestamp.toISOString(),
        location: {
          lat: alert.location.lat,
          lon: alert.location.lon,
          accuracy_meters: alert.location.accuracy_meters,
        },
        status: alert.status,
      },
    });

    // Queue async operations (non-blocking)
    void riskAssessmentQueue.add({
      alertId: alert.alert_id,
      userId: device.user_id,
    });

    // Trigger geocoding in background (fire-and-forget)
    reverseGeocode(body.lat, body.lon)
      .then(async (address) => {
        if (address) {
          await updateAlertAddress(alert.alert_id, address);
        }
      })
      .catch((err: unknown) => {
        logger.warn({ err, alertId: alert.alert_id }, 'Background geocoding failed');
      });

    sendSuccess(res, alert, { statusCode: 201 });
  } catch (err) {
    next(err);
  }
}

export async function getAlertHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { alert_id } = req.params as { alert_id: string };

    const alert = await findAlertById(alert_id);
    assertOwnership(req, alert.user_id, 'alert');

    sendSuccess(res, alert);
  } catch (err) {
    next(err);
  }
}

export async function listAlertsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new BadRequestError('Authentication required');

    const query = req.query as z.infer<typeof listAlertsQuerySchema>;

    const { alerts, total } = await listAlerts({
      userId: req.user.sub,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      status: query.status,
      startDate: query.start_date ? new Date(query.start_date) : undefined,
      endDate: query.end_date ? new Date(query.end_date) : undefined,
      riskLevel: query.risk_level,
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/api/v1/alerts`;

    sendSuccess(res, alerts, {
      pagination: buildPaginationMeta(query.page, query.limit, total, baseUrl),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAlertHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { alert_id } = req.params as { alert_id: string };
    const body = req.body as z.infer<typeof updateAlertSchema>;

    const existing = await findAlertById(alert_id);
    assertOwnership(req, existing.user_id, 'alert');

    if (existing.status === AlertStatus.CLOSED && body.status === AlertStatus.CLOSED) {
      throw new BadRequestError('Alert is already closed');
    }

    const updated = await updateAlertStatus(alert_id, body.status, body.resolution_note);

    sendSuccess(res, {
      alert_id: updated.alert_id,
      status: updated.status,
      updated_at: updated.updated_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function exportHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new BadRequestError('Authentication required');

    const format = (req.query['format'] as string) ?? 'json';
    const startDate = req.query['start_date']
      ? new Date(req.query['start_date'] as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query['end_date'] ? new Date(req.query['end_date'] as string) : new Date();

    const { alerts } = await listAlerts({
      userId: req.user.sub,
      page: 1,
      limit: 10000,
      startDate,
      endDate,
    });

    if (format === 'csv') {
      const csvHeader = 'alert_id,timestamp,status,risk_level,lat,lon,address,contact_responses\n';
      const csvRows = alerts
        .map(
          (a) =>
            `${a.alert_id},${a.timestamp.toISOString()},${a.status},${a.risk_assessment?.risk_level ?? ''},` +
            `${a.location.lat},${a.location.lon},"${a.location.address ?? ''}",0`,
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="lifetap-alerts.csv"');
      res.status(200).send(csvHeader + csvRows);
      return;
    }

    sendSuccess(res, alerts);
  } catch (err) {
    next(err);
  }
}

export async function getStatisticsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new BadRequestError('Authentication required');

    const period = (req.query['period'] as string) ?? 'month';
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const stats = await getAlertStatistics(req.user.sub, startDate, now);

    sendSuccess(res, {
      period: `${startDate.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`,
      total_alerts: stats.totalAlerts,
      alert_breakdown: stats.byRiskLevel,
      average_response_time: stats.avgResponseTimeSec,
      response_rate: 0.92, // TODO: calculate from actual response data
      false_alarm_rate: stats.falseAlarmRate,
      by_device: stats.byDevice,
    });
  } catch (err) {
    next(err);
  }
}
