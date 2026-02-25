package main

import (
	"testing"

	"github.com/sikozonpc/social/internal/store"
)

func TestIsCompatibleWithRent_Allows(t *testing.T) {
	listing := &store.Listing{
		DealType: "rent",
		RentConstraints: &store.RentConstraints{
			AllowChildren: true,
			AllowPets:     true,
			AllowStudents: true,
			MaxOccupants:  0,
			MinTermMonths: 0,
		},
	}

	payload := CreateApplicationPayload{
		HasChildren:    boolPtr(true),
		HasPets:        boolPtr(true),
		IsStudent:      boolPtr(true),
		OccupantCount:  intPtr(4),
		StayTermMonths: intPtr(1),
	}

	if !isCompatibleWithRent(listing, payload) {
		t.Fatalf("expected compatible request")
	}
}

func TestIsCompatibleWithRent_RejectsChildren(t *testing.T) {
	listing := &store.Listing{
		DealType:        "rent",
		RentConstraints: &store.RentConstraints{AllowChildren: false},
	}
	payload := CreateApplicationPayload{HasChildren: boolPtr(true)}
	if isCompatibleWithRent(listing, payload) {
		t.Fatalf("expected incompatibility for children")
	}
}

func TestIsCompatibleWithRent_RejectsPets(t *testing.T) {
	listing := &store.Listing{
		DealType:        "rent",
		RentConstraints: &store.RentConstraints{AllowPets: false},
	}
	payload := CreateApplicationPayload{HasPets: boolPtr(true)}
	if isCompatibleWithRent(listing, payload) {
		t.Fatalf("expected incompatibility for pets")
	}
}

func TestIsCompatibleWithRent_RejectsStudents(t *testing.T) {
	listing := &store.Listing{
		DealType:        "rent",
		RentConstraints: &store.RentConstraints{AllowStudents: false},
	}
	payload := CreateApplicationPayload{IsStudent: boolPtr(true)}
	if isCompatibleWithRent(listing, payload) {
		t.Fatalf("expected incompatibility for students")
	}
}

func TestIsCompatibleWithRent_RejectsOccupants(t *testing.T) {
	listing := &store.Listing{
		DealType:        "rent",
		RentConstraints: &store.RentConstraints{MaxOccupants: 2},
	}
	payload := CreateApplicationPayload{OccupantCount: intPtr(3)}
	if isCompatibleWithRent(listing, payload) {
		t.Fatalf("expected incompatibility for occupants")
	}
}

func TestIsCompatibleWithRent_RejectsShortTerm(t *testing.T) {
	listing := &store.Listing{
		DealType:        "rent",
		RentConstraints: &store.RentConstraints{MinTermMonths: 6},
	}
	payload := CreateApplicationPayload{StayTermMonths: intPtr(3)}
	if isCompatibleWithRent(listing, payload) {
		t.Fatalf("expected incompatibility for short term")
	}
}

func TestIsCompatibleWithRent_SaleAlwaysCompatible(t *testing.T) {
	listing := &store.Listing{DealType: "sale"}
	payload := CreateApplicationPayload{HasChildren: boolPtr(true)}
	if !isCompatibleWithRent(listing, payload) {
		t.Fatalf("sale listings should be compatible")
	}
}

func boolPtr(v bool) *bool { return &v }
func intPtr(v int) *int    { return &v }
