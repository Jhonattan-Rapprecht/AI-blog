# Creative Studio Phase 1 — 2026-10-28

## Delivered foundation

- Added protected admin destinations for **Article Layouts**, **Style & Appearance**, and **Admin Theme**, plus their required sidebar entries under Articles and System.
- Preserved **Developer → Components** as its own destination. It is now available in production as a read-only catalog of bundled snippet files; local development retains the existing New component workflow and its Vite-only filesystem writer.
- Added a read-only authenticated design catalog endpoint: `GET /api/article-design/catalog`.
- Added `src/config/article-design.config.js`, the single Phase 1 server foundation for approved layout IDs, style preset IDs, trusted component metadata, safe design defaults, and strict configuration validation.

## Security and architecture boundaries

- The catalog exposes metadata only. It contains no Astro source, filesystem paths, executable HTML, dynamic import strings, arbitrary CSS, or JavaScript.
- Configuration validation accepts only approved IDs/tokens and falls back to Classic Editorial / Minimal News defaults for invalid values.
- Trusted component IDs are constrained to their approved layout regions.
- No database migration, database configuration persistence, public Astro rendering change, article edit, or HTML sanitization change occurred in Phase 1.
- ReactQuill remains unchanged. Existing snippet iframe sandboxing remains unchanged.

## UI scope

The three new destinations intentionally explain the available layouts/presets and current boundaries. They do not offer misleading Save or Apply controls yet: publication defaults, per-article overrides, and public layout rendering belong to Phase 2 and Phase 4.

## Editor consistency refinement

- **Title & excerpt checks** now uses the same independent Show/Hide control, chevron, and collapse animation as Partial-article checks and Full-article checks.
- All three check panels start collapsed, reducing initial editor density while keeping every action available on expansion.
- Added a small extra gap between the rich-text editor and the Title & excerpt checks panel. The Title/Excerpt check behavior itself is unchanged.

## Follow-up refinements

- Reworked `useTheme()` into a shared browser theme store. The header toggle now updates every mounted consumer immediately, including the Admin Theme page; it also listens for browser storage changes from other tabs. Socket.IO is intentionally not involved because this is a local browser preference, not server-shared state.
- Replaced the fictitious photo-credit placeholder in the Editor and Media Library with the subdued examples `Shutterstock, Getty Images, Unsplash`. Placeholder text is intentionally small and low-contrast while entered credits remain normal, readable text.

## Verification

- `npm test`: passed 11/11 tests, including four new design configuration/registry safety tests.
- Backend syntax checks: passed for the added design config, controller, and route.
- Frontend production build: passed.
- Astro production build: passed.
- `git diff --check`: passed.

The frontend build continues to report the existing CSS `::highlight` warning and a bundle-size advisory. Neither was introduced by this phase.
