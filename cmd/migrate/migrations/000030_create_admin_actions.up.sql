CREATE TABLE IF NOT EXISTS admin_actions (
    id bigserial PRIMARY KEY,
    admin_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type varchar(50) NOT NULL,
    target_type varchar(50) NOT NULL,
    target_id bigint NOT NULL,
    details text NOT NULL,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);
