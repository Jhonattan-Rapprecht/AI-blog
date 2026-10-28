# Future Creative Studio Plan

**Status:** Phase 1 foundation implemented on 2026-10-28; no design persistence or public layout rendering has started.

## Goal and current boundary

AI Blogstudio can evolve into a configurable editorial publishing studio without replacing its current Node/Express, React/Vite, ReactQuill, MySQL, Astro, or local-Ollama architecture. The core boundary is:

| Concern | Source of truth | May execute stored code? |
| --- | --- | --- |
| Article content | `articles.content`, sanitized by `src/utils/htmlSanitizer.js` | No |
| Layout selection | Validated database configuration | No |
| Article style tokens | Validated database configuration | No |
| Approved Astro components | Version-controlled Astro source + registry | Yes, trusted application code only |
| HTML snippets | Development workspace files | No; previewed in a sandbox |
| Administration theme | Browser preference / validated admin settings | No |

The existing `normalizeHtml()` function in `site/src/lib/api.js` remains whitespace normalization, not an HTML security control. The existing model and public-response sanitization remains mandatory for every layout.

## Findings from the current implementation

### Navigation and administration

- `frontend/src/components/layout/AppShell.jsx` owns sidebar groups, page titles, theme toggle, and the dynamic Ollama connection status.
- `frontend/src/App.jsx` owns protected React routes. The Components page is currently intentionally dev-only: it is lazy-loaded only when `import.meta.env.DEV` is true.
- The admin theme is currently a light/dark local-storage toggle in `frontend/src/hooks/use-theme.js`. It is independent of the Astro public-site theme, which separately uses its own local-storage script in `site/src/layouts/BaseLayout.astro`.
- Writing settings are persisted in `data/settings.json` through `src/services/settings.service.js`, exposed by `src/controllers/settings.controller.js`. They contain AI defaults only, not publication design defaults.

### Existing Components compatibility

The current Components page (`frontend/src/pages/dev/ComponentsPage.tsx`) is a development workspace, not a database feature:

- HTML and optional CSS snippets live under `frontend/src/component-previews/` and are loaded by `frontend/src/lib/component-previews.ts`.
- A Vite development-only endpoint in `frontend/vite-plugins/component-previews.js` can save a new snippet file. It checks the request origin, limits payload size, validates slugs, and cannot run in a production build.
- Preview HTML/CSS is rendered in an empty-sandbox iframe (`sandbox=""`). Scripts are not enabled.

This workflow and its files must remain unchanged. The future Component Library should add a catalog experience beside it, not reinterpret snippet files as trusted publishing components. Snippets must never become Astro source or public-rendered components without an explicit reviewed registration workflow.

### Article editing, data, and public rendering

- `frontend/src/pages/EditorPage.jsx` uses ReactQuill and saves article content through the authenticated article API.
- `src/models/article.model.js` sanitizes string content on both create and update. AI generation reaches the same model create boundary through `src/controllers/ai.controller.js`.
- `site/src/pages/blog/[slug].astro` is the current fixed article layout: hero, metadata, optional table of contents, body, rail, and related articles. It receives article data via `site/src/lib/api.js` from `src/controllers/public.controller.js`.
- `src/controllers/public.controller.js` sanitizes article HTML again for legacy records before Astro receives it.
- Existing reusable Astro pieces are `ArticleCard.astro`, `NavCategoryMenu.astro`, `Pagination.astro`, and `SearchForm.astro`; the article page itself contains several reusable candidates (hero, metadata, body, table of contents, related rail).
- `src/models/schema.sql` defines articles, categories, media, reviews, analytics, and related records. There is no layout/style persistence yet. Runtime model helpers currently create some compatibility tables/columns lazily, but the design feature should use explicit, versioned schema changes rather than adding more ad hoc mutations.

## Proposed design configuration

Use a small, versioned, validated JSON document rather than arbitrary CSS or component source. This shape is illustrative and should be represented by server-side validation constants, not accepted blindly from the browser or an AI model.

