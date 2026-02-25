-- Add new roles for B2B (agency and developer)
INSERT INTO roles (name, description, level)
VALUES ('agency', 'Real estate agency representative', 1)
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description, level)
VALUES ('developer', 'Property developer representative', 1)
ON CONFLICT (name) DO NOTHING;
