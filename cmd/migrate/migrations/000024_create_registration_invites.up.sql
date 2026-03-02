CREATE TABLE IF NOT EXISTS registration_invites (
  id bigserial PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  company_type VARCHAR(20) NOT NULL CHECK (company_type IN ('agency', 'developer')),
  created_by bigint REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
