package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/sikozonpc/social/internal/mailer"
	"github.com/sikozonpc/social/internal/store"
)

type RegisterUserPayload struct {
	FirstName            string `json:"first_name" validate:"required,max=100"`
	LastName             string `json:"last_name" validate:"required,max=100"`
	Country              string `json:"country" validate:"required,max=100"`
	Email                string `json:"email" validate:"required,email,max=255"`
	Password             string `json:"password" validate:"required,min=3,max=72"`
	PasswordConfirmation string `json:"password_confirmation" validate:"required,eqfield=Password"`
	Username             string `json:"username" validate:"omitempty,max=100"`
}

type UserWithToken struct {
	*store.User
	Token string `json:"token"`
}

// registerUserHandler godoc
//
//	@Summary		Registers a user
//	@Description	Registers a user
//	@Tags			authentication
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		RegisterUserPayload	true	"User credentials"
//	@Success		201		{object}	UserWithToken		"User registered"
//	@Failure		400		{object}	error
//	@Failure		500		{object}	error
//	@Router			/authentication/user [post]
func (app *application) registerUserHandler(w http.ResponseWriter, r *http.Request) {
	var payload RegisterUserPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	username := payload.Username
	if username == "" {
		username = generateUsername(payload.FirstName, payload.LastName, payload.Email)
	}

	user := &store.User{
		Username:  username,
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		Country:   payload.Country,
		Email:     payload.Email,
		Role: store.Role{
			Name: "user",
		},
	}

	// hash the user password
	if err := user.Password.Set(payload.Password); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	ctx := r.Context()

	plainToken := uuid.New().String()

	// hash the token for storage but keep the plain token for email
	hash := sha256.Sum256([]byte(plainToken))
	hashToken := hex.EncodeToString(hash[:])

	// retry a few times if we generated a username that collides
	for attempt := 0; attempt < 5; attempt++ {
		err := app.store.Users.CreateAndInvite(ctx, user, hashToken, app.config.mail.exp)
		if err == nil {
			break
		}

		switch err {
		case store.ErrDuplicateEmail:
			app.badRequestResponse(w, r, err)
			return
		case store.ErrDuplicateUsername:
			user.Username = generateUsername(payload.FirstName, payload.LastName, payload.Email)
			continue
		default:
			app.internalServerError(w, r, err)
			return
		}
	}

	// If we exhausted retries, CreateAndInvite would have returned ErrDuplicateUsername
	// on the final attempt and we'd have continued, so we need an explicit check here.
	// The simplest signal: user.ID is set only on success.
	if user.ID == 0 {
		app.badRequestResponse(w, r, store.ErrDuplicateUsername)
		return
	}

	userWithToken := UserWithToken{
		User:  user,
		Token: plainToken,
	}
	activationURL := fmt.Sprintf("%s/confirm/%s", app.config.frontendURL, plainToken)

	isProdEnv := app.config.env == "production"
	vars := struct {
		Username      string
		ActivationURL string
	}{
		Username:      user.Username,
		ActivationURL: activationURL,
	}

	// send mail
	status, err := app.mailer.Send(mailer.UserWelcomeTemplate, user.Username, user.Email, vars, !isProdEnv)
	if err != nil {
		app.logger.Errorw("error sending welcome email", "error", err)

		// rollback user creation if email fails (SAGA pattern)
		if err := app.store.Users.Delete(ctx, user.ID); err != nil {
			app.logger.Errorw("error deleting user", "error", err)
		}

		app.internalServerError(w, r, err)
		return
	}

	app.logger.Infow("Email sent", "status code", status)

	if err := app.jsonResponse(w, http.StatusCreated, userWithToken); err != nil {
		app.internalServerError(w, r, err)
	}
}

var usernameNonAlnum = regexp.MustCompile(`[^a-z0-9]+`)

func generateUsername(firstName, lastName, email string) string {
	base := strings.TrimSpace(strings.ToLower(firstName + "." + lastName))
	base = usernameNonAlnum.ReplaceAllString(base, "")
	if base == "" {
		base = strings.ToLower(strings.Split(email, "@")[0])
		base = usernameNonAlnum.ReplaceAllString(base, "")
	}

	if base == "" {
		return uuid.New().String()[:12]
	}

	// keep it reasonably short
	if len(base) > 20 {
		base = base[:20]
	}

	// add a small suffix to reduce collisions
	suffix := uuid.New().String()[:6]
	return base + suffix
}

type CreateUserTokenPayload struct {
	Email    string `json:"email" validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,min=3,max=72"`
}

// createTokenHandler godoc
//
//	@Summary		Creates a token
//	@Description	Creates a token for a user
//	@Tags			authentication
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		CreateUserTokenPayload	true	"User credentials"
//	@Success		200		{string}	string					"Token"
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		500		{object}	error
//	@Router			/authentication/token [post]
func (app *application) createTokenHandler(w http.ResponseWriter, r *http.Request) {
	var payload CreateUserTokenPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user, err := app.store.Users.GetByEmail(r.Context(), payload.Email)
	if err != nil {
		switch err {
		case store.ErrNotFound:
			app.unauthorizedErrorResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}

	if err := user.Password.Compare(payload.Password); err != nil {
		app.unauthorizedErrorResponse(w, r, err)
		return
	}

	claims := jwt.MapClaims{
		"sub": user.ID,
		"exp": time.Now().Add(app.config.auth.token.exp).Unix(),
		"iat": time.Now().Unix(),
		"nbf": time.Now().Unix(),
		"iss": app.config.auth.token.iss,
		"aud": app.config.auth.token.iss,
	}

	token, err := app.authenticator.GenerateToken(claims)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, token); err != nil {
		app.internalServerError(w, r, err)
	}
}
