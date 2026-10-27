# HTML sanitization — 2026-10-27

## Purpose

Protect public article rendering from stored cross-site scripting (XSS) while retaining the legitimate HTML produced by ReactQuill and the AI article-generation workflow.

## Implementation

- Added `sanitize-html` as a backend dependency.
- Added `src/utils/htmlSanitizer.js` with the shared `sanitizeArticleHtml()` helper.
- `ArticleModel.create()` and `ArticleModel.update()` sanitize string `content` values before they are persisted. This covers manual editor saves and AI-created articles because AI creation uses `ArticleModel.create()`.
- `PublicBlogController.getArticle()` sanitizes `article.content` again immediately before its public JSON response. This protects legacy records that were stored before this remediation.
- Astro retains `site/src/lib/api.js` `normalizeHtml()` for whitespace only. It is not a security control.

## Allowed article HTML

The sanitizer permits paragraphs, line breaks, horizontal rules, headings, emphasis/underline/strikethrough, subscript/superscript, lists, blockquotes, code blocks, tables, HTTPS and relative links, and HTTP(S) or relative non-SVG images. Image attributes are limited to source, alternative text, dimensions, and lazy loading. Table attributes are limited to basic structural spans and heading scope.

Only the explicit Quill alignment, indentation, direction, and code-block classes are retained. Arbitrary classes and inline styles are removed.

## Blocked content

Executable and embedded content such as scripts, event-handler attributes, iframes, forms, objects, SVG, `javascript:` URLs, and `data:` image URLs are removed. Links opened in a new tab automatically receive `rel="noopener noreferrer"`.

## Verification

`test/html-sanitizer.test.js` uses Node's built-in test runner and covers allowed formatting, malicious elements/attributes, unsafe URLs, new-tab link protection, idempotence, manual model create/update, AI-formatted creation, and public responses for legacy HTML.

On 2026-10-27, `npm test` passed 7 of 7 tests. Backend syntax checks, the frontend production build, the Astro production build, and `git diff --check` also passed. The frontend build retains unrelated existing CSS and bundle-size warnings.

## Deliberate limitations

Custom inline typography such as Quill color, font, and size styling is stripped rather than allowing arbitrary CSS. Sanitization cannot make a compromised trusted dependency or malicious non-HTML application data safe; maintain dependency updates and retain output encoding for every other rendering context.
