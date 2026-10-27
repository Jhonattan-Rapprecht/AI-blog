# Agent Handoff and Prompt History

Read this file before continuing work when the repository history or the latest product decisions are unclear. Keep the session record current after substantial app changes: note the user request, the implementation, affected areas, verification, commit/push state, and any unfinished work. The detailed user and developer documentation remains under `docs/`.

## Active session — 2026-10-26

### Milestone handoff — 2026-10-27

- Current branch: `feat/media-library-v2.4`, renamed to reflect the next Media Library improvement milestone.
- The v2.3 UI refinements are committed and pushed to `origin/feat/article-reviewer-v2.3` as `6095408` (`feat(article-review): polish review and editor interactions`). That commit includes the compact no-findings notice, independent animated history panel, heading spacing, rich-text toolbar tooltips, and fade/collapse of handled suggestions, with changelog documentation.
- The v2.4 branch is ready for Media Library improvements. No v2.4 product changes have started yet.
- Unrelated untracked `docs/product/` and `temp.txt` were left untouched.

### Latest request — prepare video support in the media backend

The user wants separate Images and Videos areas in the Media Library while retaining the current card-grid style. Prepared the backend foundation by extending the existing `media` table (rather than adding a videos table): `media_type`, `source_type`, `source_url`, `thumbnail_url`, and nullable `filepath`; existing images default to image. Added typed media listing, signature-checked MP4/WebM/MOV uploads, HTTPS video link records, deletion protection for content references, and image-only validation for featured images. Updated `docs/development/media-library.md`. The Media Library Videos UI and article-body embed insertion/rendering are not implemented yet. Syntax and diff checks passed; DB/runtime integration was not run. These changes are uncommitted on `feat/media-library-v2.4`; unrelated untracked `docs/product/` and `temp.txt` remain untouched.

### Latest request — bulk dismiss and focused spelling check

The user requested a **Dismiss all suggestions** control next to **Apply all suggestions**, plus a dedicated spelling check because the general review misses misspelled words; spelling findings should isolate a specific word for review and correction. Added a confirmed bulk dismissal that persists each pending finding's status, and a separate AI spell-check endpoint/button returning single-word title/body findings that use the existing individual apply flow and article review history. The user also asked to commit/push/document preceding changes first; documentation has been updated, but the Git commit attempt was blocked when Git could not create `.git/index.lock` (permission denied). No commit or push has succeeded. `git diff --check` passed; runtime tests not run.

### Follow-up — applying title suggestions

The user reported a stale-title error while applying a title suggestion. Updated individual and bulk title matching to ignore quote-mark style and trailing punctuation while retaining the stale-title safeguard for actual title edits. Documented in the dated changelog. `git diff --check` passed; runtime tests not run; changes remain uncommitted/unpushed.

### Follow-up — applying spelling/body suggestions

The user reported that applying a suggestion still produced “Could not match the quoted passage.” Fixed the visible-text matcher to search normalized text consistently while mapping the match back to original editor characters, resolving case mismatches for word-level spell findings. Ambiguous matches remain rejected. Documented in the dated changelog; runtime tests not run; changes remain uncommitted/unpushed.

### Follow-up — title suggestion still blocked

The user reported title suggestions still failed with “The article title changed since this review.” Removed that brittle exact-match block: individual title application now asks for confirmation showing current and suggested values; Apply all includes title replacement in its combined confirmation preview. Documented in the dated changelog. Runtime tests not run; changes remain uncommitted/unpushed.

### Follow-up — preserve the rest of a title on spelling fixes

The user clarified that a title spelling suggestion contained only one word, and applying it replaced the complete title. Individual Apply and Apply all now replace only the quoted word when the finding is a one-word title spelling correction; full-title suggestions remain full replacements. Documented in the dated changelog. Runtime tests not run; changes remain uncommitted/unpushed.

### Follow-up — spelling quote still unmatched

