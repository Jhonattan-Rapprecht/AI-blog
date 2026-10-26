# Pages & Routes Reference

The project runs three apps. `npm run dev` in the project root starts all of them concurrently.

| App | Folder | Stack | Port | Script |
|-----|--------|-------|------|--------|
| API | `src/` | Express + Socket.IO | 3000 | `dev:server` |
| Admin (AI Blog Studio) | `frontend/` | React + Vite + shadcn-ui | 5173 | `dev:client` |
| Public site (AI Blog) | `site/` | Astro (server mode) | 4321 | `dev:site` |

For a user-facing walkthrough with screenshots, see [Pages Guide](../user/pages-guide.md).
For recent user prompt history and the latest app handoff, see the repository-root [AGENTS.md](../../AGENTS.md).

---

## Admin (React Router) — `http://localhost:5173`

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `pages/EditorPage.jsx` | New article: editor, AI generation, publishing, SEO metadata. Includes an Articles overview button. After AI generation saves an article, the admin returns to `/articles` and highlights the new row. |
| `/articles` | `pages/ArticlesPage.jsx` | Articles Overview table or responsive grid, sortable by title, workflow status, category, or creation date, with automatic infinite scroll; unpublished statuses and uncategorized rows support inline editing; only article titles open the editor |
| `/articles/analytics` | `pages/ArticlesAnalyticsPage.jsx` | Publishing and category charts, saved topics/SEO keywords, estimated reading time, and tracked reader views/active time |
| `/articles/:id` | `pages/EditorPage.jsx` | Edit an existing article (`PUT` on save instead of `POST`); includes an Articles overview button |
| `/media` | `pages/MediaPage.jsx` | Upload, browse, and remove reusable article images |
| `/settings` | `pages/SettingsPage.jsx` | Configure the installed Ollama model and saved article-generation defaults |
| `/dev/components` | `pages/dev/ComponentsPage.tsx` | **Dev only.** Preview HTML/CSS files from `src/component-previews/`, view source, copy, convert to JSX. **New component** pastes a snippet and saves it to that folder. Left out of production builds. |
| `/login` | `pages/LoginPage.jsx` | Admin login (`ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`); public route |

All other routes require a login (`components/ProtectedRoute.jsx`) and are wrapped in `components/layout/AppShell.jsx` (sidebar, header, theme toggle, and labeled **Connection status** with the active AI provider/model).

| Screen | Screenshot |
|--------|------------|
| `/` | ![](../user/screenshots/admin-editor.png) |
| `/articles` | ![](../user/screenshots/admin-articles.png) |
| `/articles/:id` | ![](../user/screenshots/admin-edit-article.png) |
| `/settings` | Settings uses the shared `AppShell` and theme; screenshot not captured yet. |
| `/dev/components` | ![](../../screenshots/dev-components.png) |

---

## Public Site (Astro) — `http://localhost:4321`

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/pages/index.astro` | Hero, featured article, latest articles, topics |
| `/blog` | `src/pages/blog/index.astro` | Article grid with search, in-place category filtering and pagination; displays animated loading placeholders during filter requests |
| `/blog?q=keyword` | | Search title/excerpt |
| `/blog?page=2` | | Pagination |
| `/blog/:slug` | `src/pages/blog/[slug].astro` | Article detail, reading time, related articles |
| `/category/:slug` | `src/pages/category/[slug].astro` | Articles in one category, including `/category/uncategorized` (supports `?page=`) |
| any unknown route | `src/pages/404.astro` | Not found (also used for unknown article/category slugs) |

Category slugs include `business`, `entertainment`, `finance`, `geopolitics`, `health`, `lifestyle`, and `technology`. The API also adds an `uncategorized` pseudo-category when published articles without a category exist.

| Screen | Screenshot |
|--------|------------|
| `/` | ![](../user/screenshots/site-home.png) |
| `/blog` | ![](../user/screenshots/site-blog.png) |
| `/blog?q=music` | ![](../user/screenshots/site-blog-search.png) |
| `/blog/:slug` | ![](../user/screenshots/site-article.png) |
| `/category/business` | ![](../user/screenshots/site-category.png) |
| 404 | ![](../user/screenshots/site-404.png) |

---

## API — `http://localhost:3000`

### Auth

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Body `{ username, password }`; returns `{ token, username }` (JWT, 24h) |

### Admin endpoints

