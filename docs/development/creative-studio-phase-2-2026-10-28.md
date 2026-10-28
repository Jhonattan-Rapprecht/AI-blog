# Creative Studio Phase 2 — Article Layout Engine

## Scope completed

- Captured the current published Classic Editorial article at `http://localhost:4321/blog/werk-lukt-niet-kort`.
- Saved the desktop full-page baseline (`1440 × 1000`) and mobile viewport baseline (`390 × 844`) in `docs/development/visual-baselines/phase-2/`.
- Kept the existing `site/src/pages/blog/[slug].astro` markup as the `classic` branch. It remains the default for legacy articles and is not a recreated design.
- Added two static, trusted Astro layouts: Magazine Split (`split`) and Immersive Feature (`immersive`). They reuse the existing public article data and sanitized HTML pipeline.
- Added validated publication-default and per-article layout persistence. Stored configuration is limited to approved layout identifiers; it cannot contain CSS, HTML, JavaScript, imports, or component paths.
- Added a functional **Article Layouts** admin screen for the publication default and an **Article layout** selector in the Editor for article overrides.

## Resolution order

1. Valid article override.
2. Valid publication default.
3. Classic Editorial (`classic`).

Invalid, missing, or unavailable design records fall back to Classic Editorial. Public article responses remain sanitized before Astro receives them. The public response also fails safely to Classic if design configuration is temporarily unavailable, so optional design data cannot take published articles offline.

## Persistence and deployment

- New model: `src/models/article-design.model.js`.
- Historical implementation note: this work originally produced
  `src/migrations/2026-10-28-article-layouts.sql`, which is now deprecated and
  must not be executed.
- Current deployment uses authoritative migration 003 through
  `database/migrate.js` (`npm run db:migrate`). Existing compatible databases
  require inspection and explicit baseline approval; incompatible schemas need
  reviewed remediation. No production database was contacted for this phase.

## Visual baseline

- Desktop: full-page capture succeeded at `1440 × 1000`.
- Mobile: the `390 × 844` viewport capture succeeded. The browser bridge timed out while requesting a mobile full-page image, so the saved mobile baseline is viewport-only.
- Post-change desktop full-page comparison also exceeded the browser bridge timeout and reset its automation session. The Astro build confirms the Classic rendering branch compiles; a visual side-by-side post-change comparison remains to be repeated once the bridge stabilizes.

## Verification

- `npm.cmd test`: passed 13/13. One existing sanitizer public-response test intentionally has a non-working test database configuration; the new public design fallback handled it and the test passed. The DB driver logs that failed test connection during the expected fallback.
- `npm.cmd --prefix frontend run build`: passed. Existing CSS pseudo-element and bundle-size warnings remain.
- `npm.cmd --prefix site run build`: passed.
- Backend syntax checks passed for the Phase 2 server modules.
- `git diff --check`: passed.

## Remaining runtime verification

The browser bridge became unstable after full-page screenshot attempts, before authenticated admin controls could be used to select and visually inspect `split` and `immersive` on the local article. No database design settings were changed for the test. After reconnecting, select each layout through the local admin UI, capture desktop/mobile screenshots, then restore the publication default to `classic` (or leave any intentional setting selected).

## Final browser verification — 2026-10-28

### Passed

- Browser debugging was restored without reinstalling any plugin. Viewport screenshots were used; no further full-page screenshot attempts were made.
- **Classic Editorial regression:** passed at the same article URL, `http://localhost:4321/blog/werk-lukt-niet-kort`, at 1440×1000 and 390×844.
  - The current output retained the existing hero image/overlay, title and metadata placement, excerpt, desktop three-column reading layout, table of contents, article rail, share controls, related content, and mobile stacked TOC.
  - DOM verification confirmed the Classic classes are active and neither `split` nor `immersive` layout markup is present for the legacy/default article.
  - The article still renders its supplied hero image, heading IDs/TOC links, sanitized article body, and public SEO source data.

### Unverified — authentication boundary, not a visual failure

- The newly attached Edge browser profile has no authenticated Blogstudio admin session. It correctly redirected `http://localhost:5173/articles/layouts` to `/login`.
- Therefore the following were not performed: changing/saving the publication default, setting/clearing an article override, visual screenshots of `split` and `immersive`, no-hero fallback under `immersive`, checking that layout selections leave article content unchanged, and confirming Component snippet previews in the same authenticated session.
- The published article page remains publicly reachable. A direct runtime test of a known unpublished article was not possible without an authenticated article identifier; the existing public-model visibility predicate continues to enforce published status and publication date.

### Result

Phase 2 is ready for code review and commit from an automated-build and Classic-regression perspective. It is **not yet ready to claim complete browser functional verification** until an authenticated local-admin Edge session is available to exercise and restore the layout settings.

## Authenticated browser completion — 2026-10-28

The local Edge session was authenticated by the user. No credentials, cookies, or tokens were inspected. Tests used the representative published article at `http://localhost:4321/blog/werk-lukt-niet-kort` and viewport captures only (desktop `1440 × 1000`, mobile `390 × 844`).

### Original state and restoration

- Original publication default: **Classic Editorial** (`classic`).
- Original representative-article override: **Publication default** (no article-specific override).
- The test temporarily saved `split` and `immersive` as publication defaults, then set a `classic` article override and cleared it.
- The original publication default and no-override state were restored at the end. A final public reload rendered Classic Editorial.

### Passed

- **Magazine Split:** desktop and mobile rendered the split hero, headline/image composition, article body and metadata without horizontal overflow. Mobile stacked the image and editorial copy as intended.
- **Immersive Feature:** desktop and mobile rendered the full-width hero, readable gradient-backed headline overlay, metadata and article body without horizontal overflow. The existing SEO description remained present.
- **Publication default persistence:** selecting and saving both new layouts showed the saved current-default state in the admin UI and changed the public render after reload.
- **Article override and clearing:** a Classic Editorial override took precedence over the temporary Immersive publication default; clearing it restored the publication-default Immersive render.
- **Article-content integrity:** the representative article title and complete Quill HTML were byte-for-byte unchanged before and after the override/clear sequence. Layout actions did not invoke the normal article save control.
- **Developer → Components:** the existing Example Card sandboxed iframe preview rendered, and the Preview action remained available and functional.
- **Publication access control:** a known unpublished/review article route rendered the public not-found response and had no `#article-body`.
- **Classic restoration:** after restoration, the representative public URL again rendered Classic Editorial only (neither Split nor Immersive markup was present).

### Unverified

- **Immersive no-hero fallback:** no suitable already-published article without a hero image was available in the local dataset. A temporary article was not created and real published media was not changed solely for this test. The fallback path remains covered by the implementation review but was not browser-exercised in this run.

### Completion result

All authenticated verification items requested for the existing article, layout persistence, overrides, Components preview, and unpublished-public access passed, and temporary settings were restored. Phase 2 is ready to commit, with the no-hero Immersive fallback noted above as the only browser-unverified edge case.

## Explicitly unchanged

- Developer → Components and its snippet-preview workflow.
- Article content, editor HTML output, sanitization, article URLs, SEO source fields, read tracking, and Classic Editorial DOM/CSS styling.
- Phase 3+ component expansion, free-form styles, Admin Theme persistence, and AI Art Director work.
