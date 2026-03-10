package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

var (
	ErrInvalidStatus   = errors.New("invalid status")
	ErrInvalidDealType = errors.New("invalid deal type")
	ErrInvalidFilter   = errors.New("invalid filter")
)

var (
	ListingStatuses = map[string]struct{}{
		"draft": {}, "moderation": {}, "active": {}, "rejected": {}, "archived": {},
	}
	ListingDealTypes = map[string]struct{}{
		"rent": {}, "sale": {},
	}
)

// Listing represents a real-estate listing.
type Listing struct {
	ID              int64            `json:"id"`
	CompanyID       int64            `json:"company_id"`
	CompanyName     string           `json:"company_name,omitempty"`
	ProjectID       *int64           `json:"project_id,omitempty"`
	Title           string           `json:"title"`
	Description     string           `json:"description"`
	PropertyType    string           `json:"property_type"`
	DealType        string           `json:"deal_type"`
	Status          string           `json:"status"`
	Price           int64            `json:"price"`
	City            string           `json:"city"`
	Address         string           `json:"address"`
	Rooms           *int             `json:"rooms,omitempty"`
	Area            *float64         `json:"area,omitempty"`
	Floor           *int             `json:"floor,omitempty"`
	TotalFloors     *int             `json:"total_floors,omitempty"`
	Latitude        *float64         `json:"latitude,omitempty"`
	Longitude       *float64         `json:"longitude,omitempty"`
	Media           []ListingMedia   `json:"media,omitempty"`
	RentConstraints *RentConstraints `json:"rent_constraints,omitempty"`
	CreatedAt       string           `json:"created_at"`
	UpdatedAt       string           `json:"updated_at"`
	PublishedAt     *string          `json:"published_at,omitempty"`
}

type ListingMedia struct {
	ID        int64  `json:"id"`
	ListingID int64  `json:"listing_id"`
	URL       string `json:"url"`
	Position  int    `json:"position"`
}

type RentConstraints struct {
	ListingID     int64 `json:"listing_id"`
	AllowChildren bool  `json:"allow_children"`
	AllowPets     bool  `json:"allow_pets"`
	AllowStudents bool  `json:"allow_students"`
	MaxOccupants  int   `json:"max_occupants"`
	MinTermMonths int   `json:"min_term_months"`
}

type ListingFilter struct {
	Limit        int
	Offset       int
	Status       string
	DealType     string
	City         string
	PropertyType string
	PriceMin     int64
	PriceMax     int64
	RoomsMin     int
	RoomsMax     int
	AreaMin      float64
	AreaMax      float64
	CompanyID    *int64
}

func (f *ListingFilter) normalize() error {
	if f.Limit == 0 {
		f.Limit = 20
	}
	if f.Limit > 50 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	if f.Status == "" {
		f.Status = "active"
	}
	if _, ok := ListingStatuses[f.Status]; !ok {
		return ErrInvalidFilter
	}
	if f.DealType != "" {
		if _, ok := ListingDealTypes[f.DealType]; !ok {
			return ErrInvalidFilter
		}
	}
	if f.PriceMin < 0 || f.PriceMax < 0 {
		return ErrInvalidFilter
	}
	if f.PriceMax > 0 && f.PriceMin > f.PriceMax {
		return ErrInvalidFilter
	}
	if f.RoomsMin < 0 || f.RoomsMax < 0 {
		return ErrInvalidFilter
	}
	if f.RoomsMax > 0 && f.RoomsMin > f.RoomsMax {
		return ErrInvalidFilter
	}
	if f.AreaMin < 0 || f.AreaMax < 0 {
		return ErrInvalidFilter
	}
	if f.AreaMax > 0 && f.AreaMin > f.AreaMax {
		return ErrInvalidFilter
	}
	return nil
}

// ListingStore provides CRUD operations for listings.
type ListingStore struct {
	db *sql.DB
}

