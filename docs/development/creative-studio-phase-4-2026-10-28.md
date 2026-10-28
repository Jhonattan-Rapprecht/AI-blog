# Creative Studio Phase 4 — Style & Appearance

## Implemented

- Extended the validated article-design configuration with Minimal News, Luxury Editorial, Brutalist Magazine, and Cyberpunk Technology.
- Added allowlisted typography tokens, image treatments, publication style persistence, and targeted article-style clearing that preserves layout overrides.
- Added a visual Style & Appearance gallery, safe typography/image controls, save/reset state, unsaved-change feedback, and labelled simulated desktop/mobile previews.
- Added the Editor style selector with **Inherit Publication Default** and the four approved presets.
- Astro applies a fixed style class only after explicit style resolution; existing articles without an explicit style retain the Classic Editorial path.

## Verification

- Node tests passed: 20/20.
- Frontend and Astro production builds passed.
- Backend syntax checks and `git diff --check` passed.
- Authenticated browser verification passed for loading Style & Appearance, all four visible presets, selecting Cyberpunk Technology, unsaved-change feedback, simulated-preview update, and Reset restoring the original Minimal News selection without persistence.
- Publication persistence cycle passed: recorded Minimal News, saved Luxury Editorial, reloaded and confirmed Luxury Editorial persisted, then restored Minimal News and reloaded to confirm the original configuration persisted.

## Unverified / limitations

- Article override/clear browser cycle passed: on the representative published article, Luxury Editorial saved and survived reload; clearing it restored **Inherit Publication Default**. The title, editor HTML, SEO title/description, and original Publication default layout remained intact after restoration. A transient test navigation selected Magazine Split by mistake after accessibility indices shifted; it was immediately restored to the recorded Publication default and verified in the final state.
- Components regression passed: the trusted catalog loaded with registered/planned state and static-preview disclosure. Search/category controls were visible. The HTML Snippets workspace loaded its existing Example Card, Preview control, and `about:srcdoc` isolated iframe preview; no snippets were modified.
- Browser checks for explicit public styles on Classic/Split/Immersive, Components snippet sandboxing, and Immersive no-hero fallback remain unverified.
- Existing warnings remain: legacy `::highlight`, bundle-size advisory, and the mocked sanitizer test's known unavailable test-DB log.

## Local visual-regression capture workflow — 2026-10-28

- Added `npm run visual:public -- <public-localhost-article-url>`, implemented by `scripts/capture-public-article.mjs`. It is a local Edge headless capture helper only; it is not used for authenticated administration or as a replacement for the official browser integration.
- The helper accepts only a `localhost` HTTP(S) article URL, uses the installed Microsoft Edge executable (or `EDGE_EXECUTABLE` when explicitly supplied), captures 1440 × 1000 and 390 × 844 viewport PNGs, waits through a 3.5-second virtual-time budget, disables GPU/scrollbars, forces sRGB, and verifies that each image exists, is nonempty, and has the requested PNG dimensions. A capture failure exits nonzero.
- Pre-extraction artifacts were captured from `http://localhost:4321/blog/werk-lukt-niet-kort` under `docs/development/visual-baselines/phase-4/captures/`:
  - `werk-lukt-niet-kort-desktop-1440x1000.png` — 1440 × 1000, 891,188 bytes.
  - `werk-lukt-niet-kort-mobile-390x844.png` — 390 × 844, 233,103 bytes.
- The existing Phase 2 Classic Editorial baselines remain unchanged at `docs/development/visual-baselines/phase-2/classic-editorial-desktop-1440x1000.png` and `classic-editorial-mobile-390x844.png`.
- Both new captures were opened and inspected. The target public article loaded successfully, including its hero, metadata, and body. The initial apparent headline regression was investigated: the current public API resolves this article to the **Immersive** publication layout, while its style source is `fallback`; it is therefore not an explicit Phase 4 style-preset effect and is not a Classic-to-Classic comparison. Immersive's existing headline rule is intentionally larger than Classic's. No renderer or article setting was changed during this capture work.
- The historical Phase 2 files have `.png` names but are JPEG-encoded captures. The historical desktop artifact is a 1425 × 2974 full-page image, while the new desktop artifact is a 1440 × 1000 viewport PNG. The mobile artifacts are both 390 × 844. A fresh Classic-resolved capture under the new workflow is required before asserting desktop or mobile Classic parity.
- In this environment, launching headless Edge from the workspace sandbox exited with code `2147483651`; the exact same local-public capture succeeded outside that sandbox. This is an execution-environment limitation, not a dependency issue. No Playwright, Puppeteer, or global browser package was installed because the existing Edge executable was sufficient.

