package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var (
	ErrInviteNotFound    = errors.New("invite not found")
	ErrInviteExpired     = errors.New("Ссылка истекла")
	ErrInviteAlreadyUsed = errors.New("Ссылка уже использована")
)

type RegistrationInvite struct {
	ID          int64      `json:"id"`
	Token       string     `json:"token"`
	CompanyType string     `json:"company_type"`
	CreatedBy   int64      `json:"created_by"`
	ExpiresAt   time.Time  `json:"expires_at"`
	UsedAt      *time.Time `json:"used_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type InviteStore struct {
	db *sql.DB
}

func (s *InviteStore) Create(ctx context.Context, invite *RegistrationInvite) error {
	query := `
		INSERT INTO registration_invites (token, company_type, created_by, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	err := s.db.QueryRowContext(
		ctx,
		query,
		invite.Token,
		invite.CompanyType,
		invite.CreatedBy,
		invite.ExpiresAt,
	).Scan(
		&invite.ID,
		&invite.CreatedAt,
	)
	if err != nil {
		return err
	}

	return nil
}

func (s *InviteStore) GetByToken(ctx context.Context, token string) (*RegistrationInvite, error) {
	query := `
		SELECT id, token, company_type, created_by, expires_at, used_at, created_at
		FROM registration_invites
		WHERE token = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	invite := &RegistrationInvite{}
	err := s.db.QueryRowContext(ctx, query, token).Scan(
		&invite.ID,
		&invite.Token,
		&invite.CompanyType,
		&invite.CreatedBy,
		&invite.ExpiresAt,
		&invite.UsedAt,
		&invite.CreatedAt,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrInviteNotFound
		default:
			return nil, err
		}
	}

	return invite, nil
}

func (s *InviteStore) MarkUsed(ctx context.Context, id int64) error {
	query := `
		UPDATE registration_invites
		SET used_at = NOW()
		WHERE id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	_, err := s.db.ExecContext(ctx, query, id)
	return err
}
