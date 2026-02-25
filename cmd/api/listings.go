package main

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/sikozonpc/social/internal/store"
)

type ProjectPayload struct {
	Name        string `json:"name" validate:"required,max=255"`
	Description string `json:"description" validate:"max=2000"`
	City        string `json:"city" validate:"required,max=100"`
}

type ListingMediaPayload struct {
	URL      string `json:"url" validate:"required,url"`
	Position int    `json:"position" validate:"gte=0"`
}

type RentConstraintsPayload struct {
	AllowChildren bool `json:"allow_children"`
	AllowPets     bool `json:"allow_pets"`
	AllowStudents bool `json:"allow_students"`
	MaxOccupants  int  `json:"max_occupants" validate:"gte=0"`
	MinTermMonths int  `json:"min_term_months" validate:"gte=0"`
}

type CreateListingPayload struct {
	ProjectID    *int64                  `json:"project_id" validate:"omitempty,gt=0"`
	Title        string                  `json:"title" validate:"required,max=255"`
	Description  string                  `json:"description" validate:"required"`
	PropertyType string                  `json:"property_type" validate:"required,max=50"`
	DealType     string                  `json:"deal_type" validate:"required,oneof=rent sale"`
	Price        int64                   `json:"price" validate:"required,gt=0"`
	City         string                  `json:"city" validate:"required,max=100"`
	Address      string                  `json:"address" validate:"max=500"`
	Rooms        *int                    `json:"rooms" validate:"omitempty,min=0,max=20"`
	Area         *float64                `json:"area" validate:"omitempty,gt=0"`
	Floor        *int                    `json:"floor" validate:"omitempty,min=0,max=200"`
	TotalFloors  *int                    `json:"total_floors" validate:"omitempty,min=0,max=200"`
	Media        []ListingMediaPayload   `json:"media" validate:"max=20,dive"`
	Rent         *RentConstraintsPayload `json:"rent_constraints"`
}

type ListListingsQuery struct {
	DealType     string
	City         string
	PropertyType string
	PriceMin     int64
	PriceMax     int64
	RoomsMin     int
	RoomsMax     int
	AreaMin      float64
	AreaMax      float64
	Limit        int
	Offset       int
}

type CreateApplicationPayload struct {
	FullName       string  `json:"full_name" validate:"required,max=255"`
	Phone          string  `json:"phone" validate:"required,max=50"`
	Email          string  `json:"email" validate:"required,max=255,email_regex"`
	Comment        *string `json:"comment" validate:"omitempty,max=2000"`
	OccupantCount  *int    `json:"occupant_count" validate:"omitempty,min=1,max=20"`
	HasChildren    *bool   `json:"has_children"`
	HasPets        *bool   `json:"has_pets"`
	IsStudent      *bool   `json:"is_student"`
	StayTermMonths *int    `json:"stay_term_months" validate:"omitempty,min=0,max=120"`
	NeedsMortgage  *bool   `json:"needs_mortgage"`
	PurchaseTerm   *string `json:"purchase_term" validate:"omitempty,max=255"`
}

type UpdateApplicationStatusPayload struct {
	Status string `json:"status" validate:"required,oneof=new review approved rejected"`
}

type UpdateListingStatusPayload struct {
	Status string `json:"status" validate:"required,oneof=draft moderation active rejected archived"`
}

type ListApplicationsQuery struct {
	Status string
	Limit  int
	Offset int
}

