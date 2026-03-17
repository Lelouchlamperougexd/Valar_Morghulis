package main

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/store"
)

// dashboardOverviewHandler godoc
//
//	@Summary		Dashboard overview
//	@Description	Returns aggregated dashboard data: favorites count, active applications, unread messages, recent listings and applications
//	@Tags			dashboard
//	@Produce		json
//	@Success		200	{object}	store.DashboardOverview
//	@Failure		401	{object}	error
//	@Failure		500	{object}	error
//	@Security		ApiKeyAuth
//	@Router			/dashboard/overview [get]
func (app *application) dashboardOverviewHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

	overview, err := app.store.Dashboard.GetOverview(r.Context(), user.ID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, overview); err != nil {
		app.internalServerError(w, r, err)
	}
}

// listFavoritesHandler godoc
//
//	@Summary		List favorites
//	@Description	Returns all favorite listings for the current user with listing details
//	@Tags			favorites
//	@Produce		json
//	@Success		200	{array}		store.FavoriteListing
//	@Failure		401	{object}	error
//	@Failure		500	{object}	error
//	@Security		ApiKeyAuth
//	@Router			/favorites [get]
func (app *application) listFavoritesHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

	favorites, err := app.store.Favorites.ListByUser(r.Context(), user.ID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, favorites); err != nil {
		app.internalServerError(w, r, err)
	}
}

// addFavoriteHandler godoc
//
//	@Summary		Add to favorites
//	@Description	Adds a listing to the current user's favorites
//	@Tags			favorites
//	@Produce		json
//	@Param			listingID	path		int	true	"Listing ID"
//	@Success		201			{object}	object{listing_id=int}
//	@Failure		400			{object}	error
//	@Failure		401			{object}	error
//	@Failure		404			{object}	error
//	@Failure		409			{object}	error
//	@Failure		500			{object}	error
//	@Security		ApiKeyAuth
//	@Router			/favorites/{listingID} [post]
func (app *application) addFavoriteHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

	listingID, err := strconv.ParseInt(chi.URLParam(r, "listingID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Verify listing exists
	_, err = app.store.Listings.GetByID(r.Context(), listingID)
	if err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	if err := app.store.Favorites.Add(r.Context(), user.ID, listingID); err != nil {
		if err == store.ErrConflict {
			app.conflictResponse(w, r, fmt.Errorf("listing already in favorites"))
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, map[string]int64{"listing_id": listingID}); err != nil {
		app.internalServerError(w, r, err)
	}
}

// removeFavoriteHandler godoc
//
//	@Summary		Remove from favorites
//	@Description	Removes a listing from the current user's favorites
//	@Tags			favorites
//	@Produce		json
//	@Param			listingID	path		int	true	"Listing ID"
//	@Success		204			{string}	string	"Removed"
//	@Failure		400			{object}	error
//	@Failure		401			{object}	error
//	@Failure		404			{object}	error
//	@Failure		500			{object}	error
//	@Security		ApiKeyAuth
//	@Router			/favorites/{listingID} [delete]
func (app *application) removeFavoriteHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

	listingID, err := strconv.ParseInt(chi.URLParam(r, "listingID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := app.store.Favorites.Remove(r.Context(), user.ID, listingID); err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusNoContent, ""); err != nil {
		app.internalServerError(w, r, err)
	}
}

// listChatsHandler godoc
//
//	@Summary		List chats
//	@Description	Returns a list of chat dialogs grouped by application with last message and unread status
//	@Tags			chats
//	@Produce		json
//	@Success		200	{array}		store.ChatSummary
//	@Failure		401	{object}	error
//	@Failure		500	{object}	error
//	@Security		ApiKeyAuth
//	@Router			/chats [get]
func (app *application) listChatsHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

	chats, err := app.store.Dashboard.ListChats(r.Context(), user.ID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, chats); err != nil {
		app.internalServerError(w, r, err)
	}
}

type UpdateProfilePayload struct {
	FirstName string `json:"first_name" validate:"omitempty,max=100"`
	LastName  string `json:"last_name" validate:"omitempty,max=100"`
	Phone     string `json:"phone" validate:"omitempty,max=20"`
}

// updateProfileHandler godoc
//
//	@Summary		Update profile
//	@Description	Partially updates the current user's profile (first_name, last_name, phone). Only non-empty fields are updated.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		UpdateProfilePayload	true	"Profile fields to update"
//	@Success		200		{object}	store.User
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/users/me [patch]
func (app *application) updateProfileHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

	var payload UpdateProfilePayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if payload.FirstName == "" && payload.LastName == "" && payload.Phone == "" {
		app.badRequestResponse(w, r, fmt.Errorf("at least one field must be provided"))
		return
	}

	if err := app.store.Users.UpdateProfile(r.Context(), user.ID, payload.FirstName, payload.LastName, payload.Phone); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	// Return updated user
	updatedUser, err := app.store.Users.GetByID(r.Context(), user.ID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, updatedUser); err != nil {
		app.internalServerError(w, r, err)
	}
}

type ChangePasswordPayload struct {
	OldPassword             string `json:"old_password" validate:"required,min=3,max=72"`
	NewPassword             string `json:"new_password" validate:"required,min=8,max=72"`
	NewPasswordConfirmation string `json:"new_password_confirmation" validate:"required,eqfield=NewPassword"`
}

// changePasswordHandler godoc
//
//	@Summary		Change password
//	@Description	Changes the current user's password after verifying the old password
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		ChangePasswordPayload	true	"Old and new passwords"
//	@Success		200		{object}	object{message=string}
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/users/me/password [put]
func (app *application) changePasswordHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)

	var payload ChangePasswordPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Verify old password
	if err := user.Password.Compare(payload.OldPassword); err != nil {
		app.unauthorizedErrorResponse(w, r, fmt.Errorf("incorrect old password"))
		return
	}

	// Set new password (hashes internally)
	if err := user.Password.Set(payload.NewPassword); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	// Save to DB
	if err := app.store.Users.UpdatePassword(r.Context(), user.ID, user.Password.GetHash()); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, map[string]string{"message": "password updated successfully"}); err != nil {
		app.internalServerError(w, r, err)
	}
}

