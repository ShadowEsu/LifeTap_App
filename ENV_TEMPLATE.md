# Environment Variables Template

Copy and paste these into Vercel Dashboard or your .env files.

---

## 🎨 FRONTEND - Vercel Environment Variables

**Project:** lifechain-frontend  
**Settings → Environment Variables (Production)**

```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY_HERE
NEXT_PUBLIC_GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
NEXTAUTH_URL=https://your-frontend.vercel.app
NEXTAUTH_SECRET=generate-with-openssl-rand-hex-32
```

### How to fill in:

1. **NEXT_PUBLIC_API_URL**
   - After deploying backend, copy its URL (e.g., `https://lifechain-backend-production.up.railway.app`)

2. **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY**
   - From Google Cloud Console
   - Must enable "Maps JavaScript API"
   - Must add domain restriction: `*.vercel.app`

3. **NEXT_PUBLIC_GEMINI_API_KEY**
   - From ai.google.dev → Get API Key
   - Free tier: unlimited (rate limited to 60 requests/minute)

4. **NEXTAUTH_URL**
   - Your Vercel frontend URL (e.g., `https://lifechain-frontend.vercel.app`)

5. **NEXTAUTH_SECRET**
   ```bash
   openssl rand -hex 32
   # Copy the output here
   ```

---

## 🔧 BACKEND - Railway Environment Variables

**Project:** lifechain-backend  
**Settings → Environment Variables**

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/lifechain
REDIS_URL=redis://:password@host:port
JWT_SECRET=generate-with-openssl-rand-hex-32
JWT_EXPIRY=24h
DEVICE_TOKEN_EXPIRY=365d
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
TWILIO_WEBHOOK_URL=https://your-backend-url/api/v1/whatsapp/webhook
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY_HERE
HARDWARE_SECRET_TOKEN=your-random-hardware-token
LOG_LEVEL=info
```

### How to fill in:

1. **NODE_ENV**
   - Set to: `production`

2. **DATABASE_URL**
   - From Supabase: Settings → Database → Connection Pooling
   - Or from Railway PostgreSQL addon
   - Format: `postgresql://user:password@host:5432/dbname`

3. **REDIS_URL**
   - From Upstash: Copy the connection URL
   - Format: `redis://:password@host:port`

4. **JWT_SECRET**
   ```bash
   openssl rand -hex 32
   # Copy the output here
   ```

5. **TWILIO_ACCOUNT_SID**
   - Provided: `your-twilio-account-sid`

6. **TWILIO_AUTH_TOKEN**
   - Provided: `your-twilio-auth-token`

7. **TWILIO_PHONE_NUMBER**
   - Provided: `your-twilio-phone-number`

8. **TWILIO_WEBHOOK_URL**
   - Your backend URL + `/api/v1/whatsapp/webhook`
   - Example: `https://lifechain-backend-production.up.railway.app/api/v1/whatsapp/webhook`

9. **GEMINI_API_KEY**
   - Same as frontend (from ai.google.dev)

10. **GOOGLE_MAPS_API_KEY**
    - Same as frontend (from Google Cloud Console)

11. **HARDWARE_SECRET_TOKEN**
    ```bash
    openssl rand -hex 32
    # Copy the output here
    ```

---

## 🗄️ DATABASE SETUP

### Supabase (Recommended)
1. Create account at supabase.com
2. New project → Create
3. Wait for project to initialize
4. Go to Settings → Database → Connection Pooling
5. Copy the connection string
6. Add to `DATABASE_URL` in backend env

### Railway
1. Create account at railway.app
2. New Project → PostgreSQL
3. Copy the connection string
4. Add to `DATABASE_URL` in backend env

---

## 📦 REDIS SETUP

### Upstash (Free Tier)
1. Create account at upstash.com
2. New Database → Redis
3. Copy the connection URL (REST or standard Redis protocol)
4. Add to `REDIS_URL` in backend env

---

## 🔑 API KEYS SETUP

### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API
4. Create API Key (Credentials → API Keys)
5. Add domain restrictions:
   - `*.vercel.app`
   - `localhost`
6. Copy key to both frontend and backend env

### Gemini API Key
1. Go to [ai.google.dev](https://ai.google.dev)
2. Click "Get API Key"
3. Create API key (free tier)
4. Copy key to both frontend and backend env

---

## 🔐 SECRET GENERATION

Generate secrets using one of these methods:

### Method 1: OpenSSL (Recommended)
```bash
openssl rand -hex 32
# Example output: 8f3c4a5b9e2d1f7a6c4b8e9d2f1a7c5b
```

### Method 2: Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Method 3: Online (Less secure)
- https://generate.plus/en/base64 (generate 32 characters)

**⚠️ DO NOT commit secrets to Git**

---

## ✅ VERIFICATION CHECKLIST

After setting all variables:

**Frontend (Vercel)**
- [ ] Can access https://your-app.vercel.app
- [ ] Maps load on dashboard
- [ ] WhatsApp page loads
- [ ] No "API_URL not set" errors

**Backend (Railway)**
- [ ] `https://your-backend/health` returns 200
- [ ] Can fetch WhatsApp history
- [ ] Database connected
- [ ] Redis connected

**Integrations**
- [ ] Send test WhatsApp message
- [ ] Receive in Sandbox
- [ ] Google Maps displays correctly
- [ ] Gemini AI responds to questions

---

## 🚨 COMMON MISTAKES

| Mistake | Fix |
|---------|-----|
| API key exposed in code | Use .env variables only |
| Wrong database URL format | Check `postgresql://user:pass@host/db` |
| Missing `NEXT_PUBLIC_` prefix | Frontend env vars need this prefix |
| Domain not whitelisted for Maps | Add `*.vercel.app` to Google Cloud Console |
| Twilio credentials wrong | Copy exactly (test with `curl` command) |
| Backend URL includes `/api/v1` | Should be just the domain |
| Redis URL format wrong | Must be `redis://:password@host:port` |

---

## 🆘 TESTING COMMANDS

Once deployed, test with these commands:

### Test Backend Health
```bash
curl https://your-backend.railway.app/health
# Expected: {"status":"ok"}
```

### Test WhatsApp API
```bash
curl -X GET https://your-backend.railway.app/api/v1/whatsapp/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: Array of messages
```

### Test Database
```bash
# In Railway Dashboard → PostgreSQL → Connect
# Should connect successfully
```

### Test Redis
```bash
# In Upstash Dashboard → Console
# Should show "PONG" on PING command
```

---

## 📝 ENVIRONMENT VARIABLE SUMMARY

| Count | Where | Variables |
|-------|-------|-----------|
| 5 | Vercel Frontend | NEXT_PUBLIC_* + NEXTAUTH_* |
| 13 | Railway Backend | NODE_ENV, DB, Redis, Twilio, etc |
| 2 | Twilio Console | Phone + Webhook URL |
| 3 | External APIs | Google Maps, Gemini (copied to 2 places) |

**Total to configure:** ~20 variables

**Time needed:** 15-20 minutes

**Complexity:** ⭐⭐ (Medium - mostly copy-paste)

---

## ✨ YOU'RE SET!

All variables filled in?
- ✅ Vercel has 5 frontend env vars
- ✅ Railway has 13 backend env vars
- ✅ Twilio webhook configured
- ✅ Database connected
- ✅ Redis connected

**Next step:** Start your deployments in the Vercel and Railway dashboards!

Good luck! 🚀
