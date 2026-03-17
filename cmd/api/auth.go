package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/sikozonpc/social/internal/crypto"
	"github.com/sikozonpc/social/internal/mailer"
	"github.com/sikozonpc/social/internal/store"
)

type RegisterUserPayload struct {
	FirstName            string `json:"first_name" validate:"required,max=100,name"`
	LastName             string `json:"last_name" validate:"required,max=100,name"`
	Email                string `json:"email" validate:"required,max=255,email_regex"`
	Phone                string `json:"phone" validate:"required,max=20"`
	Password             string `json:"password" validate:"required,min=8,max=72,password"`
	PasswordConfirmation string `json:"password_confirmation" validate:"required,eqfield=Password"`
}

type RegisterCompanyPayload struct {
	// Company info
	CompanyName        string `json:"company_name" validate:"required,max=255"`
	RegistrationNumber string `json:"registration_number" validate:"required,max=50"`
	City               string `json:"city" validate:"required,max=100"`
	CompanyEmail       string `json:"company_email" validate:"required,max=255,email_regex"`
	CompanyPhone       string `json:"company_phone" validate:"required,max=20"`
	CompanyType        string `json:"company_type" validate:"required,oneof=agency developer"`

	// Contact person
	FirstName string `json:"first_name" validate:"required,max=100,name"`
	LastName  string `json:"last_name" validate:"required,max=100,name"`
	JobTitle  string `json:"job_title" validate:"required,max=100"`

	// Security
	Password             string `json:"password" validate:"required,min=8,max=72,password"`
	PasswordConfirmation string `json:"password_confirmation" validate:"required,eqfield=Password"`

	// Optional invite token
	InviteToken string `json:"invite_token,omitempty"`
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

	username := generateUsername(payload.FirstName, payload.LastName, payload.Email)

	user := &store.User{
		Username:  username,
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		Email:     payload.Email,
		Phone:     payload.Phone,
		Role: store.Role{
			Name: store.RoleUser,
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
	activationURL := app.buildActivationURL(plainToken)

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

		if !isProdEnv {
			app.logger.Warnw("email delivery failed in non-production; registration continues", "user_id", user.ID, "email", user.Email)
			if err := app.jsonResponse(w, http.StatusCreated, userWithToken); err != nil {
				app.internalServerError(w, r, err)
			}
			return
		}

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

// LoginResponse is returned on successful login
type LoginResponse struct {
	Token string      `json:"token"`
	User  *store.User `json:"user"`
}

type CreateUserTokenPayload struct {
	Email    string `json:"email" validate:"required,max=255,email_regex"`
	Password string `json:"password" validate:"required,min=3,max=72"`
}

// createTokenHandler godoc
//
//	@Summary		User login
//	@Description	Authenticates a user (any role) and returns a JWT token with user info
//	@Tags			authentication
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		CreateUserTokenPayload	true	"User credentials"
//	@Success		200		{object}	LoginResponse			"Login successful"
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
			_ = app.logLoginEvent(r, nil, payload.Email, false)
			app.unauthorizedErrorResponse(w, r, err)
		default:
			_ = app.logLoginEvent(r, nil, payload.Email, false)
			app.internalServerError(w, r, err)
		}
		return
	}

	if err := user.Password.Compare(payload.Password); err != nil {
		_ = app.logLoginEvent(r, &user.ID, payload.Email, false)
		app.unauthorizedErrorResponse(w, r, err)
		return
	}

	_ = app.logLoginEvent(r, &user.ID, payload.Email, true)

	token, err := app.generateToken(user.ID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	response := LoginResponse{
		Token: token,
		User:  user,
	}

	if err := app.jsonResponse(w, http.StatusOK, response); err != nil {
		app.internalServerError(w, r, err)
	}
}

// createAdminTokenHandler godoc
//
//	@Summary		Admin login
//	@Description	Authenticates an admin or moderator and returns a JWT token. Rejects non-admin users.
//	@Tags			authentication
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		CreateUserTokenPayload	true	"Admin credentials"
//	@Success		200		{object}	LoginResponse			"Admin login successful"
//	@Failure		400		{object}	error
//	@Failure		401		{object}	error
//	@Failure		403		{object}	error
//	@Failure		500		{object}	error
//	@Router			/authentication/admin/token [post]
func (app *application) createAdminTokenHandler(w http.ResponseWriter, r *http.Request) {
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
			_ = app.logLoginEvent(r, nil, payload.Email, false)
			app.unauthorizedErrorResponse(w, r, err)
		default:
			_ = app.logLoginEvent(r, nil, payload.Email, false)
			app.internalServerError(w, r, err)
		}
		return
	}

	// Only admin and moderator roles are allowed
	if user.Role.Name != store.RoleAdmin && user.Role.Name != store.RoleModerator {
		_ = app.logLoginEvent(r, &user.ID, payload.Email, false)
		app.forbiddenResponse(w, r)
		return
	}

	if err := user.Password.Compare(payload.Password); err != nil {
		_ = app.logLoginEvent(r, &user.ID, payload.Email, false)
		app.unauthorizedErrorResponse(w, r, err)
		return
	}

	_ = app.logLoginEvent(r, &user.ID, payload.Email, true)

	token, err := app.generateToken(user.ID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	response := LoginResponse{
		Token: token,
		User:  user,
	}

	if err := app.jsonResponse(w, http.StatusOK, response); err != nil {
		app.internalServerError(w, r, err)
	}
}

