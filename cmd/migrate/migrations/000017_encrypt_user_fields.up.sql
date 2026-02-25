CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_hash TEXT;

ALTER TABLE users
  ALTER COLUMN email TYPE text,
  ALTER COLUMN first_name TYPE text,
  ALTER COLUMN last_name TYPE text,
  ALTER COLUMN phone TYPE text,
  ALTER COLUMN push_opt_in TYPE text;

ALTER TABLE users
  ALTER COLUMN push_opt_in SET DEFAULT '';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_hash_key ON users(email_hash);

UPDATE users
SET email_hash = encode(digest(lower(email), 'sha256'), 'hex')
WHERE email_hash IS NULL
  AND email IS NOT NULL
  AND email <> ''
  AND email NOT LIKE 'enc:%';
