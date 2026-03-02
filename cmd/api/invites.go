package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sikozonpc/social/internal/store"
)

type CreateInvitePayload struct {
	CompanyType string `json:"company_type" validate:"required,oneof=agency developer"`
}

type InviteResponse struct {
	Token       string `json:"token"`
	CompanyType string `json:"company_type"`
	ExpiresAt   string `json:"expires_at"`
	URL         string `json:"url"`
}

type ValidateInviteResponse struct {
	CompanyType string `json:"company_type"`
	Valid       bool   `json:"valid"`
}

// createInviteHandler godoc
//
//	@Summary		Creates a registration invite link
//	@Description	Admin generates an invite link for a specific company type (agency or developer)
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		CreateInvitePayload	true	"Invite details"
//	@Success		201		{object}	InviteResponse		"Invite created"
//	@Failure		400		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/invites [post]
func (app *application) createInviteHandler(w http.ResponseWriter, r *http.Request) {
	var payload CreateInvitePayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Generate crypto-random 32 bytes, hex-encoded (64 chars)
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		app.internalServerError(w, r, err)
		return
	}
	token := hex.EncodeToString(tokenBytes)

	user := getUserFromContext(r)

	invite := &store.RegistrationInvite{
		Token:       token,
		CompanyType: payload.CompanyType,
		CreatedBy:   user.ID,
		ExpiresAt:   time.Now().Add(7 * 24 * time.Hour),
	}

	if err := app.store.Invites.Create(r.Context(), invite); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	response := InviteResponse{
		Token:       invite.Token,
		CompanyType: invite.CompanyType,
		ExpiresAt:   invite.ExpiresAt.Format(time.RFC3339),
		URL:         fmt.Sprintf("%s/register/%s", app.config.frontendURL, invite.Token),
	}

	if err := app.jsonResponse(w, http.StatusCreated, response); err != nil {
		app.internalServerError(w, r, err)
	}
}

// getInviteHandler godoc
//
//	@Summary		Validates a registration invite token
//	@Description	Public endpoint to check if an invite token is valid, not expired, and not used
//	@Tags			invites
//	@Produce		json
//	@Param			token	path		string					true	"Invite token"
//	@Success		200		{object}	ValidateInviteResponse	"Token is valid"
//	@Failure		404		{object}	error
//	@Failure		410		{object}	error
//	@Router			/invites/{token} [get]
func (app *application) getInviteHandler(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	invite, err := app.store.Invites.GetByToken(r.Context(), token)
	if err != nil {
		switch err {
		case store.ErrInviteNotFound:
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}

	if invite.UsedAt != nil {
		writeJSONError(w, http.StatusGone, store.ErrInviteAlreadyUsed.Error())
		return
	}

	if time.Now().After(invite.ExpiresAt) {
		writeJSONError(w, http.StatusGone, store.ErrInviteExpired.Error())
		return
	}

	response := ValidateInviteResponse{
		CompanyType: invite.CompanyType,
		Valid:       true,
	}

	if err := app.jsonResponse(w, http.StatusOK, response); err != nil {
		app.internalServerError(w, r, err)
	}
}