The user reported another “Could not match the quoted passage” error. Extended visible-text matching to normalize Unicode accents and added a single-word boundary fallback that ignores surrounding punctuation while refusing multiple matches. Documented in the dated changelog. Runtime tests not run; changes remain uncommitted/unpushed.

### Follow-up — highlight spelling target

The user asked to highlight the suggested word directly in the editor. Added **Locate in article** to spelling cards; it selects a unique match in the title field or Quill editor and scrolls it into view. Documented in the dated changelog. Runtime tests not run; changes remain uncommitted/unpushed.

### Follow-up — in-app confirmation and visible word highlight

The user reported locating still did not work and asked to avoid browser-native confirmation popups. Updated Locate in article to select directly from the rendered Quill DOM and apply a temporary yellow CSS text highlight where supported. Replaced native `window.confirm` prompts in the Editor with a styled in-app dialog, including bulk actions and fact-check actions. Documented in the dated changelog. Runtime behavior not tested; changes remain uncommitted/unpushed.

### Latest request — spell-check a selected word or passage

The user approved a selection-based spell check that accepts one word or a whole passage. Added **Spell check selection** below Quill; it sends only the selected body text to the spell-only endpoint. Findings carry the selected Quill range for the current session, and applying one replaces the matching word within that range. Documented in the dated changelog. Runtime behavior not tested; changes remain uncommitted/unpushed.

### Follow-up — selected text control and in-app prompts

Completed the selection capture/action below Quill, including mouse and keyboard selections; spelling findings retain a Quill range so individual corrections target the selected passage. Replaced browser-native confirmation prompts in `EditorPage.jsx` with a styled app dialog. **Locate in article** now selects from rendered editor DOM and uses a yellow browser text highlight where supported. Changelog updated. `git diff --check` passed; runtime behavior not tested; changes remain uncommitted/unpushed.

### Follow-up — selected misspelling not detected

The user reported that an explicitly selected misspelled word was still missed. Spell check now receives the Editor language; the model prompt directly asks it to assess a selected single word without context, and explicit selection runs ignore old applied/dismissed finding suppression. The general full-article spell check also receives the selected language. Changelog updated; runtime behavior not tested; changes remain uncommitted/unpushed.

### Latest request — use surrounding context for spelling suggestions

The user reported Dutch corrections such as “Ton” being changed to other valid but contextually wrong words. Selected spelling requests now include up to 500 characters of surrounding editor text, clearly labeled as context only; the model is instructed to use meaning to select the correction, not suggest an arbitrary valid alternative. The selected text stays the only correction target. Changelog updated; runtime behavior not tested; changes remain uncommitted/unpushed.

### Follow-up — make spell-check actions clearer

The user said contextual checking works, though it took several attempts, and asked to clarify the distinction between selection spelling and full article checks. Before changing layout, committed and pushed the accumulated reviewer/spell-check fixes plus documentation as `ebaed79` (`feat(article-review): add contextual spell checking and safe actions`) to `origin/feat/article-reviewer-v2.3`. Then grouped whole-article spelling and complete review under **Full-article checks** with explanatory descriptions, and moved selection checking into its own labeled panel with selected-text preview and **Check selection** action. This layout change is documented and remains uncommitted/unpushed. Runtime visual check not run.

### Latest request — shorten previous review history

The user requested a shorter history section that shows only recent runs with a control for older entries. The Editor now displays the three newest previous review runs by default, shows the count, and expands older runs on **Show older reviews (N)**; **Show fewer reviews** collapses them. Saved history is unchanged. Documented in the dated changelog. `git diff --check` passed; runtime visual check not run; this UI change remains uncommitted/unpushed.

### Follow-up — reduce article review panel text

The user said the accompanying explanations made the review panel crowded. Removed the two per-button description paragraphs, shortened the header, condensed run metadata to model/date, shortened the no-findings message, and show the manual fact-check notice only when relevant. Changelog updated. Runtime visual check not run; changes remain uncommitted/unpushed.

