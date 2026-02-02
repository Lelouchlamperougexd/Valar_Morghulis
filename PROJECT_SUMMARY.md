# Real Estate — Project Summary (Architect View)

## 1) What this project is
Real Estate is a small social-network backend API (plus a minimal React UI) that supports:

- User registration via invitation/activation token
- JWT-based authentication
- Creating, reading, updating, deleting posts
- Following/unfollowing users
- A personalized feed (posts from followed users + own posts)
- Comments on posts (currently read via the post endpoint; no public “create comment” endpoint wired yet)
- Optional Redis caching for user lookups
- Request rate limiting
- Swagger/OpenAPI docs

The backend is implemented as a Go HTTP service under `cmd/api` and uses Postgres as the system of record.

## 2) Primary technologies

### Backend
- Language/runtime: Go 1.22 ([go.mod](go.mod))
- HTTP router + middleware: `go-chi/chi`
- Database: PostgreSQL (via `lib/pq`)
- Cache: Redis (optional, via `go-redis/redis/v8`)
- Auth: JWT (`golang-jwt/jwt/v5`)
- Validation: `go-playground/validator/v10`
- Logging: `uber-go/zap`
- API docs: `swaggo/swag` + `swaggo/http-swagger`

### Frontend
- React 18 + TypeScript + Vite ([web/package.json](web/package.json))
- Router: `react-router-dom`

### Local infrastructure
- Docker Compose provides Postgres + Redis + Redis Commander ([docker-compose.yml](docker-compose.yml))

## 3) Repository structure (what lives where)

- `cmd/api/`: HTTP server entrypoint + routing + handlers + middleware
  - `main.go`: configuration + wiring (DB, optional Redis, mailer, JWT auth, rate limiter)
  - `api.go`: router mounting and graceful shutdown
  - `auth.go`, `users.go`, `posts.go`, `feed.go`: main handlers
  - `middleware.go`: JWT auth middleware, BasicAuth for debug vars, role checks, caching helper, rate limiter middleware
  - `json.go`, `errors.go`: request/response envelopes and error mapping
- `internal/store/`: persistence layer (SQL queries) and domain-ish models
  - `users.go`, `posts.go`, `followers.go`, `comments.go`, `roles.go`
  - `pagination.go`: feed query parsing/validation (used by `/users/feed`)
- `internal/store/cache/`: Redis-backed cache for user objects
- `internal/auth/`: JWT authenticator implementation
- `internal/db/`: DB connection helper and a data seeder
- `internal/mailer/`: Mail client abstraction + implementations
  - Mailtrap SMTP client (used in dev if configured)
  - No-op mailer fallback (dev only)
- `cmd/migrate/migrations/`: SQL migrations for schema evolution
- `cmd/migrate/seed/`: (removed) database seeder (not used for the Real Estate platform)
- `docs/`: generated Swagger docs (`swagger.yaml`, `swagger.json`), plus the `docs.go` binding used by swag
- `web/`: Vite React UI (currently minimal)

## 4) High-level runtime architecture

**Request flow**

1. `chi` middleware stack: request ID, real IP, logging, panic recovery, CORS, optional rate limiting, request timeout.
2. Router under `/v1` dispatches to handlers.
3. Protected routes apply `AuthTokenMiddleware` (Bearer JWT).
4. Handlers validate JSON payloads and call `internal/store` methods.
5. Responses use a consistent JSON envelope (see below).

**Data stores**
- PostgreSQL is authoritative for users/posts/followers/roles/comments/invitations.
- Redis cache is optional and currently used for caching user lookups by ID.

## 5) API conventions (important behavioral details)

### Base path
All API endpoints are mounted under `/v1`.

### Response envelope
Most handlers return:

```json
{ "data": <payload> }
```

Errors return:

```json
{ "error": "message" }
```

### Authentication
- **JWT Bearer** for protected routes
  - Header: `Authorization: Bearer <jwt>`
- **Basic auth** for debug vars
  - Header: `Authorization: Basic <base64(user:pass)>`

### Rate limiting
A fixed-window limiter is enabled by default (configurable via env). When exceeded:
- HTTP 429
- Header: `Retry-After: <duration>`

### Swagger docs
Swagger UI is mounted at:
- `GET /v1/swagger/index.html`

OpenAPI spec is in:
- [docs/swagger.yaml](docs/swagger.yaml)

## 6) Endpoint catalog
This catalog reflects the router wiring in `cmd/api/api.go` and the generated Swagger.

### Operations
- `GET /v1/health` — Healthcheck (returns status/env/version)
- `GET /v1/debug/vars` — Expvar metrics (Basic Auth required)
- `GET /v1/swagger/*` — Swagger UI

