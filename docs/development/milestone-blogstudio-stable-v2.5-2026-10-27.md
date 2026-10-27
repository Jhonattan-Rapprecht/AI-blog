# Blogstudio Stable v2.5 - 2026-10-27

## Reviewer refinements

- Added **Check title** as a focused review action. It checks the title only, using the excerpt and article body only for context.
- The title prompt now assesses spelling, grammar, natural sentence structure, word meaning in context, idiomatic usage, and whether the title accurately describes the article. It must leave unusual but valid titles unchanged.
- Moved title and excerpt actions into **Title & excerpt checks**, above **Partial-article checks**. Selected-text spelling, grammar, and fact checks remain in Partial-article checks.
- Moved the shared **Review results** panel after both check sections and merged Previous review history into it. Current results and historic runs retain their existing handling and collapse controls.
- Review runs now persist `check_type`, allowing results and history to identify their source: full article, title, excerpt, or selected-text check. Reviews created before this change have no recoverable source and show the generic fallback label.
- After a reported Dutch title was not flagged despite an unnatural final phrase, strengthened the title-only prompt to receive the configured language explicitly and require a semantic-readability pass. It now flags dictionary-valid words used with the wrong sense, incomplete constructions, unnatural word combinations or idioms, and literal translations that a typical native reader would not understand.

## Public favicon consistency

- Replaced the public SVG favicon with the same purple Blogstudio mark used by the admin app.
- Regenerated the public ICO fallback from that SVG at 16, 32, and 48 pixels.
- Versioned the public favicon URLs to bypass stale browser and editor-preview caches after favicon updates.

## Verification

- Backend files passed `node --check`.
- Frontend `npm.cmd --prefix frontend run typecheck` passed.
- `git diff --check` passed.
- The review database migration was not run directly. The existing lazy review-table setup adds nullable `check_type` only when it is absent.

## Prompt history

This record preserves the product requests that led to this milestone. Messages that contained credentials or other secrets are intentionally summarized without their values.

1. Audit the codebase and identify security, architecture, quality, and production-readiness issues.
2. Remove hardcoded database credentials, load them through environment variables, verify the change, and document it.
3. Create a dedicated local MySQL application user with database-scoped access; configure the app to use `DB_*` values.
4. Make public list-mode article thumbnails consistent when cards have different text lengths.
5. Create and push the `milestone/blogstudio-stable-v2.5` branch.
6. Use the same admin favicon on the public site and its ICO fallback; address stale editor-preview cache behavior.
7. Add Check title near Check excerpt, then separate title/excerpt checks from selected-text partial checks.
8. Keep one Review results destination, label where suggestions originated, persist the source for saved review history, and merge review history into that panel.
9. Improve the title check so it detects unnatural sentence structure, incorrect contextual word meaning, and semantically unclear or misleading titles without rewriting unusual but valid titles.

## Conversation log additions

This concise log captures the latest user request and the corresponding implementation response without recording credentials or private values.

| User request | Response and outcome |
| --- | --- |
| The title checker missed a Dutch title whose final phrase was grammatically formed but semantically unnatural. | Diagnosed that the title-only prompt referred to a configured language without passing its value and did not require phrase-completeness or word-sense checks. Updated the prompt only; no UI or workflow changed. |
| Commit, push, document, and ensure prompts/responses are logged. | Added this log, updated the handoff, and committed/pushed the refined title-check prompt. |