All admin endpoints (including article publish/schedule and `/api/automation`) require an `Authorization: Bearer <token>` header and return 401 otherwise.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/articles` | List articles with `limit`, `offset`, `sortBy` (`title`, `status`, `category_name`, `created_at`), and `direction` (`asc`, `desc`) options |
| GET | `/api/articles/:id` | Get one article |
| POST | `/api/articles` | Create article |
| PUT | `/api/articles/:id` | Update article (auto-stamps `published_at` when status becomes `published`) |
| DELETE | `/api/articles/:id` | Delete article |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| DELETE | `/api/categories/:id` | Delete category |
| GET | `/api/settings` | Read saved AI model and writing defaults; includes installed Ollama models and connection status |
| PUT | `/api/settings` | Save `model`, `language`, `tone`, `audience`, and `articleLength`; model must be installed locally |
| POST | `/api/settings/check-model` | Run a short JSON-mode request against the selected installed model; unload it after the check and return the exact model response status |
| POST | `/api/ai/generate-article` | Generate an article with AI |
| POST | `/api/ai/suggest-topic` | Returns three distinct topic suggestions guided by optional `{ category, topic }` values from the Editor |
| POST | `/api/ai/suggest-slug` | Slug suggestions |
| POST | `/api/ai/review-article` | Review title, excerpt, content, and optional `articleId`, `topic`, and `category`; uses the linked AI generation prompt to recover a saved topic when available, returns advisory findings, and does not check live sources |
| GET | `/api/ai/status` | Active AI provider/model |
| GET | `/api/analytics/overview?days=30` | Authenticated editorial and reader analytics for the selected 7–90 day engagement window |
| GET | `/api/media` | List uploaded/generated image library items |
| POST | `/api/media/upload?filename=...` | Upload a validated JPG, PNG, WebP, or GIF image (12 MB max) |
| PUT | `/api/media/:id` | Update a media item's photo credit/source |
| DELETE | `/api/media/:id` | Delete an image when it is not assigned to an article |

Settings endpoints require the admin JWT. Preferences are stored in the local, git-ignored `data/settings.json`; Ollama's installed model list is fetched from its `/api/tags` endpoint. The Settings screen currently exposes only Ollama and the writing defaults consumed by the Editor. The selected model is used for article generation, topic suggestions, and slug suggestions. The AI connection indicator checks whether Ollama is reachable; **Test selected model** separately verifies the draft selection with a JSON-mode completion before it is saved. Qwen3-family requests disable the model's default thinking phase so JSON output is returned directly.

Topic suggestions use the selected category and any text entered in the Topic field as context. The backend retries for missing suggestions and returns three distinct ideas or an error. Returned ideas are recorded in the global `topic_history` table, which has no article association. On article generation, the Editor's Topic field is serialized with the full config into `ai_generations.prompt`, linked to the created article by `article_id`; article review recovers the latest saved generation topic from that record. For manual or older articles without a linked generation prompt, no topic is available unless supplied in the review request. Article category is stored as `articles.category_id` and the Editor resolves it to the current category name. Review uses that current name plus the recovered topic to assess relevance, alongside proofreading, clarity, consistency and claims needing verification. It returns up to 40 categorized findings and does not save or rewrite content automatically. Non-factual suggestions can be applied one at a time when their quoted text matches a single editor text node; factual findings are advisory and require source verification. The review endpoint does not browse the web and explicitly reports that live sources were not checked. Shared admin buttons use a short pressed-state scale, brightness, and inset-shadow animation; asynchronous AI actions show a spinner while awaiting the API. Suggestion chips are width-constrained to avoid expanding the Editor sidebar.

The browser titles are `Blogstudio | Admin` for the management app and `Blogstudio | AI` for the public site. Public article cards show an `Uncategorized` badge when no category is assigned; the blog’s article count appears beside the category filters.

Featured images are uploaded to `uploads/media/`, stored in the `media` table, and linked by `articles.featured_media_id`; legacy `featured_image` URLs remain supported. Photo credit/source is stored on the reusable media record and shown beneath the image on full article pages only, not on cards or the homepage feature. The Editor and Media Library are described in [media-library.md](media-library.md). Upload and library selection work locally. AI image generation and slow zoom-out fitting are deferred.

### Public endpoints

Also mounted at `/blog` for backwards compatibility.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/public/articles` | Published articles; query: `page`, `limit`, `category` (slug), `q` |
| GET | `/api/public/articles/:slug` | One published article with related articles |
| GET | `/api/public/categories` | Categories with published article counts, plus `uncategorized` when applicable |
| POST | `/api/public/analytics/views` | Record an anonymous view of a currently published article and return a view ID |
| POST | `/api/public/analytics/views/:viewId/finish` | Update active visible reading seconds when the article page is hidden or closed |

An article is publicly visible only when `status = 'published'` and `published_at <= now`.

Reader events are stored in `article_read_views` with one random ID per page load, the article ID, active visible seconds, and event timestamp. No visitor identity is stored. Views are page loads rather than unique people. Active reading time accumulates while the article tab is visible and is submitted on tab hide or page exit. These measurements begin after deployment; the public article's existing minutes estimate remains a content-length calculation. The analytics model creates the event table lazily for existing databases; `src/models/schema.sql` includes it for new installations.

Topic coverage uses the saved topic from an AI generation prompt when available, otherwise the published article title. Keyword counts use saved `seo_keywords`. Neither is an audience preference metric.

---

## Regenerating Screenshots

Screenshots live in `docs/user/screenshots/` and are captured at 1440×900 in dark mode with Playwright (the Astro dev toolbar hidden). With all three apps running, capture each URL above with `page.screenshot()`; the home and article pages use `fullPage: true`.
