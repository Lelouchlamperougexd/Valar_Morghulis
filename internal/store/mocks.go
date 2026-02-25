package store

import (
	"context"
	"database/sql"
	"time"
)

func NewMockStore() Storage {
	return Storage{
		Users:       &MockUserStore{},
		LoginEvents: &MockLoginEventStore{},
		Companies:   &MockCompanyStore{},
	}
}

type MockUserStore struct{}

func (m *MockUserStore) Create(ctx context.Context, tx *sql.Tx, u *User) error {
	return nil
}

func (m *MockUserStore) GetByID(ctx context.Context, userID int64) (*User, error) {
	return &User{ID: userID}, nil
}

func (m *MockUserStore) GetByEmail(context.Context, string) (*User, error) {
	return &User{}, nil
}

func (m *MockUserStore) CreateAndInvite(ctx context.Context, user *User, token string, exp time.Duration) error {
	return nil
}

func (m *MockUserStore) CreateCompanyAndUser(ctx context.Context, company *Company, user *User, token string, exp time.Duration) error {
	return nil
}

func (m *MockUserStore) Activate(ctx context.Context, t string) error {
	return nil
}

func (m *MockUserStore) Delete(ctx context.Context, id int64) error {
	return nil
}

type MockLoginEventStore struct{}

func (m *MockLoginEventStore) Create(ctx context.Context, event *LoginEvent) error {
	return nil
}

type MockCompanyStore struct{}

func (m *MockCompanyStore) Create(ctx context.Context, tx *sql.Tx, c *Company) error {
	return nil
}

func (m *MockCompanyStore) GetByID(ctx context.Context, id int64) (*Company, error) {
	return &Company{ID: id}, nil
}

func (m *MockCompanyStore) GetByRegistrationNumber(ctx context.Context, regNum string) (*Company, error) {
	return &Company{}, nil
}

func (m *MockCompanyStore) UpdateVerificationStatus(ctx context.Context, id int64, status string) error {
	return nil
}

func (m *MockCompanyStore) List(ctx context.Context, fq PaginatedFeedQuery) ([]Company, error) {
	return []Company{}, nil
}
