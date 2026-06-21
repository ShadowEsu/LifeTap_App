/**
 * Bull job queue definitions.
 * All queues are backed by Redis and share the same connection config.
 */

import Bull from 'bull';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const QUEUE_RISK_ASSESSMENT = 'risk-assessment';
export const QUEUE_SMS_NOTIFICATION = 'sms-notification';

function createQueue<T>(name: string): Bull.Queue<T> {
  const queue = new Bull<T>(name, {
    redis: config.redis.url,
    prefix: 'lifechain:bull',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  });

  queue.on('failed', (job, err) => {
    logger.error(
      { queue: name, jobId: job.id, attempt: job.attemptsMade, err },
      'Job failed',
    );
  });

  queue.on('stalled', (job) => {
    logger.warn({ queue: name, jobId: job.id }, 'Job stalled');
  });

  queue.on('error', (err) => {
    logger.error({ queue: name, err }, 'Queue error');
  });

  logger.info({ queue: name }, 'Job queue initialized');
  return queue;
}

// ---- Typed Job Payloads ------------------------------------

export interface RiskAssessmentJobData {
  alertId: string;
  userId: string;
}

export interface SmsNotificationJobData {
  alertId: string;
  userId: string;
}

// ---- Queue Instances ----------------------------------------

export const riskAssessmentQueue = createQueue<RiskAssessmentJobData>(QUEUE_RISK_ASSESSMENT);
export const smsNotificationQueue = createQueue<SmsNotificationJobData>(QUEUE_SMS_NOTIFICATION);

/**
 * Gracefully closes all queues.
 * Called during application shutdown.
 */
export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    riskAssessmentQueue.close(),
    smsNotificationQueue.close(),
  ]);
  logger.info('All job queues closed');
}
