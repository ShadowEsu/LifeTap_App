-- ============================================================
-- Migration: 001_initial_schema
-- Description: Core tables for LifeTap emergency alert system
-- Requires: PostgreSQL 14+, PostGIS extension
-- ============================================================

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS "postgis";
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pgcrypto for secure hash functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---- Custom ENUM Types ------------------------------------

CREATE TYPE alert_status AS ENUM (
  'received',
  'assessing',
  'notified',
  'acknowledged',
  'closed'
);

CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');

CREATE TYPE notification_preference AS ENUM ('always', 'high_risk_only', 'never');

CREATE TYPE device_status AS ENUM ('online', 'offline', 'degraded');

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  user_id          VARCHAR(50)   PRIMARY KEY,
  email            VARCHAR(254)  NOT NULL,
  name             VARCHAR(100)  NOT NULL,
  phone            VARCHAR(20)   NULL,
  password_hash    VARCHAR(255)  NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email)
);

COMMENT ON TABLE users IS 'LifeTap user accounts';
COMMENT ON COLUMN users.email IS 'User email address — lowercase normalized';
COMMENT ON COLUMN users.phone IS 'E.164 format phone number for device linking';

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;

-- ============================================================
-- TABLE: refresh_tokens
-- ============================================================
CREATE TABLE refresh_tokens (
  user_id     VARCHAR(50)   NOT NULL,
  token_hash  VARCHAR(255)  NOT NULL,
  expires_at  TIMESTAMPTZ   NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT refresh_tokens_pk PRIMARY KEY (user_id),
  CONSTRAINT refresh_tokens_user_fk FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE
);

COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens — one per user';

-- ============================================================
-- TABLE: hardware_devices
-- ============================================================
CREATE TABLE hardware_devices (
  device_id         VARCHAR(50)   PRIMARY KEY,
  user_id           VARCHAR(50)   NOT NULL,
  device_serial     VARCHAR(200)  NOT NULL,
  device_name       VARCHAR(100)  NOT NULL,
  device_type       VARCHAR(50)   NOT NULL,
  location          VARCHAR(100)  NOT NULL,
  secret_token_hash VARCHAR(255)  NOT NULL,
  status            device_status NOT NULL DEFAULT 'online',
  last_heartbeat_at TIMESTAMPTZ   NULL,
  firmware_version  VARCHAR(30)   NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hardware_devices_user_fk FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT hardware_devices_serial_unique UNIQUE (device_serial)
);

COMMENT ON TABLE hardware_devices IS 'Registered Raspberry Pi hardware devices';
COMMENT ON COLUMN hardware_devices.device_serial IS 'Physical device serial number from Raspberry Pi';
COMMENT ON COLUMN hardware_devices.secret_token_hash IS 'Bcrypt hash of the device JWT — NOT the raw token';

CREATE INDEX idx_hardware_devices_user_id ON hardware_devices (user_id);
CREATE INDEX idx_hardware_devices_status ON hardware_devices (status);
CREATE INDEX idx_hardware_devices_last_heartbeat ON hardware_devices (last_heartbeat_at)
  WHERE status = 'online';

-- ============================================================
-- TABLE: device_heartbeats
-- Stores periodic system status snapshots from hardware devices.
-- ============================================================
CREATE TABLE device_heartbeats (
  id            BIGSERIAL     PRIMARY KEY,
  device_id     VARCHAR(50)   NOT NULL,
  system_status JSONB         NOT NULL DEFAULT '{}',
  recorded_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT device_heartbeats_device_fk FOREIGN KEY (device_id)
    REFERENCES hardware_devices (device_id) ON DELETE CASCADE
);

COMMENT ON TABLE device_heartbeats IS 'Time-series heartbeat data from hardware devices';

CREATE INDEX idx_device_heartbeats_device_id ON device_heartbeats (device_id);
CREATE INDEX idx_device_heartbeats_recorded_at ON device_heartbeats (recorded_at DESC);

-- ============================================================
-- TABLE: device_error_logs
-- ============================================================
CREATE TABLE device_error_logs (
  id                  BIGSERIAL   PRIMARY KEY,
  device_id           VARCHAR(50) NOT NULL,
  error_type          VARCHAR(50) NOT NULL,
  message             TEXT        NOT NULL,
  recovery_attempted  BOOLEAN     NOT NULL DEFAULT FALSE,
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT device_error_logs_device_fk FOREIGN KEY (device_id)
    REFERENCES hardware_devices (device_id) ON DELETE CASCADE
);

CREATE INDEX idx_device_error_logs_device_id ON device_error_logs (device_id);
CREATE INDEX idx_device_error_logs_occurred_at ON device_error_logs (occurred_at DESC);

-- ============================================================
-- TABLE: emergency_contacts
-- ============================================================
CREATE TABLE emergency_contacts (
  contact_id              VARCHAR(50)               PRIMARY KEY,
  user_id                 VARCHAR(50)               NOT NULL,
  name                    VARCHAR(100)              NOT NULL,
  phone                   VARCHAR(20)               NOT NULL,
  relationship            VARCHAR(100)              NOT NULL,
  is_active               BOOLEAN                   NOT NULL DEFAULT TRUE,
  notification_preference notification_preference   NOT NULL DEFAULT 'always',
  verified                BOOLEAN                   NOT NULL DEFAULT FALSE,
  verified_at             TIMESTAMPTZ               NULL,
  verification_code       VARCHAR(10)               NULL,
  total_alerts_notified   INTEGER                   NOT NULL DEFAULT 0,
  total_responses         INTEGER                   NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ               NOT NULL DEFAULT NOW(),

  CONSTRAINT emergency_contacts_user_fk FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE,
  -- One phone number per user (but same number can be used by different users)
  CONSTRAINT emergency_contacts_phone_user_unique UNIQUE (user_id, phone)
);