### Authentication (public)
- `POST /v1/authentication/user` — Register a user and create an activation invitation
  - Sends an email (Mailtrap in dev if configured; otherwise no-op mailer)
  - Returns user data + a **plain** activation token (used by the frontend confirmation page)
- `POST /v1/authentication/token` — Create a JWT token for an active user

### Users
- `PUT /v1/users/activate/{token}` — Activate a user invitation token
  - Note: the router currently exposes this without JWT; Swagger marks it as ApiKeyAuth, but the handler is effectively public.
- `GET /v1/users/{userID}` — Get user profile (JWT)
- `PUT /v1/users/{userID}/follow` — Follow a user (JWT)
- `PUT /v1/users/{userID}/unfollow` — Unfollow a user (JWT)
- `GET /v1/users/feed` — Personalized feed (JWT)
  - Query supports limit/offset/sort/tags/search (see swagger for full list)

### Posts
- `POST /v1/posts` — Create a post (JWT)
- `GET /v1/posts/{postID}` — Get a post by ID (JWT)
  - Also fetches and embeds comments for the post
- `PATCH /v1/posts/{postID}` — Update a post (JWT)
  - Ownership enforced; non-owner must have sufficient role level (e.g., moderator)
  - Uses optimistic concurrency via `version` field in DB
- `DELETE /v1/posts/{postID}` — Delete a post (JWT)
  - Ownership enforced; non-owner must have sufficient role level (e.g., admin)

## 7) Data model highlights (from migrations)
Migrations under `cmd/migrate/migrations/` indicate the core schema concepts:

- `users` with activation state (`is_active`) and profile fields
- `roles` with role levels (used for authorization precedence)
- `posts` with tags and versioning for concurrency-safe updates
- `comments` associated to posts
- `followers` graph for feed generation
- `user_invitations` with expiry for activation tokens

## 8) Frontend (web) behavior
The UI under `web/` is intentionally minimal:

- Route: `/confirm/:token` calls `PUT /v1/users/activate/{token}`
- `VITE_API_URL` configures the backend base URL; defaults to `http://localhost:8080/v1`

## 9) Getting started (local development)

### Prerequisites
- Go 1.22+
- Docker Desktop (recommended for Postgres/Redis)
- Node.js 18+ (for the web UI)

### Start dependencies (Postgres + Redis)
From repo root:

```bash
docker compose up -d
```

- Postgres exposed on `localhost:5432`
- Redis exposed on `localhost:6379`
- Redis Commander exposed on `http://127.0.0.1:8081`

### Configure environment
The app reads environment variables directly; it does **not** automatically load `.env`.

- Use the provided [.env](.env) as a reference and export those variables in your shell/IDE run config.
- Safe defaults exist for most values, but DB/mail/auth values are commonly overridden.

### Run database migrations
This repo expects the `migrate` CLI (golang-migrate) to be available.

- Migrations live at `cmd/migrate/migrations/`
- The Make targets reference `DB_ADDR` and `MIGRATIONS_PATH`

Examples:

```bash
migrate -path=./cmd/migrate/migrations -database="$DB_ADDR" up
```

### Seed sample data (optional)

```bash
(seeding removed)
```

### Run the API

```bash
go run ./cmd/api
```

Then open:
- Swagger UI: `http://localhost:8080/v1/swagger/index.html`
- Healthcheck: `http://localhost:8080/v1/health`

### Run the web app

```bash
cd web
npm install
npm run dev
```

## 10) Testing
- Run unit tests:

```bash
go test ./...
```

Notable tests:
- Rate limiter behavior: `cmd/api/api_test.go`
- Cache behavior for user lookups: `cmd/api/users_test.go`

## 11) Deployment notes

### Container image
A two-stage Docker build produces a static Linux binary (CGO disabled) and runs it in `scratch`.
See [Dockerfile](Dockerfile).

### Production considerations
- Configure `AUTH_TOKEN_SECRET` to a strong secret.
- Configure Mailtrap (or implement/enable SendGrid) for email workflows.
- Consider replacing in-memory rate limiter with a distributed limiter if running multiple replicas.
- Add `.envrc`/dotenv loading or document the preferred env loading mechanism (Makefile references `.envrc`, but it is not present in the repo).

## 12) Known mismatches / gotchas
- Swagger marks `PUT /users/activate/{token}` as ApiKeyAuth, but the router exposes it without JWT.
- Some Swagger status codes differ from handler behavior (e.g., token creation uses JSON envelope and `201`).
- Makefile’s `gen-docs` target references `-g ./api/main.go`, but the main entrypoint is `cmd/api/main.go`.
