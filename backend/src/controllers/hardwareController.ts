/**
 * Hardware Controller - Handles all /api/v1/hardware endpoints.
 * Manages device registration, heartbeats, config delivery, and error logging.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  registerDevice,
  findDeviceBySerial,
  findDeviceById,
  updateHeartbeat,
  logDeviceError,
} from '../models/hardwareModel';
import { listActiveContactsForAlert } from '../models/contactModel';
import { resolveUserFromPhone } from '../services/authService';
import { generateDeviceToken } from '../services/authService';
import { generateSecureToken } from '../utils/crypto';
import { wsServer } from '../websocket/wsServer';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// ---- Validation Schemas ------------------------------------

export const registerDeviceSchema = z.object({
  device_serial: z.string().min(1).max(200),
  device_name: z.string().min(1).max(100),
  device_type: z.string().min(1).max(50),
  location: z.string().min(1).max(100),
  user_phone: z.string().regex(/^\+[1-9]\d{1,14}$/),
});

export const heartbeatSchema = z.object({
  device_id: z.string().min(1),
  timestamp: z.string().datetime(),
  system_status: z.object({
    cpu_temp_c: z.number().optional(),
    memory_available_mb: z.number().optional(),
    wifi_signal_strength: z.number().optional(),
    gps_status: z.string().optional(),
    arduino_connected: z.boolean().optional(),
  }).optional(),
});

export const deviceErrorSchema = z.object({
  error_type: z.string().min(1),
  timestamp: z.string().datetime(),
  message: z.string().min(1).max(500),
  recovery_attempted: z.boolean().default(false),
});

// ---- Handlers ----------------------------------------------

export async function registerDeviceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as z.infer<typeof registerDeviceSchema>;

    // Look up user by phone number
    const userId = await resolveUserFromPhone(body.user_phone);
    if (!userId) {
      throw new BadRequestError(
        'No user account found for this phone number. Please create an account first.',
        { user_phone: body.user_phone },
      );
    }

    // Check if device is already registered
    const existing = await findDeviceBySerial(body.device_serial);
    if (existing) {
      throw new ConflictError('Device is already registered. Use the existing device token.', {
        device_id: existing.device_id,
      });
    }

    // Generate a secret token for this device
    const secretToken = generateSecureToken(32);

    const device = await registerDevice({
      device_serial: body.device_serial,
      device_name: body.device_name,
      device_type: body.device_type,
      location: body.location,
      user_id: userId,
      secret_token: secretToken,
    });

    // Issue a device JWT for subsequent API calls
    const deviceJwt = generateDeviceToken(device.device_id, userId);

    logger.info({ deviceId: device.device_id, userId }, 'New hardware device registered');

    sendSuccess(
      res,
      {
        device_id: device.device_id,
        device_secret_token: deviceJwt, // This is the JWT the Pi will store
        user_id: userId,
        device_name: device.device_name,
        registration_timestamp: device.created_at,
        backend_url: `http://${config.server.host}:${config.server.port}`,
        backend_port: config.server.port,
        heartbeat_interval: 30,
        gps_timeout: 30,
      },
      { statusCode: 201 },
    );
  } catch (err) {
    next(err);
  }
}

export async function heartbeatHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const device = req.device;
    if (!device) throw new BadRequestError('Device authentication required');

    const body = req.body as z.infer<typeof heartbeatSchema>;

    await updateHeartbeat(device.sub, body.system_status ?? {});

    sendSuccess(res, {
      heartbeat_received: true,
      server_timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getDeviceConfigHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const device = req.device;
    if (!device) throw new BadRequestError('Device authentication required');

    const { device_id } = req.params as { device_id: string };

    // Ensure authenticated device matches the requested device_id
    if (device.sub !== device_id) {
      throw new BadRequestError('Device ID mismatch');
    }

    const deviceRecord = await findDeviceById(device_id);
    const contacts = await listActiveContactsForAlert(device.user_id);

    sendSuccess(res, {
      device_id: deviceRecord.device_id,
      heartbeat_interval: 30,
      gps_timeout: 30,
      backend_url: `${req.protocol}://${req.get('host')}`,
      features_enabled: {
        gps_enabled: true,
        sms_enabled: config.features.smsNotifications,
        risk_assessment_enabled: config.features.geminiAssessment,
      },
      emergency_contacts: contacts.map((c) => ({
        contact_id: c.contact_id,
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
        is_active: c.is_active,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function reportDeviceErrorHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const device = req.device;
    if (!device) throw new BadRequestError('Device authentication required');

    const { device_id } = req.params as { device_id: string };
    const body = req.body as z.infer<typeof deviceErrorSchema>;

    if (device.sub !== device_id) {
      throw new BadRequestError('Device ID mismatch');
    }

    await logDeviceError(device_id, body.error_type, body.message, body.recovery_attempted);

    // Broadcast device error to connected dashboard clients
    wsServer.broadcastToUser(device.user_id, {
      type: 'device_status_changed',
      data: {
        device_id,
        status: 'degraded',
        error_type: body.error_type,
        message: body.message,
      },
    });

    let recommendedAction = 'Check device logs for more information';
    if (body.error_type === 'arduino_disconnected') {
      recommendedAction = 'Check USB cable connection between Raspberry Pi and Arduino';
    } else if (body.error_type === 'gps_failure') {
      recommendedAction = 'Check GPS module serial connection and positioning';
    }

    sendSuccess(res, {
      error_logged: true,
      recommended_action: recommendedAction,
    });
  } catch (err) {
    next(err);
  }
}
