# Production Hardening Stage 3 to Stage 4 handover

Date: 2026-10-28

## Completed checkpoint

Production Hardening Stage 3 is committed and pushed on `fix/production-hardening-stage-3`:

- `a592751` - `feat(database): add versioned migration lifecycle and schema hardening`
- `0380838` - `wip(frontend): checkpoint ongoing UI and visual development`

Stage 3 introduced versioned MySQL migrations, checksum and migration-history verification, read-only startup schema validation, guarded disposable-fixture tooling, and legacy-schema adoption controls. All six authorized real MySQL integration scenarios passed in isolated disposable containers. The final regression record is 61/61 Node tests, backend and fixture syntax checks, frontend type-check, Vite build, Astro build, and diff checks passing. Shell syntax validation remains unverified because local WSL Bash returned `E_ACCESS_DENIED`.

## Safety boundaries

- Do not run migrations automatically at API startup.
- Use only the isolated, guarded database fixtures for migration integration work; never use Windows development MySQL for destructive tests.
- Keep fixture credentials in the ignored local `.env` files. Do not commit secrets.
- `database/migrations/` and `database/migrate.js` are the authoritative migration system. The older SQL files are deprecated historical references.
- No production deployment has been authorized.

## Current branch and local state

Stage 4 continues on `feat/stage-4-production-deployment-hardening`, created from `0380838`.

The following local directories are intentionally untracked and must remain outside commits unless separately reviewed:

- `.vscode/` - local editor/agent settings
- `dist-visual-harness/` - generated visual-harness output

Ignored local configuration, disposable database credentials, build folders, dependencies, uploads, and data also remain local.

## Next-session checklist

1. Confirm the current branch and Git status before changing source.
2. Define and review the explicit Stage 4 scope before implementation.
3. Preserve the Stage 3 migration and isolation guarantees.
4. Keep public article styling work separate from production-hardening work.
5. Commit and push only reviewed, scoped changes.
