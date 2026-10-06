-- Remove recipient addresses from historical email delivery audit entries.
UPDATE audit_logs
SET description = regexp_replace(
  description,
  $email$[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$email$,
  '[redacted email]',
  'gi'
)
WHERE entity_type = 'email'
  AND description ~* $email$[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$email$;
