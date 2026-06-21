-- ============================================================
-- Migration: 002_add_geospatial_functions
-- Description: PostGIS utility functions for proximity queries
-- ============================================================

-- Function: Find alerts within a radius (km) of a point
CREATE OR REPLACE FUNCTION alerts_within_radius(
  p_user_id   VARCHAR(50),
  p_lat       DOUBLE PRECISION,
  p_lon       DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION
)
RETURNS TABLE (
  alert_id          VARCHAR(50),
  "timestamp"       TIMESTAMPTZ,
  status            alert_status,
  risk_level        risk_level,
  lat               DOUBLE PRECISION,
  lon               DOUBLE PRECISION,
  distance_km       DOUBLE PRECISION
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    a.alert_id,
    a.timestamp,
    a.status,
    a.risk_level,
    ST_Y(a.location::geometry) AS lat,
    ST_X(a.location::geometry) AS lon,
    ST_Distance(
      a.location,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
    ) / 1000.0 AS distance_km
  FROM alerts a
  WHERE
    a.user_id = p_user_id
    AND ST_DWithin(
      a.location,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
      p_radius_km * 1000  -- convert km to meters
    )
  ORDER BY a.timestamp DESC;
$$;

COMMENT ON FUNCTION alerts_within_radius IS
  'Returns alerts for a user within the specified radius in kilometers';

-- Function: Get the most recent alert location for a user
CREATE OR REPLACE FUNCTION get_last_known_location(p_user_id VARCHAR(50))
RETURNS TABLE (lat DOUBLE PRECISION, lon DOUBLE PRECISION, recorded_at TIMESTAMPTZ)
LANGUAGE SQL STABLE
AS $$
  SELECT
    ST_Y(location::geometry) AS lat,
    ST_X(location::geometry) AS lon,
    timestamp AS recorded_at
  FROM alerts
  WHERE user_id = p_user_id
    AND location_status IN ('real-time', 'cached')
  ORDER BY timestamp DESC
  LIMIT 1;
$$;

-- View: Active device overview for dashboard
CREATE OR REPLACE VIEW v_device_status AS
SELECT
  hd.device_id,
  hd.user_id,
  hd.device_name,
  hd.device_type,
  hd.location,
  hd.status,
  hd.last_heartbeat_at,
  EXTRACT(EPOCH FROM (NOW() - hd.last_heartbeat_at)) AS seconds_since_heartbeat,
  COUNT(a.alert_id) FILTER (WHERE a.status NOT IN ('closed')) AS active_alerts
FROM hardware_devices hd
LEFT JOIN alerts a ON a.device_id = hd.device_id
GROUP BY
  hd.device_id, hd.user_id, hd.device_name, hd.device_type,
  hd.location, hd.status, hd.last_heartbeat_at;

COMMENT ON VIEW v_device_status IS 'Real-time device status with active alert counts';

-- View: Alert summary for history table
CREATE OR REPLACE VIEW v_alert_summary AS
SELECT
  a.alert_id,
  a.user_id,
  a.device_id,
  a.device_name,
  a.status,
  a.timestamp,
  ST_Y(a.location::geometry) AS lat,
  ST_X(a.location::geometry) AS lon,
  a.address,
  a.risk_level,
  a.risk_score,
  COUNT(acn.id) AS total_contacts_notified,
  COUNT(acn.id) FILTER (WHERE acn.response_status != 'pending') AS total_responses,
  a.created_at,
  a.updated_at
FROM alerts a
LEFT JOIN alert_contact_notifications acn ON acn.alert_id = a.alert_id
GROUP BY
  a.alert_id, a.user_id, a.device_id, a.device_name, a.status,
  a.timestamp, a.location, a.address, a.risk_level, a.risk_score,
  a.created_at, a.updated_at;

COMMENT ON VIEW v_alert_summary IS 'Alert summary with contact notification counts';