func (s *ListingStore) Create(ctx context.Context, listing *Listing, media []ListingMedia, rent *RentConstraints) error {
	if listing == nil {
		return errors.New("listing is nil")
	}
	if _, ok := ListingDealTypes[listing.DealType]; !ok {
		return ErrInvalidDealType
	}
	if _, ok := ListingStatuses[listing.Status]; !ok {
		return ErrInvalidStatus
	}

	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		insert := `
            INSERT INTO listings (
                company_id, project_id, title, description, property_type, deal_type, status, price, city, address, rooms, area, floor, total_floors, latitude, longitude
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
            RETURNING id, created_at, updated_at, published_at
        `

		var projectID sql.NullInt64
		if listing.ProjectID != nil {
			projectID.Valid = true
			projectID.Int64 = *listing.ProjectID
		}

		var rooms sql.NullInt32
		if listing.Rooms != nil {
			rooms.Valid = true
			rooms.Int32 = int32(*listing.Rooms)
		}
		var area sql.NullFloat64
		if listing.Area != nil {
			area.Valid = true
			area.Float64 = *listing.Area
		}
		var floor sql.NullInt32
		if listing.Floor != nil {
			floor.Valid = true
			floor.Int32 = int32(*listing.Floor)
		}
		var totalFloors sql.NullInt32
		if listing.TotalFloors != nil {
			totalFloors.Valid = true
			totalFloors.Int32 = int32(*listing.TotalFloors)
		}

		var latitude sql.NullFloat64
		if listing.Latitude != nil {
			latitude.Valid = true
			latitude.Float64 = *listing.Latitude
		}
		var longitude sql.NullFloat64
		if listing.Longitude != nil {
			longitude.Valid = true
			longitude.Float64 = *listing.Longitude
		}

		ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
		defer cancel()

		err := tx.QueryRowContext(ctx, insert,
			listing.CompanyID,
			projectID,
			listing.Title,
			listing.Description,
			listing.PropertyType,
			listing.DealType,
			listing.Status,
			listing.Price,
			listing.City,
			listing.Address,
			rooms,
			area,
			floor,
			totalFloors,
			latitude,
			longitude,
		).Scan(&listing.ID, &listing.CreatedAt, &listing.UpdatedAt, &listing.PublishedAt)
		if err != nil {
			return err
		}

		for _, m := range media {
			m.ListingID = listing.ID
			if err := s.insertMedia(ctx, tx, &m); err != nil {
				return err
			}
			listing.Media = append(listing.Media, m)
		}

		if listing.DealType == "rent" && rent != nil {
			rent.ListingID = listing.ID
			if err := s.insertRentConstraints(ctx, tx, rent); err != nil {
				return err
			}
			listing.RentConstraints = rent
		}

		return nil
	})
}

func (s *ListingStore) insertMedia(ctx context.Context, tx *sql.Tx, media *ListingMedia) error {
	query := `INSERT INTO listing_media (listing_id, url, position) VALUES ($1,$2,$3) RETURNING id`
	return tx.QueryRowContext(ctx, query, media.ListingID, media.URL, media.Position).Scan(&media.ID)
}

func (s *ListingStore) insertRentConstraints(ctx context.Context, tx *sql.Tx, rent *RentConstraints) error {
	query := `
        INSERT INTO listing_rent_constraints (listing_id, allow_children, allow_pets, allow_students, max_occupants, min_term_months)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (listing_id) DO UPDATE SET
          allow_children = EXCLUDED.allow_children,
          allow_pets = EXCLUDED.allow_pets,
          allow_students = EXCLUDED.allow_students,
          max_occupants = EXCLUDED.max_occupants,
          min_term_months = EXCLUDED.min_term_months
    `
	_, err := tx.ExecContext(ctx, query, rent.ListingID, rent.AllowChildren, rent.AllowPets, rent.AllowStudents, rent.MaxOccupants, rent.MinTermMonths)
	return err
}

