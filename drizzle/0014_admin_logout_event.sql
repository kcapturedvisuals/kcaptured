ALTER TABLE admin_login_events
  DROP CONSTRAINT IF EXISTS admin_login_events_outcome_check;

ALTER TABLE admin_login_events
  ADD CONSTRAINT admin_login_events_outcome_check
  CHECK (outcome IN ('viewed', 'success', 'failed', 'locked', 'invalid', 'logout'));
