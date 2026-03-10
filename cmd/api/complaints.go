package main

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/sikozonpc/social/internal/store"
)

type CreateComplaintPayload struct {
	Type        string `json:"type" validate:"required,oneof=incorrect_listing rule_violation fraud"`
	TargetType  string `json:"target_type" validate:"required,oneof=listing company"`
	TargetID    int64  `json:"target_id" validate:"required,gt=0"`
	Description string `json:"description" validate:"required,max=2000"`
}

type UpdateComplaintStatusPayload struct {
	Status string `json:"status" validate:"required,oneof=new in_progress closed"`
}

// createComplaintHandler godoc
//
//	@Summary		Create a complaint
//	@Description	User submits a complaint about a listing or company
//	@Tags			complaints
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		CreateComplaintPayload	true	"Complaint data"
//	@Success		201		{object}	store.Complaint
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		404		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/complaints [post]
func (app *application) createComplaintHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

	var payload CreateComplaintPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Verify target exists
	if payload.TargetType == "listing" {
		if _, err := app.store.Listings.GetByID(r.Context(), payload.TargetID); err != nil {
			if err == store.ErrNotFound {
				app.notFoundResponse(w, r, fmt.Errorf("listing not found"))
				return
			}
			app.internalServerError(w, r, err)
			return
		}
	} else if payload.TargetType == "company" {
		if _, err := app.store.Companies.GetByID(r.Context(), payload.TargetID); err != nil {
			if err == store.ErrNotFound {
				app.notFoundResponse(w, r, fmt.Errorf("company not found"))
				return
			}
			app.internalServerError(w, r, err)
			return
		}
	}

	complaint := &store.Complaint{
		Type:        payload.Type,
		TargetType:  payload.TargetType,
		TargetID:    payload.TargetID,
		UserID:      user.ID,
		Description: payload.Description,
	}

	if err := app.store.Complaints.Create(r.Context(), complaint); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, complaint); err != nil {
		app.internalServerError(w, r, err)
	}
}

// adminListComplaintsHandler godoc
//
//	@Summary		List complaints
//	@Description	Returns a paginated list of complaints, optionally filtered by status
//	@Tags			admin
//	@Produce		json
//	@Param			status	query		string	false	"Filter by status: new, in_progress, closed"
//	@Param			limit	query		int		false	"Limit"
//	@Param			offset	query		int		false	"Offset"
//	@Success		200		{array}		store.Complaint
//	@Failure		401		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/complaints [get]
func (app *application) adminListComplaintsHandler(w http.ResponseWriter, r *http.Request) {
	filter := store.ComplaintFilter{}

	if v := r.URL.Query().Get("status"); v != "" {
		filter.Status = v
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Limit = parsed
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Offset = parsed
		}
	}

	complaints, err := app.store.Complaints.List(r.Context(), filter)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, complaints); err != nil {
		app.internalServerError(w, r, err)
	}
}

// adminGetComplaintHandler godoc
//
//	@Summary		Get complaint by ID
//	@Description	Returns a single complaint with target name and author info
//	@Tags			admin
//	@Produce		json
//	@Param			complaintID	path		int	true	"Complaint ID"
//	@Success		200			{object}	store.Complaint
//	@Failure		400			{object}	error
//	@Failure		404			{object}	error
//	@Failure		500			{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/complaints/{complaintID} [get]
func (app *application) adminGetComplaintHandler(w http.ResponseWriter, r *http.Request) {
	complaintID, err := strconv.ParseInt(chi.URLParam(r, "complaintID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	complaint, err := app.store.Complaints.GetByID(r.Context(), complaintID)
	if err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, complaint); err != nil {
		app.internalServerError(w, r, err)
	}
}

// adminUpdateComplaintStatusHandler godoc
//
//	@Summary		Update complaint status
//	@Description	Admin changes the status of a complaint
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Param			complaintID	path		int								true	"Complaint ID"
//	@Param			payload		body		UpdateComplaintStatusPayload		true	"New status"
//	@Success		200			{object}	store.Complaint
//	@Failure		400			{object}	error
//	@Failure		404			{object}	error
//	@Failure		500			{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/complaints/{complaintID}/status [patch]
func (app *application) adminUpdateComplaintStatusHandler(w http.ResponseWriter, r *http.Request) {
	complaintID, err := strconv.ParseInt(chi.URLParam(r, "complaintID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload UpdateComplaintStatusPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := app.store.Complaints.UpdateStatus(r.Context(), complaintID, payload.Status); err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	// Log action
	adminUser := getUserFromContext(r)
	if adminUser != nil {
		app.logAdminAction(adminUser, "update_complaint_status", "complaint", complaintID, payload.Status)
	}

	complaint, err := app.store.Complaints.GetByID(r.Context(), complaintID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, complaint); err != nil {
		app.internalServerError(w, r, err)
	}
}
