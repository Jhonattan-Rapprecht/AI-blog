# Language Library — Phases 1–2

## Request

Create an enterprise-oriented Language Library under **System** so local spelling and grammar review can eventually rely on governed reference material rather than an internet-connected model.

## Implemented foundation

- Added the protected **System → Language Library** screen.
- Added an authenticated, read-only `/api/language-library/catalog` endpoint.
- Defined the approved Editor languages: Dutch, English, German, French, and Spanish.
- Established the policy that the Editor-selected language is authoritative. Detection is only a safeguard; uncertain or mixed-language text is held for manual review.
- Displayed reference readiness honestly: no local dictionary or grammar reference is active in Phase 1.

## Deliberately deferred

No dictionary files, grammar engines, external sources, packages, database migration, or review-prompt behavior changed. A later phase must register each local reference with source, license, version, update date, and validation status before it can affect editorial suggestions.

## Affected areas

- `src/config/language-library.config.js`
- `src/controllers/language-library.controller.js`
- `src/routes/language-library.routes.js`
- `src/index.js`
- `frontend/src/pages/LanguageLibraryPage.jsx`
- Admin routing, navigation, and API client
- `test/language-library-config.test.js`

## Verification

- Backend syntax checks passed.
- Node tests passed (16/16). The existing public-response sanitizer test emits its known test-database access-denied log but still passes using its mock.
- Frontend production build passed. Existing CSS pseudo-element and bundle-size warnings remain.
- `git diff --check` passed.
- Authenticated browser verification passed: the System navigation entry and Language Library screen rendered the approved-language catalog, policy guardrails, and inactive-reference status at `http://localhost:5173/system/language-library`.

## Follow-up naming and navigation

- Reordered and shortened the Articles navigation labels to Overview, Layout, Analytics, and Style & Appearance.
- Renamed only the compact sidebar label to **Language**. The destination header and page heading remain **Language Library**, which accurately describes its current content.

## Phase 2 — governed reference register

- Added a persistent, authenticated register for spelling-dictionary and grammar-reference provenance per approved language.
- Each record requires source name, license, exact version, source/acquisition reference, review state, and validation state; an optional checksum can be added after local import.
- The register is metadata only. It cannot activate a reference, load a path, run executable content, contact the internet, or change spell/grammar review behavior.
- The next phase must implement a controlled local asset import, checksum verification, licensing review, and language-specific test fixtures before any validator can consume a reference.

## Phase 2 verification

- Backend syntax checks passed.
- Node tests passed (18/18). The existing mocked public-response sanitizer test emits its known test-database access-denied log but passes.
- Frontend production build and `git diff --check` passed; existing CSS pseudo-element and bundle-size warnings remain.
- Authenticated browser verification passed. The empty register, governed-reference form, language/source state display, and the compact **Language** sidebar label rendered correctly. No database record was created during verification.