COMMENT ON TABLE emergency_contacts IS 'Emergency contacts for each user';
COMMENT ON COLUMN emergency_contacts.verification_code IS 'Temporary 6-digit code sent via SMS, cleared on verification';
COMMENT ON COLUMN emergency_contacts.total_alerts_notified IS 'Counter — updated by triggers or application';

CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts (user_id);
CREATE INDEX idx_emergency_contacts_active ON emergency_contacts (user_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_emergency_contacts_phone ON emergency_contacts (phone);

-- ============================================================
-- TABLE: alerts
-- Primary emergency alert records with PostGIS geospatial location.
-- ============================================================
CREATE TABLE alerts (
  alert_id             VARCHAR(50)    PRIMARY KEY,
  user_id              VARCHAR(50)    NOT NULL,
  device_id            VARCHAR(50)    NOT NULL,
  device_name          VARCHAR(100)   NULL,
  status               alert_status   NOT NULL DEFAULT 'received',
  timestamp            TIMESTAMPTZ    NOT NULL,

  -- PostGIS geography point (SRID 4326 = WGS84)
  location             GEOGRAPHY(POINT, 4326) NOT NULL,
  -- Denormalized lat/lon for non-spatial queries
  lat                  DOUBLE PRECISION NOT NULL,
  lon                  DOUBLE PRECISION NOT NULL,
  location_accuracy_m  REAL           NULL,
  altitude_meters      REAL           NULL,
  satellites_used      SMALLINT       NULL,
  hdop                 REAL           NULL,
  address              TEXT           NULL,
  location_status      VARCHAR(20)    NOT NULL DEFAULT 'unknown',

  -- Risk assessment (stored as JSON for flexibility)
  risk_level           risk_level     NULL,
  risk_score           SMALLINT       NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_assessment_json JSONB          NULL,

  -- Resolution details
  resolution_json      JSONB          NULL,

  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT alerts_user_fk FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE RESTRICT,
  CONSTRAINT alerts_device_fk FOREIGN KEY (device_id)
    REFERENCES hardware_devices (device_id) ON DELETE RESTRICT
);

COMMENT ON TABLE alerts IS 'Emergency alert events — immutable audit trail';
COMMENT ON COLUMN alerts.location IS 'PostGIS geography point — WGS84 (SRID 4326)';
COMMENT ON COLUMN alerts.risk_assessment_json IS 'Full Gemini AI assessment result';
COMMENT ON COLUMN alerts.resolution_json IS 'Resolution details when alert is closed';

-- Primary access patterns
CREATE INDEX idx_alerts_user_id_timestamp ON alerts (user_id, timestamp DESC);
CREATE INDEX idx_alerts_device_id ON alerts (device_id);
CREATE INDEX idx_alerts_status ON alerts (status);
CREATE INDEX idx_alerts_risk_level ON alerts (risk_level) WHERE risk_level IS NOT NULL;
CREATE INDEX idx_alerts_timestamp ON alerts (timestamp DESC);

-- PostGIS spatial index for proximity queries
CREATE INDEX idx_alerts_location ON alerts USING GIST (location);

-- Composite index for history queries
CREATE INDEX idx_alerts_user_status_time ON alerts (user_id, status, timestamp DESC);

-- ============================================================
-- TABLE: alert_contact_notifications
-- Tracks which contacts were notified for each alert and their responses.
-- ============================================================
CREATE TABLE alert_contact_notifications (
  id              BIGSERIAL    PRIMARY KEY,
  alert_id        VARCHAR(50)  NOT NULL,
  contact_id      VARCHAR(50)  NOT NULL,
  sms_message_sid VARCHAR(100) NULL,
  sms_sent_at     TIMESTAMPTZ  NULL,
  sms_success     BOOLEAN      NOT NULL DEFAULT FALSE,
  response_status VARCHAR(50)  NOT NULL DEFAULT 'pending',
  response_message TEXT        NULL,
  response_at     TIMESTAMPTZ  NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT acn_alert_fk FOREIGN KEY (alert_id)
    REFERENCES alerts (alert_id) ON DELETE CASCADE,
  CONSTRAINT acn_contact_fk FOREIGN KEY (contact_id)
    REFERENCES emergency_contacts (contact_id) ON DELETE RESTRICT,
  CONSTRAINT acn_alert_contact_unique UNIQUE (alert_id, contact_id)
);

COMMENT ON TABLE alert_contact_notifications IS 'Per-contact notification and response records for each alert';

CREATE INDEX idx_acn_alert_id ON alert_contact_notifications (alert_id);
CREATE INDEX idx_acn_contact_id ON alert_contact_notifications (contact_id);

-- ============================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_hardware_devices_updated_at
  BEFORE UPDATE ON hardware_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
