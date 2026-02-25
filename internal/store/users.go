package store

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"strconv"
	"time"

	"github.com/sikozonpc/social/internal/crypto"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrDuplicateEmail    = errors.New("a user with that email already exists")
	ErrDuplicateUsername = errors.New("a user with that username already exists")
)

type User struct {
	ID        int64    `json:"id"`
	Username  string   `json:"username"`
	FirstName string   `json:"first_name"`
	LastName  string   `json:"last_name"`
	Country   string   `json:"country"`
	Email     string   `json:"email"`
	Phone     string   `json:"phone,omitempty"`
	PushOptIn bool     `json:"push_opt_in"`
	Password  password `json:"-"`
	CreatedAt string   `json:"created_at"`
	IsActive  bool     `json:"is_active"`
	RoleID    int64    `json:"role_id"`
	Role      Role     `json:"role"`
}

type password struct {
	text *string
	hash []byte
}

func (p *password) Set(text string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(text), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	p.text = &text
	p.hash = hash

	return nil
}

func (p *password) Compare(text string) error {
	return bcrypt.CompareHashAndPassword(p.hash, []byte(text))
}

type UserStore struct {
	db      *sql.DB
	cryptor *crypto.Service
}

func (s *UserStore) Create(ctx context.Context, tx *sql.Tx, user *User) error {
	if s.cryptor == nil {
		return errors.New("encryption service not configured")
	}

	encryptedEmail, err := s.cryptor.EncryptString(user.Email)
	if err != nil {
		return err
	}
	encryptedFirstName, err := s.cryptor.EncryptString(user.FirstName)
	if err != nil {
		return err
	}
	encryptedLastName, err := s.cryptor.EncryptString(user.LastName)
	if err != nil {
		return err
	}
	encryptedPhone, err := s.cryptor.EncryptString(user.Phone)
	if err != nil {
		return err
	}
	encryptedPushOptIn, err := s.cryptor.EncryptString(strconv.FormatBool(user.PushOptIn))
	if err != nil {
		return err
	}

	emailHash := crypto.HashEmail(user.Email)

	query := `
		INSERT INTO users (username, first_name, last_name, country, password, email, phone, push_opt_in, email_hash, role_id) VALUES
		($1, $2, $3, $4, $5, $6, $7, $8, $9, (SELECT id FROM roles WHERE name = $10))
    RETURNING id, created_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	role := user.Role.Name
	if role == "" {
		role = "user"
	}

	err = tx.QueryRowContext(
		ctx,
		query,
		user.Username,
		encryptedFirstName,
		encryptedLastName,
		user.Country,
		user.Password.hash,
		encryptedEmail,
		encryptedPhone,
		encryptedPushOptIn,
		emailHash,
		role,
	).Scan(
		&user.ID,
		&user.CreatedAt,
	)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "users_email_hash_key"`:
			return ErrDuplicateEmail
		case err.Error() == `pq: duplicate key value violates unique constraint "users_username_key"`:
			return ErrDuplicateUsername
		default:
			return err
		}
	}

	return nil
}

