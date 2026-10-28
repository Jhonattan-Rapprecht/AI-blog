# Production Hardening Stage 3

Date: 2026-10-28
Branch: `fix/production-hardening-stage-3`

## Scope and architecture

Stage 3 replaces request-time schema creation with explicit, ordered MySQL
migrations under `database/migrations/`:

| Version | Purpose |
| --- | --- |
| 001 | Core editorial content, media, topics, tags, articles, and AI generations |
| 002 | Reviews, topic history, language references, and activity logging |
| 003 | Creative Studio publication settings and article overrides |
| 004 | Analytics, request-protection buckets, and analytics deduplication |

`database/migrate.js` loads only approved migration files, orders them by
version, and calculates SHA-256 checksums. It uses a MySQL advisory lock while
applying migrations. Failed migrations are never recorded as applied.

The API does not run migrations automatically. At startup it reads the complete
`schema_migrations` history and rejects missing metadata, pending versions,
checksum mismatches, and unknown recorded versions. Startup verification is
read-only. Deployments must run approved migrations separately with a
migration-capable account.

## Commands

```text
npm run db:migrate:status
npm run db:migrate:verify
npm run db:migrate:inspect
npm run db:migrate
npm run db:migrate:baseline -- --confirm-adopt-existing-schema
```

`status`, `verify`, and `inspect` are read-only. `migrate` and `baseline` are
explicit operator actions; neither is called by application startup.

## Existing-database adoption

Baseline adoption requires `--confirm-adopt-existing-schema`, no existing
migration records, and structural compatibility with
`database/schema-manifest.js`. The migration runner records versions and
checksums from the real production manifest only after all checks pass.

The legacy `articles.topic` column is preserved. Stage 3 does not drop or
rewrite legacy topic data.

Important limitation: baseline handling may create an empty
`schema_migrations` table before inspecting and rejecting an incompatible
schema. This is not a read-only operation, but it records zero migration rows
and performs no automatic structural repair.

## Completed disposable-MySQL integration scenarios

All real database tests used the separately labelled fixture project
`ai-blog-stage3-fixtures`, never the Windows development database or the
primary Stage 3 disposable schema.

| Scenario | Expected production behavior | Observed result |
| --- | --- | --- |
| Pending migration | Startup rejects a schema with an incomplete history and performs no migration | Passed |
| Checksum mismatch | Startup rejects an applied version whose checksum differs from the manifest | Passed |
| Unknown version | Startup rejects an unsupported future migration record | Passed |
| Partial DDL | A failed migration is not marked applied; partial objects remain for operator recovery | Passed; controlled rerun did not silently repair, and scoped manual recovery completed |
| Compatible legacy adoption | Explicitly confirmed compatible schema can receive versions 1-4 and production checksums | Passed; synthetic `articles.topic` data was preserved |
| Incompatible legacy adoption | Missing manifest structure causes inspection and baseline rejection | Passed; removing `idx_articles_published_at` produced incompatibility, baseline rejection, zero adopted migration rows, preserved article data, and startup rejection as behind migration 1 |

The incompatible fixture used a uniquely owned `ai_blog_stage3_fixture_*`
schema. It verified that `idx_articles_published_at` existed, was required by
the manifest, and had no foreign-key dependency before removal. Cleanup
revalidated fixture identity and ownership, then dropped only that schema.

## Partial-DDL recovery procedure

MySQL DDL may remain partially applied after a failure. Operators must:

1. Stop automatic retries.
2. Preserve and inspect the migration failure logs.
3. Inspect the affected schema and migration history.
4. Identify which DDL statements completed.
5. Review a safe recovery plan.
6. Apply a controlled forward fix or reviewed manual correction.
7. Revalidate schema structure and migration history.
8. Restart the application only after verification succeeds.

Do not blindly rerun a failed migration and do not assume transaction rollback
will undo MySQL DDL.

## Isolation and permissions

The primary integration environment and destructive fixture environment have
separate Compose projects, volumes, networks, credentials, and loopback-only
host bindings. Fixture connections require exact Docker context, project,
container ID, labels, host mapping, database identity, and an explicit
non-default port before mysql2 connection creation.

Fixture schemas require the `ai_blog_stage3_fixture_*` prefix, are tracked as
owned by the current execution, and are revalidated before cleanup. The
fixture administrator exists only in the fixture server; the fixture runtime
account is limited to DML on its designated database.

These safeguards are test-environment controls, not replacements for
production database access control. Production needs a migration-capable
deployment account and a separate restricted runtime account with no DDL
privileges.

## Deployment prerequisites

- Verify backups and a restore procedure before migration.
- Use a reviewed migration plan and a migration-capable account only for the
  approved migration window.
- Run the API with a restricted runtime account.
- Inspect existing schemas before any legacy baseline decision.
- Obtain explicit adoption approval before baseline recording.
- Verify startup migration integrity after deployment.
- Prepare partial-DDL recovery, rollback, and monitoring procedures.

Passing disposable tests is development evidence, not a substitute for these
production deployment controls.

## Known limitations and follow-up work

- Partial-DDL recovery remains manual.
- Legacy DDL files outside `database/migrations/` still need remediation or
  explicit deprecation.
- The fixture administrator initializer currently exposes its root password in
  a container process argument and needs remediation.
- The fixture CLI still uses version-only startup checking and should reuse the
  full checksum/unknown-version verifier.
- Docker metadata verification has a residual time-of-check/time-of-use risk.
- The fixed advisory-lock name can create benign contention for multiple
  schemas sharing one MySQL server.
- Existing frontend `::highlight` compatibility and bundle-size warnings are
  unrelated to Stage 3 migration correctness.

## Verification at final integration completion

- Real migration, concurrency, security, and all six negative/adoption
  scenarios: passed against disposable MySQL 8.4.
- Node tests: 57/57 passed.
- Frontend type-check and production build: passed.
- Astro production and visual-harness builds: passed.
- Backend syntax checks and `git diff --check`: passed.

No migration, baseline, or test operation targeted the Windows development
database. No Stage 3 commit or push has been made.
