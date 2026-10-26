# Changelog — 2026-10-26 (Article review baseline)

## Public blog cleanup

- Removed an accidental literal `` `r`n `` string rendered after the `/blog` page script. It was stray template text, not HTML escaping.
- Updated `AGENTS.md` with the recent prompt history and handoff state before beginning the planned AI article-review feature.

## Verification and release

- Confirmed the literal string no longer appears in `site/src/pages/blog/index.astro` and reviewed the diff.
- Committed and pushed the baseline cleanup to `origin/v2.1` as `9f39106` (`fix(blog): remove stray template text`) before starting article review.

## AI article review in the Editor

- Added authenticated `POST /api/ai/review-article`, using the selected Ollama model to review spelling, grammar, clarity, consistency, and potentially inaccurate or time-sensitive claims.
- Added an AI article-review panel to the Editor. Drafts and published articles use the same workflow.
- Findings include a quoted passage, explanation, severity, and suggestion. Writing suggestions can be applied one at a time when the quoted text matches; factual findings remain advisory and cannot be auto-applied.
- Review now includes the current article category and the saved generation topic when available. The AI generation topic is stored in the article-linked `ai_generations.prompt`; the separate `topic_history` table is global and does not associate topics with articles. Manually written/older articles without generation history have no saved topic.
- Follow-up clarified that the requested topic belongs in article data, not the Articles Overview. The temporary uncommitted overview-column change was reverted.

## Persistent article topics

- Added a normalized `topics` table and a `topic_id` foreign key on articles. Topic names are case/whitespace normalized so repeated entries reuse the same record.
- The Editor requires an article topic. Manual input resolves to a reusable topic ID; AI and automated generation save their topic through the same relationship.
- Added an idempotent lazy migration for existing installations. It migrates a prior direct `articles.topic` value or an article's completed AI generation prompt when available. Articles with no saved topic remain blank for the user to fill in; the migration never substitutes the title. Existing databases become non-null only after all legacy rows have topics.
- Article editing, AI review, and analytics read the saved topic relationship. Category remains a separate `category_id` relationship.

## Article review suggestion application

- Fixed suggestion application for rich-text content. The Editor now matches quoted visible text across inline formatting and normalizes common whitespace and quote-style differences, then replaces the selected text range while preserving surrounding editor content.
- Kept the analysis visible after applying a suggestion. The editor now clears review results only after a user-originated text edit, not when Quill receives the programmatic replacement.
- Updated review prompting to request exact visible-text quotes and replacement text for spelling, grammar, clarity, and consistency findings; factual checks remain verification advice rather than automatic edits.
- Expanded the review to check title quality and topic suitability. Findings identify whether they target the title, topic, or body, and Apply suggestion updates the matching Editor field.
- Kept the established, thorough body-proofreading pass intact and moved title/topic review into a separate focused model pass. If title/topic review fails, body results still display with a note.
- Editing the title or article body clears the previous result so findings do not silently carry over to different text.
- The review never saves content automatically and reports that live sources were not checked. Model knowledge and cutoff dates are not treated as verification.
- Updated the user guide, routes/API documentation, and `AGENTS.md` handoff history.
- Distinguished fact-check findings with a light yellow card background; these remain manual verification reminders with no Apply button.
- Colored individual Apply suggestion buttons by severity: low green, medium orange, and high red.
- Added Apply all suggestions to apply pending editable title, topic, and article-body replacements together. Fact-check findings are excluded; stale quotes and missing replacements are skipped and reported. Applying suggestions updates the Editor only and does not save the article.