```json
{
  "version": 1,
  "layout": "classic",
  "stylePreset": "minimal-news",
  "typography": {
    "headingFont": "newsreader",
    "bodyFont": "inter",
    "headingScale": "standard",
    "bodySize": "comfortable",
    "lineHeight": "relaxed",
    "dropCap": false
  },
  "colors": {
    "background": "default",
    "text": "default",
    "accent": "violet"
  },
  "imageTreatment": {
    "hero": "standard",
    "radius": "medium",
    "aspectRatio": "original"
  },
  "components": {
    "hero": "article-hero",
    "metadata": "article-meta",
    "body": "article-body",
    "related": "related-articles"
  }
}
```

### Validation rules

- Layout and style preset must be allowlisted IDs.
- Fonts must be approved identifiers mapped to bundled or explicitly configured safe font sources; no arbitrary URLs.
- Color choices should initially be preset token IDs, not free-form CSS. If custom colors are introduced later, accept only strict hex/rgb values and validate contrast.
- Components must resolve through the registry and be allowed in the requested region.
- Unknown or invalid values are discarded and resolved to safe publication defaults.
- The configuration contains no HTML, JavaScript, CSS text, import paths, or dynamic component names.

## Proposed persistence

Do not add design columns directly to `articles` in the first design. Preserve a clean override model:

1. `publication_design_settings` — one current publication-default configuration document plus `updated_at` and a schema version.
2. `article_design_overrides` — `article_id` primary/unique key, validated override JSON, timestamps; absent means use the publication default.
3. Optional later `design_presets` — named, validated reusable configurations with an owner/scope once multi-publication or SaaS tenancy exists.

The backend design resolver merges `safeDefault -> publicationDefault -> articleOverride`, validates the final result, and returns an already-safe resolved configuration to public rendering. Existing articles have no override and therefore receive the Classic Editorial + Minimal News safe default without data rewrites.

This entails a schema migration when Phase 2 begins, plus model/controller/route tests. It must be created explicitly and never run against production as part of development verification.

## Approved component registry

Create a version-controlled registry module, initially in the Astro project, for example `site/src/lib/article-component-registry.ts`:

```text
component ID -> Astro implementation -> allowed regions -> variants -> metadata
```

Each entry exposes a stable ID, name, category, description, allowed regions, supported variants, and a static preview descriptor. The renderer imports and selects only registry entries. Database values are IDs/configuration only; they can never supply a filename, import expression, or Astro source.

Initial approved entries should wrap existing article-page responsibilities:

- `article-hero`
- `article-meta`
- `article-body`
- `article-toc`
- `related-articles`
- `article-card`

The developer-facing catalog can consume registry metadata through a read-only authenticated API or a shared generated metadata file. It must keep HTML Snippets as a separate first tab/category.

## Target rendering flow

```text
Public request
  -> Public article query
  -> server-side HTML sanitization
  -> resolve validated publication default + article override
  -> Astro page chooses allowlisted layout
  -> layout uses approved registry components and token classes/CSS variables
  -> normalized, sanitized article HTML rendered into approved body component
```

No layout selection is permitted to bypass sanitization, replace the safe HTML renderer, or inject custom CSS/JS.

## Phased roadmap

### Phase 1 — Architecture and navigation

Add protected routes and sidebar entries for **Article Layouts**, **Style & Appearance**, and **Admin Theme**. Keep Components under Developer as a distinct destination and retain the dynamic connection status. Create shared client/server design constants and a validator without changing public article rendering or database data.

**Primary files:** `frontend/src/App.jsx`, `frontend/src/components/layout/AppShell.jsx`, new placeholder pages, shared server validation module, route/API scaffolding, focused validator tests.

**Complexity:** Low to medium. **Risk:** route and production visibility decisions for the existing dev-only Components page must be intentional.

### Phase 2 — Article Layout MVP

Add the explicit persistence migration, models, authenticated layout APIs, default/override selection UI, and three responsive Astro layouts: `classic`, `split`, and `immersive`. Add a resolver that gives current articles the safe default. Extract the existing article page into approved components as part of this work.

**Primary files:** new migration, design models/controllers/routes, `site/src/pages/blog/[slug].astro`, new `site/src/components/article/*`, public API model/controller, Editor layout selector.

