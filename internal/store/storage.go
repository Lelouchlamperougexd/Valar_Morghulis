package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/sikozonpc/social/internal/crypto"
)

var (
	ErrNotFound          = errors.New("resource not found")
	ErrConflict          = errors.New("resource already exists")
	QueryTimeoutDuration = time.Second * 5
)

type Storage struct {
	Posts interface {
		GetByID(context.Context, int64) (*Post, error)
		Create(context.Context, *Post) error
		Delete(context.Context, int64) error
		Update(context.Context, *Post) error
		GetUserFeed(context.Context, int64, PaginatedFeedQuery) ([]PostWithMetadata, error)
	}
	Users interface {
		GetByID(context.Context, int64) (*User, error)
		GetByEmail(context.Context, string) (*User, error)
		Create(context.Context, *sql.Tx, *User) error
		CreateAndInvite(ctx context.Context, user *User, token string, exp time.Duration) error
		CreateCompanyAndUser(ctx context.Context, company *Company, user *User, token string, exp time.Duration) error
		Activate(context.Context, string) error
		Delete(context.Context, int64) error
	}
	Comments interface {
		Create(context.Context, *Comment) error
		GetByPostID(context.Context, int64) ([]Comment, error)
	}
	Followers interface {
		Follow(ctx context.Context, userID, followerID int64) error
		Unfollow(ctx context.Context, followerID, userID int64) error
	}
	LoginEvents interface {
		Create(ctx context.Context, event *LoginEvent) error
	}
	Roles interface {
		GetByName(context.Context, string) (*Role, error)
	}
	Companies interface {
		Create(context.Context, *sql.Tx, *Company) error
		GetByID(context.Context, int64) (*Company, error)
		GetByRegistrationNumber(context.Context, string) (*Company, error)
		UpdateVerificationStatus(context.Context, int64, string) error
		List(context.Context, PaginatedFeedQuery) ([]Company, error)
	}
}

func NewStorage(db *sql.DB, cryptor *crypto.Service) Storage {
	return Storage{
		Posts:       &PostStore{db},
		Users:       &UserStore{db: db, cryptor: cryptor},
		Comments:    &CommentStore{db},
		Followers:   &FollowerStore{db},
		LoginEvents: &LoginEventStore{db: db},
		Roles:       &RoleStore{db},
		Companies:   &CompanyStore{db: db, cryptor: cryptor},
	}
}

func withTx(db *sql.DB, ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}
