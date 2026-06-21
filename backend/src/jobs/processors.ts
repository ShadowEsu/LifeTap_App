import { logger } from '../config/logger';

export const startJobProcessors = () => {
  logger.info('Job processors started');
  
  // TODO: Start Bull queue workers for:
  // - Risk assessment (Gemini AI)
  // - SMS notifications (Twilio)
};
