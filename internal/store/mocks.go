package store

import (
	"context"
	"database/sql"
	"time"
)

func NewMockStore() Storage {
	return Storage{
		Users:        &MockUserStore{},
		LoginEvents:  &MockLoginEventStore{},
		Companies:    &MockCompanyStore{},
		Roles:        &MockRoleStore{},
		Projects:     &MockProjectStore{},
		Listings:     &MockListingStore{},
		Applications: &MockApplicationStore{},
		Messages:     &MockMessageStore{},
		Favorites:    &MockFavoriteStore{},
		Dashboard:    &MockDashboardStore{},
		Invites:      &MockInviteStore{},
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

func (m *MockUserStore) UpdateProfile(ctx context.Context, userID int64, firstName, lastName, phone string) error {
	return nil
}

func (m *MockUserStore) UpdatePassword(ctx context.Context, userID int64, hashedPassword []byte) error {
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
	return &Company{ID: id, VerificationStatus: VerificationVerified}, nil
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

type MockRoleStore struct{}

func (m *MockRoleStore) GetByName(ctx context.Context, name string) (*Role, error) {
	return &Role{Name: name}, nil
}

type MockProjectStore struct{}

func (m *MockProjectStore) Create(ctx context.Context, project *Project) error {
	return nil
}

func (m *MockProjectStore) ListByCompany(ctx context.Context, companyID int64) ([]Project, error) {
	return []Project{}, nil
}

func (m *MockProjectStore) GetByID(ctx context.Context, id int64) (*Project, error) {
	return &Project{ID: id}, nil
}

type MockListingStore struct{}

func (m *MockListingStore) Create(ctx context.Context, listing *Listing, media []ListingMedia, rent *RentConstraints) error {
	return nil
}

func (m *MockListingStore) UpdateStatus(ctx context.Context, id int64, status string) error {
	return nil
}

func (m *MockListingStore) GetByID(ctx context.Context, id int64) (*Listing, error) {
	return &Listing{ID: id}, nil
}

func (m *MockListingStore) List(ctx context.Context, filter ListingFilter) ([]Listing, error) {
	return []Listing{}, nil
}

type MockApplicationStore struct{}

func (m *MockApplicationStore) Create(ctx context.Context, app *Application) error {
	return nil
}

func (m *MockApplicationStore) UpdateStatus(ctx context.Context, id int64, status string) error {
	return nil
}

func (m *MockApplicationStore) GetByID(ctx context.Context, id int64) (*Application, error) {
	return &Application{ID: id}, nil
}

func (m *MockApplicationStore) List(ctx context.Context, filter ApplicationFilter) ([]Application, error) {
	return []Application{}, nil
}

func (m *MockApplicationStore) GetByListingAndUser(ctx context.Context, listingID, userID int64) (*Application, error) {
	return nil, ErrNotFound
}

type MockMessageStore struct{}

func (m *MockMessageStore) Create(ctx context.Context, msg *ApplicationMessage) error {
	return nil
}

func (m *MockMessageStore) List(ctx context.Context, applicationID int64, limit, offset int) ([]ApplicationMessage, error) {
	return []ApplicationMessage{}, nil
}

type MockInviteStore struct{}

func (m *MockInviteStore) Create(ctx context.Context, invite *RegistrationInvite) error {
	return nil
}

func (m *MockInviteStore) GetByToken(ctx context.Context, token string) (*RegistrationInvite, error) {
	return nil, ErrInviteNotFound
}

func (m *MockInviteStore) MarkUsed(ctx context.Context, id int64) error {
	return nil
}

type MockFavoriteStore struct{}

func (m *MockFavoriteStore) Add(ctx context.Context, userID, listingID int64) error {
	return nil
}

func (m *MockFavoriteStore) Remove(ctx context.Context, userID, listingID int64) error {
	return nil
}

func (m *MockFavoriteStore) ListByUser(ctx context.Context, userID int64) ([]FavoriteListing, error) {
	return []FavoriteListing{}, nil
}

func (m *MockFavoriteStore) Count(ctx context.Context, userID int64) (int, error) {
	return 0, nil
}

type MockDashboardStore struct{}

func (m *MockDashboardStore) GetOverview(ctx context.Context, userID int64) (*DashboardOverview, error) {
	return &DashboardOverview{
		RecentListings:     []FavoriteListing{},
		RecentApplications: []ApplicationSummary{},
	}, nil
}

func (m *MockDashboardStore) ListChats(ctx context.Context, userID int64) ([]ChatSummary, error) {
	return []ChatSummary{}, nil
}
