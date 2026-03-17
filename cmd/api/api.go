package main

import (
	"context"
	"errors"
	"expvar"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"go.uber.org/zap"

	"github.com/Lelouchlamperougexd/Valar_Morghulis/docs" // This is required to generate swagger docs
	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/auth"
	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/env"
	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/mailer"
	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/ratelimiter"
	filestorage "github.com/Lelouchlamperougexd/Valar_Morghulis/internal/storage"
	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/store"
	"github.com/Lelouchlamperougexd/Valar_Morghulis/internal/store/cache"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

type application struct {
	config        config
	store         store.Storage
	cacheStorage  cache.Storage
	logger        *zap.SugaredLogger
	mailer        mailer.Client
	authenticator auth.Authenticator
	rateLimiter   ratelimiter.Limiter
	uploader      filestorage.Uploader
}

type config struct {
	addr        string
	db          dbConfig
	env         string
	apiURL      string
	mail        mailConfig
	frontendURL string
	auth        authConfig
	redisCfg    redisConfig
	rateLimiter ratelimiter.Config
	cryptoKey   string
	storage     storageConfig
}

type storageConfig struct {
	provider  string
	bucket    string
	region    string
	endpoint  string
	keyID     string
	secretKey string
}

type redisConfig struct {
	addr    string
	pw      string
	db      int
	enabled bool
}

type authConfig struct {
	basic basicConfig
	token tokenConfig
}

type tokenConfig struct {
	secret string
	exp    time.Duration
	iss    string
}

type basicConfig struct {
	user string
	pass string
}

type mailConfig struct {
	sendGrid  sendGridConfig
	mailTrap  mailTrapConfig
	smtp      smtpConfig
	fromEmail string
	exp       time.Duration
}

type mailTrapConfig struct {
	apiKey string
}

type smtpConfig struct {
	host               string
	port               int
	username           string
	password           string
	tls                bool
	insecureSkipVerify bool
}

type sendGridConfig struct {
	apiKey string
}

type dbConfig struct {
	addr         string
	maxOpenConns int
	maxIdleConns int
	maxIdleTime  string
}

func (app *application) mount() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{env.GetString("CORS_ALLOWED_ORIGIN", "http://localhost:5173")},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	if app.config.rateLimiter.Enabled {
		r.Use(app.RateLimiterMiddleware)
	}

	// Set a timeout value on the request context (ctx), that will signal
	// through ctx.Done() that the request has timed out and further
	// processing should be stopped.
	r.Use(middleware.Timeout(60 * time.Second))

	// Stricter rate limiter for auth endpoints (5 req / 60s)
	authLimiter := ratelimiter.NewFixedWindowLimiter(5, time.Minute)
	authLimiterMiddleware := app.buildRateLimiterMiddleware(authLimiter)

	r.Route("/v1", func(r chi.Router) {
		// Operations
		r.Get("/health", app.healthCheckHandler)
		r.With(app.BasicAuthMiddleware()).Get("/debug/vars", expvar.Handler().ServeHTTP)

		docsURL := fmt.Sprintf("%s/swagger/doc.json", app.config.addr)
		r.Get("/swagger/*", httpSwagger.Handler(httpSwagger.URL(docsURL)))

		r.Route("/users", func(r chi.Router) {
			r.Put("/activate/{token}", app.activateUserHandler)

			r.With(app.AuthTokenMiddleware).Get("/", app.getUserByEmailHandler)

			r.Route("/{userID}", func(r chi.Router) {
				r.Use(app.AuthTokenMiddleware)

				r.Get("/", app.getUserHandler)
			})
		})

		r.Route("/projects", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Post("/", app.createProjectHandler)
			r.Get("/", app.listProjectsHandler)
			r.Route("/{projectID}", func(r chi.Router) {
				r.Get("/", app.getProjectHandler)
				r.Patch("/", app.updateProjectHandler)
				r.Delete("/", app.deleteProjectHandler)
			})
		})

		r.Route("/listings", func(r chi.Router) {
			r.Get("/", app.listListingsHandler)
			r.Get("/{listingID}", app.getListingHandler)
			r.With(app.AuthTokenMiddleware).Post("/", app.createListingHandler)
			r.With(app.AuthTokenMiddleware).Patch("/{listingID}", app.updateListingHandler)
			r.With(app.AuthTokenMiddleware).Delete("/{listingID}", app.deleteListingHandler)
			r.With(app.AuthTokenMiddleware).Post("/{listingID}/media", app.uploadListingMediaHandler)
			r.With(app.AuthTokenMiddleware).Delete("/{listingID}/media/{mediaID}", app.deleteListingMediaHandler)
			r.With(app.AuthTokenMiddleware).Post("/{listingID}/applications", app.createApplicationHandler)
		})

		r.Route("/dashboard", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Get("/overview", app.dashboardOverviewHandler)
		})

		r.Route("/favorites", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Get("/", app.listFavoritesHandler)
			r.Post("/{listingID}", app.addFavoriteHandler)
			r.Delete("/{listingID}", app.removeFavoriteHandler)
		})

		r.Route("/chats", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Get("/", app.listChatsHandler)
		})

		r.Route("/complaints", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Post("/", app.createComplaintHandler)
		})

		r.Route("/users/me", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Patch("/", app.updateProfileHandler)
			r.Put("/password", app.changePasswordHandler)
		})

		r.Route("/applications", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Get("/", app.listApplicationsHandler)
			r.Route("/{applicationID}", func(r chi.Router) {
				r.Patch("/status", app.updateApplicationStatusHandler)
				r.Get("/messages", app.listApplicationMessagesHandler)
				r.Post("/messages", app.createApplicationMessageHandler)
			})
		})

		// Public routes
		r.Route("/authentication", func(r chi.Router) {
			r.With(authLimiterMiddleware).Post("/user", app.registerUserHandler)
			r.With(authLimiterMiddleware).Post("/company", app.registerCompanyHandler)
			r.With(authLimiterMiddleware).Post("/token", app.createTokenHandler)
			r.With(authLimiterMiddleware).Post("/admin/token", app.createAdminTokenHandler)

			// Protected auth routes
			r.With(app.AuthTokenMiddleware).Get("/me", app.getCurrentUserHandler)
		})

		// Public invite validation
		r.Get("/invites/{token}", app.getInviteHandler)

		// Admin routes
		r.Route("/admin", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Use(app.adminOnlyMiddleware)

			r.Route("/companies", func(r chi.Router) {
				r.Get("/", app.listCompaniesHandler)
				r.Route("/{companyID}", func(r chi.Router) {
					r.Get("/", app.getCompanyHandler)
					r.Put("/verify", app.verifyCompanyHandler)
				})
			})

			r.Route("/listings", func(r chi.Router) {
				r.Get("/", app.adminListListingsHandler)
				r.Put("/{listingID}/status", app.adminUpdateListingStatusHandler)
			})

			r.Route("/complaints", func(r chi.Router) {
				r.Get("/", app.adminListComplaintsHandler)
				r.Get("/{complaintID}", app.adminGetComplaintHandler)
				r.Patch("/{complaintID}/status", app.adminUpdateComplaintStatusHandler)
			})

			r.Route("/users", func(r chi.Router) {
				r.Get("/", app.adminListUsersHandler)
				r.Patch("/{userID}/status", app.adminUpdateUserStatusHandler)
				r.Patch("/{userID}/role", app.adminUpdateUserRoleHandler)
			})

			r.Route("/stats", func(r chi.Router) {
				r.Get("/overview", app.adminStatsOverviewHandler)
				r.Get("/activity", app.adminStatsActivityHandler)
			})

			r.Get("/logs", app.adminListLogsHandler)

			r.Post("/invites", app.createInviteHandler)
		})
	})

	return r
}

func (app *application) run(mux http.Handler) error {
	// Docs
	docs.SwaggerInfo.Version = version
	docs.SwaggerInfo.Host = app.config.apiURL
	docs.SwaggerInfo.BasePath = "/v1"

	srv := &http.Server{
		Addr:         app.config.addr,
		Handler:      mux,
		WriteTimeout: time.Second * 30,
		ReadTimeout:  time.Second * 10,
		IdleTimeout:  time.Minute,
	}

	shutdown := make(chan error)

	go func() {
		quit := make(chan os.Signal, 1)

		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		s := <-quit

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		app.logger.Infow("signal caught", "signal", s.String())

		shutdown <- srv.Shutdown(ctx)
	}()

	app.logger.Infow("server has started", "addr", app.config.addr, "env", app.config.env)

	err := srv.ListenAndServe()
	if !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	err = <-shutdown
	if err != nil {
		return err
	}

	app.logger.Infow("server has stopped", "addr", app.config.addr, "env", app.config.env)

	return nil
}

