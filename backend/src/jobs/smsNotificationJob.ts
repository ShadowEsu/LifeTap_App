/**
 * SMS Notification Job Processor
 * Sends SMS notifications to all active, verified emergency contacts.
 * Runs after risk assessment is complete so risk level can be included.
 */

import Bull from 'bull';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { smsNotificationQueue, SmsNotificationJobData } from './queues';
import { findAlertById, updateAlertStatus } from '../models/alertModel';
import { listActiveContactsForAlert } from '../models/contactModel';
import { sendAlertToContacts, AlertSmsPayload } from '../services/twilioService';
import { AlertStatus, NotificationPreference, RiskLevel } from '../types';
import { getPool } from '../config/database';

async function recordSmsDelivery(
  alertId: string,
  contactId: string,
  messageSid: string | undefined,
  success: boolean,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO alert_contact_notifications (
       alert_id, contact_id, sms_message_sid, sms_sent_at, sms_success
     )
     VALUES ($1, $2, $3, NOW(), $4)
     ON CONFLICT (alert_id, contact_id) DO UPDATE
       SET sms_message_sid = $3, sms_sent_at = NOW(), sms_success = $4`,
    [alertId, contactId, messageSid ?? null, success],
  );
}

async function processSmsNotification(job: Bull.Job<SmsNotificationJobData>): Promise<void> {
  const { alertId, userId } = job.data;
  logger.info({ alertId, userId, jobId: job.id }, 'Processing SMS notification job');

  // 1. Fetch alert (now with risk assessment attached)
  const alert = await findAlertById(alertId);

  // 2. Fetch active & verified contacts
  const contacts = await listActiveContactsForAlert(userId);

  if (contacts.length === 0) {
    logger.warn({ alertId, userId }, 'No active, verified contacts — skipping SMS');
    return;
  }

  // 3. Filter by notification preference based on risk level
  const riskLevel = alert.risk_assessment?.risk_level ?? RiskLevel.MEDIUM;
  const eligibleContacts = contacts.filter((c) => {
    if (c.notification_preference === NotificationPreference.ALWAYS) return true;
    if (
      c.notification_preference === NotificationPreference.HIGH_RISK_ONLY &&
      riskLevel === RiskLevel.HIGH
    )
      return true;
    return false;
  });

  if (eligibleContacts.length === 0) {
    logger.info({ alertId, riskLevel }, 'No contacts eligible for this risk level');
    return;
  }

  // 4. Build SMS payload
  const smsPayload: AlertSmsPayload = {
    alertId,
    userName: 'LifeTap User', // TODO: Fetch user name from DB
    location: {
      lat: alert.location.lat,
      lon: alert.location.lon,
      address: alert.location.address,
    },
    riskLevel,
    suggestedAction: alert.risk_assessment?.suggested_actions[0],
    timestamp: alert.timestamp,
  };

  // 5. Send SMS to all eligible contacts
  const contactsForSms = eligibleContacts.map((c) => ({
    phone: c.phone,
    name: c.name,
    contact_id: c.contact_id,
  }));

  const results = await sendAlertToContacts(contactsForSms, smsPayload);

  // 6. Record delivery status
  await Promise.all(
    results.map(async (result, i) => {
      const contact = contactsForSms[i];
      if (!contact) return;
      await recordSmsDelivery(alertId, contact.contact_id, result.messageSid, result.success);
    }),
  );

  // 7. Update alert status to 'notified'
  await updateAlertStatus(alertId, AlertStatus.NOTIFIED);

  const successCount = results.filter((r) => r.success).length;
  logger.info(
    { alertId, total: results.length, success: successCount },
    'SMS notification job complete',
  );
}

/**
 * Registers the SMS notification processor.
 * Called during application startup.
 */
export function startSmsNotificationWorker(): void {
  smsNotificationQueue.process(
    config.bull.concurrencySmsNotification,
    processSmsNotification,
  );
  logger.info(
    { concurrency: config.bull.concurrencySmsNotification },
    'SMS notification worker started',
  );
}
