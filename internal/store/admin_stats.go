package store

import (
	"context"
	"database/sql"
)

type DashboardStats struct {
	TotalUsers     int `json:"total_users"`
	TotalCompanies int `json:"total_companies"`
	TotalListings  int `json:"total_listings"`
	OnModeration   int `json:"on_moderation"`
}

type ActivityChartData struct {
	Date         string `json:"date"`
	NewUsers     int    `json:"new_users"`
	NewCompanies int    `json:"new_companies"`
	NewListings  int    `json:"new_listings"`
}

type AdminStatsStore struct {
	db *sql.DB
}

func (s *AdminStatsStore) GetOverview(ctx context.Context) (*DashboardStats, error) {
	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	var stats DashboardStats

	queries := []struct {
		dest  *int
		query string
	}{
		{&stats.TotalUsers, "SELECT COUNT(*) FROM users"},
		{&stats.TotalCompanies, "SELECT COUNT(*) FROM companies"},
		{&stats.TotalListings, "SELECT COUNT(*) FROM listings"},
		{&stats.OnModeration, "SELECT COUNT(*) FROM listings WHERE status = 'moderation'"},
	}

	for _, q := range queries {
		if err := s.db.QueryRowContext(ctx, q.query).Scan(q.dest); err != nil {
			return nil, err
		}
	}

	return &stats, nil
}

func (s *AdminStatsStore) GetActivityChart(ctx context.Context, days int) ([]ActivityChartData, error) {
	if days <= 0 {
		days = 7
	}

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	query := `
		WITH dates AS (
			SELECT generate_series(
				date_trunc('day', CURRENT_DATE - ($1 || ' days')::interval),
				date_trunc('day', CURRENT_DATE),
				'1 day'::interval
			) AS d
		)
		SELECT 
			to_char(d.d, 'YYYY-MM-DD') AS date,
			COUNT(DISTINCT u.id) AS new_users,
			COUNT(DISTINCT c.id) AS new_companies,
			COUNT(DISTINCT l.id) AS new_listings
		FROM dates d
		LEFT JOIN users u ON date_trunc('day', u.created_at) = d.d
		LEFT JOIN companies c ON date_trunc('day', c.created_at) = d.d
		LEFT JOIN listings l ON date_trunc('day', l.created_at) = d.d
		GROUP BY d.d
		ORDER BY d.d ASC
	`

	rows, err := s.db.QueryContext(ctx, query, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var data []ActivityChartData
	for rows.Next() {
		var item ActivityChartData
		if err := rows.Scan(&item.Date, &item.NewUsers, &item.NewCompanies, &item.NewListings); err != nil {
			return nil, err
		}
		data = append(data, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return data, nil
}
