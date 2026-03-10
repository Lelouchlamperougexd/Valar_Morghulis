package store

import (
	"context"
	"database/sql"
)

type AdminAction struct {
	ID         int64  `json:"id"`
	AdminID    int64  `json:"admin_id"`
	AdminName  string `json:"admin_name"` // Joined from users
	AdminRole  string `json:"admin_role"` // Joined from roles
	ActionType string `json:"action_type"`
	TargetType string `json:"target_type"`
	TargetID   int64  `json:"target_id"`
	Details    string `json:"details"`
	CreatedAt  string `json:"created_at"`
}

type AdminActionStore struct {
	db *sql.DB
}

func (s *AdminActionStore) Create(ctx context.Context, action *AdminAction) error {
	query := `
		INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	return s.db.QueryRowContext(ctx, query,
		action.AdminID, action.ActionType, action.TargetType, action.TargetID, action.Details,
	).Scan(&action.ID, &action.CreatedAt)
}

func (s *AdminActionStore) List(ctx context.Context, fq PaginatedQuery) ([]AdminAction, error) {
	if fq.Limit <= 0 {
		fq.Limit = 20
	}
	if fq.Offset < 0 {
		fq.Offset = 0
	}

	query := `
		SELECT 
			a.id, a.admin_id, a.action_type, a.target_type, a.target_id, a.details, a.created_at,
			COALESCE(u.first_name || ' ' || u.last_name, u.username) AS admin_name,
			COALESCE(r.name, '') AS admin_role
		FROM admin_actions a
		JOIN users u ON a.admin_id = u.id
		JOIN roles r ON u.role_id = r.id
		ORDER BY a.created_at DESC
		LIMIT $1 OFFSET $2
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, fq.Limit, fq.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var actions []AdminAction
	for rows.Next() {
		var a AdminAction
		if err := rows.Scan(
			&a.ID, &a.AdminID, &a.ActionType, &a.TargetType, &a.TargetID, &a.Details, &a.CreatedAt,
			&a.AdminName, &a.AdminRole,
		); err != nil {
			return nil, err
		}
		actions = append(actions, a)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return actions, nil
}
