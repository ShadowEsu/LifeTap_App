# LifeTap API Specification

**Version:** 1.0.0  
**Base URL:** `https://api.lifechain.app` (production)  
**Local Development:** `http://localhost:3001`  
**Status:** Phase 0 - Specification

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Core Endpoints](#core-endpoints)
   - [Alerts](#alerts)
   - [Contacts](#contacts)
   - [History](#history)
   - [Risk Assessment](#risk-assessment)
   - [Hardware](#hardware)
5. [WebSocket Events](#websocket-events)
6. [Rate Limiting](#rate-limiting)
7. [Pagination](#pagination)

---

## Overview

### API Design Principles

- **RESTful Architecture:** Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON Payloads:** All request/response bodies are JSON
- **Authentication:** JWT bearer tokens in Authorization header
- **Real-time Updates:** WebSocket for live alert broadcasts
- **Structured Errors:** Consistent error response format
- **Versioning:** API versioning via URL path (`/api/v1/`)

### Request Format

All requests must include:

```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

### Response Format

All responses follow this structure:

```json
{
  "status": "success|error",
  "data": { /* response payload */ },
  "meta": {
    "timestamp": "2026-06-20T14:30:00Z",
    "request_id": "req_abc123def456"
  }
}
```

---

## Authentication

### Registration (Public Endpoint)

**POST** `/api/v1/auth/register`

Creates a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_123",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response:** 201 Created
```json
{
  "status": "success",
  "data": {
    "user_id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "created_at": "2026-06-20T14:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Email already exists
- `422` - Validation error (weak password, invalid email format)

---

### Login (Public Endpoint)

**POST** `/api/v1/auth/login`

Authenticates user and returns JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_123"
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "ref_xyz789abc456",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "user_id": "user_abc123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `404` - User not found

---

### Token Refresh

**POST** `/api/v1/auth/refresh`

Obtains new access token using refresh token.

**Request:**
```json
{
  "refresh_token": "ref_xyz789abc456"
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

**Error Responses:**
- `401` - Invalid or expired refresh token

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Alert with ID abc123 not found",
    "details": {
      "alert_id": "abc123",
      "requested_at": "2026-06-20T14:30:00Z"
    }
  },
  "meta": {
    "timestamp": "2026-06-20T14:30:00Z",
    "request_id": "req_abc123def456"
  }
}
```

### HTTP Status Codes

| Status | Meaning | Example |
|---|---|---|
| `200` | OK | Successful GET request |
| `201` | Created | Alert created successfully |
| `204` | No Content | Update successful, no body |
| `400` | Bad Request | Missing required field |
| `401` | Unauthorized | Missing or invalid JWT |
| `403` | Forbidden | User lacks permission |
| `404` | Not Found | Alert doesn't exist |
| `409` | Conflict | Duplicate contact phone number |
| `422` | Unprocessable Entity | Validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected error |
| `503` | Service Unavailable | Database down, Redis down |

### Common Error Codes

| Code | HTTP | Description |
|---|---|---|
| `INVALID_TOKEN` | 401 | JWT expired, malformed, or invalid |
| `MISSING_PERMISSION` | 403 | User doesn't own the resource |
| `VALIDATION_ERROR` | 422 | Field validation failed |
| `RESOURCE_NOT_FOUND` | 404 | Alert/Contact/User doesn't exist |
| `DUPLICATE_RESOURCE` | 409 | Contact phone already registered |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `EXTERNAL_API_ERROR` | 500 | Gemini/Twilio API failed |
| `DATABASE_ERROR` | 500 | Database query failed |

---

## Core Endpoints

### Alerts

#### Create Emergency Alert (Hardware Endpoint)

**POST** `/api/v1/alerts`

Triggered by Raspberry Pi when button is pressed.

**Authentication:** Hardware token or device JWT

**Request:**
```json
{
  "device_id": "rpi_001_abc123",
  "timestamp": "2026-06-20T14:30:00Z",
  "lat": 40.7128,
  "lon": -74.0060,
  "location_accuracy": 8.5,
  "device_name": "Living Room Alert Button"
}
```

**Response:** 201 Created
```json
{
  "status": "success",
  "data": {
    "alert_id": "alert_def456ghi789",
    "device_id": "rpi_001_abc123",
    "user_id": "user_abc123",
    "status": "received",
    "timestamp": "2026-06-20T14:30:00Z",
    "location": {
      "lat": 40.7128,
      "lon": -74.0060,
      "accuracy_meters": 8.5,
      "address": "350 5th Ave, New York, NY 10118"
    },
    "created_at": "2026-06-20T14:30:00Z"
  }
}
```

**Async Operations Triggered:**
1. Fetch emergency contacts (database query)
2. Assess risk with Gemini API
3. Send SMS notifications to contacts
4. Broadcast to WebSocket clients

**Error Responses:**
- `400` - Missing required fields (device_id, timestamp, lat, lon)
- `401` - Invalid device token
- `404` - Device not registered
- `422` - Invalid coordinates (lat/lon out of range)

---

#### Get Alert Details

**GET** `/api/v1/alerts/:alert_id`

Retrieves complete alert information including risk assessment and contact responses.

**Authentication:** Required (user must own alert)

**Query Parameters:**
- `include_assessment` (optional, default: true) - Include Gemini risk assessment
- `include_responses` (optional, default: true) - Include contact response details

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "alert_id": "alert_def456ghi789",
    "user_id": "user_abc123",
    "device_id": "rpi_001_abc123",
    "device_name": "Living Room Alert Button",
    "status": "acknowledged",
    "timestamp": "2026-06-20T14:30:00Z",
    "location": {
      "lat": 40.7128,
      "lon": -74.0060,
      "accuracy_meters": 8.5,
      "address": "350 5th Ave, New York, NY 10118"
    },
    "risk_assessment": {
      "risk_level": "medium",
      "risk_score": 65,
      "assessment_timestamp": "2026-06-20T14:30:05Z",
      "rationale": "Alert at 2:30 PM in populated urban area. Device history shows previous alerts at same location.",
      "suggested_actions": [
        "Call contact to verify situation",
        "Dispatch non-emergency services if no response within 5 minutes",
        "Check nearby hospitals (2 within 5km)"
      ]
    },
    "contacts": [
      {
        "contact_id": "contact_abc123",
        "name": "Sarah Doe",
        "phone": "+1987654321",
        "relationship": "Daughter",
        "sms_sent_at": "2026-06-20T14:30:01Z",
        "response_status": "acknowledged",
        "response_message": "I'm on my way",
        "response_timestamp": "2026-06-20T14:31:15Z"
      },
      {
        "contact_id": "contact_xyz789",
        "name": "Emergency Services",
        "phone": "+1555911",
        "relationship": "Services",
        "sms_sent_at": "2026-06-20T14:30:02Z",
        "response_status": "pending",
        "response_message": null,
        "response_timestamp": null
      }
    ],
    "resolution": {
      "status": "closed",
      "resolved_at": "2026-06-20T14:45:00Z",
      "resolved_by": "user",
      "resolution_note": "False alarm - button pressed accidentally"
    },
    "created_at": "2026-06-20T14:30:00Z",
    "updated_at": "2026-06-20T14:45:00Z"
  }
}
```

**Error Responses:**
- `404` - Alert not found
- `403` - User doesn't own this alert

---

#### List Alerts (History)

**GET** `/api/v1/alerts`

Retrieves paginated list of alerts for authenticated user.

**Authentication:** Required

**Query Parameters:**
```
?page=1
&limit=20
&sort=-timestamp
&status=closed,acknowledged
&start_date=2026-06-01T00:00:00Z
&end_date=2026-06-30T23:59:59Z
&risk_level=high,medium
&location_radius=10 (in kilometers from user home)
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": [
    {
      "alert_id": "alert_def456ghi789",
      "timestamp": "2026-06-20T14:30:00Z",
      "status": "closed",
      "risk_level": "medium",
      "location": {
        "lat": 40.7128,
        "lon": -74.0060,
        "address": "350 5th Ave, New York, NY 10118"
      },
      "contact_responses": 2,
      "response_status": "acknowledged"
    }
  ],
  "meta": {
    "timestamp": "2026-06-20T14:30:00Z",
    "request_id": "req_abc123def456",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `422` - Invalid query parameters (invalid date format, limit > 100)

---

#### Update Alert Status

**PATCH** `/api/v1/alerts/:alert_id`

Updates alert status (e.g., mark as closed/resolved).

**Authentication:** Required (user must own alert)

**Request:**
```json
{
  "status": "closed",
  "resolution_note": "False alarm - button pressed accidentally"
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "alert_id": "alert_def456ghi789",
    "status": "closed",
    "updated_at": "2026-06-20T14:45:00Z"
  }
}
```

**Error Responses:**
- `403` - User doesn't own this alert
- `404` - Alert not found
- `409` - Cannot close alert that's already resolved

---

### Contacts

#### Create Emergency Contact

**POST** `/api/v1/contacts`

Adds a new emergency contact.

**Authentication:** Required

**Request:**
```json
{
  "name": "Sarah Doe",
  "phone": "+1987654321",
  "relationship": "Daughter",
  "is_active": true,
  "notification_preference": "always"
}
```

**Response:** 201 Created
```json
{
  "status": "success",
  "data": {
    "contact_id": "contact_abc123",
    "user_id": "user_abc123",
    "name": "Sarah Doe",
    "phone": "+1987654321",
    "relationship": "Daughter",
    "is_active": true,
    "notification_preference": "always",
    "verified": false,
    "created_at": "2026-06-20T14:30:00Z"
  }
}
```

**Post-Creation:**
- Verification SMS sent to contact phone
- Contact must verify phone before SMS alerts are sent
- Contact receives: "You've been added as an emergency contact. Reply VERIFY to confirm."

**Error Responses:**
- `400` - Invalid phone number format
- `409` - Phone number already in use for this user
- `422` - Name or relationship missing

---

#### Get Contact

**GET** `/api/v1/contacts/:contact_id`

**Authentication:** Required (user must own contact)

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "contact_id": "contact_abc123",
    "name": "Sarah Doe",
    "phone": "+1987654321",
    "relationship": "Daughter",
    "is_active": true,
    "notification_preference": "always",
    "verified": true,
    "verified_at": "2026-06-20T14:35:00Z",
    "total_alerts_notified": 12,
    "total_responses": 10,
    "created_at": "2026-06-20T14:30:00Z"
  }
}
```

---

#### List Contacts

**GET** `/api/v1/contacts`

Retrieves all emergency contacts for authenticated user.

**Authentication:** Required

**Query Parameters:**
```
?active_only=true (default: false)
&sort=name,-created_at
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": [
    {
      "contact_id": "contact_abc123",
      "name": "Sarah Doe",
      "phone": "+1987654321",
      "relationship": "Daughter",
      "is_active": true,
      "verified": true,
      "total_alerts_notified": 12
    },
    {
      "contact_id": "contact_xyz789",
      "name": "John Smith",
      "phone": "+1555911",
      "relationship": "Services",
      "is_active": true,
      "verified": true,
      "total_alerts_notified": 12
    }
  ],
  "meta": {
    "timestamp": "2026-06-20T14:30:00Z",
    "request_id": "req_abc123def456",
    "total": 2
  }
}
```

---

#### Update Contact

**PATCH** `/api/v1/contacts/:contact_id`

Updates contact details.

**Authentication:** Required (user must own contact)

**Request:**
```json
{
  "name": "Sarah Jane Doe",
  "is_active": false,
  "notification_preference": "high_risk_only"
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "contact_id": "contact_abc123",
    "name": "Sarah Jane Doe",
    "is_active": false,
    "notification_preference": "high_risk_only",
    "updated_at": "2026-06-20T14:45:00Z"
  }
}
```

---

#### Delete Contact

**DELETE** `/api/v1/contacts/:contact_id`

Removes emergency contact.

**Authentication:** Required (user must own contact)

**Response:** 204 No Content

**Note:** Deletion is permanent. Historical alerts and responses remain, but contact will not receive future notifications.

---

#### Verify Contact Phone

**POST** `/api/v1/contacts/:contact_id/verify`

Used by contact to verify their phone number (SMS reply endpoint).

**Authentication:** Hardware token (SMS callback from Twilio)

**Request:**
```json
{
  "code": "123456"
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "contact_id": "contact_abc123",
    "verified": true,
    "verified_at": "2026-06-20T14:40:00Z"
  }
}
```

---

### History

#### Export Alert History

**GET** `/api/v1/history/export`

Exports alerts as CSV or JSON.

**Authentication:** Required

**Query Parameters:**
```
?format=csv|json (default: json)
&start_date=2026-06-01T00:00:00Z
&end_date=2026-06-30T23:59:59Z
```

**Response:** 200 OK (CSV)
```
alert_id,timestamp,status,risk_level,location,contact_responses
alert_def456ghi789,2026-06-20T14:30:00Z,closed,medium,"40.7128, -74.0060",2
...
```

**Response:** 200 OK (JSON)
```json
{
  "status": "success",
  "data": [
    {
      "alert_id": "alert_def456ghi789",
      "timestamp": "2026-06-20T14:30:00Z",
      "status": "closed",
      "risk_level": "medium",
      "location": { "lat": 40.7128, "lon": -74.0060 },
      "contact_responses": 2
    }
  ]
}
```

---

#### Get Alert Statistics

**GET** `/api/v1/history/statistics`

Retrieves aggregate statistics about alerts.

**Authentication:** Required

**Query Parameters:**
```
?period=week|month|year (default: month)
&start_date=2026-06-01T00:00:00Z
&end_date=2026-06-30T23:59:59Z
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "period": "2026-06-01 to 2026-06-30",
    "total_alerts": 12,
    "alert_breakdown": {
      "high_risk": 2,
      "medium_risk": 5,
      "low_risk": 5
    },
    "average_response_time": 180,
    "response_rate": 0.92,
    "false_alarm_rate": 0.25,
    "by_device": [
      {
        "device_id": "rpi_001_abc123",
        "device_name": "Living Room",
        "alerts": 8
      },
      {
        "device_id": "rpi_002_xyz789",
        "device_name": "Bedroom",
        "alerts": 4
      }
    ]
  }
}
```

---

### Risk Assessment

#### Assess Alert Risk (Internal Endpoint)

**POST** `/api/v1/assessment`

Called asynchronously after alert creation. Integrates with Google Gemini API.

**Authentication:** Internal job worker token

**Request:**
```json
{
  "alert_id": "alert_def456ghi789",
  "user_id": "user_abc123",
  "timestamp": "2026-06-20T14:30:00Z",
  "location": {
    "lat": 40.7128,
    "lon": -74.0060,
    "address": "350 5th Ave, New York, NY 10118"
  },
  "device_name": "Living Room Alert Button",
  "user_profile": {
    "age": 78,
    "medical_conditions": ["Diabetes", "Heart Condition"],
    "location_home": { "lat": 40.7120, "lon": -74.0055 }
  },
  "recent_alerts": [
    {
      "timestamp": "2026-06-19T10:00:00Z",
      "location": { "lat": 40.7128, "lon": -74.0060 },
      "status": "closed"
    }
  ]
}
```

**Gemini Prompt (Internal):**
```
Analyze this emergency alert:

Alert Timestamp: 2026-06-20T14:30:00Z
Location: 350 5th Ave, New York, NY 10118 (40.7128, -74.0060)
Device: Living Room Alert Button

User Profile:
- Age: 78 years old
- Medical Conditions: Diabetes, Heart Condition
- Home Location: ~50 meters from alert location
- Recent Alert History: Same location yesterday at 10:00 AM

Time of Day Analysis:
- Current time: 2:30 PM (14:30)
- Alert rate peak: Typically 2-4 PM for this user
- Weather: Clear, 72°F

Based on this context, provide:

1. Risk Level: low | medium | high
2. Risk Score: 0-100
3. Rationale: Brief explanation (1-2 sentences)
4. Suggested Actions: 3-5 prioritized recommendations
5. Escalation Triggers: When to involve emergency services

Format response as valid JSON.
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "alert_id": "alert_def456ghi789",
    "risk_level": "medium",
    "risk_score": 62,
    "assessment_timestamp": "2026-06-20T14:30:05Z",
    "rationale": "Alert at 2:30 PM in populated urban area with high medical vulnerability. User profile suggests elevated risk despite being near home. Previous alert at same location yesterday suggests pattern.",
    "suggested_actions": [
      "Contact daughter (primary emergency contact) immediately",
      "Verify alert location - nearby hospital (NYU Medical Center) 2km away",
      "Check recent medical events in user history",
      "If no response within 3 minutes, consider dispatch"
    ],
    "escalation_criteria": {
      "trigger_emergency_services": "No contact response after 5 minutes at high-risk location",
      "escalation_threshold": 75
    }
  }
}
```

---

### Hardware

#### Register Raspberry Pi Device

**POST** `/api/v1/hardware/register`

Called once when Raspberry Pi boots up for the first time.

**Authentication:** None (registration uses device serial number)

**Request:**
```json
{
  "device_serial": "raspberry-pi-serial-number-abc123",
  "device_name": "Living Room Alert Button",
  "device_type": "raspberry-pi-4b",
  "location": "Living Room",
  "user_phone": "+1234567890"
}
```

**Response:** 201 Created
```json
{
  "status": "success",
  "data": {
    "device_id": "rpi_001_abc123",
    "device_secret_token": "secret_xyz789longtoken123456789",
    "user_id": "user_abc123",
    "device_name": "Living Room Alert Button",
    "registration_timestamp": "2026-06-20T14:30:00Z",
    "backend_url": "https://api.lifechain.app",
    "backend_port": 443,
    "heartbeat_interval": 30,
    "gps_timeout": 30
  }
}
```

**Post-Response:**
- Save `device_secret_token` to `/etc/lifechain/config.yaml` on Raspberry Pi
- Use token for all future API calls
- Start sending heartbeat signals every 30 seconds

**Error Responses:**
- `400` - Missing required fields
- `409` - Device already registered (use the stored token)

---

#### Heartbeat Signal

**POST** `/api/v1/hardware/heartbeat`

Sent every 30 seconds by Raspberry Pi to signal it's alive.

**Authentication:** Hardware device token

**Request:**
```json
{
  "device_id": "rpi_001_abc123",
  "timestamp": "2026-06-20T14:30:00Z",
  "system_status": {
    "cpu_temp_c": 52.3,
    "memory_available_mb": 1024,
    "wifi_signal_strength": -45,
    "gps_status": "acquiring",
    "arduino_connected": true
  }
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "heartbeat_received": true,
    "server_timestamp": "2026-06-20T14:30:05Z"
  }
}
```

**Note:** If no heartbeat received for 90 seconds, device marked as "offline" in dashboard.

---

#### Device Configuration Update

**GET** `/api/v1/hardware/:device_id/config`

Raspberry Pi polls this endpoint periodically to fetch updated configuration.

**Authentication:** Hardware device token

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "device_id": "rpi_001_abc123",
    "heartbeat_interval": 30,
    "gps_timeout": 30,
    "backend_url": "https://api.lifechain.app",
    "features_enabled": {
      "gps_enabled": true,
      "sms_enabled": true,
      "risk_assessment_enabled": true
    },
    "emergency_contacts": [
      {
        "contact_id": "contact_abc123",
        "name": "Sarah Doe",
        "phone": "+1987654321",
        "relationship": "Daughter",
        "is_active": true
      }
    ]
  }
}
```