### Latest request — refine AI article reviewer

The user requested graceful disappearance of dismissed suggestions, using previous review history to avoid repeating similar suggestions (especially title changes already applied), plus recommendation items 1 and 3: safe application with a combined preview and reliable persistent history/status writes. Implemented animated dismissal with an expandable dismissed list; reviewer generation now consults up to 100 prior runs, tells the model to avoid repeating applied/dismissed findings, and filters exact title repeats (with extra protection when the current title is an earlier applied suggestion). Individual and bulk text edits require unique quote matches; Apply all confirms a preview before editing. Review run + findings inserts now share a transaction; setting a status is idempotent when an identical update already persisted. See `docs/development/changelog-2026-10-26-article-review-baseline.md`. Runtime behavior was not tested; no commit or push was requested.

### Latest user request — article images and media library

The user reported that public article cards show a dark placeholder instead of the article image and asked whether local Ollama models could generate images. They approved the media library and upload workflow, then clarified to build media management first and defer AI image generation until they evaluate a solution. They then asked to add an editable photo credit/source caption beneath images and explicitly defer the slow zoom-out crop behavior. Investigation showed published articles had empty `featured_image` fields and the Editor had no image assignment control. Added local uploads, reusable media records, per-image credit/source metadata, article-featured-media associations, Media Library navigation/page, Editor upload/select, public credit captions, and public URL resolution. Generation and zoom fitting changes are deferred. See `docs/development/media-library.md`.

### User prompt history

The recent app requests in this session were:

