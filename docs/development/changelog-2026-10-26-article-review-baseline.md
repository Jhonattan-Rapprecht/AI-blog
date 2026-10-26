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
- After the reviewer controls were committed, the user asked for fact-check cards to read more clearly as yellow than medium-priority orange. Increased the card's yellow fill and border contrast. The Review article button now pulses sky blue while a review is running so the in-progress state stands out.
- Added context-aware actions for fact-check findings. The review asks for the exact containing sentence and an optional neutral rewrite that does not assert the unverified claim. The Editor offers sentence removal and neutral rewrite with a before/after confirmation; it edits only a unique sentence match, keeps the finding visible as handled, and does not save automatically. See `docs/development/known-issues.md` for the resolved issue record.
- Added **Dismiss suggestion** and persistent review history for saved articles. Each review run and finding is stored with its applied/dismissed state and linked to its article; deleting the article cascades to its review data. The Editor restores the latest review and shows up to 19 previous runs (20 runs total). If a new article is reviewed before its first save, the current review and its statuses are attached when the article is saved. Added lazy table creation for existing databases and tables to `schema.sql` for new databases.
- The fact-check prompt now requests a full sentence and optional neutral rewrite per fact finding. With the existing 3,000-token body-review response budget, this extra output can leave room for fewer findings; no review criteria or prompt scope were otherwise narrowed.
- Fixed review persistence timestamp insertion by letting MySQL assign `reviewed_at` with `CURRENT_TIMESTAMP`, rather than inserting JavaScript's ISO `T...Z` value. If the API still reports the old datetime error, restart the backend process to load the fix.
- Superseding the earlier persistent-article-topic decision: removed the standalone Article topic field from the Editor and topic checking from AI review. Topic remains in the AI generation panel and in each generation prompt. New article rows no longer require or write `topic_id`; the existing column is made nullable and legacy topic links are retained. Analytics now derives generation-topic coverage from completed AI generation records; automated generation now saves those records too.
- Extended the focused title-review pass to check spelling and grammar as well as title clarity and accuracy. It returns one combined full-title replacement so multiple title fixes do not conflict. Article topic is not part of this review.
- Confirmed with the user that Topic stays only in AI generation settings, where it and Category guide suggestions and generation; the AI may suggest a topic/title when inputs are blank. Do not show Topic in the existing-draft editor or reviewer. Manual drafts continue to save without an article topic.
- Fixed review-status persistence: CORS now permits the `PATCH` method used to record applied/dismissed findings. The Editor exposes **Retry saving status** if a status update fails after the article text changed; reapplying a title suggestion that is already present retries only the history update.
