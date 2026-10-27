# Public Blog Redesign - 2026-10-27

## Request and direction

Redesign the public article listing and article-reading pages as a premium technology publication, guided by the supplied desktop/mobile reference. Preserve Astro, the Node API, routes, article data, filters, display modes, paging/infinite loading, and theme preference. Do not fabricate article content or add a new framework/database.

## Implementation

- Restyled the shared public shell in `site/src/layouts/BaseLayout.astro` and `site/src/styles/global.css` with deep navy surfaces, blue/violet accents, responsive navigation, dynamic category links, search access, focus styles, and the persistent light/dark toggle.
- Rebuilt `/blog` as an editorial feed with a featured lead card, responsive story cards, dynamic horizontal category filters, search, grid/list controls, and Pages/Infinite scroll controls.
- Updated `ArticleCard.astro` for consistent featured-image treatment, missing-image fallback, category/date metadata, line wrapping, and reading-time display only when body content is available.
- Reworked `/blog/[slug]` with an immersive image hero, existing photo-credit display, generated H2/H3 table of contents, responsive reading layout, article progress, share/copy controls, and existing related articles.
- Reworked category archives to use the same visual system and card/feed components.
- Preserved the existing browser-tab title (`Blogstudio | AI`) while updating the shared page shell, mobile navigation accessibility, reduced-motion behavior, and pagination labels.

## Existing data and behavior

Listing and article content still come from the existing public API. Search remains server-side against title/excerpt; category filtering remains dynamic; page size, query parameters, server ordering, read tracking, and related-article selection are unchanged. The selected card layout and load mode remain in local storage. Public categories with articles are derived from the category API response.

The public API does not return an author display name or article body in listing rows, and there is no newsletter subscription flow or public trending metric. Those elements were omitted rather than invented. Reading time is shown on an article page where content exists; listing cards show it only if the API supplies content. No editor font-family control exists in the current app; the new article styles inherit the existing content typography and do not set a competing font family on the rendered body.

## List-mode media consistency

Desktop list cards now keep every thumbnail at the same shared width and 16:10 aspect ratio. Media is vertically centered instead of stretching to match the height of each card's text. The featured first card uses the same list-mode dimensions and minimum height as all other cards. Mobile list cards retain their existing full-width 16:9 image treatment.

## Verification

- `npm --prefix site run build` passed.
- Local built server returned HTTP 200 for `/blog`, a combined search/category query, `/blog?page=2`, `/category/business`, and a published article page.
- Rendered output checks confirmed grid/list and page/infinite controls, category navigation, article TOC, share controls, and reading-progress markup.
- The existing local Astro dev server returned HTTP 200 after hot reload. The separate computer-use browser bridge was unavailable, so visual screenshots at 1440, 1024, 768, and 390 px could not be captured. Responsive CSS breakpoints are present, but those exact viewport layouts still need a visual pass.

## State

Branch: `feat/public-blog-redesign`. Commit `8aeb9a6` is pushed to `origin/feat/public-blog-redesign`. Backend/API contracts and database schema were not changed.
