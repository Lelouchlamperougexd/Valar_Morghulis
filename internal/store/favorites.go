package store

import (
	"context"
	"database/sql"
)

type FavoriteListing struct {
	ListingID int64    `json:"listing_id"`
	Title     string   `json:"title"`
	City      string   `json:"city"`
	Price     int64    `json:"price"`
	Area      *float64 `json:"area,omitempty"`
	CoverURL  string   `json:"cover_url,omitempty"`
	CreatedAt string   `json:"created_at"`
}

type FavoriteStore struct {
	db *sql.DB
}

func (s *FavoriteStore) Add(ctx context.Context, userID, listingID int64) error {
	query := `INSERT INTO favorites (user_id, listing_id) VALUES ($1, $2)`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	_, err := s.db.ExecContext(ctx, query, userID, listingID)
	if err != nil {
		if err.Error() == `pq: duplicate key value violates unique constraint "favorites_pkey"` {
			return ErrConflict
		}
		return err
	}

	return nil
}

func (s *FavoriteStore) Remove(ctx context.Context, userID, listingID int64) error {
	query := `DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, userID, listingID)
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

func (s *FavoriteStore) ListByUser(ctx context.Context, userID int64) ([]FavoriteListing, error) {
	query := `
		SELECT l.id, l.title, l.city, l.price, l.area,
		       COALESCE((SELECT url FROM listing_media WHERE listing_id = l.id ORDER BY position ASC, id ASC LIMIT 1), '') AS cover_url,
		       f.created_at
		FROM favorites f
		JOIN listings l ON f.listing_id = l.id
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var favorites []FavoriteListing
	for rows.Next() {
		var f FavoriteListing
		var area sql.NullFloat64
		if err := rows.Scan(
			&f.ListingID,
			&f.Title,
			&f.City,
			&f.Price,
			&area,
			&f.CoverURL,
			&f.CreatedAt,
		); err != nil {
			return nil, err
		}
		if area.Valid {
			f.Area = &area.Float64
		}
		favorites = append(favorites, f)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return favorites, nil
}

func (s *FavoriteStore) Count(ctx context.Context, userID int64) (int, error) {
	query := `SELECT COUNT(*) FROM favorites WHERE user_id = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var count int
	err := s.db.QueryRowContext(ctx, query, userID).Scan(&count)
	return count, err
}