func (s *ListingStore) UpdateStatus(ctx context.Context, id int64, status string) error {
	if _, ok := ListingStatuses[status]; !ok {
		return ErrInvalidStatus
	}

	query := `UPDATE listings SET status = $1, updated_at = NOW(), published_at = CASE WHEN $1 = 'active' THEN NOW() ELSE published_at END WHERE id = $2`
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

func (s *ListingStore) GetByID(ctx context.Context, id int64) (*Listing, error) {
	query := `
        SELECT id, company_id, project_id, title, description, property_type, deal_type, status, price, city, address, rooms, area, floor, total_floors, latitude, longitude, created_at, updated_at, published_at
        FROM listings WHERE id = $1
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var l Listing
	var projectID sql.NullInt64
	var rooms sql.NullInt32
	var area sql.NullFloat64
	var floor sql.NullInt32
	var totalFloors sql.NullInt32
	var latitude sql.NullFloat64
	var longitude sql.NullFloat64
	var publishedAt sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&l.ID,
		&l.CompanyID,
		&projectID,
		&l.Title,
		&l.Description,
		&l.PropertyType,
		&l.DealType,
		&l.Status,
		&l.Price,
		&l.City,
		&l.Address,
		&rooms,
		&area,
		&floor,
		&totalFloors,
		&latitude,
		&longitude,
		&l.CreatedAt,
		&l.UpdatedAt,
		&publishedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if projectID.Valid {
		l.ProjectID = &projectID.Int64
	}
	if rooms.Valid {
		v := int(rooms.Int32)
		l.Rooms = &v
	}
	if area.Valid {
		v := area.Float64
		l.Area = &v
	}
	if floor.Valid {
		v := int(floor.Int32)
		l.Floor = &v
	}
	if totalFloors.Valid {
		v := int(totalFloors.Int32)
		l.TotalFloors = &v
	}
	if latitude.Valid {
		v := latitude.Float64
		l.Latitude = &v
	}
	if longitude.Valid {
		v := longitude.Float64
		l.Longitude = &v
	}
	if publishedAt.Valid {
		v := publishedAt.String
		l.PublishedAt = &v
	}

	if rent, err := s.getRentConstraints(ctx, l.ID); err == nil && rent != nil {
		l.RentConstraints = rent
	}
	l.Media, _ = s.getMedia(ctx, l.ID)

	return &l, nil
}

func (s *ListingStore) getMedia(ctx context.Context, listingID int64) ([]ListingMedia, error) {
	query := `SELECT id, listing_id, url, position FROM listing_media WHERE listing_id = $1 ORDER BY position ASC, id ASC`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, listingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var media []ListingMedia
	for rows.Next() {
		var m ListingMedia
		if err := rows.Scan(&m.ID, &m.ListingID, &m.URL, &m.Position); err != nil {
			return nil, err
		}
		media = append(media, m)
	}
	return media, rows.Err()
}

func (s *ListingStore) getRentConstraints(ctx context.Context, listingID int64) (*RentConstraints, error) {
	query := `
        SELECT listing_id, allow_children, allow_pets, allow_students, max_occupants, min_term_months
        FROM listing_rent_constraints WHERE listing_id = $1
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var r RentConstraints
	err := s.db.QueryRowContext(ctx, query, listingID).Scan(
		&r.ListingID, &r.AllowChildren, &r.AllowPets, &r.AllowStudents, &r.MaxOccupants, &r.MinTermMonths,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &r, nil
}

func (s *ListingStore) List(ctx context.Context, filter ListingFilter) ([]Listing, error) {
	if err := filter.normalize(); err != nil {
		return nil, err
	}

	var where []string
	var args []any

	where = append(where, "l.status = $1")
	args = append(args, filter.Status)

	if filter.DealType != "" {
		args = append(args, filter.DealType)
		where = append(where, fmt.Sprintf("l.deal_type = $%d", len(args)))
	}
	if filter.City != "" {
		args = append(args, filter.City)
		where = append(where, fmt.Sprintf("l.city = $%d", len(args)))
	}
	if filter.PropertyType != "" {
		args = append(args, filter.PropertyType)
		where = append(where, fmt.Sprintf("l.property_type = $%d", len(args)))
	}
	if filter.PriceMin > 0 {
		args = append(args, filter.PriceMin)
		where = append(where, fmt.Sprintf("l.price >= $%d", len(args)))
	}
	if filter.PriceMax > 0 {
		args = append(args, filter.PriceMax)
		where = append(where, fmt.Sprintf("l.price <= $%d", len(args)))
	}
	if filter.RoomsMin > 0 {
		args = append(args, filter.RoomsMin)
		where = append(where, fmt.Sprintf("l.rooms >= $%d", len(args)))
	}
	if filter.RoomsMax > 0 {
		args = append(args, filter.RoomsMax)
		where = append(where, fmt.Sprintf("l.rooms <= $%d", len(args)))
	}
	if filter.AreaMin > 0 {
		args = append(args, filter.AreaMin)
		where = append(where, fmt.Sprintf("l.area >= $%d", len(args)))
	}
	if filter.AreaMax > 0 {
		args = append(args, filter.AreaMax)
		where = append(where, fmt.Sprintf("l.area <= $%d", len(args)))
	}
	if filter.CompanyID != nil {
		args = append(args, *filter.CompanyID)
		where = append(where, fmt.Sprintf("l.company_id = $%d", len(args)))
	}

	clause := strings.Join(where, " AND ")
	args = append(args, filter.Limit)
	args = append(args, filter.Offset)

	query := fmt.Sprintf(`
        SELECT l.id, l.company_id, COALESCE(c.name, '') AS company_name, l.project_id, l.title, l.description, l.property_type, l.deal_type, l.status, l.price, l.city, l.address, l.rooms, l.area, l.floor, l.total_floors, l.latitude, l.longitude, l.created_at, l.updated_at, l.published_at
        FROM listings l
        LEFT JOIN companies c ON l.company_id = c.id
        WHERE %s
        ORDER BY l.created_at DESC
        LIMIT $%d OFFSET $%d
    `, clause, len(args)-1, len(args))

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var listings []Listing
	for rows.Next() {
		var l Listing
		var projectID sql.NullInt64
		var rooms sql.NullInt32
		var area sql.NullFloat64
		var floor sql.NullInt32
		var totalFloors sql.NullInt32
		var latitude sql.NullFloat64
		var longitude sql.NullFloat64
		var publishedAt sql.NullString

		if err := rows.Scan(
			&l.ID,
			&l.CompanyID,
			&l.CompanyName,
			&projectID,
			&l.Title,
			&l.Description,
			&l.PropertyType,
			&l.DealType,
			&l.Status,
			&l.Price,
			&l.City,
			&l.Address,
			&rooms,
			&area,
			&floor,
			&totalFloors,
			&latitude,
			&longitude,
			&l.CreatedAt,
			&l.UpdatedAt,
			&publishedAt,
		); err != nil {
			return nil, err
		}

		if projectID.Valid {
			l.ProjectID = &projectID.Int64
		}
		if rooms.Valid {
			v := int(rooms.Int32)
			l.Rooms = &v
		}
		if area.Valid {
			v := area.Float64
			l.Area = &v
		}
		if floor.Valid {
			v := int(floor.Int32)
			l.Floor = &v
		}
		if totalFloors.Valid {
			v := int(totalFloors.Int32)
			l.TotalFloors = &v
		}
		if latitude.Valid {
			v := latitude.Float64
			l.Latitude = &v
		}
		if longitude.Valid {
			v := longitude.Float64
			l.Longitude = &v
		}
		if publishedAt.Valid {
			v := publishedAt.String
			l.PublishedAt = &v
		}

		listings = append(listings, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Load media and rent constraints in batch
	if err := s.attachMediaAndRent(ctx, listings); err != nil {
		return nil, err
	}

	return listings, nil
}

func (s *ListingStore) attachMediaAndRent(ctx context.Context, listings []Listing) error {
	if len(listings) == 0 {
		return nil
	}
	ids := make([]int64, 0, len(listings))
	for _, l := range listings {
		ids = append(ids, l.ID)
	}

	mediaMap, err := s.fetchMediaMap(ctx, ids)
	if err != nil {
		return err
	}
	rentMap, err := s.fetchRentMap(ctx, ids)
	if err != nil {
		return err
	}

	for i := range listings {
		if media, ok := mediaMap[listings[i].ID]; ok {
			listings[i].Media = media
		}
		if rent, ok := rentMap[listings[i].ID]; ok {
			listings[i].RentConstraints = rent
		}
	}
	return nil
}

func (s *ListingStore) fetchMediaMap(ctx context.Context, ids []int64) (map[int64][]ListingMedia, error) {
	placeholders := make([]string, len(ids))
	args := make([]any, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
        SELECT id, listing_id, url, position
        FROM listing_media
        WHERE listing_id IN (%s)
        ORDER BY listing_id, position ASC, id ASC
    `, strings.Join(placeholders, ","))

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int64][]ListingMedia)
	for rows.Next() {
		var m ListingMedia
		if err := rows.Scan(&m.ID, &m.ListingID, &m.URL, &m.Position); err != nil {
			return nil, err
		}
		result[m.ListingID] = append(result[m.ListingID], m)
	}
	return result, rows.Err()
}

func (s *ListingStore) fetchRentMap(ctx context.Context, ids []int64) (map[int64]*RentConstraints, error) {
	placeholders := make([]string, len(ids))
	args := make([]any, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
        SELECT listing_id, allow_children, allow_pets, allow_students, max_occupants, min_term_months
        FROM listing_rent_constraints
        WHERE listing_id IN (%s)
    `, strings.Join(placeholders, ","))

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int64]*RentConstraints)
	for rows.Next() {
		var r RentConstraints
		if err := rows.Scan(&r.ListingID, &r.AllowChildren, &r.AllowPets, &r.AllowStudents, &r.MaxOccupants, &r.MinTermMonths); err != nil {
			return nil, err
		}
		rCopy := r
		result[r.ListingID] = &rCopy
	}
	return result, rows.Err()
}
