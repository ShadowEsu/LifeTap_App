/**
 * Twilio SMS Service
 * Sends SMS notifications to emergency contacts and verification codes.
 * Handles all Twilio API interactions with proper error handling.
 */

import twilio from 'twilio';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { ExternalApiError } from '../utils/errors';
import { RiskLevel } from '../types';

let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!config.twilio.accountSid || !config.twilio.authToken) {
      throw new ExternalApiError('Twilio', 'Twilio credentials are not configured');
    }
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

export interface AlertSmsPayload {
  alertId: string;
  userName: string;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  riskLevel?: RiskLevel;
  suggestedAction?: string;
  timestamp: Date;
}

export interface SmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
  phone: string;
}

/**
 * Formats a human-readable SMS body for an emergency alert.
 */
function formatAlertSms(payload: AlertSmsPayload, contactName: string): string {
  const riskEmoji =
    payload.riskLevel === RiskLevel.HIGH
      ? '[HIGH RISK]'
      : payload.riskLevel === RiskLevel.MEDIUM
        ? '[MEDIUM RISK]'
        : '';

  const locationStr = payload.location.address
    ? payload.location.address
    : `GPS: ${payload.location.lat.toFixed(4)}, ${payload.location.lon.toFixed(4)}`;

  const timeStr = payload.timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });

  const actionStr = payload.suggestedAction ? `\nSuggested: ${payload.suggestedAction}` : '';

  return (
    `LIFETAP EMERGENCY ALERT ${riskEmoji}\n` +
    `${contactName}, ${payload.userName} needs help!\n` +
    `Time: ${timeStr}\n` +
    `Location: ${locationStr}${actionStr}\n` +
    `Ref: ${payload.alertId}`
  );
}

/**
 * Sends an emergency alert SMS to a single contact.
 */
export async function sendAlertSms(
  phone: string,
  contactName: string,
  payload: AlertSmsPayload,
): Promise<SmsResult> {
  if (!config.features.smsNotifications) {
    logger.warn({ phone }, 'SMS notifications disabled — skipping send');
    return { success: true, phone, messageSid: 'sms_disabled' };
  }

  try {
    const client = getTwilioClient();
    const body = formatAlertSms(payload, contactName);

    const message = await client.messages.create({
      body,
      from: config.twilio.phoneNumber,
      to: phone,
    });

    logger.info(
      { messageSid: message.sid, phone, alertId: payload.alertId },
      'Alert SMS sent successfully',
    );

    return { success: true, messageSid: message.sid, phone };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, phone, alertId: payload.alertId }, 'Failed to send alert SMS');
    return { success: false, error: errorMessage, phone };
  }
}

/**
 * Sends alert SMS notifications to multiple contacts in parallel.
 * Does not throw — individual failures are recorded in results.
 */
export async function sendAlertToContacts(
  contacts: Array<{ phone: string; name: string; contact_id: string }>,
  payload: AlertSmsPayload,
): Promise<SmsResult[]> {
  const results = await Promise.allSettled(
    contacts.map((contact) => sendAlertSms(contact.phone, contact.name, payload)),
  );

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const contact = contacts[i];
    return {
      success: false,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      phone: contact?.phone ?? 'unknown',
    };
  });
}

/**
 * Sends a phone verification SMS to a new emergency contact.
 */
export async function sendVerificationSms(phone: string, code: string): Promise<void> {
  if (!config.features.smsNotifications) {
    logger.warn({ phone }, 'SMS notifications disabled — skipping verification SMS');
    return;
  }

  try {
    const client = getTwilioClient();

    await client.messages.create({
      body:
        `LifeTap Emergency Alert System\n` +
        `You have been added as an emergency contact.\n` +
        `Your verification code is: ${code}\n` +
        `Reply STOP to opt out.`,
      from: config.twilio.phoneNumber,
      to: phone,
    });

    logger.info({ phone }, 'Verification SMS sent');
  } catch (err) {
    logger.error({ err, phone }, 'Failed to send verification SMS');
    throw new ExternalApiError('Twilio', `Failed to send verification SMS: ${String(err)}`);
  }
}

/**
 * Validates a phone number format using Twilio's Lookup API.
 * Returns the formatted E.164 phone number on success.
 */
export async function validatePhoneNumber(phone: string): Promise<string> {
  try {
    const client = getTwilioClient();
    const lookup = await client.lookups.v2.phoneNumbers(phone).fetch();
    return lookup.phoneNumber;
  } catch (err) {
    throw new ExternalApiError('Twilio', `Invalid phone number: ${String(err)}`);
  }
}
