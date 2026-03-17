package main

import (
	"context"
	"net/http"

	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/store"
)

// adminListLogsHandler godoc
//
//	@Summary		Lists admin action logs
//	@Description	Returns a paginated list of actions performed by administrators and moderators
//	@Tags			admin
//	@Produce		json
//	@Param			limit	query		int	false	"Limit"
//	@Param			offset	query		int	false	"Offset"
//	@Success		200		{array}		store.AdminAction
//	@Failure		401		{object}	error
//	@Failure		403		{object}	error
//	@Failure		500		{object}	error
//	@Security		ApiKeyAuth
//	@Router			/admin/logs [get]
func (app *application) adminListLogsHandler(w http.ResponseWriter, r *http.Request) {
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

	logs, err := app.store.AdminActions.List(r.Context(), fq)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, logs); err != nil {
		app.internalServerError(w, r, err)
	}
}

// logAdminAction is a helper function to log an action performed by an admin or moderator.
func (app *application) logAdminAction(user *store.User, actionType string, targetType string, targetID int64, details string) {
	if user == nil {
		app.logger.Warn("logAdminAction: no user provided")
		return
	}

	action := &store.AdminAction{
		AdminID:    user.ID,
		ActionType: actionType,
		TargetType: targetType,
		TargetID:   targetID,
		Details:    details,
	}

	// Make sure we're not tied to the request timeout if it returns early
	go func() {
		// New background context
		bgCtx := context.Background()
		if err := app.store.AdminActions.Create(bgCtx, action); err != nil {
			app.logger.Errorw("failed to create admin action log", "error", err)
		}
	}()
}

