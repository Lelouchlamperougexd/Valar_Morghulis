package main

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/store"
)

// adminListUsersHandler godoc
//
//	@Summary		Lists users
//	@Description	Returns a paginated list of users. Can be filtered by search
//	@Tags			admin
//	@Produce		json
//	@Param			search	query		string	false	"Search by username or email"
//	@Param			limit	query		int		false	"Limit"
//	@Param			offset	query		int		false	"Offset"
//	@Success		200		{array}		store.User
//	@Failure		401		{object}	error
//	@Failure		403		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/users [get]
func (app *application) adminListUsersHandler(w http.ResponseWriter, r *http.Request) {
	fq := store.PaginatedQuery{
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

	users, err := app.store.Users.List(r.Context(), fq)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, users); err != nil {
		app.internalServerError(w, r, err)
	}
}

// adminUpdateUserStatusHandler godoc
//
//	@Summary		Updates a user's status (block/unblock)
//	@Description	Changes the is_active status of a user
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Param			userID	path		int		true	"User ID"
//	@Param			payload	body		object	true	"Status payload"
//	@Success		200		{object}	map[string]string
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		403		{object}	error
//	@Failure		404		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/users/{userID}/status [patch]
func (app *application) adminUpdateUserStatusHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload struct {
		IsActive bool `json:"is_active"`
	}

	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := app.store.Users.UpdateStatus(r.Context(), userID, payload.IsActive); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}

	// Log action
	adminUser := getUserFromContext(r)
	if adminUser != nil {
		action := "block_user"
		if payload.IsActive {
			action = "unblock_user"
		}
		app.logAdminAction(adminUser, action, "user", userID, "")
	}

	if err := app.jsonResponse(w, http.StatusOK, map[string]string{"message": "User status updated successfully"}); err != nil {
		app.internalServerError(w, r, err)
	}
}

// adminUpdateUserRoleHandler godoc
//
//	@Summary		Updates a user's role
//	@Description	Changes the role of a user
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Param			userID	path		int		true	"User ID"
//	@Param			payload	body		object	true	"Role payload containing role_id"
//	@Success		200		{object}	map[string]string
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		403		{object}	error
//	@Failure		404		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/users/{userID}/role [patch]
func (app *application) adminUpdateUserRoleHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload struct {
		RoleID int64 `json:"role_id" validate:"required"`
	}

	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := app.store.Users.UpdateRole(r.Context(), userID, payload.RoleID); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}

	// Log action
	adminUser := getUserFromContext(r)
	if adminUser != nil {
		app.logAdminAction(adminUser, "change_user_role", "user", userID, "")
	}

	if err := app.jsonResponse(w, http.StatusOK, map[string]string{"message": "User role updated successfully"}); err != nil {
		app.internalServerError(w, r, err)
	}
}

