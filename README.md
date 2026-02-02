
# Real Estate

## Email (dev)

By default, the API sends a registration confirmation email (activation link) when you call the registration endpoint.

You can use **any SMTP provider** by setting:

- `FROM_EMAIL` — the address that will appear as the sender
- `SMTP_HOST` — e.g. `smtp.gmail.com`
- `SMTP_PORT` — usually `587` (STARTTLS) or `465` (TLS)
- `SMTP_USERNAME` — your SMTP login (often the full email address)
- `SMTP_PASSWORD` — SMTP password / app password
- `SMTP_TLS` — set `true` to force TLS (recommended for port 465)
- `SMTP_INSECURE_SKIP_VERIFY` — set `true` only for local testing with self-signed certs

If `MAILTRAP_API_KEY` is set, Mailtrap is used with higher priority.

### Testing rate limiter

```bash
 npx autocannon -r 22 -d 1 -c 1 --renderStatusCodes http://localhost:8080/v1/health
```