1. “would it be possible to create an inline editing option for the status in the table overview for articles?” The user then specified a short hover animation that morphs unpublished status badges into Edit controls; published articles must never show it.
2. “perfect. Now also add one new column to the articles overview page for category”
3. “implement the same feature as for the Status column inline editing, but only if an article is uncategorized”
4. “there is something strange i noticed, when i click on the background accidentally when trying to inline edit data in the columns then it takes me to to the edit article page, but i dont want that, only if you click on the article title should it take you to the article edit page and not when you are on the other columns, can you implement this? tell me firts before proceeding to implement and iw ill respond with Yes or No to proceed” — the user approved with “Yes”.
5. “Change the articles overview label to Articles Overview or something that reflects what is on the page because currently it says articles 2 times on the page”
6. The user asked to add **Articles Overview** and **Articles Analytics** under an Articles navigation section and requested a useful business analytics page, specifically including actual article read time and topics where possible. They said not to implement until the data sources and prerequisites were analyzed.
7. After the analysis, the user said: “yes proceed and also commit push and document/changelog everything also add a new md.file for the agent prompts used during this session and place the prompt history there for future refereence and for others agents to know and check what was the last thing that was done inside the app. So now there are 2 places where things are documented.”
8. The user requested an editable photo credit/source beneath images (example: “source pphoto: michael henniway”), with the slow zoom-out image fitting behavior deferred. They asked to document the milestone, commit/push, and rename the branch `v2.1`.
9. The user then clarified: “dont forget to update the agent.md file with the prompts used for future reference. No remove the photo credit source label from the main article blog page in the front end, so dont display it on the cards, only when you open the article if that makes sense?” The credit caption now appears only on full article pages, and this prompt is recorded here for future agents.
10. The user requested: “on the article analystics page the title is truncated... make it a bit less truncated but dont let it go on endlessly either”. Follow-up: “make it longer try to fit the title on one line, unless its too long then truncate it on one line not two”. The analytics **Most-read articles** table gives titles 70% of the width, keeps them on one line with ellipsis, and exposes the full title on hover.
11. The user requested a **Connection status** section at the bottom of the admin sidebar, around the current model status. The existing status now has that label; collapsed sidebar mode retains the dot with a tooltip containing the provider/model details.
12. The user said the label and connection information felt too close together. Increased the vertical spacing between those two rows in the sidebar footer.
13. The user requested controls to change the dashboard Articles Overview layout, and asked for the current version to be pushed first. The clean baseline (`82f3ebe`) was pushed to `origin/v2.1` before beginning this feature. Added Table/Grid views, responsive cards, server-side offset pagination/sorting, and automatic infinite scroll; the grid retains inline status/category editing and delete actions. The public `/blog` page separately has Grid/List and Pages/Infinite scroll controls.
14. The user clarified: “actually i wanted this on the front end article overview page you know where the cards are? not the article overview, but for now leave it.... and make the changes on the article frontpage card section”. Left the admin Articles Overview feature in place and added the controls to public `/blog`: Grid/List card layout and Pages/Infinite scroll, with persistent preferences, mobile-friendly list cards, loading/retry feedback, and active category/search filters applied to appended results. Documented in the dated changelog. These working changes are uncommitted; no new commit or push was requested.
15. The user clarified: “okay remove the display buttons from the article overview in the dashbaord but keepo the gris and list buttons”. Removed the dashboard Infinite scroll/Load more buttons and the manual Load more mode. The dashboard keeps its Table/Grid controls and automatically loads more rows when scrolling. Public `/blog` controls remain unchanged. Updated the dated changelog; the changes remain uncommitted.
16. The user reported that sorting the dashboard Articles Overview by status sometimes glitches. Found that status values were sorted alphabetically in both SQL and JavaScript, which conflicts with their workflow order and made the order seem inconsistent. Updated server pagination and client-side sorting to consistently use Draft, Review, Scheduled, Published, Archived, and corrected the routes guide and dated changelog.
17. The user asked: “make the table and grid buttons consistent with the artifcle overview buttons and icons on the blog frontend overview page”. Aligned the dashboard Table/Grid segmented controls' active colors, spacing, and typography with the public `/blog` layout buttons, while retaining the dashboard's Table/Grid labels and icons. Added matching Grid/List icons to the public buttons and updated the changelog.
18. The user requested: “push commit docs”. Corrected the user guide to describe the dashboard's current automatic scroll loading, updated historical handoff text, and committed/pushed the accumulated Articles Overview and public blog layout work with documentation on `v2.1`.
19. The user noticed literal `` `r
 `` text at the bottom-left of the public `/blog` page. Removed the stray text from `site/src/pages/blog/index.astro`; this was literal template text, not HTML escaping.
20. The user asked how filtering and sorting work, then requested an explanation of the underlying code for both the dashboard and public blog. Explained the React state/API/controller/model/SQL flow, public URL-backed category/search filters, and pagination. No code changes for this explanation.
21. The user asked about adding AI article review for inaccurate/inconsistent content, spelling, and other writing issues, including review of published articles. Recommended one review workflow in the Editor, which loads both drafts and published articles. Explained that Ollama alone cannot verify current facts or provide a dependable cutoff; source-backed checks would need an external search integration. User asked to first commit/push/document existing changes, then proceed. Committed and pushed the stray blog-template text cleanup and documentation first as `9f39106` on `v2.1`, then started the review feature.
22. Added the Editor's AI article-review panel and authenticated `POST /api/ai/review-article`. It checks spelling, grammar, clarity, consistency, and claims that may need fact verification. Draft and published articles share the Editor workflow. Results are advisory, no live sources are checked, and the model supplies no dependable cutoff date. Non-factual suggestions can be applied one at a time when the quoted phrase matches; factual findings cannot be auto-applied. Review never saves automatically. Editing the title/body clears stale findings. Updated the user guide, API/routes docs, and dated changelog. These feature changes are not yet committed or pushed.
23. The user asked whether review uses topic and category, then requested both be included and asked where the topic comes from. Review now uses the current category name from the Editor and recovers the topic from the linked `ai_generations.prompt` JSON for generated articles. `topic_history` is a global suggestion/generation history table without article linkage; manually authored articles may have no recorded topic. The prompt assesses topic/category relevance. Updated docs and handoff.
24. The user clarified they meant a topic saved in MySQL on each article, not a Topic column in Articles Overview. I initially misread the request and made an uncommitted overview-column change, then reverted it after the clarification. Topic persistence implementation was still under discussion; the accepted direction is now a normalized reusable topics table linked by `articles.topic_id`, with required Editor input and no title fallback.
25. The user clarified that an article title must never be used as a substitute topic. Confirmed that the Editor save path already requires a non-empty topic and the API validates create/update requests. Removed title fallback from the existing-database migration; missing legacy topics remain NULL for the user to fill in, and the migration only enforces NOT NULL after all existing articles have topics.
26. The user rejected the separate topics table and requested an article-level topic field. Temporarily switched to `articles.topic VARCHAR(500)` while preserving required validation and no-title-fallback migration behavior.
27. The user then approved normalizing topics. Replaced the temporary direct string field with a reusable `topics` table and `articles.topic_id`, while keeping the Editor topic mandatory and never substituting the title. The migration now transfers a direct topic or linked generation-prompt topic; missing legacy values stay blank until entered. Updated analytics and docs. Work remains uncommitted.
28. The user reported that AI review's Apply suggestion button often told them to edit manually. Root cause: quote matching searched only for an exact phrase inside a single raw HTML text node, so formatting splits and minor whitespace/quote differences failed. Updated the Editor to match visible text across inline formatting and replace via a DOM Range; adjusted the AI prompt to request exact visible phrases and replacement text for language findings. Documented the fix. Current work is uncommitted.
29. The user then reported that applying a suggestion made the analysis disappear and the text change was unclear. Root cause: the ReactQuill onChange handler cleared findings on all content changes, including app-applied updates. It now clears the analysis only for user-originated Quill changes so suggestions remain visible and mark as applied. Documented; uncommitted.
30. The user asked whether review can improve article title and topic. It previously used both only as context and applied suggestions only to the body. Extended review output with a target field (`title`, `topic`, or `content`), prompt checks for title/topic quality, and apply handlers that update the selected field. Updated user guide/changelog. Uncommitted.
31. The user reported the review returned fewer/worse body findings after adding title/topic checks. The combined prompt's stricter rules likely suppressed findings. Restored a dedicated thorough body-proofreading prompt and split title/topic recommendations into a second focused pass, preserving body findings if the second pass fails. Documented; uncommitted.

32. The user asked why fact-check findings lack Apply buttons and requested severity colors. They confirmed to keep fact checks non-applicable, color fact-check cards light yellow, and asked about applying all suggestions at once. Added green/orange/red buttons for low/medium/high editable suggestions, plus Apply all that skips fact checks and stale/missing replacements and does not save automatically. The branch is `feat/article-reviewer-v2.3`; committed and pushed as `8bd2c6d`.
33. The user said fact-check cards still looked orange beside medium-priority suggestions and requested a pulsing colored state on Review article while review runs. Increased the yellow card contrast and added a sky-blue pulse to the in-progress Review article button. Documented; follow-up is uncommitted.
34. The user asked to record the unresolved problem that removing a fact-check claim can leave an awkward or unfinished sentence. Added `docs/development/known-issues.md` with an open issue, current behavior, safe design direction, and the need to confirm actions/preview behavior before implementation. No app code was changed for this request.
35. The user approved implementing both fact-check options: remove the containing sentence or use a neutral rewrite, with a preview before applying. The AI review now requests the complete sentence and optional neutral rewrite. The Editor confirms before editing, requires a unique sentence match, keeps the finding visible as handled, and never saves automatically. Marked the issue resolved in `docs/development/known-issues.md`; runtime verification is still pending.
36. The user requested a Dismiss suggestion action and asked how to retain review history per article until deletion. Added article-linked review runs and finding rows with pending/dismissed/applied state, lazy table setup for existing databases, schema entries for fresh installs, history/status APIs, restore/display in the Editor, and cascading deletion with the article. If a new article was reviewed before saving, its current review and statuses are attached when it is first saved. Investigation found no narrowed fact-check criteria, but the latest prompt asks for a full sentence and optional neutral rewrite per fact check, increasing output tokens under the unchanged 3,000-token limit and possibly reducing finding count. The user asked to leave review behavior as-is. The Editor displays up to 20 runs total. Documented; changes are uncommitted.
37. The user reported an `Incorrect datetime value` for `article_reviews.reviewed_at`, requested removing the article topic field and topic review (generation topic remains), and said to implement the previously discussed dismissal/history changes. The timestamp insert now uses database `CURRENT_TIMESTAMP`; restart a non-watch backend if the old error persists. Removed editor article topic and topic-specific review pass; article topic storage is now optional/nullable and new article writes leave it empty while preserving old links. AI review checks title/body/category only. Analytics reads generation topics from `ai_generations.prompt`, and automated generation now saves that record. The persistent dismissal/review-history implementation remains uncommitted.
38. The user asked whether the title review checks spelling and grammar, then approved adding those checks. Expanded the title-only prompt to check spelling, grammar, clarity, and accuracy, returning at most one combined whole-title replacement. Updated user/developer docs; uncommitted.
39. The user clarified and confirmed the topic field should stay only in AI generation settings: entered topic/category can guide topic suggestions, and blank settings allow topic/title generation. Do not add an article topic field to the draft editor or reviewer. Manual article drafts continue to save without an article topic. The accumulated changes were committed as `19aa76d` (`feat(article-review): persist findings and improve review actions`) and pushed to `origin/feat/article-reviewer-v2.3`.
40. The user reported a Network Error after applying a title suggestion. The text replacement succeeded, but status persistence used PATCH and the API CORS allowlist omitted PATCH, so browser preflight blocked the status request. Added PATCH to CORS, a **Retry saving status** button on failures, and recovery when the current title already equals the suggestion. Documented in the changelog and known issues; this fix is uncommitted.

### App work completed in this session

- Added an animated inline status editor for unpublished articles; saving uses the existing article update API. Published rows remain static.
- Added category names to the admin article list query and a Category column. Uncategorized rows can select and save an existing category inline.
- Made only the article title navigate from the Articles Overview table.
- Changed the page title to **Articles Overview**.
- Added nested Articles navigation links for the overview and analytics pages.
- Added an analytics dashboard for article status, publishing cadence, published category mix, topic/SEO-keyword coverage, estimated reading time, page views, and active read duration.
- Added anonymous per-page-load reader tracking on public article pages. The database stores article ID, event timestamp, and visible seconds; it does not store a visitor identity. These metrics have no historical backfill.
- Added lazy creation of the reader-event table for existing databases and included it in `src/models/schema.sql` for new installations.
- Updated the user guide, technical routes/API documentation, and session changelog.

### Latest state

- Current branch: `feat/article-reviewer-v2.3`. Latest working changes refine dismiss animation, repeat-suggestion avoidance, unique quote matching and Apply all preview, transactional review persistence, and idempotent status updates. They are uncommitted; see the latest request entry above.

- Current feature branch: `feat/article-reviewer-v2.3` (standardized from `Feat-article-reviewer-v2.3`; pushed to origin).
- The accumulated reviewer, article-topic, persistence, and documentation changes were committed as `19aa76d` and pushed to `origin/feat/article-reviewer-v2.3`.
- Follow-up: fixed a CORS preflight failure for PATCH status updates; this follow-up is uncommitted.
- Latest milestone commit: `feat(media): add image library and photo credits` on `v2.1`, pushed to `origin/v2.1`; the follow-up moves captions off cards and records this prompt-history update.
- Photo credit/source captions belong only on full article pages. Check `git status` and the latest commit before assuming there is pending work.
- Reader engagement values are page-load views and visible seconds, not unique visitors. The public site's existing reading-time estimate is based on article word count.
- Media Library uploads and photo-source metadata are committed on branch `v2.1`. Follow-up work places the credit caption only on article detail pages; cards and homepage feature omit it. Existing articles need images explicitly uploaded/selected and then saved. AI image generation and slow zoom-out crop behavior remain deferred by the user.
- The Analytics **Most-read articles** table reserves 70% of its width for titles. Titles stay on one line with ellipsis when needed; the full text is available on hover.
- The admin sidebar footer labels the existing provider/model indicator **Connection status**.
- Articles Overview supports Table/Grid views with automatic infinite scroll and paginated API results sorted by an allowlisted field; the selected view persists in local storage. Status sort uses Draft, Review, Scheduled, Published, Archived order.
- The dashboard Table/Grid controls share the public layout buttons' selected-state styling; public Grid/List buttons have matching icons.
- The literal `` `r
 `` formerly rendered at the bottom of `/blog` was removed and is included in the baseline commit before AI article-review work.
