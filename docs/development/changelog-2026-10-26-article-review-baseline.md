# Changelog â€” 2026-10-26 (Article review baseline)

## Public blog cleanup

- Removed an accidental literal `` `r
 `` string rendered after the `/blog` page script. It was stray template text, not HTML escaping.
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

## Article reviewer refinement

- Dismissed suggestion cards now collapse with a short fade/height transition. A **Dismissed suggestions** disclosure keeps their details available, and each finding remains in the article's review history.
- New reviews load up to 100 saved runs and pass handled findings to the reviewer to avoid repeating the same or substantially similar applied/dismissed changes. If the current title matches a previously applied title suggestion, the title pass avoids style-only rewrites; exact repeated title findings are filtered server-side.
- Applying a body suggestion now requires a unique quote match. **Apply all suggestions** uses unique matches and shows a combined confirmation preview before changing the Editor.
- Review-run and findings inserts now commit or roll back as one database transaction. Repeating an identical applied/dismissed status update succeeds, allowing safe retries after a network error.
- Verification: `git diff --check` passed. Runtime tests were not run.

## Focused spelling and bulk dismissal

- Added **Dismiss all suggestions** beside **Apply all suggestions**. It confirms the action, dismisses every remaining pending finding (including fact checks), and persists each status in review history; applied findings are left as-is.
- Added a dedicated **Spell check** action. It requests only likely misspelled words, returns each as a single-word finding, checks the title and body, avoids repeating handled spelling findings, and stores results in the same per-article review history. Each word can be reviewed and applied individually through the existing Apply suggestion button.
- Verification: `git diff --check` passed. Runtime tests were not run. Git commit/push of the preceding reviewer refinement was attempted first but was blocked because Git could not create `.git/index.lock` in this environment; those changes and this follow-up remain uncommitted/unpushed.

## Title suggestion matching fix

- Title suggestions now compare normalized title text while ignoring surrounding quote marks and trailing punctuation, so typographic quote differences do not block application. The existing stale-title guard remains in place for genuinely changed titles.
- Apply all uses the same normalized title comparison.
- Verification: `git diff --check` passed. Runtime tests were not run.

## Case-insensitive spelling suggestion matching

- Fixed the visible-text matcher to search a normalized text stream while preserving a mapping back to the original editor characters. Case differences no longer produce an incorrect text range or prevent applying a one-word spelling suggestion. Ambiguous matches still require a unique occurrence.
- Verification: `git diff --check` passed. Runtime tests were not run.

## Title suggestion confirmation

- Removed the unreliable exact-match guard that kept blocking title suggestions as stale. Applying an individual title suggestion now shows the current and proposed titles and requires confirmation before replacement. Apply all includes title changes in its combined preview and likewise replaces the current title only after confirmation.
- Verification: `git diff --check` passed. Runtime tests were not run.

## Word-level title spelling corrections

- Title findings tagged as spelling with a one-word quote now replace only that quoted word in the current title. Full-title clarity/grammar suggestions continue to replace the whole title. Apply all uses the same word-level behavior and its combined preview shows the resulting full title.
- Verification: `git diff --check` passed. Runtime tests were not run.

## Unicode tolerant spelling quote matching

- Extended article-text matching to normalize accented Unicode characters and, for single-word findings, use a word-boundary match that tolerates surrounding punctuation. It still requires exactly one matching word in the article before applying.
- Verification: `git diff --check` passed. Runtime tests were not run.

## Locate spelling findings in the editor

- Spelling cards now include **Locate in article**. It selects the uniquely matching word in the title input or rich-text editor and scrolls it into view, making the target visible before applying a correction.
- Verification: `git diff --check` passed. Runtime tests were not run.

## In-editor spelling highlight and confirmation dialogs

- **Locate in article** now selects the word directly from Quill's rendered text and adds a temporary yellow text highlight where the browser supports the CSS Custom Highlight API.
- Replaced native browser confirmation popups in the Editor with a styled in-app dialog for title changes, bulk apply/dismiss, fact-check sentence actions, and category deletion.
- Verification: `git diff --check` passed. Runtime behavior has not been tested.

## Spell-check selected text

- Added **Spell check selection** below the rich-text editor. Select a single word or passage, then run a focused spelling-only check on that selection; it is not asked to assess the rest of the article or title.
- Selected-text findings retain the selected Quill range for the current session, so applying a finding replaces the matched word inside that selected passage, even if the word appears elsewhere in the article.
- Verification: `git diff --check` passed. Runtime behavior has not been tested.

## Selected-passage spelling follow-up

- Added the **Spell check selection** control directly beneath the editor. Mouse or keyboard selection captures a word or passage before the control takes focus; only that text is sent to the focused spell-check request.
- Findings keep the selected Quill range during the current session. Applying a finding replaces the matching word inside that range and adjusts the remaining finding ranges after each correction.
- Verification: `git diff --check` passed. Runtime behavior has not been tested.

## Selected spelling language and repeat checks

- Spell checks now receive the Editor's selected writing language. Explicitly selected text is treated as a direct spelling question, including a single word without context, and older handled findings no longer suppress results from this manual focused check.
- Verification: `git diff --check` and backend syntax check passed. Runtime behavior has not been tested.

## Context-aware selected spelling check

- Selected-text spelling checks now include up to 500 characters of nearby editor text as context, while clearly separating the selected correction target from context-only text. The request includes the editor's spelling language and asks the model to choose corrections based on sentence meaning (for example, distinguish valid words that do not fit the context).
- Verification: `git diff --check` and backend syntax check passed. Runtime behavior has not been tested.

## Article review control layout

- Grouped whole-article actions under **Full-article checks**, with separate descriptions for **Check full article spelling** and **Review full article**.
- Put selected spelling in its own **Spell-check selected text** panel directly below the editor, with selection instructions, a preview of the selected passage, and a dedicated **Check selection** button.
- The preceding contextual spelling and reviewer changes were committed and pushed as `ebaed79` (`feat(article-review): add contextual spell checking and safe actions`) to `origin/feat/article-reviewer-v2.3` before this layout change.
- Verification: `git diff --check` passed. Runtime visual checks were not run.

## Compact previous review history

- The Editor now shows the three most recent previous review runs by default, displays the total run count, and provides **Show older reviews (N)** to expand the rest. **Show fewer reviews** collapses the list again. All saved history remains available.
- Verification: `git diff --check` passed. Runtime visual checks were not run.

## Simplified article review panel

- Removed the explanatory paragraphs beneath the full-article check buttons and tightened the header. The controls now read **Spell check** and **Full article review**.
- Review metadata is one compact model/date line; the no-findings state is shorter. The manual verification note appears only when the run includes fact-check findings.
- Verification: `git diff --check` passed. Runtime visual checks were not run.

## Compact AI check metadata

- Changed the metadata label to **AI check done by:** followed by the model and date/time. When there are no findings, this metadata is grouped on the same line as **No suggestions found.** When findings exist, it remains a compact line above them.
- The preceding review controls/history cleanup was committed and pushed as `144d081` (`refactor(article-review): simplify editor review controls`) to `origin/feat/article-reviewer-v2.3` before this follow-up.
- Verification: `git diff --check` passed. Runtime visual check not run.

## Auto-dismiss empty review notice

- The **No suggestions found** notice now stays visible for five seconds, then smoothly fades and collapses. The review controls and saved history remain visible.
- Verification: `git diff --check` passed. Runtime visual check not run.

## Independent review history panel

- Moved **Previous review history** out of the Full-article checks card into its own collapsible panel. It can now be expanded or collapsed without affecting review controls or current findings. This is a UI-only change; history behavior and data are unchanged.
- Verification: `git diff --check` passed. Runtime visual check not run.

## Smooth review history expansion

- Replaced the history panel's instant native disclosure with a controlled expand/collapse transition that animates height and opacity. This is a presentation-only change; displayed records and history behavior are unchanged.
- Verification: `git diff --check` passed. Runtime visual check not run.

## Full-article checks heading spacing

- Kept the **Choose a check:** helper line and increased its top spacing beneath the section heading for better visual breathing room.
- Verification: `git diff --check` passed. Runtime visual check not run.

## Rich-text toolbar tooltips

- Added compact, styled hover/focus tooltips to the editor's paragraph/heading style, bold, italic, underline, link, numbered list, bulleted list, and clear-formatting controls. Labels also improve accessible names for toolbar controls.
- Verification: `git diff --check` passed. Runtime visual check not run.

## Fade handled suggestion cards

- Applied suggestion cards now fade and collapse out of the active findings list, matching dismissed cards. Applied and dismissed items remain available in a collapsed **Handled suggestions** disclosure with their status and text.
- Verification: `git diff --check` passed. Runtime visual check not run.

## Media Library video backend foundation â€” 2026-10-27

- Extended the existing `media` table instead of introducing a separate videos table. Added media/source types, external source and thumbnail URL fields, and made the local filepath nullable for links. Existing image rows default to `image` and the API defaults to returning images to preserve the current UI.
- Added backend handling for MP4, WebM, and MOV uploads (200 MB maximum with signature validation) and HTTPS video links with optional title/thumbnail metadata. Deletion checks article content references as well as featured image associations.
- Featured-image validation now rejects video media. Added typed media listing and a client API helper for adding video links.
- Updated `docs/development/media-library.md`. The Media Library Videos UI and video insertion/rendering in article bodies remain future work.
- Verification: backend JavaScript syntax checks and `git diff --check` passed. No runtime upload/DB integration checks were run.

## Selected-text check heading spacing

- Matched the selected-text spelling section's heading-to-helper spacing to the Full-article checks section.
- Verification: `git diff --check` passed. Runtime visual check not run.

## Milestone handoff â€” 2026-10-27

- Completed and pushed the v2.3 reviewer UI refinements as `6095408` (`feat(article-review): polish review and editor interactions`) on `feat/article-reviewer-v2.3`.
- Created the next milestone branch from that commit. It was initially named `feat/article-reviewer-v2.4`, then renamed to `feat/media-library-v2.4` when the user shifted the next work to Media Library improvements. No v2.4 feature changes have started yet.

## Media Library dashboard: Images and Videos — 2026-10-27

- Added separate Images and Videos tabs to the Media Library dashboard. Existing image cards and photo-credit controls remain in the Images view.
- Added video upload and hosted-link controls, with preview cards matching the image grid. Uploaded video cards include native playback controls; hosted links use a thumbnail when supplied or a provider placeholder.
- Updated the Media Library guide. Adding videos inside article content remains future work.
- Per the user's request, the initial UI pass was not tested; the follow-up verification is recorded below.

## Media Library Images/Videos dashboard verification — 2026-10-27

- Fixed the Media Library page source encoding so Vite can read and compile the new video UI.
- Verification: frontend production build passed. The admin `/media` page returned HTTP 200; the media API returned HTTP 401 without a token, as expected for its admin-only route. Build reports existing CSS highlight pseudo-element and large-chunk warnings. App runtime upload/DB testing was not performed.
## System activity logs feature kickoff — 2026-10-27

- Created branch `feat/system-activity-logs` from the pushed Media Library milestone.
- Added a Developer sidebar entry and a placeholder System Activity Logs page to mark the feature location. No event capture, persistence, or audit behavior is implemented yet; that design and implementation are next.

## System Activity Logs navigation placement — 2026-10-27

- Moved **System Activity Logs** from Developer to the System sidebar section per user clarification. Developer remains for development tools.
- No activity capture or persistence behavior changed.

## Media Library video playback error - 2026-10-27

- Investigated an uploaded MP4 that would not play. The stored file had a valid container header but an empty `mdat` box, so it contained no media payload. Static serving correctly returned `video/mp4` with byte-range support.
- MP4/MOV upload validation now requires a non-empty media-data box. Video cards show a clear message when playback fails in the browser, including a reminder about supported codecs.
- The existing broken upload was left untouched; the user can delete that library entry and upload the complete source. `node --check src/controllers/media.controller.js` and the frontend production build passed; authenticated upload testing remains pending.
## Media Library in-app delete confirmation - 2026-10-27

- Replaced the browser-native delete popup with an accessible, styled in-app confirmation dialog. It names the item, explains uploaded-file deletion, notes the article usage restriction, and provides Cancel/Delete actions.
- Verification: frontend production build passed; `git diff --check` passed. No deletion was executed during verification.
## Consistent in-app delete confirmations - 2026-10-27

- Replaced the remaining browser-native confirmation in Articles Overview with the same styled, accessible alert dialog used by Media Library. Article deletion now names the article, explains that saved review history and media associations are deleted, and provides Cancel/Delete actions.
- Repository-wide source search found no remaining native `window.confirm`, `window.alert`, or `window.prompt` calls. Editor confirmations were already in-app.
- Verification: frontend production build passed; `git diff --check` passed.
## System Activity Logs reporting module - 2026-10-27

- Replaced the placeholder with a modular MySQL event log and report workspace under System. Added report-category selectors and summary cards, inclusive date filters, paginated event table, and an Excel-compatible UTF-8 semicolon CSV export capped at 50,000 rows.
- Added lazy database-table creation plus schema.sql definition. Shared middleware records authenticated admin mutations and API failures with actor, target, status, timing, and allowlisted metadata; secrets, full article content, prompts, and request query strings are excluded.
- Added explicit events for login success/failure and rejected tokens, Ollama connection state transitions, scheduled publishing, automation outcomes, API startup, Socket.IO connection errors, admin browser errors, and public-site HTTP 5xx responses. Reader-activity report is sourced from existing anonymous article_read_views; it does not create visitor identities.
- Documented capture coverage, privacy decisions, historical-data limits, retention gap, single-admin identity limit, and database-down fallback in docs/development/system-activity-logs.md. There is no historical backfill or retention UI yet. At initial implementation, CSV was the only export format. Local MySQL migration/report integration and event-flow runtime checks remain to be performed.
### Activity report export formats - 2026-10-27

- Added real XLSX, CSV, and PDF exports for the selected report and inclusive date range. XLSX includes Activity report and Overview sheets; PDF presents the overview counts and filtered activity records.
- Renamed the action to Export report, added a format menu and hover/focus help bubble, and clarified Google Sheets works by importing XLSX/CSV rather than direct publishing.
- Export still caps each format at 50,000 rows. PDF uses standard fonts, so non-Latin characters may be replaced in that format.

### XLSX repair warning follow-up - 2026-10-27

- Excel reported XML errors while opening exported workbooks. Stripped XML 1.0-invalid control characters, preserved valid Unicode, and limited strings to Excel's cell text limit. Corrected worksheet schema element ordering and selected-tab metadata.
- Generated a workbook containing control characters and Unicode, opened the ZIP, and parsed all five XML parts successfully.
ode --check and git diff --check passed.

### Export menu focus styling - 2026-10-27

- While the export menu is open, the page behind it is softly dimmed and blurred. Clicking an underlying element closes the menu and still activates that element; Escape closes the menu as well.
- Frontend production build and git diff --check passed.

### Public article front-end redesign - 2026-10-27

- Redesigned the public Blog listing and article reading pages in the existing Astro site, plus shared shell, reusable article cards, and category archives. Added responsive navy/blue/violet styling, dynamic category navigation, mobile menu, and search access.
- Preserved existing API data and behavior for search, filters, Grid/List, Pages/Infinite scroll, theme preference, article routes, read tracking, photo credits, and related articles. Added generated table of contents, reading progress, and social share/copy actions.
- Site production build and local HTTP route/query checks passed. Exact viewport screenshot review remains pending because browser automation could not connect. No backend/API/database changes. Work remains uncommitted/unpushed on feat/public-blog-redesign.

## Separate article grammar and fact-check actions — 2026-10-27

- Added standalone **Grammar check** and **Fact-check** actions to the Editor's full-article checks, alongside existing spelling and complete review actions.
- Added focused API endpoints. Grammar checks are limited to spelling, grammar, punctuation, capitalization, and usage. Fact-check review is limited to claims requiring verification and remains advisory because no live sources are queried.
- Both actions save findings in the existing per-article review history and reuse existing finding cards, dismissal/status persistence, and safe edit flows. Fact-check findings keep sentence quotes and optional neutral rewrites for preview-confirmed actions.
- Verification: pending.

## Rename selected-text checks section — 2026-10-27

- Renamed the selected-text panel heading to **Partial-article checks** to distinguish it visually from **Full-article checks**. Selection instructions, preview, control, and behavior are unchanged.
- Verification: git diff --check passed; runtime visual check not run.

## Label selected-text check action — 2026-10-27

- Added a visible **Spell check** label directly above the **Check selection** button in the **Partial-article checks** panel so its purpose is explicit.
- Verification: git diff --check passed; runtime visual check not run.

## Place partial-check label with its description — 2026-10-27

- Moved **Spell check** from above the action button into the helper text, where it now prefixes the selection instructions. The **Check selection** button remains unchanged.
- Verification: git diff --check passed; runtime visual check not run.

## Increase partial-check heading spacing — 2026-10-27

- Increased the vertical margin above the **Spell check** helper line in **Partial-article checks** for clearer separation from the section label.
- Verification: git diff --check passed; runtime visual check not run.

## Align partial-check description with action — 2026-10-27

- Bottom-aligned the description/selection preview column and **Check selection** button at desktop widths so the **Spell check** line aligns with its action. Mobile layout remains stacked.
- Verification: git diff --check passed; runtime visual check not run.

## Center selected-text action vertically — 2026-10-27

- Vertically centered **Check selection** against the description/preview column on desktop after user feedback that bottom alignment placed it too low. Mobile remains stacked.
- Verification: git diff --check passed; runtime visual check not run.

## Expand partial-article checks — 2026-10-27

- Added independent selection-only **Grammar check** and **Fact-check** actions alongside spelling. Each checks only the selected passage; up to 500 characters of surrounding editor text are sent as meaning context and are explicitly excluded as finding targets.
- Reused the existing focused-check endpoints with selection mode and added named selection routes. Findings keep their Quill selection range so text corrections and fact-check sentence actions can target the passage. Fact-check remains advisory with no live-source verification.
- Positioned the selection action column from the **Spell check** description line; additional selection check actions continue beneath it.
- Verification: backend syntax checks, frontend production build, and git diff --check passed. Build reports existing CSS highlight pseudo-element and large-bundle warnings. Runtime/model interaction not tested.

## Align partial-check options with their actions — 2026-10-27

- Reorganized **Partial-article checks** into three paired rows: each **Spell check**, **Grammar check**, and **Fact-check** description now sits directly beside its matching selection action. The selected-text preview remains with spelling.
- Verification: frontend production build and git diff --check passed. Existing CSS highlight and bundle-size build warnings remain; runtime visual check not run.

## Fix selected grammar/fact-check HTTP 500 — 2026-10-27

- Bound the focused grammar and fact-check controller methods when registering Express routes. The handlers call a shared method through this; Express had been invoking them without the controller instance, causing an unhandled TypeError and HTTP 500 before the check ran.
- Scoped duplicate filtering to the selected check's relevant finding types so selection grammar checks do not get blocked by unrelated handled findings.
- Verification: Node syntax checks passed for the AI controller and routes; git diff --check passed. The Ollama request was not exercised.

## Separate loading state for article checks — 2026-10-27

- Gave each selection and full-article check its own active/loading indicator. Only the action that was pressed now shows its spinner or checking label; other check buttons are disabled during the request to prevent overlapping requests against the shared findings panel.
- Separated selected-text spelling loading from full-article spelling loading.
- Verification: frontend production build and git diff --check passed. Existing CSS highlight and bundle-size warnings remain; runtime interaction check not run.

## Add excerpt proofreading and fact-check action — 2026-10-27

- Added **Check excerpt** to Partial-article checks. It checks only the excerpt for spelling, grammar, punctuation, usage, and claims that may need verification; article body text is context only.
- Added an authenticated endpoint and saved the findings in existing per-article review history. Findings target the `excerpt` field; individual and Apply all corrections update the excerpt, while fact-check sentence removal/neutral rewrite retain the existing preview confirmation.
- Verification: backend syntax checks, frontend production build, and `git diff --check` passed. Existing CSS highlight and bundle-size warnings remain; AI runtime behavior not tested.
## Full article review runs all focused checks — 2026-10-27

- Full article review now runs the broader editorial/title pass plus the dedicated spelling, grammar, and fact-check passes. Findings are combined, deduplicated, and saved as one review-history run.
- Increased the full-review frontend request timeout to five minutes to accommodate the additional sequential model passes. If one focused pass fails, the other findings are retained and the failure is noted in the review.
- Verification: backend syntax checks, frontend production build, and `git diff --check` passed. Existing CSS highlight and bundle-size warnings remain; runtime model request not tested.
## Match partial-check button widths — 2026-10-27

- Set the selection spell, grammar, fact-check, and excerpt actions to a consistent 12rem width on wider screens. Buttons remain full-width on mobile, preserving the stacked responsive layout.
- Verification: `git diff --check` passed; runtime visual check not run.
## Consistent dividers in partial-article checks — 2026-10-27

- Added the same top divider and spacing to the spelling, grammar, and fact-check option rows already used for the excerpt row.
- Verification: `git diff --check` passed; runtime visual check not run.
## Match partial-check panel background — 2026-10-27

- Changed the **Partial-article checks** panel to use the same card background, foreground, border, and shadow treatment as **Full-article checks**, separating both check areas from the editor surface.
- Verification: `git diff --check` passed; runtime visual check not run.
## Collapsible article check sections — 2026-10-27

- Made **Partial-article checks** and **Full-article checks** independently collapsible with accessible Show/Hide buttons and chevron indicators. Both sections are expanded by default; collapsing Full-article checks also hides its current findings to reduce page clutter.
- Verification: frontend production build and `git diff --check` passed. Existing CSS highlight and bundle-size warnings remain; runtime visual check not run.
## Match review-history collapse animation — 2026-10-27

- Applied the same animated grid-row and opacity transition used by Previous review history to the Partial-article checks and Full-article checks collapsible sections.
- Verification: frontend production build and `git diff --check` passed. Existing CSS highlight and bundle-size warnings remain; runtime visual check not run.