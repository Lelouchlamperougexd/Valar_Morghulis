package main

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/sikozonpc/social/internal/store"
)

type VerifyCompanyPayload struct {
	Status string `json:"status" validate:"required,oneof=verified rejected"`
}

// listCompaniesHandler godoc
//
//	@Summary		Lists companies for admin review
//	@Description	Returns a paginated list of companies (for admin dashboard)
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Param			limit	query		int	false	"Limit"
//	@Param			offset	query		int	false	"Offset"
//	@Success		200		{array}		store.Company
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/companies [get]
func (app *application) listCompaniesHandler(w http.ResponseWriter, r *http.Request) {
	fq := store.PaginatedFeedQuery{
		Limit:  20,
		Offset: 0,
	}

	fq, err := fq.Parse(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(fq); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	companies, err := app.store.Companies.List(r.Context(), fq)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, companies); err != nil {
		app.internalServerError(w, r, err)
	}
}

// getCompanyHandler godoc
//
//	@Summary		Gets a company by ID
//	@Description	Returns a single company
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Param			companyID	path		int	true	"Company ID"
//	@Success		200			{object}	store.Company
//	@Failure		400			{object}	error
//	@Failure		404			{object}	error
//	@Failure		500			{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/companies/{companyID} [get]
func (app *application) getCompanyHandler(w http.ResponseWriter, r *http.Request) {
	companyID, err := strconv.ParseInt(chi.URLParam(r, "companyID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	company, err := app.store.Companies.GetByID(r.Context(), companyID)
	if err != nil {
		switch err {
		case store.ErrNotFound:
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, company); err != nil {
		app.internalServerError(w, r, err)
	}
}

// verifyCompanyHandler godoc
//
//	@Summary		Verifies or rejects a company
//	@Description	Admin sets the verification status of a company to "verified" or "rejected"
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Param			companyID	path		int						true	"Company ID"
//	@Param			payload		body		VerifyCompanyPayload	true	"Verification status"
//	@Success		200			{object}	store.Company
//	@Failure		400			{object}	error
//	@Failure		404			{object}	error
//	@Failure		500			{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/companies/{companyID}/verify [put]
func (app *application) verifyCompanyHandler(w http.ResponseWriter, r *http.Request) {
	companyID, err := strconv.ParseInt(chi.URLParam(r, "companyID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload VerifyCompanyPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := app.store.Companies.UpdateVerificationStatus(r.Context(), companyID, payload.Status); err != nil {
		switch err {
		case store.ErrNotFound:
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}

	// Log action
	adminUser := getUserFromContext(r)
	if adminUser != nil {
		action := "verify_company"
		if payload.Status == "rejected" {
			action = "reject_company"
		}
		app.logAdminAction(adminUser, action, "company", companyID, "")
	}

	// Return the updated company
	company, err := app.store.Companies.GetByID(r.Context(), companyID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, company); err != nil {
		app.internalServerError(w, r, err)
	}
}
