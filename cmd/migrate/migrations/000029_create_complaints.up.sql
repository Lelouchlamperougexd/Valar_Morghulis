CREATE TABLE IF NOT EXISTS complaints (
  id bigserial PRIMARY KEY,
  type varchar(50) NOT NULL CHECK (type IN ('incorrect_listing', 'rule_violation', 'fraud')),
  target_type varchar(20) NOT NULL CHECK (target_type IN ('listing', 'company')),
  target_id bigint NOT NULL,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
  created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_target ON complaints(target_type, target_id);
