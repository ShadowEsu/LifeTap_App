# LifeTap: Emergency Alert System - Phase 0 Master Documentation

**Last Updated:** 2026-06-20  
**Version:** 0.1.0  
**Status:** Specification & Architecture Phase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Vision & Problem Statement](#vision--problem-statement)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Key Features & User Flows](#key-features--user-flows)
6. [Development Workflow](#development-workflow)
7. [Environment Configuration](#environment-configuration)
8. [Deployment Strategy](#deployment-strategy)
9. [Agent Dispatch Protocol](#agent-dispatch-protocol)

---

## Project Overview

**LifeTap** is a modern emergency alert and personal safety system that combines hardware and software to provide rapid emergency response with GPS tracking and intelligent risk assessment.

### Core Value Proposition

- **Instant Emergency Alerts:** One-button emergency activation via Raspberry Pi + Arduino hardware
- **Real-Time GPS Tracking:** Automatic location capture at moment of alert
- **Intelligent Risk Assessment:** Google Gemini AI analyzes alert context and suggests response protocols
- **Multi-Channel Notification:** SMS via Twilio reaching multiple emergency contacts
- **Audit Trail:** Complete history of alerts, locations, and contact responses
- **Modern Dashboard:** Real-time web interface with Google Maps integration

### Target Users

- Elderly individuals with mobility concerns
- Individuals with medical conditions requiring rapid response
- Vulnerable populations in high-risk situations
- Caregivers managing remote family members

---

## Vision & Problem Statement

### The Problem

When emergencies occur, the critical window for effective response is measured in seconds to minutes. Traditional systems (calling 911, text messages) introduce delays through:

- Fumbling with phones while in distress
- Cognitive load of explaining situation verbally
- Notification fatigue leading to missed alerts
- Lack of real-time location context
- No structured risk assessment to prioritize response

### The Solution: LifeTap

LifeTap eliminates friction in emergency response by:

1. **Hardware-First Design:** Physical button (mounted on Raspberry Pi/Arduino) is always accessible, never lost or forgotten
2. **Instant Capture:** GPS location is captured and transmitted immediately upon activation
3. **AI-Driven Assessment:** Gemini AI analyzes alert metadata (time, location, repeat patterns) to suggest risk level and response actions
4. **Coordinated Notification:** SMS notifications to multiple contacts with real-time dashboard updates
5. **Accountability:** Complete audit trail ensures response tracking and compliance

---

## Technology Stack

### Frontend

- **Framework:** Next.js 14+ with App Router
- **UI/Styling:** React with Tailwind CSS
- **Visualization:** Google Maps API (embedded in dashboard)
- **Real-time Updates:** WebSockets or polling (TBD based on scale)
- **State Management:** React Context API or Zustand
- **Authentication:** NextAuth.js with JWT

### Backend

- **API Server:** Node.js with Express.js or Python FastAPI
- **Database:** PostgreSQL 14+ with PostGIS for geospatial queries
- **Caching:** Redis for session state and location history
- **Job Queue:** Bull (Node.js) or Celery (Python) for async tasks
- **Logging:** Structured JSON logging to ELK stack (optional Phase 2)
- **Monitoring:** Prometheus + Grafana (Phase 2)

### Hardware Layer

- **Microcontroller:** Arduino (Pro Micro or similar) - button input, beeper control
- **Single-Board Computer:** Raspberry Pi 4+ - orchestration, GPS communication, network connectivity
- **GPS Module:** u-blox Neo-6M or Neo-8M (UART serial interface)
- **Button:** Momentary push button with debouncing capacitor
- **Beeper:** Piezo buzzer for confirmation feedback
- **Communication:** Raspberry Pi ↔ Arduino via serial (UART) @ 9600 baud

### External Integrations

- **SMS Provider:** Twilio (for SMS notifications)
- **AI Risk Assessment:** Google Gemini API (text-based context analysis)
- **Maps:** Google Maps API (location visualization)
- **Authentication:** Firebase or custom JWT (TBD)

### DevOps & Deployment

- **Containerization:** Docker + Docker Compose for local development
- **Orchestration:** Kubernetes (Phase 2 - optional, start with Docker Compose)
- **CI/CD:** GitHub Actions
- **Hosting:** AWS (RDS for database, EC2/ECS for backend, CloudFront for frontend)

---

## Architecture Overview

### System Diagram Description

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐         ┌──────────────────────┐       │
│  │  Next.js Dashboard   │◄────────►│  Emergency Contacts  │       │
│  │  (Real-time UI)      │         │  Management Portal   │       │
│  │                      │         │                      │       │
│  │  • Alert History     │         │  • CRUD Contacts     │       │
│  │  • Live Map (Google) │         │  • SMS Preferences   │       │
│  │  • Contact Manager   │         │  • Notification Log  │       │
│  │  • Settings          │         │                      │       │
│  └──────────────────────┘         └──────────────────────┘       │
│                 ▲                             ▲                   │
└─────────────────┼─────────────────────────────┼───────────────────┘
                  │ HTTPS + WebSocket           │
┌─────────────────┼─────────────────────────────┼───────────────────┐
│                 ▼         API LAYER           ▼                   │
│  ┌──────────────────────────────────────────────────────┐         │
│  │         REST API + WebSocket Server                  │         │
│  │         (Node.js Express / Python FastAPI)           │         │
│  │                                                      │         │
│  │  Endpoints:                                          │         │
│  │  • POST /alerts → Create emergency alert             │         │
│  │  • GET /alerts/:id → Fetch alert details             │         │
│  │  • POST /contacts → Manage emergency contacts        │         │
│  │  • WS /live → Real-time alert broadcast              │         │
│  │  • POST /assess → Gemini risk assessment             │         │
│  │  • GET /history → Retrieve alert history             │         │
│  │  • POST /hardware/register → Register Raspberry Pi   │         │
│  │  • POST /hardware/heartbeat → Keep-alive signal      │         │
│  └──────────────────────────────────────────────────────┘         │
│         ▲                    ▲                   ▲                 │
└─────────┼────────────────────┼───────────────────┼─────────────────┘
          │                    │                   │
    ┌─────┴──────┐    ┌────────┴────────┐  ┌──────┴──────┐
    │             │    │                 │  │             │
┌───▼────────┐  ┌┴────▼─────┐      ┌────▼──▼──┐   ┌──────┴─────┐
│             │  │            │      │           │   │            │
│ PostgreSQL  │  │   Redis    │      │ Job Queue │   │  Twilio    │
│ Database    │  │  (Caching) │      │  (Bull)   │   │   API      │
│             │  │            │      │           │   │            │
│ • Alerts    │  │ • Sessions │      │ • SMS     │   │  (SMS)     │
│ • Contacts  │  │ • Location │      │ • Email   │   │            │
│ • History   │  │   Cache    │      │ • Risk    │   └────────────┘
│ • Users     │  │            │      │   Assess  │
│             │  │            │      │           │
└─────────────┘  └────────────┘      └───────────┘
```

### Hardware Layer

```
┌──────────────────────────────────────────────────────────────┐
│                    HARDWARE LAYER                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐      ┌──────────────────┐              │
│  │   Raspberry Pi   │      │    Arduino Pro   │              │
│  │   (Main Control) │◄────►│    Micro         │              │
│  │                  │      │  (I/O Control)   │              │
│  │ • OS: Raspberry  │      │                  │              │
│  │   Pi OS / Linux  │      │ • Button Input   │              │
│  │ • WiFi/Ethernet  │      │ • Beeper Control │              │
│  │ • Serial UART    │      │ • Debouncing     │              │
│  │ • Python Service │      │ • Feedback Tone  │              │
│  │                  │      │                  │              │
│  │ • Registers w/   │      └──────────────────┘              │
│  │   Backend on     │              ▲                         │
│  │   startup        │              │ Serial (9600 baud)      │
│  │ • Sends heartbeat│              │                         │
│  │   every 30s      │              │                         │
│  │ • Monitors GPS   │              ▼                         │
│  │   for location   │      ┌──────────────────┐              │
│  │ • Listens for    │      │   Momentary      │              │
│  │   alert trigger  │      │   Push Button    │              │
│  │   from Arduino   │      └──────────────────┘              │
│  │                  │              ▲                         │
│  │ ┌──────────────┐ │              │                         │
│  │ │ GPS Module   │ │              │ (Pressed)               │
│  │ │ (u-blox)     │ │      ┌───────┴──────────┐              │
│  │ │              │ │      │    Piezo Beeper  │              │
│  │ │ UART ←─────┼─┼─────→│    Buzzer         │              │
│  │ │ Serial       │ │      │  (Confirmation)   │              │
│  │ │              │ │      └───────────────────┘              │
│  │ └──────────────┘ │                                        │
│  │                  │                                        │
│  └──────────────────┘                                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow: Emergency Alert Lifecycle

```
1. INITIATION
   User presses physical button on Raspberry Pi
   ↓
2. ARDUINO DETECTION
   Arduino detects button press (debounced)
   Sends: ALERT_TRIGGERED packet via serial
   Arduino activates beeper (100ms pulse tone)
   ↓
3. RASPBERRY PI CAPTURE
   Python service receives serial packet
   Immediately calls GPS module (if available)
   Captures timestamp, location (lat/lon), device ID
   ↓
4. BACKEND TRANSMISSION
   POST /alerts to API server
   Payload: { device_id, timestamp, lat, lon, device_name }
   ↓
5. DATABASE STORAGE
   Alert record created in PostgreSQL
   Status: "received"
   Related contacts fetched
   ↓
6. GEMINI ASSESSMENT (Async)
   Risk assessment job queued
   Gemini API analyzes:
     - Time of day (night alerts = higher risk)
     - Location patterns (repeat locations = lower risk)
     - Device history (first alert = higher priority)
   Returns: risk_level (low/medium/high), suggested_actions
   ↓
7. SMS NOTIFICATION (Async)
   Twilio SMS sent to all active emergency contacts
   Message: "ALERT from [User]: [Location]. [Suggested Action]"
   Status: "notified"
   ↓
8. DASHBOARD UPDATE
   WebSocket broadcast to all connected dashboards
   Real-time marker appears on Google Maps
   Alert details updated in UI
   ↓
9. CONTACT RESPONSE
   Contact receives SMS → clicks response link
   Dashboard shows: contacted_timestamp, contact_name
   ↓
10. CLOSED
    User or contact marks alert as resolved
    Status: "closed", resolution_timestamp
```

---

## Key Features & User Flows

### Feature 1: Emergency Alert Activation

**Actors:** Primary User (elderly person, medical patient, etc.)

**Flow:**
1. User is in distress or emergency situation
2. User reaches for Raspberry Pi mounted nearby
3. User presses physical button for 2+ seconds
4. Arduino detects press, activates beeper (confirmation tone)
5. Raspberry Pi captures location from GPS
6. Alert is transmitted to backend in <2 seconds
7. SMS and dashboard notifications sent to contacts
8. User can see alert status in Raspberry Pi's small LCD display (Phase 2)

**Success Criteria:**
- Button press to SMS delivery: <5 seconds
- GPS accuracy: ±5 meters (urban), ±15 meters (rural)
- No false positives from accidental presses

### Feature 2: Emergency Contact Management

**Actors:** Primary User, Emergency Contact

**Flow:**
1. User logs into web dashboard
2. Navigates to "Emergency Contacts" section
3. Can add/edit/remove contacts with fields:
   - Name
   - Phone number (SMS recipient)
   - Relationship
   - Active/Inactive toggle
   - Notification preferences (always notify, only high-risk, etc.)
4. Saves preferences to PostgreSQL
5. Contacts receive SMS with custom greeting on first alert
6. Contact can reply with status: "acknowledged", "en route", "emergency services called"

**Success Criteria:**
- CRUD operations complete in <1 second
- SMS recipients verified before activation
- Contact list supports unlimited contacts
- Preferences synced across devices

### Feature 3: Real-Time Dashboard

**Actors:** Emergency Contact, System Administrator

**Flow:**
1. Contact receives SMS alert with dashboard link
2. Clicks link (or logs in separately)
3. Dashboard displays:
   - Current alert in red on Google Maps
   - Alert timestamp and age (e.g., "3 minutes ago")
   - Risk assessment from Gemini (low/medium/high)
   - Suggested response actions
   - Contact response status from each notified person
   - Alert history (last 30 days)
4. Contact can mark alert as "acknowledged" or "resolved"
5. Dashboard auto-refreshes via WebSocket every 500ms

**Success Criteria:**
- Page load: <2 seconds
- Map rendering: <1 second
- WebSocket reconnects automatically on disconnect
- Mobile responsive (iOS Safari, Android Chrome)

### Feature 4: Gemini Risk Assessment

**Actors:** Backend system, Gemini API

**Flow:**
1. Alert is received and stored
2. Async job pulls alert metadata:
   - Device history (past 7 days)
   - Location history
   - Time of day
   - Device configuration
3. Constructs prompt for Gemini:
   ```
   Analyze this emergency alert:
   - Time: 2:30 AM
   - Location: Rural area (GPS coordinates)
   - Device: Medical alert system (registered type)
   - User profile: 78 years old, chronic condition
   - Last alert: 6 days ago, same location
   - Context: Isolated farmhouse, nearest hospital 30km away
   
   Suggest:
   1. Risk level (low/medium/high)
   2. Top 3 recommended actions
   3. Escalation protocol if needed
   ```
4. Gemini returns structured response
5. Response stored in `alerts.risk_assessment` JSON field
6. Displayed in dashboard

**Success Criteria:**
- Assessment completes within 5 seconds
- Gemini response is JSON-parseable
- Error handling if API fails (fallback to default risk=medium)
- Audit trail of all assessments

### Feature 5: Alert History & Audit Trail

**Actors:** Primary User, Emergency Contact, Administrator

**Flow:**
1. User navigates to "History" in dashboard
2. Displays table of all past alerts with filters:
   - Date range
   - Risk level
   - Resolution status
   - Location
3. Each row clickable to show:
   - Exact timestamp
   - GPS coordinates (with street address lookup)
   - Gemini assessment at time of alert
   - SMS delivery status
   - Contact responses
   - Manual resolution notes
4. Export to CSV available
5. Data retained for 2 years in PostgreSQL

**Success Criteria:**
- Queries return in <2 seconds
- Pagination for >100 alerts
- Geolocation lookup cached to avoid rate limits
- Audit log immutable (no deletion, only append)

---

## Development Workflow

### Repository Structure

```
lifechain-claude-app/
├── CLAUDE.md                    # This master documentation
├── API_SPEC.md                  # Complete REST API specification
├── HARDWARE_PROTOCOL.md         # Hardware communication protocol
├── PROJECT_STRUCTURE.md         # File organization & folder layout
│
├── backend/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt (if Python) or package.json (if Node)
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── env.example
│   ├── src/
│   │   ├── index.js (or main.py)
│   │   ├── routes/
│   │   │   ├── alerts.js
│   │   │   ├── contacts.js
│   │   │   ├── hardware.js
│   │   │   ├── assessment.js
│   │   │   └── history.js
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── jobs/
│   │   │   ├── riskAssessment.js
│   │   │   └── smsNotification.js
│   │   └── utils/
│   └── tests/
│
├── frontend/
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   ├── public/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   ├── contacts/
│   │   ├── history/
│   │   └── api/
│   ├── components/
│   │   ├── Map.tsx
│   │   ├── AlertCard.tsx
│   │   ├── ContactForm.tsx
│   │   └── HistoryTable.tsx
│   └── tests/
│
├── hardware/
│   ├── raspberry-pi/
│   │   ├── service.py             # Main Python service
│   │   ├── gps_module.py          # GPS communication
│   │   ├── requirements.txt
│   │   ├── config.yaml
│   │   └── install.sh
│   ├── arduino/
│   │   ├── firmware.ino           # Arduino sketch
│   │   └── circuit_diagram.txt
│   └── README.md
│
└── db/
    ├── migrations/
    │   ├── 001_initial_schema.sql
    │   ├── 002_add_risk_assessment.sql
    │   └── ...
    ├── seeds/
    │   └── dev_data.sql
    └── schema.sql
```

### Development Commands

#### Local Setup

```bash
# Clone repository
git clone https://github.com/prestonjaysusanto/lifechain-claude-app.git
cd lifechain-claude-app

# Install backend dependencies
cd backend
npm install
# OR pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Start Docker Compose stack (PostgreSQL, Redis, all services)
cd ..
docker-compose up -d

# Run database migrations
npm run db:migrate  # or equivalent for your stack

# Start services
cd backend && npm run dev
# In another terminal:
cd frontend && npm run dev

# Access dashboard: http://localhost:3000
# API base: http://localhost:3001
```

#### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPattern=alerts

# Run with coverage
npm test -- --coverage

# E2E tests (Playwright)
npm run test:e2e
```

#### Database

```bash
# Create new migration
npm run db:create-migration "add_new_field"

# Run migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Seed development data
npm run db:seed
```

#### Deployment

```bash
# Build production images
docker build -t lifechain-backend:latest ./backend
docker build -t lifechain-frontend:latest ./frontend

# Push to registry
docker push <registry>/lifechain-backend:latest
docker push <registry>/lifechain-frontend:latest

# Deploy to AWS (see DEPLOYMENT_STRATEGY section)
aws ecs update-service --cluster lifechain-prod --service lifechain-backend --force-new-deployment
```

---

## Environment Configuration

### Backend Environment Variables

Create `.env` file in `backend/` directory:

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lifechain
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379

# API Configuration
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=development

# Authentication
JWT_SECRET=your-secret-key-here (use 32+ character random string)
JWT_EXPIRY=24h

# Twilio SMS
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

# Google Maps
GOOGLE_MAPS_API_KEY=your-maps-api-key

# Hardware
HARDWARE_SECRET_TOKEN=unique-token-for-rpi-authentication

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json
```

### Frontend Environment Variables

Create `.env.local` file in `frontend/` directory:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-maps-api-key
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### Docker Compose

The `docker-compose.yml` should define:

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: lifechain
      POSTGRES_USER: lifechain
      POSTGRES_PASSWORD: dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://lifechain:dev_password@postgres:5432/lifechain
      REDIS_URL: redis://redis:6379

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001

volumes:
  postgres_data:
```

### Raspberry Pi Configuration

Create `/etc/lifechain/config.yaml` on Raspberry Pi:

```yaml
device:
  name: "LifeTap Device 001"
  device_id: "rpi-001-abc123"
  location: "Kitchen"
  secret_token: "from-backend-registration"

api:
  backend_url: "https://api.lifechain.app"
  heartbeat_interval: 30 # seconds
  timeout: 10 # seconds

gps:
  serial_port: "/dev/ttyUSB0"
  baud_rate: 9600
  timeout: 30 # seconds
  accuracy_threshold: 50 # meters

button:
  debounce_delay: 50 # milliseconds
  hold_time: 2000 # milliseconds to trigger alert

beeper:
  confirmation_tone: 100 # milliseconds
  frequency: 1000 # Hz

logging:
  level: "INFO"
  file: "/var/log/lifechain/service.log"
```

---

## Deployment Strategy

### Deployment Architecture

```
Production Environment:
┌─────────────────────────────────────────────────────────────┐
│                      AWS Infrastructure                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  CloudFront      │    │  Route 53        │              │
│  │  (CDN/Cache)     │◄───│  (DNS)           │              │
│  └──────────────────┘    └──────────────────┘              │
│           ▲                       ▲                         │
│           │                       │                         │
│  ┌────────┴──────────────────────┴──────────────┐          │
│  │                                               │          │
│  │    Application Load Balancer (ALB)           │          │
│  │                                               │          │
│  ├─────────────────┬──────────────────┬─────────┤          │
│  │                 │                  │         │          │
│  ▼                 ▼                  ▼         ▼          │
│ ┌───────┐ ┌───────┐ ┌──────────┐ ┌──────┐ ┌──────┐        │
│ │ECS    │ │ECS    │ │  ECS     │ │ ECS  │ │ ECS  │        │
│ │Back-  │ │Back-  │ │  Front-  │ │Cron  │ │ WS   │        │
│ │end    │ │end    │ │  end     │ │Jobs  │ │Server│        │
│ │(x2)   │ │(x2)   │ │  (x2)    │ │      │ │      │        │
│ └───────┘ └───────┘ └──────────┘ └──────┘ └──────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RDS PostgreSQL (Multi-AZ)                          │   │
│  │  • Primary: Read/Write                              │   │
│  │  • Replica: Read-only (async replication)           │   │
│  │  • Automated backups: Daily                         │   │
│  │  • Encryption: AES-256                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ElastiCache Redis (Cluster Mode)                   │   │
│  │  • Primary node + replica nodes                     │   │
│  │  • Auto-failover enabled                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  S3 Buckets                                         │   │
│  │  • Static assets (frontend builds)                  │   │
│  │  • Alert history exports (CSV/JSON)                 │   │
│  │  • Logs (CloudTrail, ALB)                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Monitoring & Alerting:
  CloudWatch → SNS → PagerDuty (on-call)
  Metrics: CPU, Memory, Request latency, Error rate, DB connections
```

### Deployment Pipeline

**Phase 1 (Development):** Local Docker Compose

**Phase 2 (Staging):** AWS ECS with terraform configuration
- Separate AWS account for staging
- Same infrastructure as production, smaller instance sizes
- Automated deployments on commits to `develop` branch

**Phase 3 (Production):** AWS ECS with Blue-Green Deployment
- Production AWS account
- Multi-AZ RDS and ElastiCache
- Canary deployments (10% traffic first)
- Automated rollback on error rate spike

### Deployment Checklist

```
Pre-Deployment:
☐ All tests passing (unit, integration, E2E)
☐ Database migrations created and tested
☐ Environment variables configured
☐ Docker images built and scanned for vulnerabilities
☐ Performance benchmarks baseline established
☐ Load testing completed (minimum 100 req/sec)
☐ Security audit passed
☐ Runbook updated

Deployment:
☐ Create deployment pull request
☐ Code review approved
☐ Tag release in git (v1.2.3)
☐ Build Docker images with tag
☐ Push images to ECR
☐ Update ECS task definitions
☐ Execute blue-green deployment
☐ Monitor metrics for 30 minutes
☐ Verify all endpoints accessible
☐ Run smoke tests in production

Post-Deployment:
☐ Monitor error rates and latency
☐ Check database replication lag
☐ Verify backups completed
☐ Update deployment log
☐ Notify stakeholders
☐ Create post-mortem if issues occurred
```

---

## Agent Dispatch Protocol

For complex development tasks, delegate to specialized agents following this protocol:

### When to Dispatch an Agent

Dispatch when you encounter tasks in these categories:

| Task Category | Agent Type | Trigger |
|---|---|---|
| **Backend Architecture** | `backend-architect` | Designing API endpoints, database schema, service architecture |
| **Frontend Development** | `nextjs-pro` | Building React components, Next.js features, page routing |
| **Python Services** | `python-pro` | Raspberry Pi service, job workers, data processing |
| **Full-Stack Integration** | `full-stack-developer` | Cross-layer features (hardware + backend + frontend) |
| **Security** | `security-auditor` | Auth implementation, data validation, encryption |
| **Performance** | `performance-engineer` | Load testing, optimization, scaling analysis |
| **Database** | `postgresql-pglite-pro` | Schema design, query optimization, migrations |
| **DevOps/Deployment** | `deployment-engineer` | CI/CD pipelines, Docker, Kubernetes, AWS setup |
| **API Documentation** | `api-documenter` | OpenAPI specs, Postman collections, SDK docs |
| **Testing** | `test-engineer` | Test strategy, test automation, coverage |
| **Code Review** | `code-reviewer-pro` | Architectural consistency, security, maintainability |

### Agent Prompt Template

When dispatching, use this structure:

```
Agent Task: [Task Name]

CONTEXT:
- What is this feature or component?
- Why are we building it?
- Who will use it?

REQUIREMENTS:
- Specific requirements (technical constraints, API contracts, etc.)
- Success criteria
- Edge cases to handle

CONSTRAINTS:
- Technology stack (see TECHNOLOGY_STACK section)
- Performance targets
- Security requirements
- Existing code patterns to follow

DELIVERABLES:
- What files/code should be created or modified?
- Where should they go? (reference PROJECT_STRUCTURE.md)
- Expected output format (code, documentation, diagrams)

REFERENCE:
- API_SPEC.md for API contracts
- HARDWARE_PROTOCOL.md for hardware communication
- PROJECT_STRUCTURE.md for file organization
```

### Example Dispatch

```
Agent Task: Implement GET /alerts/:id endpoint

CONTEXT:
Dashboard needs to fetch individual alert details when a user clicks
an alert from the history table.

REQUIREMENTS:
- Return alert with all associated data (contacts, risk assessment)
- Include response status from each contact
- Cache result in Redis for 5 minutes
- Return 404 if alert doesn't exist
- Only return if request user is the alert owner

CONSTRAINTS:
- Must match API_SPEC.md /alerts/:id schema
- Use existing middleware/auth pattern
- Must handle missing GPS data gracefully
- Response time target: <200ms

DELIVERABLES:
- Create/update backend/src/routes/alerts.js
- Create/update backend/src/controllers/alertController.js
- Unit tests in backend/tests/alerts.test.js
```

### Agent Task Tracking

For multi-step tasks, create a task checklist:

```markdown
## Task: Implement Emergency Alert Feature

### Phase 1: Backend
- [ ] Architect alert schema
- [ ] Implement POST /alerts endpoint
- [ ] Add alert retrieval endpoints
- [ ] Implement Gemini assessment job

### Phase 2: Frontend
- [ ] Build AlertCard component
- [ ] Implement real-time map updates
- [ ] Add contact notification UI
- [ ] Build alert history table

### Phase 3: Hardware
- [ ] Implement Arduino firmware
- [ ] Create Raspberry Pi service
- [ ] Test serial communication
- [ ] Implement alert transmission

### Phase 4: Integration
- [ ] End-to-end testing
- [ ] Hardware-to-backend integration test
- [ ] Load testing
- [ ] Security audit

### Phase 5: Deployment
- [ ] Database migrations
- [ ] Environment configuration
- [ ] Docker image build
- [ ] Production deployment
```

---

## Quick Reference: Critical Files

| File | Purpose |
|---|---|
| `CLAUDE.md` | You are here - master documentation |
| `API_SPEC.md` | Complete REST API specification with examples |
| `HARDWARE_PROTOCOL.md` | Arduino ↔ Raspberry Pi communication protocol |
| `PROJECT_STRUCTURE.md` | File organization, folder layout, env requirements |
| `backend/.env.example` | Template for backend environment variables |
| `frontend/.env.local` | Frontend configuration (API URLs, Maps key) |
| `docker-compose.yml` | Local development stack (PostgreSQL, Redis, services) |
| `db/migrations/` | SQL migration files for schema changes |
| `hardware/raspberry-pi/service.py` | Main Raspberry Pi service (Python) |
| `hardware/arduino/firmware.ino` | Arduino sketch for button/beeper control |

---

## Support & Contributing

### Getting Help

- **API Questions:** See `API_SPEC.md`
- **Hardware Issues:** See `HARDWARE_PROTOCOL.md`
- **Project Structure:** See `PROJECT_STRUCTURE.md`
- **Architecture Decisions:** See this file (CLAUDE.md)

### Adding Features

1. Create an issue describing the feature
2. Use the agent dispatch protocol to delegate complex work
3. Reference this documentation in code comments
4. Add corresponding sections to relevant .md files
5. Update this file's table of contents if significant

### Documentation Standards

- Always explain the "why" not just the "what"
- Link between related sections using markdown anchors
- Include code examples for complex concepts
- Keep diagrams in ASCII format for version control
- Update all affected .md files when architecture changes

---

**Document Version:** 0.1.0  
**Last Updated:** 2026-06-20  
**Next Review:** When Phase 1 (Backend) begins
