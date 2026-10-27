# Database Configuration - 2026-10-27

## Request

Remove the backend's hardcoded local MySQL connection settings while preserving the existing pool behavior and allowing local development configuration through the ignored root `.env` file and deployment configuration through the host environment.

## Implementation

- `src/index.js` loads dotenv before importing routes, controllers, or models.
- `src/config/db.js` now requires `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` before constructing the MySQL pool.
- Missing configuration stops startup with the names of missing variables only; no credential values are logged.
- The existing pool limits, idle timeout, queue behavior, and keepalive settings remain unchanged.
- `.env.example` documents the four required variable names with safe local placeholders. Its pre-existing `DATABASE_URL` line remains because no application code uses it and it was not repurposed.

## Local and production behavior

For local development, dotenv reads the ignored root `.env` file. In production, the host provides the same variables through `process.env`; no physical `.env` file is required and no development fallback credentials exist.

## Verification

- `node --check src/index.js` passed.
- `node --check src/config/db.js` passed.
- `git diff --check` passed.
- Loading the database module with the required variables absent produced the expected configuration error naming each missing variable.
- A real database connection was not made during the remediation check because the local `.env` had not yet been populated with the new `DB_*` variables.
