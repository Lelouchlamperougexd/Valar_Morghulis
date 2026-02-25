package store

import (
	"context"
	"database/sql"
)

// ApplicationMessage represents a chat message within an application.
type ApplicationMessage struct {
	ID            int64  `json:"id"`
	ApplicationID int64  `json:"application_id"`
	SenderUserID  *int64 `json:"sender_user_id,omitempty"`
	Body          string `json:"body"`
	CreatedAt     string `json:"created_at"`
}

type MessageStore struct {
	db *sql.DB
}

func (s *MessageStore) Create(ctx context.Context, msg *ApplicationMessage) error {
	query := `
        INSERT INTO application_messages (application_id, sender_user_id, body)
        VALUES ($1, $2, $3)
        RETURNING id, created_at
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var sender sql.NullInt64
	if msg.SenderUserID != nil {
		sender.Valid = true
		sender.Int64 = *msg.SenderUserID
	}

	return s.db.QueryRowContext(ctx, query, msg.ApplicationID, sender, msg.Body).Scan(&msg.ID, &msg.CreatedAt)
}

func (s *MessageStore) List(ctx context.Context, applicationID int64, limit, offset int) ([]ApplicationMessage, error) {
	if limit == 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	query := `
        SELECT id, application_id, sender_user_id, body, created_at
        FROM application_messages
        WHERE application_id = $1
        ORDER BY created_at ASC, id ASC
        LIMIT $2 OFFSET $3
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, applicationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []ApplicationMessage
	for rows.Next() {
		var m ApplicationMessage
		var sender sql.NullInt64
		if err := rows.Scan(&m.ID, &m.ApplicationID, &sender, &m.Body, &m.CreatedAt); err != nil {
			return nil, err
		}
		if sender.Valid {
			m.SenderUserID = &sender.Int64
		}
		messages = append(messages, m)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return messages, nil
}
