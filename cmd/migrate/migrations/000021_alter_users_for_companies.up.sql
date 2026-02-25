ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
