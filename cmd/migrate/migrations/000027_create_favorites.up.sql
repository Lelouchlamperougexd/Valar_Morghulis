CREATE TABLE IF NOT EXISTS favorites (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id bigint NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
