-- Booking self-service flow: manage links, lifecycle timestamps, payment instructions.
-- Safe to run more than once.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS manage_token text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;

UPDATE bookings
SET manage_token = replace(replace(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+', '-'), '/', '_')
WHERE manage_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_manage_token_key ON bookings (manage_token);
CREATE INDEX IF NOT EXISTS bookings_email_lower_idx ON bookings (lower(email));

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_instructions text;
