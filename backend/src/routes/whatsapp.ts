import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../config/logger';
import { getPool } from '../config/database';

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

// Parse lat/lon from message body (supports plain coords and Google Maps URLs)
function parseCoords(body: string): { lat: number; lon: number } | null {
  // Google Maps URL: @37.123,-121.456 or ?q=37.123,-121.456 or ll=37.123,-121.456
  const urlMatch = body.match(/[@?&](?:q=|ll=)?(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]!);
    const lon = parseFloat(urlMatch[2]!);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return { lat, lon };
  }
  // Plain coords: 37.123456,-121.456789 or 37.123456, -121.456789
  const plainMatch = body.match(/(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1]!);
    const lon = parseFloat(plainMatch[2]!);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return { lat, lon };
  }
  return null;
}

// Webhook for receiving messages from Twilio
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { From, To, Body, MessageSid } = req.body;

    logger.info(`Received WhatsApp message from: ${From}`);
    logger.debug(`Message: ${Body}`);

    const coords = parseCoords(Body || '');
    const pool = getPool();

    await pool.query(
      `INSERT INTO whatsapp_messages (message_sid, from_number, to_number, body, lat, lon, has_coords)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (message_sid) DO NOTHING`,
      [
        MessageSid,
        From,
        To,
        Body || '',
        coords?.lat ?? null,
        coords?.lon ?? null,
        coords !== null,
      ]
    );

    if (coords) {
      logger.info(`Parsed coords from WhatsApp: lat=${coords.lat}, lon=${coords.lon}`);
    }

    // Respond with empty TwiML so Twilio doesn't auto-reply
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (error: any) {
    logger.error(`Webhook error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get all stored WhatsApp messages (from DB)
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, message_sid, from_number, to_number, body, lat, lon, has_coords, received_at
       FROM whatsapp_messages
       ORDER BY received_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (error: any) {
    logger.error(`Failed to fetch messages: ${error.message}`);
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
