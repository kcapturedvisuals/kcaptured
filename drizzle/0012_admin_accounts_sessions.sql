CREATE TABLE IF NOT EXISTS admin_users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin')),
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  failed_login_attempts integer NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  session_hash text PRIMARY KEY,
  admin_user_id text NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_sessions_user_expiry_idx
  ON admin_sessions (admin_user_id, expires_at);

CREATE TABLE IF NOT EXISTS admin_login_events (
  id text PRIMARY KEY,
  admin_user_id text REFERENCES admin_users(id) ON DELETE SET NULL,
  username text,
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'login', 'logout')),
  outcome text NOT NULL CHECK (outcome IN ('viewed', 'success', 'failed', 'locked', 'invalid', 'logout')),
  ip_address text,
  country_code text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_login_events_created_at_idx
  ON admin_login_events (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_login_events_ip_created_at_idx
  ON admin_login_events (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_login_events_username_created_at_idx
  ON admin_login_events (username, created_at DESC);
