package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/crypto"
)

var (
	ErrDuplicateRegistrationNumber = errors.New("a company with that registration number already exists")
	ErrDuplicateCompanyEmail       = errors.New("a company with that email already exists")
)

type Company struct {
	ID                 int64  `json:"id"`
	Name               string `json:"name"`
	RegistrationNumber string `json:"registration_number"`
	City               string `json:"city"`
	Email              string `json:"email"`
	Phone              string `json:"phone"`
	Type               string `json:"type"`                // "agency" | "developer"
	VerificationStatus string `json:"verification_status"` // "pending" | "verified" | "rejected"
	CreatedAt          string `json:"created_at"`
	UpdatedAt          string `json:"updated_at"`
}

type CompanyStore struct {
	db      *sql.DB
	cryptor *crypto.Service
}

func (s *CompanyStore) Create(ctx context.Context, tx *sql.Tx, company *Company) error {
	if s.cryptor == nil {
		return errors.New("encryption service not configured")
	}

	encryptedEmail, err := s.cryptor.EncryptString(company.Email)
	if err != nil {
		return err
	}
	encryptedPhone, err := s.cryptor.EncryptString(company.Phone)
	if err != nil {
		return err
	}

	emailHash := crypto.HashEmail(company.Email)

	query := `
		INSERT INTO companies (name, registration_number, city, email, email_hash, phone, type)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, verification_status, created_at, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	err = tx.QueryRowContext(
		ctx,
		query,
		company.Name,
		company.RegistrationNumber,
		company.City,
		encryptedEmail,
		emailHash,
		encryptedPhone,
		company.Type,
	).Scan(
		&company.ID,
		&company.VerificationStatus,
		&company.CreatedAt,
		&company.UpdatedAt,
	)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "companies_registration_number_key"`:
			return ErrDuplicateRegistrationNumber
		case err.Error() == `pq: duplicate key value violates unique constraint "idx_companies_email_hash"`:
			return ErrDuplicateCompanyEmail
		default:
			return err
		}
	}

	return nil
}

func (s *CompanyStore) GetByID(ctx context.Context, id int64) (*Company, error) {
	if s.cryptor == nil {
		return nil, errors.New("encryption service not configured")
	}

	query := `
		SELECT id, name, registration_number, city, email, phone, type, verification_status, created_at, updated_at
		FROM companies
		WHERE id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	company := &Company{}
	var encryptedEmail, encryptedPhone string
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&company.ID,
		&company.Name,
		&company.RegistrationNumber,
		&company.City,
		&encryptedEmail,
		&encryptedPhone,
		&company.Type,
		&company.VerificationStatus,
		&company.CreatedAt,
		&company.UpdatedAt,
	)
	if err != nil {
		switch err {
		case sql.ErrNoRows:
			return nil, ErrNotFound
		default:
			return nil, err
		}
	}

	company.Email, err = s.cryptor.DecryptString(encryptedEmail)
	if err != nil {
		return nil, err
	}
	company.Phone, err = s.cryptor.DecryptString(encryptedPhone)
	if err != nil {
		return nil, err
	}

	return company, nil
}

func (s *CompanyStore) GetByRegistrationNumber(ctx context.Context, regNum string) (*Company, error) {
	if s.cryptor == nil {
		return nil, errors.New("encryption service not configured")
	}

	query := `
		SELECT id, name, registration_number, city, email, phone, type, verification_status, created_at, updated_at
		FROM companies
		WHERE registration_number = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	company := &Company{}
	var encryptedEmail, encryptedPhone string
	err := s.db.QueryRowContext(ctx, query, regNum).Scan(
		&company.ID,
		&company.Name,
		&company.RegistrationNumber,
		&company.City,
		&encryptedEmail,
		&encryptedPhone,
		&company.Type,
		&company.VerificationStatus,
		&company.CreatedAt,
		&company.UpdatedAt,
	)
	if err != nil {
		switch err {
		case sql.ErrNoRows:
			return nil, ErrNotFound
		default:
			return nil, err
		}
	}

	company.Email, err = s.cryptor.DecryptString(encryptedEmail)
	if err != nil {
		return nil, err
	}
	company.Phone, err = s.cryptor.DecryptString(encryptedPhone)
	if err != nil {
		return nil, err
	}

	return company, nil
}

func (s *CompanyStore) UpdateVerificationStatus(ctx context.Context, id int64, status string) error {
	query := `
		UPDATE companies
		SET verification_status = $1, updated_at = NOW()
		WHERE id = $2
	`

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

func (s *CompanyStore) List(ctx context.Context, fq PaginatedFeedQuery) ([]Company, error) {
	if s.cryptor == nil {
		return nil, errors.New("encryption service not configured")
	}

	var where []string
	var args []any

	if fq.Search != "" {
		where = append(where, fmt.Sprintf("verification_status = $%d", len(args)+1))
		args = append(args, fq.Search)
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	args = append(args, fq.Limit)
	args = append(args, fq.Offset)

	query := fmt.Sprintf(`
		SELECT id, name, registration_number, city, email, phone, type, verification_status, created_at, updated_at
		FROM companies
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, len(args)-1, len(args))

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var companies []Company
	for rows.Next() {
		var c Company
		var encryptedEmail, encryptedPhone string
		err := rows.Scan(
			&c.ID,
			&c.Name,
			&c.RegistrationNumber,
			&c.City,
			&encryptedEmail,
			&encryptedPhone,
			&c.Type,
			&c.VerificationStatus,
			&c.CreatedAt,
			&c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		c.Email, err = s.cryptor.DecryptString(encryptedEmail)
		if err != nil {
			return nil, err
		}
		c.Phone, err = s.cryptor.DecryptString(encryptedPhone)
		if err != nil {
			return nil, err
		}

		companies = append(companies, c)
	}

	return companies, nil
}

