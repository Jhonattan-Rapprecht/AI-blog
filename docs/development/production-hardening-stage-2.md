# Production Hardening Stage 2

## Scope

Stage 2 protects administrator sign-in attempts and public article-read analytics without changing public article presentation or the Creative Studio work.

## Configuration

The API defaults to five failed attempts per account/IP pair in fifteen minutes and twenty failed attempts per IP in that same window. `AUTH_LOGIN_*` values can tighten or relax these limits within validated bounds. A throttled request receives HTTP 429 and `Retry-After`; invalid credentials always use a generic response.

`TRUST_PROXY` is **false by default**. Set it only when a known reverse proxy strips client-supplied forwarding headers, using `loopback`, `linklocal`, `uniquelocal`, or an explicit positive hop count. Do not enable it merely because a host sends `X-Forwarded-For`.

Public analytics is limited per hashed IP (`PUBLIC_ANALYTICS_*`) and deduplicated per article/browser session for `PUBLIC_ANALYTICS_DEDUPE_SECONDS` (30 minutes by default). The client sends a random session-only UUID; the API stores only an HMAC fingerprint and returns an opaque tracking token, not a database row ID.

## Deployment notes

The limiter uses the existing shared MySQL database so all API instances enforce the same limits. Stage 3 provisions the protection tables through authoritative migration 004; the runtime database user must not require DDL privileges. Expired rows are bounded by key rather than one row per request; operational retention/cleanup may be added later if traffic warrants it.

JWTs remain stored in browser local storage by the existing application. This stage documents and assesses that risk only: a future migration to short-lived, HttpOnly, Secure, SameSite cookies requires a separate authentication compatibility design and is not included here.

## Verification status

- Node tests cover configuration validation, opaque/scoped HMAC keys, constant-time credential comparison, threshold behavior, retry calculation, and window recovery.
- Frontend type-check/build, Astro production build, backend syntax checks, and `git diff --check` passed.
- A real MySQL integration/concurrency run was intentionally not performed during this change: first use creates additive protection tables and would modify the local database. Before deployment, verify the database account can provision the schema (or pre-provision it), test 429/`Retry-After` through the reverse proxy, and exercise concurrent attempts across every API instance.

## Stage 3 migration follow-up

Replace the current lazy compatibility DDL with one versioned deployment migration covering `request_protection_buckets`, `article_view_deduplications`, and `article_read_views.client_token`. The migration must backfill a distinct opaque token for legacy analytics rows before making that column non-null, add the unique/index/foreign-key constraints idempotently, and include rollback/retention guidance. Do not run that migration automatically at application startup.
