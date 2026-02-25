CREATE TABLE IF NOT EXISTS applications (
  id bigserial PRIMARY KEY,
  listing_id bigint NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'review', 'approved', 'rejected')),
  is_compatible boolean NOT NULL DEFAULT true,
  deal_type varchar(10) NOT NULL CHECK (deal_type IN ('rent', 'sale')),
  occupant_count int,
  has_children boolean,
  has_pets boolean,
  is_student boolean,
  stay_term_months int,
  needs_mortgage boolean,
  purchase_term text,
  comment text,
  created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_listing_id ON applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE TABLE IF NOT EXISTS application_messages (
  id bigserial PRIMARY KEY,
  application_id bigint NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_messages_application_id ON application_messages(application_id);
