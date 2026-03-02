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
	Latitude     *float64                `json:"latitude" validate:"omitempty,min=-90,max=90"`
	Longitude    *float64                `json:"longitude" validate:"omitempty,min=-180,max=180"`
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

type ApplicationMessagePayload struct {
	Body string `json:"body" validate:"required,max=5000"`
}

// createProjectHandler godoc
//
//	@Summary		Create project (developer)
//	@Description	Developers create a project container for listings
//	@Tags			projects
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		ProjectPayload	true	"Project data"
//	@Success		201		{object}	store.Project
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		403		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/projects [post]
func (app *application) createProjectHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user.Role.Name != store.RoleDeveloper {
		app.forbiddenResponse(w, r)
		return
	}
	if user.CompanyID == nil {
		app.forbiddenResponse(w, r)
		return
	}

	company, err := app.store.Companies.GetByID(r.Context(), *user.CompanyID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if company.VerificationStatus != store.VerificationVerified {
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

// createListingHandler godoc
//
//	@Summary		Create listing (agency/developer)
//	@Description	Create listing; defaults to status=moderation
//	@Tags			listings
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		CreateListingPayload	true	"Listing data"
//	@Success		201		{object}	store.Listing
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		403		{object}	error
//	@Failure		404		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/listings [post]
func (app *application) createListingHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user.Role.Name != store.RoleAgency && user.Role.Name != store.RoleDeveloper {
		app.forbiddenResponse(w, r)
		return
	}
	if user.CompanyID == nil {
		app.forbiddenResponse(w, r)
		return
	}

	company, err := app.store.Companies.GetByID(r.Context(), *user.CompanyID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if company.VerificationStatus != store.VerificationVerified {
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
		Status:       store.ListingStatusModeration,
		Price:        payload.Price,
		City:         payload.City,
		Address:      payload.Address,
		Rooms:        payload.Rooms,
		Area:         payload.Area,
		Floor:        payload.Floor,
		TotalFloors:  payload.TotalFloors,
		Latitude:     payload.Latitude,
		Longitude:    payload.Longitude,
	}

	if err := app.store.Listings.Create(r.Context(), listing, media, rent); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, listing); err != nil {
		app.internalServerError(w, r, err)
	}
}

// listListingsHandler godoc
//
//	@Summary		Public catalog listings
//	@Description	Returns active listings with filters
//	@Tags			listings
//	@Produce		json
//	@Param			deal_type		query		string	false	"rent|sale"
//	@Param			city			query		string	false	"City"
//	@Param			property_type	query		string	false	"Property type"
//	@Param			price_min		query		int		false	"Min price"
//	@Param			price_max		query		int		false	"Max price"
//	@Param			rooms_min		query		int		false	"Min rooms"
//	@Param			rooms_max		query		int		false	"Max rooms"
//	@Param			area_min		query		number	false	"Min area"
//	@Param			area_max		query		number	false	"Max area"
//	@Param			limit			query		int		false	"Limit"
//	@Param			offset			query		int		false	"Offset"
//	@Success		200				{array}		store.Listing
//	@Failure		400				{object}	error
//	@Failure		500				{object}	error
//	@Router			/listings [get]
func (app *application) listListingsHandler(w http.ResponseWriter, r *http.Request) {
	qs := r.URL.Query()
	filter := store.ListingFilter{}

	filter.DealType = qs.Get("deal_type")
	filter.City = qs.Get("city")
	filter.PropertyType = qs.Get("property_type")
	filter.Status = store.ListingStatusActive

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

// getListingHandler godoc
//
//	@Summary	Get listing by ID
//	@Tags		listings
//	@Produce	json
//	@Param		listingID	path		int	true	"Listing ID"
//	@Success	200			{object}	store.Listing
//	@Failure	404			{object}	error
//	@Failure	500			{object}	error
//	@Router		/listings/{listingID} [get]
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
	if listing.Status != store.ListingStatusActive {
		if user == nil || (user.Role.Name != store.RoleAdmin && (user.CompanyID == nil || *user.CompanyID != listing.CompanyID)) {
			app.notFoundResponse(w, r, store.ErrNotFound)
			return
		}
	}

	if err := app.jsonResponse(w, http.StatusOK, listing); err != nil {
		app.internalServerError(w, r, err)
	}
}

// createApplicationHandler godoc
//
//	@Summary		Create application for listing
//	@Description	Requires authenticated user; checks rent constraints for compatibility flag
//	@Tags			applications
//	@Accept			json
//	@Produce		json
//	@Param			listingID	path		int							true	"Listing ID"
//	@Param			payload		body		CreateApplicationPayload	true	"Application data"
//	@Success		201			{object}	store.Application
//	@Failure		400			{object}	error
//	@Failure		401			{object}	error
//	@Failure		403			{object}	error
//	@Failure		404			{object}	error
//	@Failure		500			{object}	error
//	@Security		ApiKeyAuth
//	@Router			/listings/{listingID}/applications [post]
func (app *application) createApplicationHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

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

	if listing.Status != store.ListingStatusActive {
		app.forbiddenResponse(w, r)
		return
	}

	// Prevent applying to own company's listing
	if user.CompanyID != nil && *user.CompanyID == listing.CompanyID {
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

	// Check for duplicate application
	_, err = app.store.Applications.GetByListingAndUser(r.Context(), listing.ID, user.ID)
	if err == nil {
		app.conflictResponse(w, r, fmt.Errorf("Вы уже подали заявку на этот объект"))
		return
	}
	if err != store.ErrNotFound {
		app.internalServerError(w, r, err)
		return
	}

	compatible := isCompatibleWithRent(listing, payload)

	appModel := &store.Application{
		ListingID:      listing.ID,
		UserID:         user.ID,
		FullName:       payload.FullName,
		Phone:          payload.Phone,
		Email:          payload.Email,
		Status:         store.ApplicationStatusNew,
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

// listApplicationsHandler godoc
//
//	@Summary		List applications (my or company)
//	@Description	User sees own apps; company sees apps for its listings
//	@Tags			applications
//	@Produce		json
//	@Param			status	query		string	false	"new|review|approved|rejected"
//	@Param			limit	query		int		false	"Limit"
//	@Param			offset	query		int		false	"Offset"
//	@Success		200		{array}		store.Application
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/applications [get]
func (app *application) listApplicationsHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
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
	if user.CompanyID != nil && (user.Role.Name == store.RoleAgency || user.Role.Name == store.RoleDeveloper) {
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

// updateApplicationStatusHandler godoc
//
//	@Summary	Update application status (company)
//	@Tags		applications
//	@Accept		json
//	@Produce	json
//	@Param		applicationID	path		int								true	"Application ID"
//	@Param		payload			body		UpdateApplicationStatusPayload	true	"Status payload"
//	@Success	200				{object}	store.Application
//	@Failure	400				{object}	error
//	@Failure	401				{object}	error
//	@Failure	403				{object}	error
//	@Failure	404				{object}	error
//	@Failure	500				{object}	error
//	@Security	ApiKeyAuth
//	@Router		/applications/{applicationID}/status [patch]
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

// listApplicationMessagesHandler godoc
//
//	@Summary	List messages for application
//	@Tags		applications
//	@Produce	json
//	@Param		applicationID	path		int	true	"Application ID"
//	@Param		limit			query		int	false	"Limit"
//	@Param		offset			query		int	false	"Offset"
//	@Success	200				{array}		store.ApplicationMessage
//	@Failure	401				{object}	error
//	@Failure	403				{object}	error
//	@Failure	404				{object}	error
//	@Failure	500				{object}	error
//	@Security	ApiKeyAuth
//	@Router		/applications/{applicationID}/messages [get]
func (app *application) listApplicationMessagesHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

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

// createApplicationMessageHandler godoc
//
//	@Summary	Send message in application chat
//	@Tags		applications
//	@Accept		json
//	@Produce	json
//	@Param		applicationID	path		int							true	"Application ID"
//	@Param		payload			body		ApplicationMessagePayload	true	"Message body"
//	@Success	201				{object}	store.ApplicationMessage
//	@Failure	400				{object}	error
//	@Failure	401				{object}	error
//	@Failure	403				{object}	error
//	@Failure	404				{object}	error
//	@Failure	500				{object}	error
//	@Security	ApiKeyAuth
//	@Router		/applications/{applicationID}/messages [post]
func (app *application) createApplicationMessageHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

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

// adminListListingsHandler godoc
//
//	@Summary	List listings for moderation
//	@Tags		admin
//	@Produce	json
//	@Param		status			query		string	false	"draft|moderation|active|rejected|archived"
//	@Param		deal_type		query		string	false	"rent|sale"
//	@Param		city			query		string	false	"City"
//	@Param		property_type	query		string	false	"Property type"
//	@Param		limit			query		int		false	"Limit"
//	@Param		offset			query		int		false	"Offset"
//	@Success	200				{array}		store.Listing
//	@Failure	400				{object}	error
//	@Failure	401				{object}	error
//	@Failure	403				{object}	error
//	@Failure	500				{object}	error
//	@Security	ApiKeyAuth
//	@Router		/admin/listings [get]
func (app *application) adminListListingsHandler(w http.ResponseWriter, r *http.Request) {
	qs := r.URL.Query()
	filter := store.ListingFilter{}
	filter.Status = qs.Get("status")
	if filter.Status == "" {
		filter.Status = store.ListingStatusModeration
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

// adminUpdateListingStatusHandler godoc
//
//	@Summary	Update listing status (moderation)
//	@Tags		admin
//	@Accept		json
//	@Produce	json
//	@Param		listingID	path		int							true	"Listing ID"
//	@Param		payload		body		UpdateListingStatusPayload	true	"Status payload"
//	@Success	200			{object}	store.Listing
//	@Failure	400			{object}	error
//	@Failure	401			{object}	error
//	@Failure	403			{object}	error
//	@Failure	404			{object}	error
//	@Failure	500			{object}	error
//	@Security	ApiKeyAuth
//	@Router		/admin/listings/{listingID}/status [put]
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
