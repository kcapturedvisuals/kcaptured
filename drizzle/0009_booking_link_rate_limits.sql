-- Keep booking-link resend limits without storing raw email addresses.
CREATE TABLE IF NOT EXISTS booking_link_rate_limits (
  email_hash text PRIMARY KEY,
  request_count integer NOT NULL CHECK (request_count BETWEEN 1 AND 3),
  window_started_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS booking_link_rate_limits_window_started_at_idx
  ON booking_link_rate_limits (window_started_at);