## Classic baseline candidate discovery — 2026-10-28

- Read-only discovery queried all 15 published records from the public article API and verified each article's **effective** resolved design through its individual public response.
- No published article currently resolves to `classic`. Every record resolves to `layout: immersive`, `source: publication`, and `styleSource: fallback`.
- Therefore there is no safe existing Classic Editorial candidate to capture. No article layout, publication setting, style override, or database record was changed. The Phase 2 captures remain historical evidence only; they cannot be re-used as a new controlled Phase 4 baseline because the current public configuration contains no Classic-resolved article and the desktop capture conditions differ.
- To establish a controlled pre-extraction Classic baseline, the next step requires explicit approval for a reversible local test configuration or a separate isolated test environment that resolves one article to Classic, with the original Immersive publication state recorded and restored.

## Authorized temporary Classic baseline — 2026-10-28

- Environment safety was confirmed before the temporary write: `NODE_ENV=development`, database host `localhost`, and both the local API and Astro server returned HTTP 200. No production, shared, staging, or remote host was used.
- Selected published article: `the-paradox-of-ai-companionship-humans-loving-algorithms` (`2eef4984-bba4-4d96-afb7-d79bd3cc2c0f`). It has a hero image, category/date/read-time metadata, a multi-section TOC, and three related articles.
- Original state was recorded as an absent article-level layout override (Editor value **Publication default**) and absent article-level style override (**Inherit Publication Default**). Its effective public state was `immersive` from `publication` with `styleSource: fallback`; the publication default was recorded as **Immersive Feature**.
- A temporary article-only **Classic Editorial** override was saved through the authenticated Editor. The public API independently confirmed `layout: classic`, `source: article`, and `styleSource: fallback`. No title, content, SEO value, hero image, or publication configuration was changed.
- Captured and inspected the actual Classic rendering with `npm run visual -- http://localhost:4321/blog/the-paradox-of-ai-companionship-humans-loving-algorithms`:
  - `docs/development/visual-baselines/phase-4/captures/classic-pre-extraction-the-paradox-desktop-1440x1000.png` — 1440 × 1000, 1,177,025 bytes.
  - `docs/development/visual-baselines/phase-4/captures/classic-pre-extraction-the-paradox-mobile-390x844.png` — 390 × 844, 275,018 bytes.
- The captures are valid, nonempty PNGs and show the real Classic DOM path, hero, metadata, table of contents, article rail, and body. They are a suitable same-article, same-capture-workflow pre-extraction baseline; they are not a pixel comparison against the differently captured Phase 2 files.
- Mandatory restoration completed through the same Editor control. The public API independently confirmed `layout: immersive`, `source: publication`, and `styleSource: fallback` again. Title, content length, SEO title/description, hero presence, and related-content count match the pre-test record.

## Checkpoint A — Classic Editorial extraction — 2026-10-28

- Extracted the sole Classic Editorial presentation into trusted `site/src/components/article/ClassicEditorial.astro`. The public `[slug].astro` route still owns article/category loading, 404 behavior, TOC preparation, article-design resolution, SEO metadata, structured public URL values, and the existing progress/share/TOC client script.
- The new component receives only prepared route data and retains the existing Classic DOM classes, IDs, hero/image fallback, metadata, table of contents, article rail, share markup, related rail and bottom related cards. It uses the existing shared helpers for date formatting, image URL resolution, and HTML whitespace normalization. There is no second Classic renderer in the route.
- `npm.cmd --prefix site run build` passed. `npm.cmd test` passed all 20 tests. `git diff --check` passed. The known mocked test-DB access-denied diagnostic remains emitted during the sanitizer/public-response test, but that test passes and does not access the local development database.
- The running Astro development server retained a stale SSR module state immediately after the new component was added and returned `FailedToLoadModuleSSR`; no server process was altered. The freshly built Astro preview on local port 4322 rendered the extracted public route successfully with all styles and assets.
- Using the approved temporary article-only Classic override, captured post-extraction production-preview artifacts (then restored the override):
  - `docs/development/visual-baselines/phase-4/captures/classic-post-extraction-the-paradox-desktop-1440x1000.png` — 1440 × 1000.
  - `docs/development/visual-baselines/phase-4/captures/classic-post-extraction-the-paradox-mobile-390x844.png` — 390 × 844.
