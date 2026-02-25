package store

import (
	"context"
	"database/sql"
)

type LoginEvent struct {
	ID        int64  `json:"id"`
	UserID    *int64 `json:"user_id"`
	EmailHash string `json:"email_hash"`
	IP        string `json:"ip"`
	UserAgent string `json:"user_agent"`
	Success   bool   `json:"success"`
	CreatedAt string `json:"created_at"`
}

type LoginEventStore struct {
	db *sql.DB
}

func (s *LoginEventStore) Create(ctx context.Context, event *LoginEvent) error {
	query := `
		INSERT INTO user_login_events (user_id, email_hash, ip, user_agent, success)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	return s.db.QueryRowContext(
		ctx,
		query,
		event.UserID,
		event.EmailHash,
		event.IP,
		event.UserAgent,
		event.Success,
	).Scan(
		&event.ID,
		&event.CreatedAt,
	)
}
