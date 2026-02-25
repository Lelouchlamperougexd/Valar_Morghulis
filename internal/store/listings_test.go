package store

import "testing"

func TestListingFilterNormalizeDefaults(t *testing.T) {
	f := ListingFilter{}
	if err := f.normalize(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if f.Status != "active" {
		t.Fatalf("expected default status 'active', got %q", f.Status)
	}
	if f.Limit != 20 || f.Offset != 0 {
		t.Fatalf("unexpected limit/offset: %d/%d", f.Limit, f.Offset)
	}
}

func TestListingFilterNormalizeInvalidStatus(t *testing.T) {
	f := ListingFilter{Status: "bad"}
	if err := f.normalize(); err != ErrInvalidFilter {
		t.Fatalf("expected ErrInvalidFilter, got %v", err)
	}
}

func TestListingFilterNormalizeInvalidDealType(t *testing.T) {
	f := ListingFilter{DealType: "lease"}
	if err := f.normalize(); err != ErrInvalidFilter {
		t.Fatalf("expected ErrInvalidFilter, got %v", err)
	}
}

func TestListingFilterNormalizePriceRange(t *testing.T) {
	f := ListingFilter{PriceMin: 200, PriceMax: 100}
	if err := f.normalize(); err != ErrInvalidFilter {
		t.Fatalf("expected ErrInvalidFilter, got %v", err)
	}
}
