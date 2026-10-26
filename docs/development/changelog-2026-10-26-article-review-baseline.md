# Changelog — 2026-10-26 (Article review baseline)

## Public blog cleanup

- Removed an accidental literal `` `r`n `` string rendered after the `/blog` page script. It was stray template text, not HTML escaping.
- Updated `AGENTS.md` with the recent prompt history and handoff state before beginning the planned AI article-review feature.

## Verification and release

- Confirmed the literal string no longer appears in `site/src/pages/blog/index.astro` and reviewed the diff.
- Baseline commit and push to `origin/v2.1` are pending.
- AI article-review implementation has not started; it will follow this baseline checkpoint.
