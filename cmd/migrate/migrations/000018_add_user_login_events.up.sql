CREATE TABLE IF NOT EXISTS user_login_events (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users (id) ON DELETE SET NULL,
  email_hash text,
  ip text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  success boolean NOT NULL DEFAULT false,
  created_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_login_events_user_id_idx ON user_login_events(user_id);
CREATE INDEX IF NOT EXISTS user_login_events_email_hash_idx ON user_login_events(email_hash);
