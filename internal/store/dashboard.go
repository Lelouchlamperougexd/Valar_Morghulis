package store

import (
	"context"
	"database/sql"
)

type ApplicationSummary struct {
	ID           int64  `json:"id"`
	ListingTitle string `json:"listing_title"`
	CompanyName  string `json:"company_name"`
	Status       string `json:"status"`
	UpdatedAt    string `json:"updated_at"`
}

type ChatSummary struct {
	ApplicationID int64  `json:"application_id"`
	ListingTitle  string `json:"listing_title"`
	CompanyName   string `json:"company_name"`
	LastMessage   string `json:"last_message"`
	LastMessageAt string `json:"last_message_at"`
	IsUnread      bool   `json:"is_unread"`
}

type DashboardOverview struct {
	FavoritesCount          int                  `json:"favorites_count"`
	ActiveApplicationsCount int                  `json:"active_applications_count"`
	UnreadMessagesCount     int                  `json:"unread_messages_count"`
	RecentListings          []FavoriteListing    `json:"recent_listings"`
	RecentApplications      []ApplicationSummary `json:"recent_applications"`
}

type DashboardStore struct {
	db *sql.DB
}

func (s *DashboardStore) GetOverview(ctx context.Context, userID int64) (*DashboardOverview, error) {
	overview := &DashboardOverview{}

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	// 1. Favorites count
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM favorites WHERE user_id = $1`, userID,
	).Scan(&overview.FavoritesCount)
	if err != nil {
		return nil, err
	}

	// 2. Active applications count (status IN ('new', 'review'))
	err = s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM applications WHERE user_id = $1 AND status IN ('new', 'review')`, userID,
	).Scan(&overview.ActiveApplicationsCount)
	if err != nil {
		return nil, err
	}

	// 3. Unread messages count
	err = s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM application_messages am
		JOIN applications a ON am.application_id = a.id
		WHERE a.user_id = $1
		  AND am.sender_user_id IS DISTINCT FROM $1
		  AND am.is_read = false
	`, userID).Scan(&overview.UnreadMessagesCount)
	if err != nil {
		return nil, err
	}

	// 4. Recent listings (last 5 favorites)
	recentListingsRows, err := s.db.QueryContext(ctx, `
		SELECT l.id, l.title, l.city, l.price, l.area,
		       COALESCE((SELECT url FROM listing_media WHERE listing_id = l.id ORDER BY position ASC, id ASC LIMIT 1), '') AS cover_url,
		       f.created_at
		FROM favorites f
		JOIN listings l ON f.listing_id = l.id
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC
		LIMIT 5
	`, userID)
	if err != nil {
		return nil, err
	}
	defer recentListingsRows.Close()

	overview.RecentListings = []FavoriteListing{}
	for recentListingsRows.Next() {
		var fl FavoriteListing
		var area sql.NullFloat64
		if err := recentListingsRows.Scan(
			&fl.ListingID, &fl.Title, &fl.City, &fl.Price, &area, &fl.CoverURL, &fl.CreatedAt,
		); err != nil {
			return nil, err
		}
		if area.Valid {
			fl.Area = &area.Float64
		}
		overview.RecentListings = append(overview.RecentListings, fl)
	}
	if err := recentListingsRows.Err(); err != nil {
		return nil, err
	}

	// 5. Recent applications (last 3 with listing title + company name)
	recentAppsRows, err := s.db.QueryContext(ctx, `
		SELECT a.id, l.title, c.name, a.status, a.updated_at
		FROM applications a
		JOIN listings l ON a.listing_id = l.id
		JOIN companies c ON l.company_id = c.id
		WHERE a.user_id = $1
		ORDER BY a.updated_at DESC
		LIMIT 3
	`, userID)
	if err != nil {
		return nil, err
	}
	defer recentAppsRows.Close()

	overview.RecentApplications = []ApplicationSummary{}
	for recentAppsRows.Next() {
		var as ApplicationSummary
		if err := recentAppsRows.Scan(
			&as.ID, &as.ListingTitle, &as.CompanyName, &as.Status, &as.UpdatedAt,
		); err != nil {
			return nil, err
		}
		overview.RecentApplications = append(overview.RecentApplications, as)
	}
	if err := recentAppsRows.Err(); err != nil {
		return nil, err
	}

	return overview, nil
}

func (s *DashboardStore) ListChats(ctx context.Context, userID int64) ([]ChatSummary, error) {
	query := `
		SELECT
			a.id AS application_id,
			l.title AS listing_title,
			c.name AS company_name,
			latest_msg.body AS last_message,
			latest_msg.created_at AS last_message_at,
			EXISTS (
				SELECT 1 FROM application_messages um
				WHERE um.application_id = a.id
				  AND um.sender_user_id IS DISTINCT FROM $1
				  AND um.is_read = false
			) AS is_unread
		FROM applications a
		JOIN listings l ON a.listing_id = l.id
		JOIN companies c ON l.company_id = c.id
		JOIN LATERAL (
			SELECT body, created_at
			FROM application_messages
			WHERE application_id = a.id
			ORDER BY created_at DESC, id DESC
			LIMIT 1
		) latest_msg ON true
		WHERE a.user_id = $1
		ORDER BY latest_msg.created_at DESC
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []ChatSummary
	for rows.Next() {
		var cs ChatSummary
		if err := rows.Scan(
			&cs.ApplicationID,
			&cs.ListingTitle,
			&cs.CompanyName,
			&cs.LastMessage,
			&cs.LastMessageAt,
			&cs.IsUnread,
		); err != nil {
			return nil, err
		}
		chats = append(chats, cs)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return chats, nil
}
