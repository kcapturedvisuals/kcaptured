-- Track the studio/client cancellation notification so status edits do not send duplicates.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_email_sent_at timestamptz;