- AI article review is available in the Editor for drafts and published articles. It returns advisory proofreading, clarity, consistency, title spelling/grammar, and fact-check findings from the selected Ollama model. It does not use live sources or provide a dependable cutoff date; fact findings require manual verification. Findings can be applied, dismissed, or handled with sentence removal/neutral rewrite; review history is stored per article. Commit `19aa76d` is pushed; see `docs/development/changelog-2026-10-26-article-review-baseline.md`.
- Legacy articles may retain `topic_id` references, but the column is now nullable. New article saves do not set it; topic is an input to AI generation and is kept in the linked generation prompt.
- AI review suggestions can replace quoted text across rich-text inline formatting and tolerate common whitespace or quote-style differences. Editable buttons use green/orange/red for low/medium/high priority; fact-check cards are yellow and remain manual verification. Apply all skips fact checks and does not save automatically.
- The reviewer actions were committed and pushed as `8bd2c6d` on `feat/article-reviewer-v2.3`. The follow-up makes fact-check cards a more saturated yellow and pulses the Review article button in sky blue while review is running; this follow-up is currently uncommitted.
- Fact-check findings now offer preview-confirmed sentence removal or optional neutral rewrite; see `docs/development/known-issues.md`. Implemented in pushed commit `19aa76d`; runtime verification is pending.
- Saved articles retain AI review runs and each suggestion's pending/dismissed/applied status until article deletion. The Editor restores the latest run and displays up to 19 previous runs (20 total); unsaved reviews are attached on first save. Implemented in pushed commit `19aa76d`; runtime verification is pending.
- The Editor no longer asks for or reviews an article topic. Topic remains an AI generation input only; legacy `articles.topic_id` is nullable and retained for old data. AI and automated generation prompts are saved with their articles for generation-topic analytics.

