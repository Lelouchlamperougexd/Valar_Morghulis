ALTER TABLE applications
  ADD CONSTRAINT unique_application_per_user_listing
  UNIQUE (listing_id, user_id);
