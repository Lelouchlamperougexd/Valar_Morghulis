package store

import (
	"net/http"
	"strconv"
)

// PaginatedQuery holds generic pagination parameters.
type PaginatedQuery struct {
	Limit  int    `json:"limit" validate:"gte=1,lte=20"`
	Offset int    `json:"offset" validate:"gte=0"`
	Search string `json:"search,omitempty"`
}

// PaginatedFeedQuery is kept as an alias for backward-compatibility.
type PaginatedFeedQuery = PaginatedQuery

func (pq PaginatedQuery) Parse(r *http.Request) (PaginatedQuery, error) {
	qs := r.URL.Query()

	if v := qs.Get("limit"); v != "" {
		l, err := strconv.Atoi(v)
		if err != nil {
			return pq, nil
		}
		pq.Limit = l
	}

	if v := qs.Get("offset"); v != "" {
		o, err := strconv.Atoi(v)
		if err != nil {
			return pq, nil
		}
		pq.Offset = o
	}

	if v := qs.Get("status"); v != "" {
		pq.Search = v
	}

	return pq, nil
}