---

#### Report Arduino Disconnect

**POST** `/api/v1/hardware/:device_id/error`

Raspberry Pi reports Arduino communication failures.

**Authentication:** Hardware device token

**Request:**
```json
{
  "error_type": "arduino_disconnected",
  "timestamp": "2026-06-20T14:30:00Z",
  "message": "Serial port /dev/ttyUSB0 no longer responding",
  "recovery_attempted": true
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "error_logged": true,
    "recommended_action": "Check USB cable connection and restart Arduino"
  }
}
```

---

## WebSocket Events

Connect to WebSocket server at: `wss://api.lifechain.app/ws` (production)  
Or: `ws://localhost:3001/ws` (development)

### Authentication

Send authentication message immediately after connecting:

```json
{
  "type": "authenticate",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response:**
```json
{
  "type": "authenticated",
  "data": {
    "user_id": "user_abc123",
    "authenticated_at": "2026-06-20T14:30:00Z"
  }
}
```

### Alert Broadcast

When a new alert is created, broadcasted to all connected clients:

```json
{
  "type": "alert_created",
  "data": {
    "alert_id": "alert_def456ghi789",
    "user_id": "user_abc123",
    "device_id": "rpi_001_abc123",
    "timestamp": "2026-06-20T14:30:00Z",
    "location": {
      "lat": 40.7128,
      "lon": -74.0060,
      "accuracy_meters": 8.5
    },
    "status": "received"
  }
}
```

### Risk Assessment Update

When Gemini assessment completes:

```json
{
  "type": "risk_assessment_complete",
  "data": {
    "alert_id": "alert_def456ghi789",
    "risk_level": "medium",
    "risk_score": 62,
    "suggested_actions": ["Contact daughter", "Verify location"]
  }
}
```

### Contact Response

When emergency contact replies:

```json
{
  "type": "contact_response",
  "data": {
    "alert_id": "alert_def456ghi789",
    "contact_id": "contact_abc123",
    "contact_name": "Sarah Doe",
    "response_status": "acknowledged",
    "response_message": "I'm on my way",
    "response_timestamp": "2026-06-20T14:31:15Z"
  }
}
```

### Device Status Update

When hardware device status changes:

```json
{
  "type": "device_status_changed",
  "data": {
    "device_id": "rpi_001_abc123",
    "status": "offline",
    "last_heartbeat": "2026-06-20T14:28:00Z",
    "issue": "No heartbeat received for 120 seconds"
  }
}
```

### Connection Heartbeat

Server sends every 30 seconds to keep connection alive:

```json
{
  "type": "heartbeat",
  "data": {
    "server_timestamp": "2026-06-20T14:30:00Z"
  }
}
```

---

## Rate Limiting

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1687270200
```

