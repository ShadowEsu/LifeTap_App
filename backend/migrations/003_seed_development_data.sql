-- ============================================================
-- Migration: 003_seed_development_data
-- Description: Development seed data — DO NOT run in production
-- ============================================================

-- Safety guard: abort if running in production
DO $$
BEGIN
  IF current_setting('app.env', TRUE) = 'production' THEN
    RAISE EXCEPTION 'Refusing to run seed data in production environment';
  END IF;
END $$;

-- ---- Development User (password: DevPassword123) ----------
-- Hash generated with bcrypt rounds=12
INSERT INTO users (user_id, email, name, phone, password_hash) VALUES
(
  'user_dev001',
  'dev@lifechain.app',
  'Dev Test User',
  '+15551234567',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCFSfYdXJnEWxFJlzk8Bvqa'
)
ON CONFLICT (email) DO NOTHING;

-- ---- Development Hardware Device --------------------------
INSERT INTO hardware_devices (
  device_id, user_id, device_serial, device_name,
  device_type, location, secret_token_hash, status, last_heartbeat_at
) VALUES (
  'rpi_dev001',
  'user_dev001',
  'RASPI-SERIAL-DEV-001',
  'Living Room Alert Button',
  'raspberry-pi-4b',
  'Living Room',
  '$2b$12$placeholder_hash_for_dev_token_only',
  'online',
  NOW()
)
ON CONFLICT (device_serial) DO NOTHING;

-- ---- Development Emergency Contacts -----------------------
INSERT INTO emergency_contacts (
  contact_id, user_id, name, phone, relationship,
  is_active, notification_preference, verified, verified_at
) VALUES
(
  'contact_dev001',
  'user_dev001',
  'Sarah Dev',
  '+15559876543',
  'Daughter',
  TRUE,
  'always',
  TRUE,
  NOW() - INTERVAL '1 day'
),
(
  'contact_dev002',
  'user_dev001',
  'Dr. Johnson',
  '+15550001111',
  'Primary Care Physician',
  TRUE,
  'high_risk_only',
  TRUE,
  NOW() - INTERVAL '2 days'
)
ON CONFLICT DO NOTHING;

-- ---- Sample Alerts ----------------------------------------
INSERT INTO alerts (
  alert_id, user_id, device_id, device_name, status, timestamp,
  location, lat, lon, location_accuracy_m, address, location_status,
  risk_level, risk_score, risk_assessment_json, resolution_json
) VALUES
(
  'alert_dev001',
  'user_dev001',
  'rpi_dev001',
  'Living Room Alert Button',
  'closed',
  NOW() - INTERVAL '5 days',
  ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326),
  40.7128, -74.0060, 8.5,
  '350 5th Ave, New York, NY 10118',
  'real-time',
  'medium', 62,
  '{
    "risk_level": "medium",
    "risk_score": 62,
    "assessment_timestamp": "2026-06-15T14:30:05Z",
    "rationale": "Alert at 2:30 PM in populated urban area. No recent alert history.",
    "suggested_actions": [
      "Contact Sarah Dev immediately",
      "Verify alert location",
      "Check nearby hospitals"
    ]
  }'::jsonb,
  '{
    "status": "closed",
    "resolved_at": "2026-06-15T14:45:00Z",
    "resolved_by": "user",
    "resolution_note": "False alarm — button pressed accidentally"
  }'::jsonb
),
(
  'alert_dev002',
  'user_dev001',
  'rpi_dev001',
  'Living Room Alert Button',
  'acknowledged',
  NOW() - INTERVAL '2 hours',
  ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326),
  40.7128, -74.0060, 5.2,
  '350 5th Ave, New York, NY 10118',
  'real-time',
  'high', 82,
  '{
    "risk_level": "high",
    "risk_score": 82,
    "assessment_timestamp": "2026-06-20T12:30:05Z",
    "rationale": "Alert at midday but second alert in 5 days at same location. High risk user profile.",
    "suggested_actions": [
      "Call Sarah Dev immediately",
      "If no answer, contact emergency services",
      "Verify user is responsive"
    ]
  }'::jsonb,
  NULL
)
ON CONFLICT (alert_id) DO NOTHING;

-- ---- Sample Notifications ---------------------------------
INSERT INTO alert_contact_notifications (
  alert_id, contact_id, sms_message_sid, sms_sent_at, sms_success,
  response_status, response_message, response_at
) VALUES
(
  'alert_dev001',
  'contact_dev001',
  'SM_dev_001',
  NOW() - INTERVAL '5 days',
  TRUE,
  'acknowledged',
  'On my way, be there in 10 minutes',
  NOW() - INTERVAL '5 days' + INTERVAL '2 minutes'
),
(
  'alert_dev002',
  'contact_dev001',
  'SM_dev_002',
  NOW() - INTERVAL '2 hours',
  TRUE,
  'acknowledged',
  'Calling now',
  NOW() - INTERVAL '100 minutes'
)
ON CONFLICT DO NOTHING;