**Complexity:** High. **Risk:** avoiding regressions in SEO metadata, read tracking, table of contents, related content, and mobile reading layout.

### Phase 3 — Component Library expansion

Keep HTML Snippets intact as one tab. Add article/editorial/layout/Astro catalog tabs backed by the trusted registry. Add static metadata and preview cards; do not write component source through the database or UI.

**Complexity:** Medium. **Risk:** current Components UI is dev-only, so exposure in a production admin needs an authentication-safe, non-filesystem-based catalog view while preserving developer workflow.

### Phase 4 — Style & Appearance

Add validated typography/image/color tokens, four initial presets (Minimal News, Luxury Editorial, Brutalist Magazine, Cyberpunk Technology), publication default and per-article override. Use CSS variables or classes generated only from validated tokens.

**Complexity:** High. **Risk:** font loading, contrast, print/readability, and ensuring styles remain independent of layout.

### Phase 5 — Admin Theme

Extend the existing `use-theme` implementation to light/dark/system, accent, sidebar, and density tokens. Persist admin preferences separately from public design settings. It must not write public-site styling values.

**Complexity:** Medium. **Risk:** preserving existing dark corporate visual identity and accessibility across all admin controls.

### Phase 6 — Advanced creative studio

Add editorial components, region constraints, layout presets, duplication, and versioning. Defer drag-and-drop until region contracts and configuration validation are mature.

**Complexity:** High. **Risk:** configuration compatibility and accidental free-form layout execution.

### Phase 7 — AI Art Director

Have Ollama return structured, schema-validated suggestions only. Present a preview/diff and explicit apply action; never let AI output component code, CSS, JavaScript, or unrestricted URLs.

**Complexity:** High. **Risk:** model JSON reliability and unsafe or inaccessible visual recommendations.

### Phase 8 — commercial publishing capabilities

Add import/export, branding kits, design packs, multi-publication scoping, and SaaS tenancy only after stable configuration versioning and migration strategy exist.

**Complexity:** High. **Risk:** tenant isolation, backward compatibility, and package trust.

## Required testing strategy

- Unit-test design configuration validation, merge precedence, and safe fallback for invalid IDs/tokens.
- Verify existing snippet files still appear, can be previewed in the sandbox, and remain unmodified.
- Test registry region/variant restrictions and reject unknown component IDs.
- Add Astro rendering tests or fixture builds for each layout with legacy articles that lack design records.
- Confirm public responses remain sanitized under every layout.
- Verify layout/style changes do not modify article content or the admin theme.
- Test desktop, tablet, and mobile layouts; title/metadata/hero accessibility; keyboard navigation; color contrast; and SEO/meta output.
- Run Node tests plus React and Astro production builds for every phase; do not use production data during test runs.

## Phase 1 decision points before implementation

1. Should the Components catalog become available in production administration now, or should only the future registry catalog be production-visible while snippet authoring remains development-only?
2. Should publication-level design settings stay in the existing JSON settings file for the earliest MVP, or should Phase 2 start directly with MySQL persistence to support future SaaS/multi-publication use? The recommended answer is MySQL in Phase 2, while Phase 1 only establishes constants and screens.
3. Which font licensing/loading policy is acceptable for self-hosted deployments: bundled open-source fonts only (recommended initially), optional local system fonts, or externally hosted providers?

## Exact anticipated modification areas

Phase 1: `frontend/src/App.jsx`, `frontend/src/components/layout/AppShell.jsx`, new pages under `frontend/src/pages/`, a new server design validation module, new authenticated design routes/controllers, `frontend/src/api/client.js`, and tests/documentation.

Phase 2 onward: new explicit database migration and schema entries; new design model/service/controller/route files; `src/controllers/public.controller.js` and/or `src/models/public.model.js` to supply resolved design data; `site/src/pages/blog/[slug].astro`; new Astro article layout/component modules; site styles; `frontend/src/pages/EditorPage.jsx`; the Component Library catalog. Existing HTML snippet files, `frontend/vite-plugins/component-previews.js`, and sanitization code are preserved unless a security review identifies a separate issue.
