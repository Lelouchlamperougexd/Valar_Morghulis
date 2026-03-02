package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/sikozonpc/social/internal/crypto"
)

var ApplicationStatuses = map[string]struct{}{
	"new": {}, "review": {}, "approved": {}, "rejected": {},
}

// Application represents a user submission for a listing.
type Application struct {
	ID             int64   `json:"id"`
	ListingID      int64   `json:"listing_id"`
	UserID         int64   `json:"user_id"`
	FullName       string  `json:"full_name"`
	Phone          string  `json:"phone"`
	Email          string  `json:"email"`
	Status         string  `json:"status"`
	IsCompatible   bool    `json:"is_compatible"`
	DealType       string  `json:"deal_type"`
	OccupantCount  *int    `json:"occupant_count,omitempty"`
	HasChildren    *bool   `json:"has_children,omitempty"`
	HasPets        *bool   `json:"has_pets,omitempty"`
	IsStudent      *bool   `json:"is_student,omitempty"`
	StayTermMonths *int    `json:"stay_term_months,omitempty"`
	NeedsMortgage  *bool   `json:"needs_mortgage,omitempty"`
	PurchaseTerm   *string `json:"purchase_term,omitempty"`
	Comment        *string `json:"comment,omitempty"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
}

type ApplicationFilter struct {
	Limit     int
	Offset    int
	Status    string
	CompanyID *int64
	UserID    *int64
}

func (f *ApplicationFilter) normalize() error {
	if f.Limit == 0 {
		f.Limit = 20
	}
	if f.Limit > 50 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	if f.Status != "" {
		if _, ok := ApplicationStatuses[f.Status]; !ok {
			return ErrInvalidFilter
		}
	}
	return nil
}

// ApplicationStore manages applications.
type ApplicationStore struct {
	db      *sql.DB
	cryptor *crypto.Service
}

func (s *ApplicationStore) Create(ctx context.Context, a *Application) error {
	if a == nil {
		return errors.New("application is nil")
	}
	if _, ok := ListingDealTypes[a.DealType]; !ok {
		return ErrInvalidDealType
	}

	emailForDB := a.Email
	if s.cryptor != nil {
		encrypted, err := s.cryptor.EncryptString(a.Email)
		if err != nil {
			return err
		}
		emailForDB = encrypted
	}

	query := `
        INSERT INTO applications (
            listing_id, user_id, full_name, phone, email, status, is_compatible, deal_type, occupant_count, has_children, has_pets, is_student, stay_term_months, needs_mortgage, purchase_term, comment
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id, created_at, updated_at
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var occupantCount sql.NullInt32
	if a.OccupantCount != nil {
		occupantCount.Valid = true
		occupantCount.Int32 = int32(*a.OccupantCount)
	}
	var hasChildren, hasPets, isStudent sql.NullBool
	if a.HasChildren != nil {
		hasChildren.Valid = true
		hasChildren.Bool = *a.HasChildren
	}
	if a.HasPets != nil {
		hasPets.Valid = true
		hasPets.Bool = *a.HasPets
	}
	if a.IsStudent != nil {
		isStudent.Valid = true
		isStudent.Bool = *a.IsStudent
	}
	var stayTerm sql.NullInt32
	if a.StayTermMonths != nil {
		stayTerm.Valid = true
		stayTerm.Int32 = int32(*a.StayTermMonths)
	}
	var needsMortgage sql.NullBool
	if a.NeedsMortgage != nil {
		needsMortgage.Valid = true
		needsMortgage.Bool = *a.NeedsMortgage
	}
	var purchaseTerm sql.NullString
	if a.PurchaseTerm != nil {
		purchaseTerm.Valid = true
		purchaseTerm.String = *a.PurchaseTerm
	}
	var comment sql.NullString
	if a.Comment != nil {
		comment.Valid = true
		comment.String = *a.Comment
	}

	err := s.db.QueryRowContext(ctx, query,
		a.ListingID,
		a.UserID,
		a.FullName,
		a.Phone,
		emailForDB,
		a.Status,
		a.IsCompatible,
		a.DealType,
		occupantCount,
		hasChildren,
		hasPets,
		isStudent,
		stayTerm,
		needsMortgage,
		purchaseTerm,
		comment,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
	return err
}

func (s *ApplicationStore) UpdateStatus(ctx context.Context, id int64, status string) error {
	if _, ok := ApplicationStatuses[status]; !ok {
		return ErrInvalidStatus
	}

	query := `UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	res, err := s.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *ApplicationStore) GetByID(ctx context.Context, id int64) (*Application, error) {
	query := `
        SELECT id, listing_id, user_id, full_name, phone, email, status, is_compatible, deal_type, occupant_count, has_children, has_pets, is_student, stay_term_months, needs_mortgage, purchase_term, comment, created_at, updated_at
        FROM applications WHERE id = $1
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var a Application
	var occupantCount sql.NullInt32
	var hasChildren, hasPets, isStudent sql.NullBool
	var stayTerm sql.NullInt32
	var needsMortgage sql.NullBool
	var purchaseTerm sql.NullString
	var comment sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&a.ID,
		&a.ListingID,
		&a.UserID,
		&a.FullName,
		&a.Phone,
		&a.Email,
		&a.Status,
		&a.IsCompatible,
		&a.DealType,
		&occupantCount,
		&hasChildren,
		&hasPets,
		&isStudent,
		&stayTerm,
		&needsMortgage,
		&purchaseTerm,
		&comment,
		&a.CreatedAt,
		&a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if occupantCount.Valid {
		v := int(occupantCount.Int32)
		a.OccupantCount = &v
	}
	if hasChildren.Valid {
		v := hasChildren.Bool
		a.HasChildren = &v
	}
	if hasPets.Valid {
		v := hasPets.Bool
		a.HasPets = &v
	}
	if isStudent.Valid {
		v := isStudent.Bool
		a.IsStudent = &v
	}
	if stayTerm.Valid {
		v := int(stayTerm.Int32)
		a.StayTermMonths = &v
	}
	if needsMortgage.Valid {
		v := needsMortgage.Bool
		a.NeedsMortgage = &v
	}
	if purchaseTerm.Valid {
		v := purchaseTerm.String
		a.PurchaseTerm = &v
	}
	if comment.Valid {
		v := comment.String
		a.Comment = &v
	}

	if s.cryptor != nil {
		decrypted, err := s.cryptor.DecryptString(a.Email)
		if err != nil {
			return nil, err
		}
		a.Email = decrypted
	}

	return &a, nil
}

func (s *ApplicationStore) List(ctx context.Context, f ApplicationFilter) ([]Application, error) {
	if err := f.normalize(); err != nil {
		return nil, err
	}

	var where []string
	var args []any

	if f.Status != "" {
		where = append(where, fmt.Sprintf("a.status = $%d", len(args)+1))
		args = append(args, f.Status)
	}
	if f.UserID != nil {
		where = append(where, fmt.Sprintf("a.user_id = $%d", len(args)+1))
		args = append(args, *f.UserID)
	}
	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("l.company_id = $%d", len(args)+1))
		args = append(args, *f.CompanyID)
	}

	if len(where) == 0 {
		where = append(where, "1=1")
	}

	args = append(args, f.Limit)
	args = append(args, f.Offset)

	query := fmt.Sprintf(`
        SELECT a.id, a.listing_id, a.user_id, a.full_name, a.phone, a.email, a.status, a.is_compatible, a.deal_type,
               a.occupant_count, a.has_children, a.has_pets, a.is_student, a.stay_term_months, a.needs_mortgage, a.purchase_term, a.comment,
               a.created_at, a.updated_at
        FROM applications a
        JOIN listings l ON a.listing_id = l.id
        WHERE %s
        ORDER BY a.created_at DESC
        LIMIT $%d OFFSET $%d
    `, strings.Join(where, " AND "), len(args)-1, len(args))

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []Application
	for rows.Next() {
		var a Application
		var occupantCount sql.NullInt32
		var hasChildren, hasPets, isStudent sql.NullBool
		var stayTerm sql.NullInt32
		var needsMortgage sql.NullBool
		var purchaseTerm sql.NullString
		var comment sql.NullString

		if err := rows.Scan(
			&a.ID,
			&a.ListingID,
			&a.UserID,
			&a.FullName,
			&a.Phone,
			&a.Email,
			&a.Status,
			&a.IsCompatible,
			&a.DealType,
			&occupantCount,
			&hasChildren,
			&hasPets,
			&isStudent,
			&stayTerm,
			&needsMortgage,
			&purchaseTerm,
			&comment,
			&a.CreatedAt,
			&a.UpdatedAt,
		); err != nil {
			return nil, err
		}

		if occupantCount.Valid {
			v := int(occupantCount.Int32)
			a.OccupantCount = &v
		}
		if hasChildren.Valid {
			v := hasChildren.Bool
			a.HasChildren = &v
		}
		if hasPets.Valid {
			v := hasPets.Bool
			a.HasPets = &v
		}
		if isStudent.Valid {
			v := isStudent.Bool
			a.IsStudent = &v
		}
		if stayTerm.Valid {
			v := int(stayTerm.Int32)
			a.StayTermMonths = &v
		}
		if needsMortgage.Valid {
			v := needsMortgage.Bool
			a.NeedsMortgage = &v
		}
		if purchaseTerm.Valid {
			v := purchaseTerm.String
			a.PurchaseTerm = &v
		}
		if comment.Valid {
			v := comment.String
			a.Comment = &v
		}

		if s.cryptor != nil {
			decrypted, err := s.cryptor.DecryptString(a.Email)
			if err != nil {
				return nil, err
			}
			a.Email = decrypted
		}

		apps = append(apps, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return apps, nil
}

func (s *ApplicationStore) GetByListingAndUser(ctx context.Context, listingID, userID int64) (*Application, error) {
	query := `
		SELECT id, listing_id, user_id, full_name, phone, email, status, is_compatible, deal_type,
		       occupant_count, has_children, has_pets, is_student, stay_term_months, needs_mortgage, purchase_term, comment,
		       created_at, updated_at
		FROM applications
		WHERE listing_id = $1 AND user_id = $2
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var a Application
	var occupantCount sql.NullInt32
	var hasChildren, hasPets, isStudent sql.NullBool
	var stayTerm sql.NullInt32
	var needsMortgage sql.NullBool
	var purchaseTerm sql.NullString
	var comment sql.NullString

	err := s.db.QueryRowContext(ctx, query, listingID, userID).Scan(
		&a.ID,
		&a.ListingID,
		&a.UserID,
		&a.FullName,
		&a.Phone,
		&a.Email,
		&a.Status,
		&a.IsCompatible,
		&a.DealType,
		&occupantCount,
		&hasChildren,
		&hasPets,
		&isStudent,
		&stayTerm,
		&needsMortgage,
		&purchaseTerm,
		&comment,
		&a.CreatedAt,
		&a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if occupantCount.Valid {
		v := int(occupantCount.Int32)
		a.OccupantCount = &v
	}
	if hasChildren.Valid {
		v := hasChildren.Bool
		a.HasChildren = &v
	}
	if hasPets.Valid {
		v := hasPets.Bool
		a.HasPets = &v
	}
	if isStudent.Valid {
		v := isStudent.Bool
		a.IsStudent = &v
	}
	if stayTerm.Valid {
		v := int(stayTerm.Int32)
		a.StayTermMonths = &v
	}
	if needsMortgage.Valid {
		v := needsMortgage.Bool
		a.NeedsMortgage = &v
	}
	if purchaseTerm.Valid {
		v := purchaseTerm.String
		a.PurchaseTerm = &v
	}
	if comment.Valid {
		v := comment.String
		a.Comment = &v
	}

	if s.cryptor != nil {
		decrypted, err := s.cryptor.DecryptString(a.Email)
		if err != nil {
			return nil, err
		}
		a.Email = decrypted
	}

	return &a, nil
}
