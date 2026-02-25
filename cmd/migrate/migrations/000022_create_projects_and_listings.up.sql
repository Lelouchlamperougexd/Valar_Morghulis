CREATE TABLE IF NOT EXISTS projects (
  id bigserial PRIMARY KEY,
  company_id bigint NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text DEFAULT '',
  city varchar(100) NOT NULL,
  created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_city ON projects(city);

CREATE TABLE IF NOT EXISTS listings (
  id bigserial PRIMARY KEY,
  company_id bigint NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id bigint REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  property_type varchar(50) NOT NULL,
  deal_type varchar(10) NOT NULL CHECK (deal_type IN ('rent', 'sale')),
  status varchar(20) NOT NULL DEFAULT 'moderation' CHECK (status IN ('draft', 'moderation', 'active', 'rejected', 'archived')),
  price bigint NOT NULL,
  city varchar(100) NOT NULL,
  address text DEFAULT '',
  rooms smallint,
  area numeric(10,2),
  floor smallint,
  total_floors smallint,
  created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
  published_at timestamp(0) with time zone
);

CREATE INDEX IF NOT EXISTS idx_listings_company_id ON listings(company_id);
CREATE INDEX IF NOT EXISTS idx_listings_project_id ON listings(project_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_deal_type ON listings(deal_type);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);

CREATE TABLE IF NOT EXISTS listing_media (
  id bigserial PRIMARY KEY,
  listing_id bigint NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url text NOT NULL,
  position int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_listing_media_listing_id ON listing_media(listing_id);

CREATE TABLE IF NOT EXISTS listing_rent_constraints (
  listing_id bigint PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  allow_children boolean NOT NULL DEFAULT true,
  allow_pets boolean NOT NULL DEFAULT true,
  allow_students boolean NOT NULL DEFAULT true,
  max_occupants int NOT NULL DEFAULT 0,
  min_term_months int NOT NULL DEFAULT 0
);