### Main files for this work

- Navigation and routes: `frontend/src/components/layout/AppShell.jsx`, `frontend/src/App.jsx`
- Articles table: `frontend/src/pages/ArticlesPage.jsx`
- Analytics UI: `frontend/src/pages/ArticlesAnalyticsPage.jsx`
- Analytics data and endpoints: `src/models/analytics.model.js`, `src/controllers/analytics.controller.js`, `src/routes/analytics.routes.js`, `src/routes/public.routes.js`, `src/index.js`
- Public read tracking: `site/src/lib/analytics.js`, `site/src/pages/blog/[slug].astro`
- Database schema: `src/models/schema.sql`
- User/developer guides and dated changelog: `docs/user/`, `docs/development/`
- AI article review: `frontend/src/pages/EditorPage.jsx`, `frontend/src/api/client.js`, `src/controllers/ai.controller.js`, `src/routes/ai.routes.js`
- Persistent AI review history: `src/models/article.review.model.js`, `src/models/schema.sql`
- Optional legacy article topics and generation-only topic reporting: `src/models/article.model.js`, `src/models/analytics.model.js`, `src/services/automation.service.js`

### Latest UI follow-up — compact AI check metadata

The user asked to put the model/date inside the no-suggestions panel on one line and label it **AI check done by:**. First committed and pushed the preceding UI/history cleanup as `144d081` (`refactor(article-review): simplify editor review controls`) to `origin/feat/article-reviewer-v2.3`. Then grouped the no-findings status and model/date in one compact panel and used the requested label when suggestions exist. This follow-up is documented and remains uncommitted/unpushed; runtime visual check not run.

