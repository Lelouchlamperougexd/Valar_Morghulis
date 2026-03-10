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
	Users interface {
		GetByID(context.Context, int64) (*User, error)
		GetByEmail(context.Context, string) (*User, error)
		Create(context.Context, *sql.Tx, *User) error
		CreateAndInvite(ctx context.Context, user *User, token string, exp time.Duration) error
		CreateCompanyAndUser(ctx context.Context, company *Company, user *User, token string, exp time.Duration) error
		Activate(context.Context, string) error
		Delete(context.Context, int64) error
		UpdateProfile(ctx context.Context, userID int64, firstName, lastName, phone string) error
		UpdatePassword(ctx context.Context, userID int64, hashedPassword []byte) error
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
	Projects interface {
		Create(ctx context.Context, project *Project) error
		ListByCompany(ctx context.Context, companyID int64) ([]Project, error)
		GetByID(ctx context.Context, id int64) (*Project, error)
	}
	Listings interface {
		Create(ctx context.Context, listing *Listing, media []ListingMedia, rent *RentConstraints) error
		UpdateStatus(ctx context.Context, id int64, status string) error
		GetByID(ctx context.Context, id int64) (*Listing, error)
		List(ctx context.Context, filter ListingFilter) ([]Listing, error)
	}
	Applications interface {
		Create(ctx context.Context, app *Application) error
		UpdateStatus(ctx context.Context, id int64, status string) error
		GetByID(ctx context.Context, id int64) (*Application, error)
		List(ctx context.Context, filter ApplicationFilter) ([]Application, error)
		GetByListingAndUser(ctx context.Context, listingID, userID int64) (*Application, error)
	}
	Messages interface {
		Create(ctx context.Context, msg *ApplicationMessage) error
		List(ctx context.Context, applicationID int64, limit, offset int) ([]ApplicationMessage, error)
	}
	Favorites interface {
		Add(ctx context.Context, userID, listingID int64) error
		Remove(ctx context.Context, userID, listingID int64) error
		ListByUser(ctx context.Context, userID int64) ([]FavoriteListing, error)
		Count(ctx context.Context, userID int64) (int, error)
	}
	Dashboard interface {
		GetOverview(ctx context.Context, userID int64) (*DashboardOverview, error)
		ListChats(ctx context.Context, userID int64) ([]ChatSummary, error)
	}
	Invites interface {
		Create(ctx context.Context, invite *RegistrationInvite) error
		GetByToken(ctx context.Context, token string) (*RegistrationInvite, error)
		MarkUsed(ctx context.Context, id int64) error
	}
}

func NewStorage(db *sql.DB, cryptor *crypto.Service) Storage {
	return Storage{
		Users:        &UserStore{db: db, cryptor: cryptor},
		LoginEvents:  &LoginEventStore{db: db},
		Roles:        &RoleStore{db},
		Companies:    &CompanyStore{db: db, cryptor: cryptor},
		Projects:     &ProjectStore{db: db},
		Listings:     &ListingStore{db: db},
		Applications: &ApplicationStore{db: db, cryptor: cryptor},
		Messages:     &MessageStore{db: db},
		Favorites:    &FavoriteStore{db: db},
		Dashboard:    &DashboardStore{db: db},
		Invites:      &InviteStore{db: db},
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