// getCurrentUserHandler godoc
//
//	@Summary		Get current user
//	@Description	Returns the currently authenticated user's profile
//	@Tags			authentication
//	@Produce		json
//	@Success		200	{object}	store.User
//	@Failure		401	{object}	error
//	@Security		ApiKeyAuth
//	@Router			/authentication/me [get]
func (app *application) getCurrentUserHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if err := app.jsonResponse(w, http.StatusOK, user); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) generateToken(userID int64) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(app.config.auth.token.exp).Unix(),
		"iat": time.Now().Unix(),
		"nbf": time.Now().Unix(),
		"iss": app.config.auth.token.iss,
		"aud": app.config.auth.token.iss,
	}

	return app.authenticator.GenerateToken(claims)
}

// registerCompanyHandler godoc
//
//	@Summary		Registers a company (agency or developer)
//	@Description	Registers a company with a contact person account. The company will be in "pending" verification status.
//	@Tags			authentication
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		RegisterCompanyPayload	true	"Company and contact person credentials"
//	@Success		201		{object}	UserWithToken			"Company and user registered"
//	@Failure		400		{object}	error
//	@Failure		500		{object}	error
//	@Router			/authentication/company [post]
func (app *application) registerCompanyHandler(w http.ResponseWriter, r *http.Request) {
	var payload RegisterCompanyPayload
	if err := readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	ctx := r.Context()

	// Validate invite token if provided
	var invite *store.RegistrationInvite
	if payload.InviteToken != "" {
		var err error
		invite, err = app.store.Invites.GetByToken(ctx, payload.InviteToken)
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

		if invite.CompanyType != payload.CompanyType {
			app.badRequestResponse(w, r, fmt.Errorf("company_type mismatch: token is for %q", invite.CompanyType))
			return
		}
	}

	company := &store.Company{
		Name:               payload.CompanyName,
		RegistrationNumber: payload.RegistrationNumber,
		City:               payload.City,
		Email:              payload.CompanyEmail,
		Phone:              payload.CompanyPhone,
		Type:               payload.CompanyType,
	}

	username := generateUsername(payload.FirstName, payload.LastName, payload.CompanyEmail)

	user := &store.User{
		Username:  username,
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		Email:     payload.CompanyEmail,
		Phone:     payload.CompanyPhone,
		JobTitle:  payload.JobTitle,
		Role: store.Role{
			Name: payload.CompanyType, // "agency" or "developer"
		},
	}

	if err := user.Password.Set(payload.Password); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	plainToken := uuid.New().String()
	hash := sha256.Sum256([]byte(plainToken))
	hashToken := hex.EncodeToString(hash[:])

	for attempt := 0; attempt < 5; attempt++ {
		err := app.store.Users.CreateCompanyAndUser(ctx, company, user, hashToken, app.config.mail.exp)
		if err == nil {
			break
		}

		switch err {
		case store.ErrDuplicateEmail:
			app.badRequestResponse(w, r, err)
			return
		case store.ErrDuplicateCompanyEmail:
			app.badRequestResponse(w, r, err)
			return
		case store.ErrDuplicateRegistrationNumber:
			app.badRequestResponse(w, r, err)
			return
		case store.ErrDuplicateUsername:
			user.Username = generateUsername(payload.FirstName, payload.LastName, payload.CompanyEmail)
			continue
		default:
			app.internalServerError(w, r, err)
			return
		}
	}

	if user.ID == 0 {
		app.badRequestResponse(w, r, store.ErrDuplicateUsername)
		return
	}

	// Mark invite token as used if it was provided
	if invite != nil {
		if err := app.store.Invites.MarkUsed(ctx, invite.ID); err != nil {
			app.internalServerError(w, r, err)
			return
		}
	}

	userWithToken := UserWithToken{
		User:  user,
		Token: plainToken,
	}
	activationURL := app.buildActivationURL(plainToken)

	isProdEnv := app.config.env == "production"
	vars := struct {
		Username      string
		ActivationURL string
	}{
		Username:      user.Username,
		ActivationURL: activationURL,
	}

	status, err := app.mailer.Send(mailer.UserWelcomeTemplate, user.Username, user.Email, vars, !isProdEnv)
	if err != nil {
		app.logger.Errorw("error sending welcome email", "error", err)

		if !isProdEnv {
			app.logger.Warnw("email delivery failed in non-production; registration continues", "user_id", user.ID, "email", user.Email, "company_id", company.ID)
			if err := app.jsonResponse(w, http.StatusCreated, userWithToken); err != nil {
				app.internalServerError(w, r, err)
			}
			return
		}

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

func (app *application) logLoginEvent(r *http.Request, userID *int64, email string, success bool) error {
	ip := r.RemoteAddr
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		ip = host
	}

	event := &store.LoginEvent{
		UserID:    userID,
		EmailHash: crypto.HashEmail(email),
		IP:        ip,
		UserAgent: r.UserAgent(),
		Success:   success,
	}

	return app.store.LoginEvents.Create(r.Context(), event)
}

func (app *application) buildActivationURL(token string) string {
	base := strings.TrimRight(app.config.frontendURL, "/")
	escapedToken := url.QueryEscape(token)

	// In development we prefer query token, because static servers often do not
	// support SPA deep links like /confirm/{token} without extra rewrite config.
	if app.config.env != "production" {
		return fmt.Sprintf("%s/?token=%s", base, escapedToken)
	}

	return fmt.Sprintf("%s/confirm/%s", base, escapedToken)
}
