# LifeTap Project Structure & File Organization

**Version:** 1.0.0  
**Status:** Phase 0 - Specification  
**Last Updated:** 2026-06-20

---

## Table of Contents

1. [Complete Directory Tree](#complete-directory-tree)
2. [Core Directories](#core-directories)
3. [File Descriptions](#file-descriptions)
4. [Configuration Files](#configuration-files)
5. [Environment Variables](#environment-variables)
6. [Docker Setup](#docker-setup)
7. [Development Workflow](#development-workflow)

---

## Complete Directory Tree

```
lifechain-claude-app/
│
├── README.md                              # Project overview
├── CLAUDE.md                              # Master project documentation
├── API_SPEC.md                            # REST API specification
├── HARDWARE_PROTOCOL.md                   # Hardware communication protocol
├── PROJECT_STRUCTURE.md                   # This file
│
├── .claude/                               # Claude Code configuration
│   └── settings.local.json
│
├── .github/                               # GitHub workflows
│   └── workflows/
│       ├── ci.yml                         # CI/CD pipeline
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── .env.example                           # Environment template
├── .gitignore
├── docker-compose.yml                     # Local dev stack
├── docker-compose.prod.yml                # Production stack
│
├── backend/                               # Node.js/Python backend
│   ├── Dockerfile                         # Backend container image
│   ├── .dockerignore
│   ├── package.json (or requirements.txt) # Dependencies
│   ├── tsconfig.json (if TypeScript)
│   ├── nodemon.json                       # Dev server config
│   │
│   ├── .env.example
│   ├── .env.local                         # Local overrides (gitignored)
│   │
│   ├── config/
│   │   ├── database.js                    # PostgreSQL connection
│   │   ├── redis.js                       # Redis client
│   │   ├── env.js                         # Environment loader
│   │   └── logger.js                      # Structured logging
│   │
│   ├── src/
│   │   ├── index.js (or main.py)         # Entry point
│   │   ├── middleware/
│   │   │   ├── auth.js                    # JWT authentication
│   │   │   ├── errorHandler.js            # Global error handling
│   │   │   └── validation.js              # Input validation
│   │   │
│   │   ├── routes/
│   │   │   ├── index.js                   # Route aggregator
│   │   │   ├── alerts.js                  # POST/GET /alerts
│   │   │   ├── contacts.js                # CRUD /contacts
│   │   │   ├── history.js                 # GET /history
│   │   │   ├── assessment.js              # POST /assessment (Gemini)
│   │   │   ├── hardware.js                # POST /hardware/register
│   │   │   └── auth.js                    # POST /auth/login
│   │   │
│   │   ├── controllers/
│   │   │   ├── alertController.js         # Alert business logic
│   │   │   ├── contactController.js
│   │   │   ├── authController.js
│   │   │   └── hardwareController.js
│   │   │
│   │   ├── services/
│   │   │   ├── alertService.js            # Alert operations
│   │   │   ├── geminiService.js           # Gemini API integration
│   │   │   ├── twilioService.js           # SMS notifications
│   │   │   ├── geoService.js              # Geolocation/reverse geocoding
│   │   │   └── authService.js             # JWT token management
│   │   │
│   │   ├── models/
│   │   │   ├── Alert.js                   # Database schema/queries
│   │   │   ├── Contact.js
│   │   │   ├── User.js
│   │   │   ├── Device.js
│   │   │   └── index.js                   # All models export
│   │   │
│   │   ├── jobs/
│   │   │   ├── riskAssessmentJob.js       # Async Gemini assessment
│   │   │   ├── smsNotificationJob.js      # Async Twilio SMS
│   │   │   ├── deviceHeartbeatJob.js      # Check offline devices
│   │   │   └── queue.js                   # Bull queue setup
│   │   │
│   │   ├── utils/
│   │   │   ├── validators.js              # Validation helpers
│   │   │   ├── formatters.js              # Response formatting
│   │   │   ├── geoHelpers.js              # Coordinate utilities
│   │   │   └── errors.js                  # Custom error classes
│   │   │
│   │   └── websocket/
│   │       ├── server.js                  # WebSocket setup
│   │       ├── handlers.js                # Event handlers
│   │       └── broadcast.js               # Send messages to clients
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── services/
│   │   │   │   ├── alertService.test.js
│   │   │   │   └── geminiService.test.js
│   │   │   ├── controllers/
│   │   │   │   └── alertController.test.js
│   │   │   └── utils/
│   │   │       └── validators.test.js
│   │   │
│   │   ├── integration/
│   │   │   ├── alerts.test.js             # Alert flow tests
│   │   │   ├── contacts.test.js
│   │   │   └── hardware.test.js
│   │   │
│   │   └── fixtures/
│   │       ├── alerts.json                # Test data
│   │       ├── contacts.json
│   │       └── users.json
│   │
│   └── docs/
│       └── API_USAGE.md                   # API examples
│
├── frontend/                              # Next.js React app
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── next.config.js                     # Next.js config
│   ├── tailwind.config.js                 # Tailwind CSS config
│   ├── tsconfig.json
│   ├── .env.local.example
│   ├── .env.local                         # (gitignored)
│   │
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   └── maps-background.png
│   │
│   ├── app/                               # Next.js App Router
│   │   ├── layout.tsx                     # Root layout
│   │   ├── page.tsx                       # Home/login page
│   │   ├── loading.tsx                    # Loading skeleton
│   │   ├── error.tsx                      # Error boundary
│   │   │
│   │   ├── (dashboard)/                   # Protected routes
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                   # Main dashboard
│   │   │   ├── contacts/
│   │   │   │   ├── page.tsx               # Contact list
│   │   │   │   ├── new/page.tsx           # Add contact form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx           # Edit contact
│   │   │   │       └── delete/page.tsx
│   │   │   │
│   │   │   ├── history/
│   │   │   │   ├── page.tsx               # Alert history table
│   │   │   │   ├── [alertId]/page.tsx    # Alert details
│   │   │   │   └── export/page.tsx        # Export CSV/JSON
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   └── page.tsx               # User settings
│   │   │   │
│   │   │   └── devices/
│   │   │       ├── page.tsx               # Device management
│   │   │       └── [deviceId]/page.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/[token]/page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── route.ts               # Edge functions if needed
│   │   │   │   └── [...]
│   │   │   └── webhooks/
│   │   │       └── twilio/route.ts        # SMS callback handler
│   │   │
│   │   └── error-pages/
│   │       ├── 404.tsx
│   │       └── 500.tsx
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── AlertCard.tsx              # Alert display
│   │   │   ├── MapViewer.tsx              # Google Maps integration
│   │   │   ├── RiskBadge.tsx              # Risk level display
│   │   │   ├── RecentAlerts.tsx           # Latest alerts list
│   │   │   └── Statistics.tsx             # Summary statistics
│   │   │
│   │   ├── contacts/
│   │   │   ├── ContactList.tsx            # Table of contacts
│   │   │   ├── ContactForm.tsx            # Add/Edit contact modal
│   │   │   └── ContactRow.tsx
│   │   │
│   │   ├── history/
│   │   │   ├── HistoryTable.tsx           # Paginated alert table
│   │   │   ├── FilterBar.tsx              # Date/status filters
│   │   │   └── AlertDetailModal.tsx
│   │   │
│   │   └── shared/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       └── Tooltip.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                     # Auth context hook
│   │   ├── useAlerts.ts                   # Alerts data fetching
│   │   ├── useWebSocket.ts                # WebSocket connection
│   │   ├── useMap.ts                      # Google Maps integration
│   │   └── useLocalStorage.ts             # Persist user preferences
│   │
│   ├── context/
│   │   ├── AuthContext.tsx                # Auth state
│   │   ├── AlertContext.tsx               # Alert state
│   │   └── ThemeContext.tsx               # Dark/light mode
│   │
│   ├── lib/
│   │   ├── api.ts                         # API client wrapper
│   │   ├── apiClient.ts                   # Fetch configuration
│   │   ├── websocket.ts                   # WebSocket client
│   │   ├── geoHelpers.ts                  # Coordinate utilities
│   │   └── formatters.ts                  # Date/number formatting
│   │
│   ├── styles/
│   │   ├── globals.css                    # Global styles
│   │   ├── variables.css                  # CSS variables
│   │   └── themes.css                     # Light/dark themes
│   │
│   ├── tests/
│   │   ├── components/
│   │   │   ├── AlertCard.test.tsx
│   │   │   └── MapViewer.test.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.test.ts
│   │   └── pages/
│   │       └── dashboard.test.tsx
│   │
│   └── docs/
│       └── COMPONENT_DOCS.md
│
├── hardware/                              # Hardware services
│   │
│   ├── raspberry-pi/
│   │   ├── README.md                      # Setup instructions
│   │   ├── requirements.txt               # Python dependencies
│   │   ├── install.sh                     # Installation script
│   │   │
│   │   ├── service.py                     # Main Python service
│   │   ├── config.yaml                    # Device configuration
│   │   ├── config.example.yaml            # Config template
│   │   │
│   │   ├── lib/
│   │   │   ├── serial_handler.py          # Arduino communication
│   │   │   ├── gps_handler.py             # GPS data parsing
│   │   │   ├── api_client.py              # Backend API calls
│   │   │   ├── logger.py                  # Logging setup
│   │   │   └── config_loader.py           # Config parsing
│   │   │
│   │   ├── tests/
│   │   │   ├── test_serial.py             # Serial comm tests
│   │   │   ├── test_gps.py                # GPS parsing tests
│   │   │   └── test_api.py                # API client tests
│   │   │
│   │   └── systemd/
│   │       └── lifechain.service          # Systemd unit file
│   │
│   ├── arduino/
│   │   ├── README.md
│   │   ├── firmware.ino                   # Arduino sketch
│   │   ├── firmware.hex                   # Compiled binary
│   │   ├── circuit_diagram.txt            # Pinout reference
│   │   │
│   │   ├── lib/
│   │   │   ├── ButtonHandler.h/.cpp       # Button debouncing
│   │   │   ├── BeeperControl.h/.cpp       # Tone generation
│   │   │   └── SerialComm.h/.cpp          # Message protocol
│   │   │
│   │   └── tests/
│   │       ├── button_test.ino
│   │       └── beeper_test.ino
│   │
│   └── docs/
│       ├── INSTALLATION.md                # Setup guide
│       ├── TROUBLESHOOTING.md
│       └── PINOUT.md
│
├── db/                                    # Database
│   │
│   ├── migrations/                        # SQL migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_risk_assessment.sql
│   │   ├── 003_add_device_table.sql
│   │   └── migration_template.sql         # Template for new migrations
│   │
│   ├── seeds/
│   │   ├── dev_data.sql                   # Development fixtures
│   │   └── production_init.sql            # Production baseline
│   │
│   ├── schema.sql                         # Current schema (reference)
│   ├── triggers.sql                       # Database triggers
│   └── procedures.sql                     # Stored procedures
│
├── scripts/                               # Utility scripts
│   ├── setup.sh                           # Initial setup
│   ├── seed-db.sh                         # Load test data
│   ├── backup.sh                          # Database backup
│   ├── deploy.sh                          # Deployment script
│   ├── health-check.sh                    # Service health monitoring
│   └── lint.sh                            # Code quality checks
│
├── docs/                                  # Additional documentation
│   ├── GETTING_STARTED.md                 # Quick start guide
│   ├── ARCHITECTURE.md                    # System design deep dive
│   ├── DEPLOYMENT.md                      # Deployment procedures
│   ├── TROUBLESHOOTING.md                 # Common issues
│   ├── CONTRIBUTING.md                    # Contribution guidelines
│   └── SECURITY.md                        # Security practices
│
├── terraform/                             # Infrastructure as Code
│   ├── README.md
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── networking.tf
│   ├── compute.tf
│   ├── database.tf
│   ├── rds.tf
│   ├── environments/
│   │   ├── dev.tfvars
│   │   ├── staging.tfvars
│   │   └── prod.tfvars
│   └── modules/
│       ├── vpc/
│       ├── rds/
│       └── ecs/
│
└── .dockerignore
```

---

## Core Directories

### `/backend`

**Purpose:** Node.js or Python REST API server

**Key Files:**
- `package.json` - Node dependencies
- `Dockerfile` - Backend container image
- `src/index.js` - Entry point
- `src/routes/` - API endpoints
- `src/services/` - Business logic

**Responsibilities:**
- REST API endpoints (see `API_SPEC.md`)
- Database operations
- Gemini AI integration
- Twilio SMS sending
- WebSocket server for real-time updates
- Job queue for async tasks

---

### `/frontend`

**Purpose:** Next.js React web dashboard

**Key Files:**
- `package.json` - React dependencies
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - CSS framework
- `app/` - Next.js App Router pages
- `components/` - Reusable React components
- `lib/api.ts` - Backend API client

**Responsibilities:**
- User authentication (login/register)
- Alert history visualization
- Emergency contact management
- Real-time alert dashboard with Google Maps
- User settings

---

### `/hardware`

**Purpose:** Raspberry Pi and Arduino services

#### `/hardware/raspberry-pi`

**Files:**
- `service.py` - Main Python service (runs on startup)
- `config.yaml` - Device configuration
- `lib/serial_handler.py` - Arduino communication
- `lib/gps_handler.py` - GPS parsing
- `lib/api_client.py` - Backend HTTP calls

**Responsibilities:**
- Listen for button presses from Arduino
- Capture GPS location when alert triggered
- Send alerts to backend API
- Receive heartbeat commands from backend
- Manage device registration

#### `/hardware/arduino`

**Files:**
- `firmware.ino` - Arduino sketch
- `circuit_diagram.txt` - Pin connections

**Responsibilities:**
- Read button input (debounced)
- Control beeper/buzzer
- Send/receive serial messages from Raspberry Pi

---

### `/db`

**Purpose:** Database schema and migrations

**Files:**
- `migrations/` - SQL migration files (numbered 001, 002, etc.)
- `schema.sql` - Current schema reference
- `seeds/` - Test data fixtures

**Key Concepts:**
- Use `001_initial_schema.sql`, `002_add_...sql` format
- Migrations run in order
- Each migration is idempotent (safe to run multiple times)

---

### `/terraform`

**Purpose:** AWS Infrastructure as Code

**Files:**
- `main.tf` - Primary configuration
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `environments/` - Dev, staging, prod configs
- `modules/` - Reusable infrastructure modules

**Deploys:**
- VPC and networking
- RDS PostgreSQL cluster
- ElastiCache Redis
- ECS services for backend and frontend
- CloudFront CDN
- Load balancers

---

## File Descriptions

### Backend Files

#### `backend/src/index.js` (or `main.py`)

**Entry point for the API server**

Responsibilities:
- Initialize Express/FastAPI server
- Connect to database and Redis
- Setup middleware
- Register routes
- Start WebSocket server
- Handle graceful shutdown

```javascript
// Node.js Example
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(authMiddleware);

// Routes
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/contacts', contactsRouter);

// WebSocket
const wss = new WebSocket.Server({ server });

app.listen(3001, () => {
  console.log('API server running on port 3001');
});
```

#### `backend/src/routes/alerts.js`

**Defines POST /api/v1/alerts and GET /api/v1/alerts/:id endpoints**

```javascript
router.post('/', async (req, res) => {
  // Validate request
  // Create alert in database
  // Trigger async jobs (risk assessment, SMS)
  // Return alert data
});

router.get('/:id', async (req, res) => {
  // Fetch alert with contacts and risk assessment
  // Return alert details
});

router.patch('/:id', async (req, res) => {
  // Update alert status
});
```

#### `backend/src/services/geminiService.js`

**Integrates with Google Gemini API for risk assessment**

```javascript
async assessRisk(alert) {
  // Build prompt from alert data
  // Call Gemini API
  // Parse structured response
  // Return risk level and suggested actions
}
```

#### `backend/src/jobs/riskAssessmentJob.js`

**Async job worker that calls Gemini API**

Triggered by alert creation, runs asynchronously so API responds immediately.

---

### Frontend Files

#### `frontend/app/page.tsx`

**Home/login page** (component before dashboard login)

```tsx
export default function Home() {
  // If authenticated, redirect to /dashboard
  // If not, show login form
  return <LoginForm />;
}
```

#### `frontend/app/(dashboard)/page.tsx`

**Main dashboard** with alert map and recent alerts

```tsx
export default function Dashboard() {
  return (
    <div>
      <MapViewer />
      <RecentAlerts />
      <Statistics />
    </div>
  );
}
```

#### `frontend/components/dashboard/MapViewer.tsx`

**Renders Google Maps with alert markers**

```tsx
import { GoogleMap, Marker } from '@react-google-maps/api';

export function MapViewer() {
  // Show map with alert locations
  // Real-time WebSocket updates
  // Click marker to see alert details
}
```

#### `frontend/lib/api.ts`

**API client that wraps fetch calls**

```typescript
const apiClient = {
  alerts: {
    list: (params) => fetch('/api/v1/alerts?...'),
    get: (id) => fetch(`/api/v1/alerts/${id}`),
    create: (data) => fetch('/api/v1/alerts', { method: 'POST', body: data }),
  },
  contacts: {
    // ...
  }
};
```

---

### Hardware Files

#### `hardware/raspberry-pi/service.py`

**Main Raspberry Pi service** (runs continuously)

Responsibilities:
- Initialize serial port to Arduino and GPS
- Listen for serial messages
- Capture GPS on alert trigger
- Call backend API to create alert
- Send heartbeat every 30 seconds
- Handle reconnection on errors

#### `hardware/raspberry-pi/config.yaml`

**Device configuration**

```yaml
device:
  name: "Living Room Alert"
  device_id: "rpi_001_abc123"
  secret_token: "from-backend-registration"
  location: "Kitchen"

api:
  backend_url: "https://api.lifechain.app"
  heartbeat_interval: 30

gps:
  serial_port: "/dev/ttyUSB1"
  baud_rate: 9600
  timeout: 30

button:
  hold_time: 2000  # milliseconds to trigger alert
```

#### `hardware/arduino/firmware.ino`

**Arduino sketch** (uploaded to Arduino Pro Micro)

Responsibilities:
- Read button on pin D11
- Debounce (50ms delay)
- When held 2+ seconds, send `<ALRT>` to Raspberry Pi
- Receive `<BEEP>` commands and play tones on pin D9
- Periodic `<STAT>` health reports

---

## Configuration Files

### Backend `.env.example`

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/lifechain
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379

# API
API_PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Gemini
GEMINI_API_KEY=AIzaxxxxxxxxxx
GEMINI_MODEL=gemini-2.0-flash

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaxxxxxxxxxx

# Hardware
HARDWARE_SECRET_TOKEN=device-secret-token

# Logging
LOG_LEVEL=debug
```

### Frontend `.env.local.example`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaxxxxxxxxxx
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### Raspberry Pi `config.yaml.example`

See `/hardware/raspberry-pi/config.example.yaml`

---

## Environment Variables

### Backend Environment Variables (Complete List)

#### Database

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@pg.example.com:5432/lifechain` | PostgreSQL connection string |
| `DATABASE_POOL_SIZE` | `20` | Max database connections |
| `DATABASE_REPLICA_URL` | `postgresql://user:pass@replica.example.com/lifechain` | Read replica (optional) |

#### Redis

| Variable | Example | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `REDIS_DB` | `0` | Redis database number |

#### API & Server

| Variable | Example | Description |
|---|---|---|
| `API_PORT` | `3001` | Port to bind to |
| `API_HOST` | `0.0.0.0` | Host to bind to |
| `NODE_ENV` | `development` | Environment (development/staging/production) |

#### Authentication

| Variable | Example | Description |
|---|---|---|
| `JWT_SECRET` | `your-32-char-secret-key` | JWT signing key (32+ characters) |
| `JWT_EXPIRY` | `24h` | Token expiration (e.g., "24h", "7d") |
| `JWT_REFRESH_EXPIRY` | `30d` | Refresh token expiration |

#### External APIs

| Variable | Example | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxx` | Twilio account ID |
| `TWILIO_AUTH_TOKEN` | `xxxxxxxxxxxx` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | `+1234567890` | Twilio phone for SMS |
| `GEMINI_API_KEY` | `AIzaxxxxxxxxxx` | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model version |
| `GOOGLE_MAPS_API_KEY` | `AIzaxxxxxxxxxx` | Google Maps API key |

#### Hardware

| Variable | Example | Description |
|---|---|---|
| `HARDWARE_SECRET_TOKEN` | `secret-token-xyz` | Token for device authentication |
| `HARDWARE_REGISTRATION_TIMEOUT` | `300` | Seconds to wait for device registration |

#### Logging

| Variable | Example | Description |
|---|---|---|
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `LOG_FORMAT` | `json` | Log format (json or text) |
| `LOG_FILE` | `/var/log/lifechain/app.log` | Log file path (optional) |

#### Features (Flags)

| Variable | Example | Description |
|---|---|---|
| `FEATURE_GPS_REQUIRED` | `false` | Require GPS for all alerts |
| `FEATURE_SMS_ENABLED` | `true` | Enable SMS notifications |
| `FEATURE_RISK_ASSESSMENT` | `true` | Enable Gemini risk assessment |

### Frontend Environment Variables (Complete List)

#### API Endpoints

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.lifechain.app` | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | `wss://api.lifechain.app/ws` | WebSocket endpoint |

#### Third-Party APIs

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `AIzaxxxxxxxxxx` | Google Maps API key (public) |

#### NextAuth.js

| Variable | Example | Description |
|---|---|---|
| `NEXTAUTH_URL` | `https://lifechain.app` | Auth callback URL |
| `NEXTAUTH_SECRET` | `your-secret-key` | NextAuth signing key (32+ characters) |

#### Features

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_FEATURE_DARK_MODE` | `true` | Enable dark mode toggle |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `support@lifechain.app` | Support email |

---

## Docker Setup

### docker-compose.yml (Development)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: lifechain
      POSTGRES_USER: lifechain
      POSTGRES_PASSWORD: lifechain_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/migrations:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://lifechain:lifechain_dev@postgres:5432/lifechain
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
      JWT_SECRET: dev_secret_key_do_not_use_in_prod
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend/src:/app/src
    command: npm run dev

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: dev_secret_key
    depends_on:
      - backend
    volumes:
      - ./frontend/app:/app/app
      - ./frontend/components:/app/components

volumes:
  postgres_data:
```

**Start Development Stack:**
```bash
docker-compose up -d
# Services available at:
# - Frontend: http://localhost:3000
# - API: http://localhost:3001
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

---

## Development Workflow

### 1. Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd lifechain-claude-app

# Copy environment templates
cp backend/.env.example backend/.env.local
cp frontend/.env.local.example frontend/.env.local

# Start Docker services
docker-compose up -d

# Wait for database to start
sleep 5

# Run database migrations
docker-compose exec backend npm run db:migrate

# Seed test data (optional)
docker-compose exec backend npm run db:seed
```

### 2. Development Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Run tests
docker-compose exec backend npm test
docker-compose exec frontend npm test

# Format code
docker-compose exec backend npm run lint:fix
docker-compose exec frontend npm run lint:fix

# Create database migration
docker-compose exec backend npm run db:create-migration "migration_name"

# Stop all services
docker-compose down
```

### 3. Adding a New Feature

1. **Create database migration** (if needed)
   ```bash
   npm run db:create-migration "add_field_to_alerts"
   # Edit db/migrations/NNN_add_field_to_alerts.sql
   ```

2. **Update backend**
   - Add route in `backend/src/routes/`
   - Add service logic in `backend/src/services/`
   - Add tests in `backend/tests/`

3. **Update frontend**
   - Add component in `frontend/components/`
   - Add page in `frontend/app/`
   - Add hook if needed in `frontend/hooks/`
   - Add tests in `frontend/tests/`

4. **Test end-to-end**
   ```bash
   npm run test:e2e
   ```

### 4. Deployment Preparation

```bash
# Run full test suite
npm run test:all

# Build production images
docker build -t lifechain-backend:latest ./backend
docker build -t lifechain-frontend:latest ./frontend

# Push to registry
docker push registry/lifechain-backend:latest
docker push registry/lifechain-frontend:latest

# Deploy via Terraform
cd terraform
terraform apply -var-file=environments/prod.tfvars
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-06-20  
**Reference:** See CLAUDE.md for complete architecture overview
