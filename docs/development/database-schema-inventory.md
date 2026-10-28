# Database Schema Inventory — Stage 3

Date: 2026-10-28

## Authoritative migration lifecycle

The authoritative schema lifecycle is now the ordered migration set in
`database/migrations/` and the explicit `database/migrate.js` runner. Normal
application startup verifies migration history but never applies migrations or
performs request-time DDL.

| Version | Structures introduced |
| --- | --- |
| 001 | Categories, media, topics, articles, tags, article tags, AI generations |
| 002 | Article reviews/findings, topic history, language references, activity logs |
| 003 | Publication design settings and article design overrides |
| 004 | Article-read views, request-protection buckets, analytics deduplication |

`schema_migrations` is created only by explicit migration or baseline commands.
It records version, migration name, SHA-256 checksum, and application time.

## Current key tables and relationships

| Table group | Key relationships |
| --- | --- |
| Editorial | `articles` references categories, topics, and featured media; tags join through `article_tags`; AI generations reference articles |
| Review and language | Review findings reference review runs; review runs reference articles; topic history and language references are standalone |
| Creative Studio | Per-article design overrides reference articles; publication design settings is a singleton |
| Security and analytics | Read views and deduplication records reference articles; protection buckets and activity logs are standalone |

The compatibility manifest at `database/schema-manifest.js` conservatively
checks required tables, columns, and selected critical indexes before baseline
adoption. Table presence alone is never sufficient evidence of compatibility.

## Runtime DDL status

The former model-level schema initializers are now no-ops. Runtime models and
startup paths do not execute `CREATE`, `ALTER`, `DROP`, or index-management
SQL. Startup only reads `schema_migrations` and compares the recorded complete
history with the real migration manifest.

Two legacy DDL artifacts remain outside the versioned migration directory:

- `src/models/schema.sql`
- `src/migrations/2026-10-28-article-layouts.sql`

They are not invoked by normal runtime code, but must be deprecated, removed,
or reconciled before production release so operators cannot mistake them for a
supported deployment path.

## Existing-database adoption

Existing databases must first be inspected using the read-only migration
inspector. A compatible schema can be baselined only with explicit
`--confirm-adopt-existing-schema` confirmation and only when no migration
history exists. Incompatible variants require a reviewed forward migration or
manual remediation.

The legacy `articles.topic` column is preserved. No Stage 3 migration drops it
or rewrites its contents.

Baseline rejection may leave an empty `schema_migrations` table because the
explicit baseline command initializes metadata before structural inspection.
It does not insert adopted migration records or repair incompatible objects.

## Deployment constraints

Use a migration-capable account only for explicitly approved migration or
baseline activity. The normal runtime account needs application DML and the
read access required for startup verification, but must not have DDL privileges.
Backups, restore validation, a reviewed migration plan, and partial-DDL recovery
procedures are required before production migration.
