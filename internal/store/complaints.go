package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type Complaint struct {
	ID          int64  `json:"id"`
	Type        string `json:"type"`         // "incorrect_listing", "rule_violation", "fraud"
	TargetType  string `json:"target_type"`  // "listing" | "company"
	TargetID    int64  `json:"target_id"`
	TargetName  string `json:"target_name"`  // joined from listings.title or companies.name
	UserID      int64  `json:"user_id"`
	AuthorName  string `json:"author_name"`  // joined from users.username
	Description string `json:"description"`
	Status      string `json:"status"`       // "new", "in_progress", "closed"
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type ComplaintFilter struct {
	Status string
	Limit  int
	Offset int
}

func (f *ComplaintFilter) normalize() {
	if f.Limit == 0 {
		f.Limit = 20
	}
	if f.Limit > 50 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
}

type ComplaintStore struct {
	db *sql.DB
}

func (s *ComplaintStore) Create(ctx context.Context, c *Complaint) error {
	if c == nil {
		return errors.New("complaint is nil")
	}

	query := `
		INSERT INTO complaints (type, target_type, target_id, user_id, description)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, status, created_at, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	return s.db.QueryRowContext(ctx, query,
		c.Type, c.TargetType, c.TargetID, c.UserID, c.Description,
	).Scan(&c.ID, &c.Status, &c.CreatedAt, &c.UpdatedAt)
}

func (s *ComplaintStore) GetByID(ctx context.Context, id int64) (*Complaint, error) {
	query := `
		SELECT 
			c.id, c.type, c.target_type, c.target_id, c.user_id, c.description, c.status, c.created_at, c.updated_at,
			COALESCE(u.username, '') AS author_name,
			CASE 
				WHEN c.target_type = 'listing' THEN COALESCE(l.title, '')
				WHEN c.target_type = 'company' THEN COALESCE(co.name, '')
				ELSE ''
			END AS target_name
		FROM complaints c
		LEFT JOIN users u ON c.user_id = u.id
		LEFT JOIN listings l ON c.target_type = 'listing' AND c.target_id = l.id
		LEFT JOIN companies co ON c.target_type = 'company' AND c.target_id = co.id
		WHERE c.id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var comp Complaint
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&comp.ID, &comp.Type, &comp.TargetType, &comp.TargetID,
		&comp.UserID, &comp.Description, &comp.Status,
		&comp.CreatedAt, &comp.UpdatedAt,
		&comp.AuthorName, &comp.TargetName,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &comp, nil
}

func (s *ComplaintStore) List(ctx context.Context, filter ComplaintFilter) ([]Complaint, error) {
	filter.normalize()

	var where []string
	var args []any

	if filter.Status != "" {
		where = append(where, fmt.Sprintf("c.status = $%d", len(args)+1))
		args = append(args, filter.Status)
	}

	if len(where) == 0 {
		where = append(where, "1=1")
	}

	args = append(args, filter.Limit)
	args = append(args, filter.Offset)

	query := fmt.Sprintf(`
		SELECT 
			c.id, c.type, c.target_type, c.target_id, c.user_id, c.description, c.status, c.created_at, c.updated_at,
			COALESCE(u.username, '') AS author_name,
			CASE 
				WHEN c.target_type = 'listing' THEN COALESCE(l.title, '')
				WHEN c.target_type = 'company' THEN COALESCE(co.name, '')
				ELSE ''
			END AS target_name
		FROM complaints c
		LEFT JOIN users u ON c.user_id = u.id
		LEFT JOIN listings l ON c.target_type = 'listing' AND c.target_id = l.id
		LEFT JOIN companies co ON c.target_type = 'company' AND c.target_id = co.id
		WHERE %s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d
	`, strings.Join(where, " AND "), len(args)-1, len(args))

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var complaints []Complaint
	for rows.Next() {
		var comp Complaint
		if err := rows.Scan(
			&comp.ID, &comp.Type, &comp.TargetType, &comp.TargetID,
			&comp.UserID, &comp.Description, &comp.Status,
			&comp.CreatedAt, &comp.UpdatedAt,
			&comp.AuthorName, &comp.TargetName,
		); err != nil {
			return nil, err
		}
		complaints = append(complaints, comp)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return complaints, nil
}

func (s *ComplaintStore) UpdateStatus(ctx context.Context, id int64, status string) error {
	query := `UPDATE complaints SET status = $1, updated_at = NOW() WHERE id = $2`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}
