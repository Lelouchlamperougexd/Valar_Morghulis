CREATE TABLE IF NOT EXISTS companies (
  id bigserial PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(50) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL,
  email TEXT NOT NULL,
  email_hash TEXT,
  phone TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('agency', 'developer')),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);
CREATE INDEX IF NOT EXISTS idx_companies_verification_status ON companies(verification_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_email_hash ON companies(email_hash);
