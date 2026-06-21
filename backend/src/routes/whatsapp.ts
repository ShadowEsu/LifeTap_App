import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../config/logger';

const router = Router();

// Twilio credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+16892644297';

// Base64 encode credentials for Basic Auth
const twilioAuth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

// Fetch WhatsApp chat history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const targetContact = 'whatsapp:+19254570055'; // The contact to pull messages from
    
    logger.info(`Fetching WhatsApp history for contact: ${targetContact}`);

    // Fetch messages from Twilio API
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN
        },
        params: {
          limit: 100,
          pageSize: 100
        }
      }
    );

    // Filter messages for our contact
    const messages = (response.data.messages || [])
      .filter((msg: any) => {
        const isFromContact = msg.from === targetContact && msg.to === TWILIO_PHONE;
        const isToContact = msg.from === TWILIO_PHONE && msg.to === targetContact;
        return isFromContact || isToContact;
      })
      .sort((a: any, b: any) => 
        new Date(a.date_sent).getTime() - new Date(b.date_sent).getTime()
      )
      .map((msg: any) => ({
        id: msg.sid,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        timestamp: msg.date_sent,
        direction: msg.from === targetContact ? 'incoming' : 'outgoing',
        status: msg.status
      }));

    logger.info(`Retrieved ${messages.length} messages from WhatsApp history`);
    res.json(messages);
  } catch (error: any) {
    logger.error(`Failed to fetch WhatsApp history: ${error.message}`);
    res.status(500).json({ 
      error: 'Failed to fetch WhatsApp history',
      details: error.message 
    });
  }
});

// Send WhatsApp message
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing to or message' });
    }

    const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    logger.info(`Sending WhatsApp message to: ${toWhatsApp}`);

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        From: TWILIO_PHONE,
        To: toWhatsApp,
        Body: message
      },
      {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    logger.info(`Message sent successfully. SID: ${response.data.sid}`);
    res.json({ 
      success: true, 
      sid: response.data.sid,
      status: response.data.status
    });
  } catch (error: any) {
    logger.error(`Failed to send WhatsApp message: ${error.message}`);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message 
    });
  }
});

// Webhook for receiving messages from Twilio
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { From, To, Body, MessageSid, Timestamp } = req.body;

    logger.info(`Received WhatsApp message from: ${From}`);
    logger.debug(`Message: ${Body}`);

    // Here you could save to database
    // await saveWhatsAppMessage({ from: From, to: To, body: Body, sid: MessageSid })

    // Send acknowledgment
    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Webhook error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get unread messages count
router.get('/unread', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN
        },
        params: {
          limit: 100
        }
      }
    );

    const targetContact = 'whatsapp:+19254570055';
    const unreadCount = (response.data.messages || [])
      .filter((msg: any) => 
        msg.from === targetContact && 
        msg.to === TWILIO_PHONE && 
        msg.status === 'received'
      ).length;

    res.json({ unreadCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