- Visual inspection found matching headline size/wrapping, metadata placement, hero geometry, TOC/rail, body typography, related layout, and mobile presentation against the pre-extraction captures. Exact-pixel comparison reported 3.6635% desktop and 6.6372% mobile changed pixels. Those artifacts were captured from different local renderers (pre: existing dev server; post: clean production preview after the dev server's stale-module failure), so they are useful visual evidence but not a pixel-perfect renderer-controlled diff.
- Functional public-route verification on the production preview passed: Classic hero is present; Immersive hero is absent; ten TOC links, four share actions, the copy-link control, article rail, and related section are present. Activating the first TOC link updated the URL hash to its existing heading ID and identified the matching heading.
- Mandatory restoration was independently verified after capture and interaction testing: the article resolves again to `layout: immersive`, `source: publication`, and `styleSource: fallback`. Checkpoint A is complete for visual/functional parity under the available local conditions. Checkpoint B has not started.

## Checkpoint B — isolated visual harness — 2026-10-28

- Added a separate static Astro configuration at `site/astro.visual.config.mjs` with `srcDir: site/visual-harness/src` and output `dist-visual-harness`. The normal production `site/src` route tree does not import or discover fixture routes.
- The harness statically imports the trusted Classic, Split, and Immersive components and calls the shared validated design resolver. It uses deterministic in-source synthetic article data and a data-URI SVG hero; it has no database, API, authentication, or user-input path.
- `npm.cmd --prefix site run visual:build` generated 14 isolated pages: 12 layout/preset combinations, unstyled Classic fallback, and Immersive no-hero. Inspection of the normal production `site/dist` found no fixture route, fixture identifier, or synthetic fixture text.
- Captured 28 valid nonempty screenshots (desktop 1440 × 1000 and mobile 390 × 844) under `docs/development/visual-baselines/phase-4/captures/fixtures-*.png`. They cover every required matrix combination plus fallback/no-hero. The no-hero Immersive capture renders the existing `.article-hero__fallback` treatment.
- Automated verification: Node tests 20/20, frontend production build, Astro production build, backend syntax check, visual-harness build, and `git diff --check` passed. Existing non-blocking frontend `::highlight` and bundle-size advisories remain.

## Checkpoint C — visual acceptance finding — 2026-10-28

- Contact-sheet inspection of every layout/preset pair at desktop and mobile found a blocking contrast failure in the Minimal News, Luxury Editorial, and Brutalist Magazine presets on all three dark hero layouts. Their generic preset heading selector overrides the hero's intended white text with dark heading colors, making headline text unreadable. Cyberpunk Technology remains legible.
- This affects 18 of the 24 preset/layout screenshot pairs (36 viewport screenshots): Classic, Split, and Immersive × Minimal/Luxury/Brutalist × desktop/mobile. The six Cyberpunk viewport captures are visually legible. The Classic fallback and Immersive no-hero fixtures render structurally, but final acceptance is blocked by the preset contrast defect.
- Phase 4 is **not commit-ready** until the explicit style-token heading color is scoped so dark hero headings remain readable. Exact Classic pixel parity remains qualified because pre/post captures used different renderers.

## Hero contrast correction — 2026-10-28

- Root cause: `.article-style[class*='article-style--'] h1, h2, h3` applied `--article-heading` after the trusted layout hero rules, replacing hero white with dark preset colors.
- Minimal correction: `site/src/styles/global.css` now targets only `.article-body h2` and `.article-body h3`. Hero `h1` selectors are no longer overridden; no `!important`, layout, spacing, or token values changed.
- Regression test added to reject a global preset `h1` selector. Node tests now pass 21/21. Frontend, Astro production, visual harness, backend syntax, and diff checks pass.
- Regenerated Classic/Minimal desktop and mobile evidence confirms the hero headline is white and readable again. The same cascade correction applies to all three trusted layouts and all four preset classes; full matrix recapture remains recommended before final commit because only the originally failing representative pair was regenerated in this correction pass.

## Final visual acceptance — 2026-10-28

- Rebuilt the isolated harness and regenerated all 28 fixture screenshots from corrected CSS. All files are nonempty at their requested desktop/mobile dimensions.
- Computed-style verification across all 12 layout/preset combinations confirms white hero headings (`rgb(255, 255, 255)`), expected preset body-heading colors, and no desktop document overflow. This covers Classic, Split, and Immersive with Minimal, Luxury, Brutalist, and Cyberpunk.
- Visual inspection of the regenerated representative and contact-sheet matrix confirms the corrected high-contrast hero treatment. Classic fallback and Immersive no-hero screenshots remain structurally readable. No production fixture output was found in normal `site/dist`.
- Classic exact pixel parity remains qualified because Checkpoint A baseline/post captures used different local renderers. It is not a current visual blocker because the extracted Classic screenshot was visually/structurally consistent and the production renderer is now covered by the isolated harness.