func (s *UserStore) GetByID(ctx context.Context, userID int64) (*User, error) {
	if s.cryptor == nil {
		return nil, errors.New("encryption service not configured")
	}

	query := `
		SELECT users.id, username, first_name, last_name, country, email, phone, push_opt_in, password, created_at, roles.*
		FROM users
		JOIN roles ON (users.role_id = roles.id)
		WHERE users.id = $1 AND is_active = true
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	user := &User{}
	var encryptedEmail, encryptedFirstName, encryptedLastName, encryptedPhone, encryptedPushOptIn string
	err := s.db.QueryRowContext(
		ctx,
		query,
		userID,
	).Scan(
		&user.ID,
		&user.Username,
		&encryptedFirstName,
		&encryptedLastName,
		&user.Country,
		&encryptedEmail,
		&encryptedPhone,
		&encryptedPushOptIn,
		&user.Password.hash,
		&user.CreatedAt,
		&user.Role.ID,
		&user.Role.Name,
		&user.Role.Level,
		&user.Role.Description,
	)
	if err != nil {
		switch err {
		case sql.ErrNoRows:
			return nil, ErrNotFound
		default:
			return nil, err
		}
	}

	user.Email = encryptedEmail
	user.FirstName = encryptedFirstName
	user.LastName = encryptedLastName
	user.Phone = encryptedPhone
	if err := s.decryptUser(user); err != nil {
		return nil, err
	}

	if err := s.decryptPushOptIn(user, encryptedPushOptIn); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserStore) CreateAndInvite(ctx context.Context, user *User, token string, invitationExp time.Duration) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		if err := s.Create(ctx, tx, user); err != nil {
			return err
		}

		if err := s.createUserInvitation(ctx, tx, token, invitationExp, user.ID); err != nil {
			return err
		}

		return nil
	})
}

func (s *UserStore) Activate(ctx context.Context, token string) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		// 1. find the user that this token belongs to
		user, err := s.getUserFromInvitation(ctx, tx, token)
		if err != nil {
			return err
		}

		// 2. update the user
		user.IsActive = true
		if err := s.update(ctx, tx, user); err != nil {
			return err
		}

		// 3. clean the invitations
		if err := s.deleteUserInvitations(ctx, tx, user.ID); err != nil {
			return err
		}

		return nil
	})
}

func (s *UserStore) getUserFromInvitation(ctx context.Context, tx *sql.Tx, token string) (*User, error) {
	query := `
		SELECT u.id, u.username, u.email, u.created_at, u.is_active
		FROM users u
		JOIN user_invitations ui ON u.id = ui.user_id
		WHERE ui.token = $1 AND ui.expiry > $2
	`

	hash := sha256.Sum256([]byte(token))
	hashToken := hex.EncodeToString(hash[:])

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	user := &User{}
	err := tx.QueryRowContext(ctx, query, hashToken, time.Now()).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.CreatedAt,
		&user.IsActive,
	)
	if err != nil {
		switch err {
		case sql.ErrNoRows:
			return nil, ErrNotFound
		default:
			return nil, err
		}
	}

	return user, nil
}

func (s *UserStore) createUserInvitation(ctx context.Context, tx *sql.Tx, token string, exp time.Duration, userID int64) error {
	query := `INSERT INTO user_invitations (token, user_id, expiry) VALUES ($1, $2, $3)`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	_, err := tx.ExecContext(ctx, query, token, userID, time.Now().Add(exp))
	if err != nil {
		return err
	}

	return nil
}

func (s *UserStore) update(ctx context.Context, tx *sql.Tx, user *User) error {
	query := `UPDATE users SET username = $1, email = $2, is_active = $3 WHERE id = $4`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	_, err := tx.ExecContext(ctx, query, user.Username, user.Email, user.IsActive, user.ID)
	if err != nil {
		return err
	}

	return nil
}

func (s *UserStore) deleteUserInvitations(ctx context.Context, tx *sql.Tx, userID int64) error {
	query := `DELETE FROM user_invitations WHERE user_id = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	_, err := tx.ExecContext(ctx, query, userID)
	if err != nil {
		return err
	}

	return nil
}

func (s *UserStore) Delete(ctx context.Context, userID int64) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		if err := s.delete(ctx, tx, userID); err != nil {
			return err
		}

		if err := s.deleteUserInvitations(ctx, tx, userID); err != nil {
			return err
		}

		return nil
	})
}

func (s *UserStore) delete(ctx context.Context, tx *sql.Tx, id int64) error {
	query := `DELETE FROM users WHERE id = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	_, err := tx.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	return nil
}

func (s *UserStore) GetByEmail(ctx context.Context, email string) (*User, error) {
	if s.cryptor == nil {
		return nil, errors.New("encryption service not configured")
	}

	emailHash := crypto.HashEmail(email)
	query := `
		SELECT id, username, email, first_name, last_name, country, phone, push_opt_in, password, created_at
		FROM users
		WHERE email_hash = $1 AND is_active = true
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	user := &User{}
	var encryptedEmail, encryptedFirstName, encryptedLastName, encryptedPhone, encryptedPushOptIn string
	err := s.db.QueryRowContext(ctx, query, emailHash).Scan(
		&user.ID,
		&user.Username,
		&encryptedEmail,
		&encryptedFirstName,
		&encryptedLastName,
		&user.Country,
		&encryptedPhone,
		&encryptedPushOptIn,
		&user.Password.hash,
		&user.CreatedAt,
	)
	if err != nil {
		switch err {
		case sql.ErrNoRows:
			return nil, ErrNotFound
		default:
			return nil, err
		}
	}

	user.Email = encryptedEmail
	user.FirstName = encryptedFirstName
	user.LastName = encryptedLastName
	user.Phone = encryptedPhone
	if err := s.decryptUser(user); err != nil {
		return nil, err
	}

	if err := s.decryptPushOptIn(user, encryptedPushOptIn); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserStore) decryptUser(user *User) error {
	if user == nil {
		return nil
	}

	var err error
	user.Email, err = s.cryptor.DecryptString(user.Email)
	if err != nil {
		return err
	}
	user.FirstName, err = s.cryptor.DecryptString(user.FirstName)
	if err != nil {
		return err
	}
	user.LastName, err = s.cryptor.DecryptString(user.LastName)
	if err != nil {
		return err
	}
	user.Phone, err = s.cryptor.DecryptString(user.Phone)
	if err != nil {
		return err
	}

	return nil
}

func (s *UserStore) decryptPushOptIn(user *User, encryptedValue string) error {
	decrypted, err := s.cryptor.DecryptString(encryptedValue)
	if err != nil {
		return err
	}
	if decrypted == "" {
		user.PushOptIn = false
		return nil
	}

	parsed, err := strconv.ParseBool(decrypted)
	if err != nil {
		return err
	}
	user.PushOptIn = parsed
	return nil
}
