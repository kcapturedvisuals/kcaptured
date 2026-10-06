CREATE TABLE IF NOT EXISTS admin_password_resets (
  token_hash text PRIMARY KEY,
  admin_user_id text NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by_admin_id text REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_password_resets_user_created_idx
  ON admin_password_resets (admin_user_id, created_at DESC);
