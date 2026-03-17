package main

import (
	"context"
	"expvar"
	"runtime"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/joho/godotenv"
	"github.com/sikozonpc/social/internal/auth"
	"github.com/sikozonpc/social/internal/crypto"
	"github.com/sikozonpc/social/internal/db"
	"github.com/sikozonpc/social/internal/env"
	"github.com/sikozonpc/social/internal/mailer"
	"github.com/sikozonpc/social/internal/ratelimiter"
	filestorage "github.com/sikozonpc/social/internal/storage"
	"github.com/sikozonpc/social/internal/store"
	"github.com/sikozonpc/social/internal/store/cache"
	"go.uber.org/zap"
)

const version = "1.1.0"

//	@title			Real Estate API
//	@description	API for Real Estate, tool to manage real estate properties and users.
//	@termsOfService	http://swagger.io/terms/

//	@contact.name	API Support
//	@contact.url	http://www.swagger.io/support
//	@contact.email	support@swagger.io

//	@license.name	Apache 2.0
//	@license.url	http://www.apache.org/licenses/LICENSE-2.0.html

// @BasePath					/v1
//
// @securityDefinitions.apikey	ApiKeyAuth
// @in							header
// @name						Authorization
// @description
func main() {
	godotenv.Load()
	cfg := config{
		addr:        env.GetString("ADDR", ":8080"),
		apiURL:      env.GetString("EXTERNAL_URL", "localhost:8080"),
		frontendURL: env.GetString("FRONTEND_URL", "http://localhost:5173"),
		db: dbConfig{
			addr:         env.GetString("DB_ADDR", "postgres://admin:adminpassword@localhost/socialnetwork?sslmode=disable"),
			maxOpenConns: env.GetInt("DB_MAX_OPEN_CONNS", 30),
			maxIdleConns: env.GetInt("DB_MAX_IDLE_CONNS", 30),
			maxIdleTime:  env.GetString("DB_MAX_IDLE_TIME", "15m"),
		},
		redisCfg: redisConfig{
			addr:    env.GetString("REDIS_ADDR", "localhost:6379"),
			pw:      env.GetString("REDIS_PW", ""),
			db:      env.GetInt("REDIS_DB", 0),
			enabled: env.GetBool("REDIS_ENABLED", false),
		},
		env:       env.GetString("ENV", "development"),
		cryptoKey: env.GetString("ENCRYPTION_KEY", ""),
		mail: mailConfig{
			exp:       time.Hour * 24 * 3, // 3 days
			fromEmail: env.GetString("FROM_EMAIL", ""),
			sendGrid: sendGridConfig{
				apiKey: env.GetString("SENDGRID_API_KEY", ""),
			},
			mailTrap: mailTrapConfig{
				apiKey: env.GetString("MAILTRAP_API_KEY", ""),
			},
			smtp: smtpConfig{
				host:               env.GetString("SMTP_HOST", ""),
				port:               env.GetInt("SMTP_PORT", 587),
				username:           env.GetString("SMTP_USERNAME", ""),
				password:           env.GetString("SMTP_PASSWORD", ""),
				tls:                env.GetBool("SMTP_TLS", false),
				insecureSkipVerify: env.GetBool("SMTP_INSECURE_SKIP_VERIFY", false),
			},
		},
		auth: authConfig{
			basic: basicConfig{
				user: env.GetString("AUTH_BASIC_USER", "admin"),
				pass: env.GetString("AUTH_BASIC_PASS", "admin"),
			},
			token: tokenConfig{
				secret: env.GetString("AUTH_TOKEN_SECRET", "example"),
				exp:    time.Hour * 24 * 3, // 3 days
				iss:    "real-estate",
			},
		},
		rateLimiter: ratelimiter.Config{
			RequestsPerTimeFrame: env.GetInt("RATELIMITER_REQUESTS_COUNT", 20),
			TimeFrame:            time.Second * 5,
			Enabled:              env.GetBool("RATE_LIMITER_ENABLED", true),
		},
		storage: storageConfig{
			provider:  env.GetString("STORAGE_PROVIDER", "local"),
			bucket:    env.GetString("STORAGE_BUCKET", ""),
			region:    env.GetString("STORAGE_REGION", ""),
			endpoint:  env.GetString("STORAGE_ENDPOINT", ""),
			keyID:     env.GetString("STORAGE_KEY_ID", ""),
			secretKey: env.GetString("STORAGE_SECRET_KEY", ""),
		},
	}

	// Logger
	logger := zap.Must(zap.NewProduction()).Sugar()
	defer logger.Sync()

	if cfg.cryptoKey == "" {
		logger.Fatal("ENCRYPTION_KEY is required")
	}

	// Main Database
	db, err := db.New(
		cfg.db.addr,
		cfg.db.maxOpenConns,
		cfg.db.maxIdleConns,
		cfg.db.maxIdleTime,
	)
	if err != nil {
		logger.Fatal(err)
	}

	defer db.Close()
	logger.Info("database connection pool established")

	// Cache
	var rdb *redis.Client
	if cfg.redisCfg.enabled {
		rdb = cache.NewRedisClient(cfg.redisCfg.addr, cfg.redisCfg.pw, cfg.redisCfg.db)
		logger.Info("redis cache connection established")

		defer rdb.Close()
	}

	// Rate limiter
	rateLimiter := ratelimiter.NewFixedWindowLimiter(
		cfg.rateLimiter.RequestsPerTimeFrame,
		cfg.rateLimiter.TimeFrame,
	)

	// Mailer
	var mailClient mailer.Client
	if cfg.mail.mailTrap.apiKey != "" {
		mailtrap, err := mailer.NewMailTrapClient(cfg.mail.mailTrap.apiKey, cfg.mail.fromEmail)
		if err != nil {
			logger.Fatal(err)
		}
		mailClient = mailtrap
	} else if cfg.mail.sendGrid.apiKey != "" {
		mailClient = mailer.NewSendgrid(cfg.mail.sendGrid.apiKey, cfg.mail.fromEmail)
	} else if cfg.mail.smtp.host != "" {
		smtpClient, err := mailer.NewSMTPClient(mailer.SMTPConfig{
			Host:               cfg.mail.smtp.host,
			Port:               cfg.mail.smtp.port,
			Username:           cfg.mail.smtp.username,
			Password:           cfg.mail.smtp.password,
			FromEmail:          cfg.mail.fromEmail,
			UseTLS:             cfg.mail.smtp.tls,
			InsecureSkipVerify: cfg.mail.smtp.insecureSkipVerify,
		})
		if err != nil {
			logger.Fatal(err)
		}
		mailClient = smtpClient
	} else {
		if cfg.env == "production" {
			logger.Fatal("MAILTRAP_API_KEY, SENDGRID_API_KEY, or SMTP_HOST is required in production")
		}
		logger.Warn("no mailer configured; using no-op mailer")
		mailClient = mailer.NewNoopClient()
	}

	// Authenticator
	jwtAuthenticator := auth.NewJWTAuthenticator(
		cfg.auth.token.secret,
		cfg.auth.token.iss,
		cfg.auth.token.iss,
	)

	cryptor, err := crypto.NewServiceFromBase64Key(cfg.cryptoKey)
	if err != nil {
		logger.Fatal(err)
	}

	store := store.NewStorage(db, cryptor)
	cacheStorage := cache.NewRedisStorage(rdb)

	var uploader filestorage.Uploader
	switch cfg.storage.provider {
	case "", "local":
		uploader, err = filestorage.NewLocalUploader("./uploads")
	case "s3":
		uploader, err = filestorage.NewS3Uploader(context.Background(), filestorage.S3Config{
			Bucket:    cfg.storage.bucket,
			Region:    cfg.storage.region,
			Endpoint:  cfg.storage.endpoint,
			KeyID:     cfg.storage.keyID,
			SecretKey: cfg.storage.secretKey,
		})
	default:
		logger.Fatalw("invalid STORAGE_PROVIDER", "provider", cfg.storage.provider)
	}
	if err != nil {
		logger.Fatal(err)
	}
	logger.Infow("storage uploader initialized", "provider", cfg.storage.provider)

	app := &application{
		config:        cfg,
		store:         store,
		cacheStorage:  cacheStorage,
		logger:        logger,
		mailer:        mailClient,
		authenticator: jwtAuthenticator,
		rateLimiter:   rateLimiter,
		uploader:      uploader,
	}

	// Metrics collected
	expvar.NewString("version").Set(version)
	expvar.Publish("database", expvar.Func(func() any {
		return db.Stats()
	}))
	expvar.Publish("goroutines", expvar.Func(func() any {
		return runtime.NumGoroutine()
	}))

	mux := app.mount()

	logger.Fatal(app.run(mux))

}
