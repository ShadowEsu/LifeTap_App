-- ============================================================
-- Migration: 004_whatsapp_messages
-- Description: Store incoming WhatsApp messages with coord parsing
-- ============================================================

CREATE TABLE whatsapp_messages (
  id          BIGSERIAL    PRIMARY KEY,
  message_sid VARCHAR(100) NOT NULL UNIQUE,
  from_number VARCHAR(30)  NOT NULL,
  to_number   VARCHAR(30)  NOT NULL,
  body        TEXT         NOT NULL,
  lat         DOUBLE PRECISION NULL,
  lon         DOUBLE PRECISION NULL,
  has_coords  BOOLEAN      NOT NULL DEFAULT FALSE,
  received_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_messages_from     ON whatsapp_messages (from_number);
CREATE INDEX idx_whatsapp_messages_received ON whatsapp_messages (received_at DESC);
CREATE INDEX idx_whatsapp_messages_coords   ON whatsapp_messages (has_coords) WHERE has_coords = TRUE;
