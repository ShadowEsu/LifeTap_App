# Vercel Deployment Quick Start - 15 Minutes

## Your Credentials (Already Have)
```
Twilio Account SID: your-twilio-account-sid
Twilio Auth Token: your-twilio-auth-token
Twilio WhatsApp: your-twilio-phone-number
Contact (Preston): +1 925 457 0055
```

---

## Step 1: Prepare GitHub Repository (2 min)

```bash
cd /Users/prestonjaysusanto/lifechain\ claude\ app

# Initialize git if not already
git init
git add .
git commit -m "Initial LifeTap commit with WhatsApp and Google Maps integration"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/lifechain.git
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Databases (5 min)

### Option A: Supabase (Recommended - Free)
1. Go to **supabase.com**
2. Click "Start your project"
3. Create new project
4. Go to **Settings → Database**
5. Copy the full connection string
6. Save as `DATABASE_URL`

### Option B: Railway (Easier)
1. Go to **railway.app**
2. Click "New Project"
3. Select "PostgreSQL"
4. Copy connection string
5. Save as `DATABASE_URL`

### Redis Setup (Free - Upstash)
1. Go to **upstash.com**
2. Create Redis database
3. Copy connection string
4. Save as `REDIS_URL`

---

## Step 3: Get API Keys (3 min)

### Google Maps
1. **Google Cloud Console** → Create project
2. Enable "Maps JavaScript API"
3. Create API key → Copy it
4. Save as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Gemini API
1. Go to **ai.google.dev**
2. Click "Get API Key"
3. Create new API key
4. Save as `NEXT_PUBLIC_GEMINI_API_KEY` and `GEMINI_API_KEY`

### Generate Secrets
```bash
# Generate 32-char secret for NextAuth
openssl rand -hex 32

# Generate 32-char JWT secret  
openssl rand -hex 32
```

---

## Step 4: Deploy Frontend to Vercel (3 min)

1. Go to **vercel.com** → Sign in with GitHub
2. Click "New Project"
3. Select your lifechain repository
4. Configure:
   - **Project Name:** lifechain-frontend
   - **Root Directory:** `frontend`
   - **Framework:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

5. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL = https://your-backend-url.vercel.app
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = (your Google Maps key)
   NEXT_PUBLIC_GEMINI_API_KEY = (your Gemini key)
   NEXTAUTH_URL = https://lifechain-frontend.vercel.app
   NEXTAUTH_SECRET = (your generated secret)
   ```

6. Click "Deploy" → Wait for build

7. **Copy your Vercel frontend URL** (looks like `https://lifechain-frontend.vercel.app`)

---

## Step 5: Deploy Backend (3 min)

### Option A: Vercel (Serverless)
1. Create `backend/vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       { "src": "src/index.ts", "use": "@vercel/node" }
     ],
     "routes": [
       { "src": "/(.*)", "dest": "src/index.ts" }
     ],
     "env": {
       "DATABASE_URL": "@database_url",
       "REDIS_URL": "@redis_url",
       "JWT_SECRET": "@jwt_secret"
     }
   }
   ```

2. Push to GitHub
3. In Vercel → "New Project" → Select backend folder
4. Add all environment variables (see below)
5. Deploy

### Option B: Railway (Better for Persistent Services)
1. Go to **railway.app**
2. New Project → GitHub repo
3. Select backend folder
4. Add environment variables
5. Deploy

**Copy your backend URL** (looks like `https://your-backend.railway.app`)

---

## Step 6: Update Frontend with Backend URL (1 min)

After backend is deployed:

1. Go back to **Vercel Dashboard** → Frontend Project
2. Settings → Environment Variables
3. Update: `NEXT_PUBLIC_API_URL = https://your-backend-url.vercel.app`
4. Click "Deploy" again to redeploy

---

## Environment Variables Checklist

### Frontend (.env.production)
- [ ] `NEXT_PUBLIC_API_URL` = your backend URL
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = Google Maps key
- [ ] `NEXT_PUBLIC_GEMINI_API_KEY` = Gemini key
- [ ] `NEXTAUTH_URL` = your Vercel frontend URL
- [ ] `NEXTAUTH_SECRET` = generated 32-char secret

### Backend (.env.production)
- [ ] `NODE_ENV` = production
- [ ] `DATABASE_URL` = Supabase/Railway connection string
- [ ] `REDIS_URL` = Upstash Redis URL
- [ ] `JWT_SECRET` = generated 32-char secret
- [ ] `TWILIO_ACCOUNT_SID` = your-twilio-account-sid
- [ ] `TWILIO_AUTH_TOKEN` = your-twilio-auth-token
- [ ] `TWILIO_PHONE_NUMBER` = your-twilio-phone-number
- [ ] `TWILIO_WEBHOOK_URL` = https://your-backend.vercel.app/api/v1/whatsapp/webhook
- [ ] `GEMINI_API_KEY` = your Gemini key
- [ ] `GOOGLE_MAPS_API_KEY` = your Google Maps key

---

## Step 7: Configure Twilio Webhook

1. Go to **Twilio Console**
2. **Messaging → Sandbox Configuration**
3. Set **When a message comes in:**
   ```
   https://your-backend-url/api/v1/whatsapp/webhook
   ```
4. Method: POST
5. Save

---

## Testing (2 min)

### Test Frontend
```bash
curl https://your-frontend.vercel.app
# Should return HTML
```

### Test API
```bash
curl https://your-backend.vercel.app/health
# Should return { "status": "ok" }
```

### Test WhatsApp
```bash
curl -X GET https://your-backend.vercel.app/api/v1/whatsapp/history \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should return message history
```

### Test Google Maps
- Open frontend → Dashboard
- Should see map loading

---

## Common Issues & Fixes

### "Cannot find module 'X'"
```bash
cd backend && npm install
cd ../frontend && npm install
```

### "API connection refused"
- Check `NEXT_PUBLIC_API_URL` matches backend URL
- Ensure backend is deployed and healthy
- Check CORS settings in backend

### "Maps not loading"
- Verify Google Maps API key is correct
- Check domain restrictions include `*.vercel.app`
- Clear browser cache

### "WhatsApp messages not loading"
- Verify Twilio credentials are correct
- Check webhook URL is configured
- Verify contact format: `+1 925 457 0055`

### "Database connection error"
- Test connection string locally:
  ```bash
  psql "postgresql://user:pass@host:5432/db"
  ```
- Ensure IP is whitelisted

---

## Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations completed
- [ ] Twilio webhook configured
- [ ] Google Maps API enabled
- [ ] Gemini API enabled
- [ ] Frontend deploys successfully
- [ ] Backend deploys successfully
- [ ] Can load dashboard without errors
- [ ] WhatsApp messages load and send
- [ ] Maps display correctly
- [ ] Monitoring set up (optional)

---

## URLs After Deployment

```
Frontend: https://lifechain-frontend.vercel.app
Backend: https://your-backend.vercel.app
API Docs: https://your-backend.vercel.app/health
WhatsApp: https://lifechain-frontend.vercel.app/whatsapp
Dashboard: https://lifechain-frontend.vercel.app
```

---

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test all integrations
3. ✅ Set up monitoring
4. ✅ Add custom domain (optional)
5. ✅ Set up SSL (automatic on Vercel)
6. ✅ Configure analytics
7. ✅ Go live!

---

## Support URLs

- Vercel Docs: vercel.com/docs
- Twilio Docs: twilio.com/docs
- Google Maps: developers.google.com/maps
- Gemini API: ai.google.dev/docs

**That's it! Your app is now live on Vercel with WhatsApp and Google Maps integrated. 🚀**
