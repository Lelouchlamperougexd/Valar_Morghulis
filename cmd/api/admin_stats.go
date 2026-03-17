package main

import (
	"net/http"
	"strconv"

	_ "github.com/Lelouchlamperougexd/Valar_Morghulis/internal/store"
)

// adminStatsOverviewHandler godoc
//
//	@Summary		Get platform stats overview
//	@Description	Returns total counts for users, companies, listings, and items on moderation
//	@Tags			admin
//	@Produce		json
//	@Success		200	{object}	store.DashboardStats
//	@Failure		401	{object}	error
//	@Failure		403	{object}	error
//	@Failure		500	{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/stats/overview [get]
func (app *application) adminStatsOverviewHandler(w http.ResponseWriter, r *http.Request) {
	stats, err := app.store.AdminStats.GetOverview(r.Context())
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, stats); err != nil {
		app.internalServerError(w, r, err)
	}
}

// adminStatsActivityHandler godoc
//
//	@Summary		Get platform activity chart data
//	@Description	Returns daily counts of new users, companies, and listings for a given time period
//	@Tags			admin
//	@Produce		json
//	@Param			days	query		int	false	"Number of days to look back (default 7)"
//	@Success		200		{array}		store.ActivityChartData
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		403		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/stats/activity [get]
func (app *application) adminStatsActivityHandler(w http.ResponseWriter, r *http.Request) {
	days := 7
	if v := r.URL.Query().Get("days"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			days = parsed
		}
	}

	data, err := app.store.AdminStats.GetActivityChart(r.Context(), days)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, data); err != nil {
		app.internalServerError(w, r, err)
	}
}

