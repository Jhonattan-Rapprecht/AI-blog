# Creative Studio Phase 2 handover — 2026-10-28

## Resume point

- Current branch: `feat/creative-studio-phase-2`, pushed to `origin` and tracking it.
- Working tree was clean before this handover documentation was created.
- Phase 1 is complete and pushed. Its latest commits are `220f9b9` (`feat(creative-studio): add phase one foundation`) and `07fe2dc` (`fix(ui): synchronize theme and refine editor hints`).
- Phase 2 implementation has **not** begun: no application code, database schema, migration, dependency, article data, or public Astro layout was changed on the Phase 2 branch.

## Mandatory Phase 2 rule

The existing production Astro article page at `site/src/pages/blog/[slug].astro` is the **Classic Editorial** layout (`classic`). It is an immutable visual baseline, not a new design to recreate.

When Phase 2 starts:

1. Capture its desktop and mobile appearance before modifying the page.
2. Keep existing Classic visual structure, header/navigation, hero, metadata, typography, content width, TOC/sidebar/related content, footer, SEO metadata, public route, responsive behavior, tracking, and sanitization materially unchanged.
3. Build the layout engine around it.
4. Add only two new designs: `split` (Magazine Split) and `immersive` (Immersive Feature).
5. Compare Classic output against the captured baseline after implementation.

The complete Phase 2 specification is in the user-provided prompt from this session. The amendment overrides any conflicting direction: do not redesign or visually reinterpret Classic.

## Current blocker

The required visual baseline could not be captured because the Windows browser automation bridge is unavailable. Two attempts returned:

`Native apps: Error: Computer Use native pipe is unavailable: failed to connect native pipe: The system cannot find the file specified.`

No browser tabs are exposed to the session. This is an environment/integration issue, not a Blogstudio error. After restarting the relevant Codex/ChatGPT/VS Code/browser integration, first retry browser access and capture the baseline before changing Astro rendering. Alternatively, use user-supplied desktop and mobile screenshots of a representative published article as the baseline.

## Phase 2 implementation plan after baseline capture

1. Read `docs/development/creative-studio-phase-1-2026-10-28.md` and `docs/FUTURE_CREATIVE_STUDIO_PLAN.md`.
2. Inspect the current public article data path: `src/models/public.model.js` → `src/controllers/public.controller.js` → `site/src/lib/api.js` → `site/src/pages/blog/[slug].astro`.
3. Add only the minimum persistence for a publication default layout and optional article override. Use the Phase 1 allowlisted `classic`, `split`, and `immersive` identifiers; resolve in this order: valid article override → valid publication default → `classic`.
4. Keep layout validation server-side and use a static trusted Astro component map. Never dynamically import a database value or execute a Component snippet.
5. Extract shared Astro presentation pieces only as needed to preserve Classic DOM/CSS behavior, then create the two new layouts.
6. Add the functional Article Layouts management page and compact Editor override selector without altering article content or ReactQuill formatting.
7. Add focused resolution/persistence/API/rendering tests, run `npm test`, backend syntax checks, React/Astro builds, and do the desktop/mobile Classic visual comparison.
8. Document actual migration application/recovery instructions in `docs/development/creative-studio-phase-2-2026-10-28.md`. Do not commit or push Phase 2 implementation until the user asks.

## Existing Phase 1 foundation to reuse

- Design catalog/validation: `src/config/article-design.config.js`.
- Read-only authenticated catalog endpoint: `GET /api/article-design/catalog`.
- Article Layouts admin destination: `frontend/src/pages/ArticleLayoutsPage.jsx`.
- Components remain separate and safe: production is read-only; local dev snippet authoring is sandboxed; snippets are not trusted Astro components.
- Stored article HTML remains sanitized in `src/models/article.model.js` and again in `src/controllers/public.controller.js`. `site/src/lib/api.js` `normalizeHtml()` is whitespace normalization only.

## Explicit exclusions

Do not begin Phase 3 Component expansion, advanced Style & Appearance controls, Admin Theme persistence, AI Art Director work, arbitrary CSS, or arbitrary Astro execution as part of Phase 2.