### Follow-up — fade empty review notice

The user asked for the no-suggestions panel to disappear gracefully after a delay. It now remains visible for five seconds and then fades/collapses over 500 ms; findings, review controls, and history are unaffected. Changelog updated. `git diff --check` passed; runtime visual check not run; changes remain uncommitted/unpushed.

### Latest request — separate collapsible history UI

The user asked to visually separate Previous review history from Full-article checks so history can collapse independently. Moved it into its own collapsible card; business logic/data behavior unchanged. Changelog updated. `git diff --check` passed; runtime visual check not run; changes remain uncommitted/unpushed.

### Follow-up — smooth history panel transition

The user asked for consistent smooth transitions when panels expand/collapse. Replaced the history card's native instant details toggle with a controlled grid-height and opacity transition; this changes presentation only. Changelog updated. `git diff --check` passed; runtime visual check not run; changes remain uncommitted/unpushed.

### Follow-up — full-article check heading spacing

The user clarified to keep the helper text and asked only for more vertical breathing room beneath the heading. Increased the helper's top margin. Changelog updated. Runtime visual check not run; this UI change remains uncommitted/unpushed.

### Follow-up — selected-text check heading spacing

The user asked for matching vertical spacing in the Spell-check selected text section. Increased its helper line's top margin to match Full-article checks. Changelog updated; runtime visual check not run; UI change remains uncommitted/unpushed.

