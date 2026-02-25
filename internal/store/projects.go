package store

import (
	"context"
	"database/sql"
	"errors"
)

// Project groups listings for developers.
type Project struct {
	ID          int64  `json:"id"`
	CompanyID   int64  `json:"company_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	City        string `json:"city"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type ProjectStore struct {
	db *sql.DB
}

func (s *ProjectStore) Create(ctx context.Context, p *Project) error {
	if p == nil {
		return errors.New("project is nil")
	}

	query := `
        INSERT INTO projects (company_id, name, description, city)
        VALUES ($1,$2,$3,$4)
        RETURNING id, created_at, updated_at
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	return s.db.QueryRowContext(ctx, query, p.CompanyID, p.Name, p.Description, p.City).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (s *ProjectStore) ListByCompany(ctx context.Context, companyID int64) ([]Project, error) {
	query := `
        SELECT id, company_id, name, description, city, created_at, updated_at
        FROM projects
        WHERE company_id = $1
        ORDER BY created_at DESC
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.CompanyID, &p.Name, &p.Description, &p.City, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		res = append(res, p)
	}
	return res, rows.Err()
}

func (s *ProjectStore) GetByID(ctx context.Context, id int64) (*Project, error) {
	query := `
        SELECT id, company_id, name, description, city, created_at, updated_at
        FROM projects
        WHERE id = $1
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var p Project
	err := s.db.QueryRowContext(ctx, query, id).Scan(&p.ID, &p.CompanyID, &p.Name, &p.Description, &p.City, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &p, nil
}
