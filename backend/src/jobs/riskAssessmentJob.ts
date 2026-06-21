/**
 * Risk Assessment Job Processor
 * Runs asynchronously after an alert is created.
 * Fetches context, calls Gemini, saves result, broadcasts via WebSocket.
 */

import Bull from 'bull';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  riskAssessmentQueue,
  RiskAssessmentJobData,
  smsNotificationQueue,
} from './queues';
import { findAlertById, saveRiskAssessment } from '../models/alertModel';
import { assessAlertRisk } from '../services/geminiService';
import { getPool } from '../config/database';
import { wsServer } from '../websocket/wsServer';

/**
 * Fetches recent alert history for a user (past 7 days).
 */
async function getRecentAlerts(userId: string) {
  const pool = getPool();
  const result = await pool.query<{
    timestamp: Date;
    lat: number;
    lon: number;
    status: string;
  }>(
    `SELECT
       timestamp,
       ST_X(location::geometry) as lon,
       ST_Y(location::geometry) as lat,
       status
     FROM alerts
     WHERE user_id = $1
       AND timestamp > NOW() - INTERVAL '7 days'
     ORDER BY timestamp DESC
     LIMIT 10`,
    [userId],
  );

  return result.rows.map((r) => ({
    timestamp: r.timestamp,
    location: { lat: r.lat, lon: r.lon },
    status: r.status,
  }));
}

async function processRiskAssessment(job: Bull.Job<RiskAssessmentJobData>): Promise<void> {
  const { alertId, userId } = job.data;
  logger.info({ alertId, userId, jobId: job.id }, 'Processing risk assessment job');

  // 1. Fetch the alert
  const alert = await findAlertById(alertId);

  // 2. Fetch recent alert history for context
  const recentAlerts = await getRecentAlerts(userId);

  // 3. Run Gemini assessment
  const assessment = await assessAlertRisk({
    alertId,
    timestamp: alert.timestamp,
    location: {
      lat: alert.location.lat,
      lon: alert.location.lon,
      address: alert.location.address,
    },
    deviceName: alert.device_name,
    recentAlerts,
  });

  // 4. Persist assessment to database
  await saveRiskAssessment(alertId, assessment);

  // 5. Broadcast assessment result via WebSocket
  wsServer.broadcastToUser(userId, {
    type: 'risk_assessment_complete',
    data: {
      alert_id: alertId,
      risk_level: assessment.risk_level,
      risk_score: assessment.risk_score,
      suggested_actions: assessment.suggested_actions,
    },
  });

  // 6. Queue SMS notifications (now that we have risk assessment context)
  await smsNotificationQueue.add(
    { alertId, userId },
    { priority: assessment.risk_level === 'high' ? 1 : 2 },
  );

  logger.info({ alertId, riskLevel: assessment.risk_level }, 'Risk assessment job complete');
}

/**
 * Registers the risk assessment processor.
 * Called during application startup.
 */
export function startRiskAssessmentWorker(): void {
  riskAssessmentQueue.process(
    config.bull.concurrencyRiskAssessment,
    processRiskAssessment,
  );
  logger.info(
    { concurrency: config.bull.concurrencyRiskAssessment },
    'Risk assessment worker started',
  );
}