### Follow-up — rich-text editor toolbar tooltips

The user asked whether hover explanations could be added to the rich-text toolbar. Added styled hover/focus tooltips and accessible labels for paragraph/heading style, bold, italic, underline, link, ordered/bulleted lists, and clear formatting. Changelog updated. `git diff --check` passed; runtime visual check not run; changes remain uncommitted/unpushed.

### Latest request — hide applied suggestion cards

The user asked for suggestion cards to fade away once applied because no further action is available. Applied and dismissed cards now collapse from the active list; both remain available in the **Handled suggestions** disclosure with their status. Review data/action behavior is unchanged. Changelog updated; runtime visual check not run; changes remain uncommitted/unpushed.

### Latest request � Media Library dashboard Images/Videos UI

- User asked to implement the Media Library dashboard UI after the video backend foundation, while postponing testing.
- Added distinct Images and Videos tabs. Preserved the current image grid and credit editor; the Videos tab provides matching preview cards, native playback for uploads, hosted video link entry, optional thumbnail, and delete controls.
- Updated docs/development/media-library.md and the dated changelog. Video insertion/rendering inside article content remains unimplemented. No runtime tests were run at the user's request; review git diff --check only.

### Media Library UI verification follow-up � 2026-10-27

- Fixed invalid source encoding in `frontend/src/pages/MediaPage.jsx`; Vite had been unable to scan the page. The page now compiles.
- Verification: frontend production build passed; `/media` returned HTTP 200, and unauthenticated `/api/media?type=image` returned 401 as expected. Build emits existing CSS highlight pseudo-element and chunk-size warnings. No authenticated uploads or DB mutation testing performed.
- The latest Media Library UI work is ready for the requested commit/push. Next user-requested branch is for system activity/audit logging, including a Developer navigation item.