### Rate Limit Tiers

| Endpoint | Limit | Window |
|---|---|---|
| POST /alerts | 100 | 1 minute |
| POST /contacts | 50 | 1 hour |
| GET /alerts | 200 | 1 hour |
| GET /history | 100 | 1 hour |
| POST /assessment | Unlimited (internal) | - |
| Hardware heartbeat | Unlimited | - |

### Rate Limit Exceeded Response

```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Limit: 100/minute",
    "retry_after": 45
  }
}
```

---

## Pagination

### Query Parameters

```
?page=1        # Page number (1-indexed)
&limit=20      # Items per page (max 100)
&sort=-created_at  # Sort field (- for descending)
```

### Pagination Response

```json
{
  "status": "success",
  "data": [ /* items */ ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 245,
      "pages": 13,
      "has_next": true,
      "has_previous": false,
      "next_page_url": "/api/v1/alerts?page=2&limit=20",
      "previous_page_url": null
    }
  }
}
```

---

## Integration Examples

### Example 1: Complete Alert Flow (Frontend)

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const { data: { access_token } } = await loginResponse.json();

// 2. Connect to WebSocket for real-time alerts
const ws = new WebSocket('ws://localhost:3001/ws');
ws.send(JSON.stringify({
  type: 'authenticate',
  data: { token: access_token }
}));