func (app *application) createProjectHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user.Role.Name != "developer" {
		app.forbiddenResponse(w, r)
		return
	}
	if user.CompanyID == nil {
		app.forbiddenResponse(w, r)
		return
	}

	var payload ProjectPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	project := &store.Project{
		CompanyID:   *user.CompanyID,
		Name:        payload.Name,
		Description: payload.Description,
		City:        payload.City,
	}

	if err := app.store.Projects.Create(r.Context(), project); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, project); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) createListingHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user.Role.Name != "agency" && user.Role.Name != "developer" {
		app.forbiddenResponse(w, r)
		return
	}
	if user.CompanyID == nil {
		app.forbiddenResponse(w, r)
		return
	}

	var payload CreateListingPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if payload.ProjectID != nil {
		project, err := app.store.Projects.GetByID(r.Context(), *payload.ProjectID)
		if err != nil {
			if err == store.ErrNotFound {
				app.notFoundResponse(w, r, err)
				return
			}
			app.internalServerError(w, r, err)
			return
		}
		if project.CompanyID != *user.CompanyID {
			app.forbiddenResponse(w, r)
			return
		}
	}

	media := make([]store.ListingMedia, 0, len(payload.Media))
	for _, m := range payload.Media {
		media = append(media, store.ListingMedia{URL: m.URL, Position: m.Position})
	}

	var rent *store.RentConstraints
	if payload.DealType == "rent" && payload.Rent != nil {
		rent = &store.RentConstraints{
			AllowChildren: payload.Rent.AllowChildren,
			AllowPets:     payload.Rent.AllowPets,
			AllowStudents: payload.Rent.AllowStudents,
			MaxOccupants:  payload.Rent.MaxOccupants,
			MinTermMonths: payload.Rent.MinTermMonths,
		}
	}

	listing := &store.Listing{
		CompanyID:    *user.CompanyID,
		ProjectID:    payload.ProjectID,
		Title:        payload.Title,
		Description:  payload.Description,
		PropertyType: payload.PropertyType,
		DealType:     payload.DealType,
		Status:       "moderation",
		Price:        payload.Price,
		City:         payload.City,
		Address:      payload.Address,
		Rooms:        payload.Rooms,
		Area:         payload.Area,
		Floor:        payload.Floor,
		TotalFloors:  payload.TotalFloors,
	}

	if err := app.store.Listings.Create(r.Context(), listing, media, rent); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, listing); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) listListingsHandler(w http.ResponseWriter, r *http.Request) {
	qs := r.URL.Query()
	filter := store.ListingFilter{}

	filter.DealType = qs.Get("deal_type")
	filter.City = qs.Get("city")
	filter.PropertyType = qs.Get("property_type")
	filter.Status = "active"

	if v := qs.Get("price_min"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			filter.PriceMin = parsed
		}
	}
	if v := qs.Get("price_max"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			filter.PriceMax = parsed
		}
	}
	if v := qs.Get("rooms_min"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.RoomsMin = parsed
		}
	}
	if v := qs.Get("rooms_max"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.RoomsMax = parsed
		}
	}
	if v := qs.Get("area_min"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			filter.AreaMin = parsed
		}
	}
	if v := qs.Get("area_max"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			filter.AreaMax = parsed
		}
	}
	if v := qs.Get("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Limit = parsed
		}
	}
	if v := qs.Get("offset"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Offset = parsed
		}
	}

	listings, err := app.store.Listings.List(r.Context(), filter)
	if err != nil {
		if err == store.ErrInvalidFilter {
			app.badRequestResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, listings); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) getListingHandler(w http.ResponseWriter, r *http.Request) {
	listingID, err := strconv.ParseInt(chi.URLParam(r, "listingID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	listing, err := app.store.Listings.GetByID(r.Context(), listingID)
	if err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	user := getUserFromContext(r)
	if listing.Status != "active" {
		if user == nil || (user.Role.Name != "admin" && (user.CompanyID == nil || *user.CompanyID != listing.CompanyID)) {
			app.notFoundResponse(w, r, store.ErrNotFound)
			return
		}
	}

	if err := app.jsonResponse(w, http.StatusOK, listing); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) createApplicationHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user == nil {
		app.unauthorizedErrorResponse(w, r, fmt.Errorf("unauthorized"))
		return
	}

	listingID, err := strconv.ParseInt(chi.URLParam(r, "listingID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	listing, err := app.store.Listings.GetByID(r.Context(), listingID)
	if err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	if listing.Status != "active" {
		app.forbiddenResponse(w, r)
		return
	}

	var payload CreateApplicationPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	compatible := isCompatibleWithRent(listing, payload)

	appModel := &store.Application{
		ListingID:      listing.ID,
		UserID:         user.ID,
		FullName:       payload.FullName,
		Phone:          payload.Phone,
		Email:          payload.Email,
		Status:         "new",
		IsCompatible:   compatible,
		DealType:       listing.DealType,
		OccupantCount:  payload.OccupantCount,
		HasChildren:    payload.HasChildren,
		HasPets:        payload.HasPets,
		IsStudent:      payload.IsStudent,
		StayTermMonths: payload.StayTermMonths,
		NeedsMortgage:  payload.NeedsMortgage,
		PurchaseTerm:   payload.PurchaseTerm,
		Comment:        payload.Comment,
	}

	if err := app.store.Applications.Create(r.Context(), appModel); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, appModel); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) listApplicationsHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user == nil {
		app.unauthorizedErrorResponse(w, r, fmt.Errorf("unauthorized"))
		return
	}
	qs := r.URL.Query()
	filter := store.ApplicationFilter{}

	if v := qs.Get("status"); v != "" {
		filter.Status = v
	}
	if v := qs.Get("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Limit = parsed
		}
	}
	if v := qs.Get("offset"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Offset = parsed
		}
	}

	// Company dashboard: filter by company_id
	if user.CompanyID != nil && (user.Role.Name == "agency" || user.Role.Name == "developer") {
		filter.CompanyID = user.CompanyID
	} else {
		filter.UserID = &user.ID
	}

	apps, err := app.store.Applications.List(r.Context(), filter)
	if err != nil {
		if err == store.ErrInvalidFilter {
			app.badRequestResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, apps); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) updateApplicationStatusHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user == nil || user.CompanyID == nil {
		app.forbiddenResponse(w, r)
		return
	}

	applicationID, err := strconv.ParseInt(chi.URLParam(r, "applicationID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	appModel, err := app.store.Applications.GetByID(r.Context(), applicationID)
	if err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	listing, err := app.store.Listings.GetByID(r.Context(), appModel.ListingID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if *user.CompanyID != listing.CompanyID {
		app.forbiddenResponse(w, r)
		return
	}

	var payload UpdateApplicationStatusPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := app.store.Applications.UpdateStatus(r.Context(), appModel.ID, payload.Status); err != nil {
		if err == store.ErrInvalidStatus {
			app.badRequestResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	appModel.Status = payload.Status
	if err := app.jsonResponse(w, http.StatusOK, appModel); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) listApplicationMessagesHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user == nil {
		app.unauthorizedErrorResponse(w, r, fmt.Errorf("unauthorized"))
		return
	}

	applicationID, err := strconv.ParseInt(chi.URLParam(r, "applicationID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if !app.canAccessApplication(r.Context(), user, applicationID) {
		app.forbiddenResponse(w, r)
		return
	}

	qs := r.URL.Query()
	limit, _ := strconv.Atoi(qs.Get("limit"))
	offset, _ := strconv.Atoi(qs.Get("offset"))

	messages, err := app.store.Messages.List(r.Context(), applicationID, limit, offset)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, messages); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) createApplicationMessageHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user == nil {
		app.unauthorizedErrorResponse(w, r, fmt.Errorf("unauthorized"))
		return
	}

	applicationID, err := strconv.ParseInt(chi.URLParam(r, "applicationID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if !app.canAccessApplication(r.Context(), user, applicationID) {
		app.forbiddenResponse(w, r)
		return
	}

	var payload struct {
		Body string `json:"body" validate:"required,max=5000"`
	}

	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	senderID := user.ID
	msg := &store.ApplicationMessage{
		ApplicationID: applicationID,
		SenderUserID:  &senderID,
		Body:          payload.Body,
	}

	if err := app.store.Messages.Create(r.Context(), msg); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, msg); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) adminListListingsHandler(w http.ResponseWriter, r *http.Request) {
	qs := r.URL.Query()
	filter := store.ListingFilter{}
	filter.Status = qs.Get("status")
	if filter.Status == "" {
		filter.Status = "moderation"
	}
	filter.DealType = qs.Get("deal_type")
	filter.City = qs.Get("city")
	filter.PropertyType = qs.Get("property_type")

	if v := qs.Get("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Limit = parsed
		}
	}
	if v := qs.Get("offset"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Offset = parsed
		}
	}

	listings, err := app.store.Listings.List(r.Context(), filter)
	if err != nil {
		if err == store.ErrInvalidFilter {
			app.badRequestResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, listings); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) adminUpdateListingStatusHandler(w http.ResponseWriter, r *http.Request) {
	listingID, err := strconv.ParseInt(chi.URLParam(r, "listingID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload UpdateListingStatusPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := app.store.Listings.UpdateStatus(r.Context(), listingID, payload.Status); err != nil {
		if err == store.ErrInvalidStatus {
			app.badRequestResponse(w, r, err)
			return
		}
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	listing, _ := app.store.Listings.GetByID(r.Context(), listingID)

	if err := app.jsonResponse(w, http.StatusOK, listing); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) canAccessApplication(ctx context.Context, user *store.User, applicationID int64) bool {
	appModel, err := app.store.Applications.GetByID(ctx, applicationID)
	if err != nil {
		return false
	}
	if appModel.UserID == user.ID {
		return true
	}
	if user.CompanyID == nil {
		return false
	}
	listing, err := app.store.Listings.GetByID(ctx, appModel.ListingID)
	if err != nil {
		return false
	}
	return listing.CompanyID == *user.CompanyID
}

func isCompatibleWithRent(listing *store.Listing, payload CreateApplicationPayload) bool {
	if listing.DealType != "rent" || listing.RentConstraints == nil {
		return true
	}
	c := listing.RentConstraints

	if !c.AllowChildren && payload.HasChildren != nil && *payload.HasChildren {
		return false
	}
	if !c.AllowPets && payload.HasPets != nil && *payload.HasPets {
		return false
	}
	if !c.AllowStudents && payload.IsStudent != nil && *payload.IsStudent {
		return false
	}
	if c.MaxOccupants > 0 && payload.OccupantCount != nil && *payload.OccupantCount > c.MaxOccupants {
		return false
	}
	if c.MinTermMonths > 0 && payload.StayTermMonths != nil && *payload.StayTermMonths < c.MinTermMonths {
		return false
	}
	return true
}
