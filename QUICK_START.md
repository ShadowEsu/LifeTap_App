# LifeTap Quick Start Guide

## 🚀 5-Minute Setup

### 1. Get API Keys
- **Google Maps**: https://console.cloud.google.com/maps
- **Gemini**: https://ai.google.dev
- **Twilio**: https://www.twilio.com/console

### 2. Configure Environment
```bash
cd lifechain-claude-app

# Backend config
cp backend/.env.example backend/.env.local
# Edit backend/.env.local with your API keys

# Frontend config
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your Google Maps & Gemini keys
```

### 3. Start Everything
```bash
docker compose up -d
```

### 4. Access the App
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **Database**: postgres://localhost:5432/lifechain

## 🔐 Default Login
Email: `demo@lifetap.app`
Password: `demo123`

## 📱 Dashboard Features

**Left Side:**
- Google Maps with search
- Location selection
- Click map to select locations

**Right Side:**
- Danger level (0-100%) via Gemini AI
- Local news & alerts
- Emergency response suggestions

**Navigation:**
- 🏠 Dashboard - Maps & risk assessment
- 🤖 AI Agent - Chat with Gemini
- 📋 History - Alert timeline
- 👥 Contacts - Emergency contact management

## 🔧 Development

### Backend (Node.js + Express)
```bash
cd backend
npm install
npm run dev
```
API runs on http://localhost:3001

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Dashboard runs on http://localhost:3000

### Hardware (Raspberry Pi)
```bash
cd hardware/raspberry-pi
pip install -r requirements.txt
python main.py
```

## 📚 Full Documentation
- [CLAUDE.md](./CLAUDE.md) - Architecture & vision
- [API_SPEC.md](./API_SPEC.md) - Complete API reference
- [HARDWARE_PROTOCOL.md](./HARDWARE_PROTOCOL.md) - Device communication
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File organization

## 🐛 Troubleshooting

**Port 3000/3001 already in use?**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database connection failed?**
```bash
docker compose logs postgres
docker compose down -v  # Reset database
docker compose up -d
```

**Google Maps not showing?**
Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `frontend/.env.local`

**Gemini API errors?**
Check `NEXT_PUBLIC_GEMINI_API_KEY` and `GEMINI_API_KEY` in environment files

## 🎨 UI Design Inspiration
- Minimalist, clean white background
- Light blue gradients (#3b82f6 - #60a5fa)
- Google AI Studio aesthetic
- Smooth transitions and animations
- Mobile responsive

## 🚀 Production Deployment
See [CLAUDE.md](./CLAUDE.md) section "Deployment Strategy" for AWS setup.

## 📞 Support
Check documentation or review the CLAUDE.md file for architecture decisions.