// 3. Listen for new alerts
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'alert_created') {
    // Show alert on map
    showAlertMarker(message.data.location);
  }
};

// 4. Fetch alert details
const alertResponse = await fetch(
  'http://localhost:3001/api/v1/alerts/alert_def456ghi789',
  {
    headers: { 'Authorization': `Bearer ${access_token}` }
  }
);
const alert = await alertResponse.json();

// 5. Update alert status
await fetch(
  'http://localhost:3001/api/v1/alerts/alert_def456ghi789',
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'closed',
      resolution_note: 'False alarm'
    })
  }
);
```

### Example 2: Hardware Integration (Raspberry Pi)

```python
import requests
import json

# Load device token from config
with open('/etc/lifechain/config.yaml', 'r') as f:
    config = yaml.safe_load(f)

device_id = config['device']['device_id']
device_token = config['device']['secret_token']
backend_url = config['api']['backend_url']

# Send alert when button pressed
alert_data = {
    'device_id': device_id,
    'timestamp': '2026-06-20T14:30:00Z',
    'lat': 40.7128,
    'lon': -74.0060,
    'location_accuracy': 8.5,
    'device_name': 'Living Room'
}

response = requests.post(
    f'{backend_url}/api/v1/alerts',
    headers={
        'Authorization': f'Bearer {device_token}',
        'Content-Type': 'application/json'
    },
    json=alert_data,
    timeout=5
)

alert_response = response.json()
print(f"Alert created: {alert_response['data']['alert_id']}")
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-06-20  
**Reference:** See CLAUDE.md for architecture overview
