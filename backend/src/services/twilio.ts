import { config } from '../config/env';
import { logger } from '../config/logger';

export const sendAlertSMS = async (phoneNumber: string, message: string) => {
  try {
    logger.info(`Sending SMS to ${phoneNumber}`);
    
    // TODO: Implement Twilio SMS sending
    return {
      success: true,
      messageId: 'mock-message-id',
    };
  } catch (error) {
    logger.error('SMS sending failed:', error);
    throw error;
  }
};
