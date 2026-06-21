# Vercel Deployment Guide - LifeTap

## 🚀 Quick Vercel Setup

### Prerequisites
- Vercel account (free at vercel.com)
- Git repository pushed to GitHub
- Environment variables prepared

### Step 1: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
cd /Users/prestonjaysusanto/lifechain\ claude\ app
vercel
```

Or connect via GitHub at [vercel.com](https://vercel.com):
1. Click "New Project"
2. Select GitHub repository
3. Select `frontend` directory as root
4. Add environment variables (see below)
5. Deploy

---

## 🔑 Required Environment Variables for Vercel

### Frontend (.env.production)
```
NEXT_PUBLIC_API_URL=https://your-backend-api.vercel.app
NEXT_PUBLIC_WS_URL=wss://your-backend-api.vercel.app
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
NEXT_PUBLIC_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generate-random-32-char-string
```

### Backend (.env.production)
```
NODE_ENV=production
PORT=3001
DATABASE_URL=your-postgres-url
REDIS_URL=your-redis-url
JWT_SECRET=your-jwt-secret
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=whatsapp:your-twilio-phone-number
TWILIO_WEBHOOK_URL=https://your-backend-api.vercel.app/webhooks/twilio
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
HARDWARE_SECRET_TOKEN=your-hardware-token
```

---

## 📍 Google Maps Setup

### 1. Get Google Maps API Key
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create new project
- Enable "Maps JavaScript API"
- Create API key
- Set restrictions to "Web"
- Add allowed domains:
  - `localhost:3000`
  - `*.vercel.app`

### 2. Add to Vercel Dashboard
**Settings → Environment Variables:**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = YOUR_KEY_HERE
```

### 3. Frontend Usage
```javascript
// lib/maps.ts
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  version: 'weekly',
});

export const initMap = async () => {
  const { Map } = await loader.importLibrary('maps');
  return new Map(document.getElementById('map'), {
    zoom: 12,
    center: { lat: 37.7749, lng: -122.4194 },
  });
};
```

---

## 💬 Twilio WhatsApp Integration

### Your Credentials (Already Set Up)
```
Account SID: your-twilio-account-sid
Auth Token: your-twilio-auth-token
Twilio WhatsApp: your-twilio-phone-number
Contact to Monitor: +1 925 457 0055
Webhook: https://timberwolf-mastiff-9776.twil.io/demo-reply
```

### 1. Twilio Webhook Configuration
In Vercel backend, create endpoint:

**src/routes/webhooks.ts**
```typescript
import { Router, Request, Response } from 'express';
import { Client } from 'twilio';

const router = Router();

const twilioClient = new Client(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Receive WhatsApp messages
router.post('/webhooks/twilio', async (req: Request, res: Response) => {
  try {
    const { From, Body, Timestamp } = req.body;
    
    // Save message to database
    await saveWhatsAppMessage({
      from: From,
      body: Body,
      timestamp: Timestamp,
      direction: 'incoming'
    });

    // Send acknowledgment
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch WhatsApp chat history
router.get('/api/v1/whatsapp/history', async (req: Request, res: Response) => {
  try {
    const targetContact = 'whatsapp:+19254570055';
    const twilioNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

    // Fetch incoming messages
    const incoming = await twilioClient.messages.list({
      from: targetContact,
      to: twilioNumber,
      limit: 100,
    });

    // Fetch outgoing messages
    const outgoing = await twilioClient.messages.list({
      from: twilioNumber,
      to: targetContact,
      limit: 100,
    });

    // Merge and sort
    const allMessages = [...incoming, ...outgoing]
      .sort((a, b) => 
        new Date(a.dateSent).getTime() - new Date(b.dateSent).getTime()
      )
      .map(msg => ({
        id: msg.sid,
        from: msg.from,
        body: msg.body,
        timestamp: msg.dateSent,
        direction: msg.from === targetContact ? 'incoming' : 'outgoing'
      }));

    res.json(allMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send WhatsApp message
router.post('/api/v1/whatsapp/send', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    const result = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message,
    });

    res.json({ success: true, sid: result.sid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 2. Update Main Backend
**src/index.ts**
```typescript
import webhookRoutes from './routes/webhooks';

app.use('/api', webhookRoutes);
```

### 3. Frontend WhatsApp Component
**components/WhatsAppChat.tsx**
```typescript
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  from: string;
  body: string;
  timestamp: Date;
  direction: 'incoming' | 'outgoing';
}

export default function WhatsAppChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get('/api/v1/whatsapp/history');
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="whatsapp-chat">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message ${msg.direction}`}
          >
            <div className="message-content">{msg.body}</div>
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🗄️ Database & Cache Setup

### Option 1: Supabase (Recommended for Vercel)
```
1. Go to supabase.com
2. Create new project
3. Copy DATABASE_URL
4. Add to Vercel environment variables
```

### Option 2: Heroku Postgres
```
1. Create Heroku account
2. heroku addons:create heroku-postgresql:hobby-dev
3. Copy database URL
```

### Option 3: AWS RDS
```
1. AWS Console → RDS
2. Create PostgreSQL instance
3. Copy endpoint URL
```

### Redis Setup
**Option A: Upstash (Free tier available)**
```
1. Go to upstash.com
2. Create Redis database
3. Copy connection URL
4. Add to Vercel env vars as REDIS_URL
```

**Option B: Redis Cloud**
```
1. rediscloud.com
2. Create free instance
3. Copy connection string
```

---

## 🔗 Connecting the Services

### Step-by-step Integration:

1. **Create Vercel Project**
   - Frontend deployed to vercel.app
   - Environment variables set

2. **Deploy Backend**
   - Option A: Vercel serverless functions
   - Option B: Railway/Render (better for persistent connections)
   - Option C: AWS EC2 (more control)

3. **Update Frontend .env.production**
   ```
   NEXT_PUBLIC_API_URL=https://backend-api.vercel.app
   ```

4. **Update Backend .env.production**
   ```
   TWILIO_WEBHOOK_URL=https://backend-api.vercel.app/webhooks/twilio
   ```

5. **Update Twilio Webhook in Console**
   ```
   https://your-backend.vercel.app/webhooks/twilio
   ```

---

## 📊 Vercel Dashboard Setup

### Environment Variables Setup
In Vercel Dashboard → Settings → Environment Variables:

| Key | Value | Scope |
|-----|-------|-------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Your Google Maps API key | Production |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Your Gemini API key | Production |
| `NEXTAUTH_SECRET` | Random 32+ char string | Production |
| `DATABASE_URL` | Postgres connection string | Production |
| `REDIS_URL` | Redis connection string | Production |
| `TWILIO_ACCOUNT_SID` | AC8a6f7e... | Production |
| `TWILIO_AUTH_TOKEN` | 99e924a2... | Production |
| `TWILIO_PHONE_NUMBER` | your-twilio-phone-number | Production |

### Domains & CORS
**Settings → Domains:**
- Add your custom domain
- Update NEXTAUTH_URL to match

**Settings → CORS:**
```
Allow these origins:
- *.vercel.app
- yourdomain.com
```

---

## 🚦 Testing Deployment

### 1. Test Frontend
```bash
vercel --prod
```
Open https://your-app.vercel.app

### 2. Test API Endpoint
```bash
curl https://your-backend.vercel.app/health
```

### 3. Test WhatsApp Integration
```bash
# Send test message
curl -X POST https://your-backend.vercel.app/api/v1/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+19254570055", "message": "Test message"}'
```

### 4. Test Google Maps
- Navigate to dashboard
- Map should load with markers

---

## 🔄 Continuous Deployment

### Auto-deploy on GitHub Push
Vercel Dashboard → Settings → Git:
- Connected to GitHub repo
- Auto-deploy on push to main branch
- Preview deployments for pull requests

---

## 📝 Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations run
- [ ] Redis cache initialized
- [ ] Google Maps API key configured
- [ ] Twilio webhook configured
- [ ] WhatsApp sandbox participant added
- [ ] CORS domains configured
- [ ] SSL certificate enabled (automatic)
- [ ] Monitoring/logging set up
- [ ] Backups scheduled

---

## 🆘 Troubleshooting

### API calls failing
```
Check:
1. NEXT_PUBLIC_API_URL matches backend URL
2. CORS headers configured
3. Backend environment variables set
4. Network tab shows actual error
```

### WhatsApp not receiving
```
Check:
1. Twilio webhook URL is correct
2. Contact is in sandbox participants
3. Message sent to correct format (whatsapp:+1...)
4. Twilio logs in console
```

### Google Maps not loading
```
Check:
1. API key is valid
2. Domain restrictions allow vercel.app
3. API is enabled in Google Cloud Console
4. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set
```

### Database connection errors
```
Check:
1. DATABASE_URL is correct
2. IP whitelist includes Vercel IPs
3. Database user has proper permissions
4. Connection pool size not exceeded
```

---

## 💰 Cost Breakdown

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Vercel | 100GB bandwidth/mo | Serverless functions |
| Google Maps | $7/1000 requests | Pay as you go |
| Twilio | $0.0075/SMS | SMS pricing |
| Supabase | 500MB database | Postgres |
| Upstash | 10k commands/day | Redis |
| Gemini API | $0.5-15 per 1M tokens | Usage based |

**Estimated Monthly Cost:** $50-150 (development phase)

---

## 🎯 Next Steps

1. Create Vercel account
2. Set up database (Supabase recommended)
3. Set up Redis (Upstash)
4. Gather all API keys
5. Deploy frontend to Vercel
6. Deploy backend (Railway or similar)
7. Configure Twilio webhook
8. Test integrations
9. Monitor with Vercel Analytics

That's it! Your app is live on Vercel with WhatsApp and Google Maps integrated. 🚀
