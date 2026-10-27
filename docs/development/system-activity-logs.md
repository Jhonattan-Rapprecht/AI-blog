# System Activity Logs

## Current implementation

The administrator report module is available under **System > System Activity Logs** at `/system/activity-logs`. It stores flexible events in `system_activity_logs`, filters reports by type and inclusive date range, and paginates the table. **Export report** offers three formats, using the currently selected report type and date range:

- **Excel workbook (.xlsx):** an Activity report sheet with all matching events and an Overview sheet with report/date metadata and category totals. Worksheet text is cleaned for XML 1.0 validity and cell-size limits so user-generated metadata cannot corrupt the workbook.
- **CSV (.csv):** the full matching event rows as UTF-8, semicolon-delimited data for Excel, Google Sheets, and other spreadsheet tools.
- **PDF (.pdf):** a formatted report with the selected report/date range, category totals, and all matching activity rows.

Exports are limited to 50,000 rows; narrow the date range if that limit is reached. Excel and CSV files can be imported into Google Sheets; direct Google Sheets account integration is not configured.

The table stores timestamp, category/event, severity, outcome, actor, source, action, target, request method/path/status, IP address, user agent, and safe JSON metadata. It deliberately does not store passwords, tokens, article body text, AI prompts, full external video URLs, or request query strings. Audit writes fail open: a logging/database issue is written to server console and does not block the original application action.

The table is created lazily for existing databases and is also defined in `src/models/schema.sql` for new databases. No historic administrative events can be backfilled. Logs currently have no retention or purge UI; they remain in MySQL until manually removed or a retention policy is added.

## Reports and captured activity

- **Articles and content:** authenticated API create/update/delete operations, including actor and safe metadata such as title, status, and changed field names.
- **Publishing and scheduling:** administrator publish/schedule requests and successful scheduled auto-publishing.
- **Media Library:** upload, link creation, credit updates, deletion attempts, and outcomes; credentials and full source URLs are excluded.
- **Administrator access:** successful/failed logins and requests rejected for missing, invalid, or expired JWTs. This app currently uses one environment-configured administrator identity; it does not distinguish multiple editors.
- **AI and model status:** AI action requests, HTTP failures, and Ollama connection lost/restored transitions. Prompts and article content are excluded.
- **Settings changes:** settings API mutations, with changed field names and safe model/config values.
- **Automation:** automatic generation success/failure, with article ID and provider/model on success.
- **Errors and rejected actions:** HTTP 4xx/5xx outcomes from authenticated admin routes, unhandled Express request exceptions, failed report loads/exports, socket connection errors, and scheduler/automation errors.
- **Browser and public API errors:** authenticated admin-side uncaught exceptions, unhandled promise rejections, and API network failures (message and safe route only), plus HTTP 5xx responses from the Express public API and legacy `/blog` API mount.
- **System events:** API startup and scheduled work. The module is designed to accept future event categories/types.
- **Reader activity:** page views and visible read seconds from existing anonymous analytics records. No visitor identity is stored. This report reads `article_read_views`; it is not mixed into the audit table.

Administrative mutations and failed admin requests are captured by shared middleware. Additional explicit events cover authentication, AI connectivity, automation and scheduler activity. Reads of admin pages/endpoints are intentionally not logged, to avoid noisy reports. Public visitor views are represented in the Analytics report rather than as individual audit records.

## Known limits and missing metadata

- Existing events are not reconstructed; capture starts when this code is running and the database is available.
- A single shared administrator username is the only actor identity. If multiple editor accounts are added later, auth tokens and this event schema can store each account.
- If MySQL is unavailable, its own failure cannot be persisted to that same MySQL-backed audit log. Current fallback is server console output; a separate durable fallback would be needed to retain such failures.
- A process crash or power loss may prevent the process from recording a final event. External services can only be logged when the app observes their response or connection state.
- Errors generated inside the separate Astro public-site process are not yet sent to the Express activity log; only errors observed by the Express public API are captured.
- The log captures route-level request outcomes and selected safe metadata; it does not capture every read-only admin navigation, raw stack trace, article contents, prompts, secrets, or full network payloads. While an administrator session is active, the browser reports uncaught errors, unhandled promise rejections, and API network failures. If the server is completely unreachable, the browser cannot deliver its report until connectivity returns; no offline queue is implemented.
- The Errors report includes rejected (4xx) operations as well as failed (5xx) operations, so validation and authorization rejections are visible alongside server/provider failures.
- The export formats are generated from the filtered report data. CSV includes a UTF-8 BOM and Excel delimiter hint for compatibility with Dutch/European Excel settings. PDF uses standard built-in fonts, so some non-Latin characters may be replaced in the PDF output; the Excel workbook and CSV retain Unicode text.

## Extending the module

Use `ActivityLogModel.record()` for domain/system events that are not covered by the shared request middleware. Choose an existing category where possible; new categories can be added to the model's category list and the report selector. Keep event types descriptive and metadata allowlisted. Avoid secrets, full request bodies, and sensitive article text. Add a report-specific data source only when its data has different semantics, as with anonymous reader analytics.

Files: `src/models/activity-log.model.js`, `src/middleware/activity-log.middleware.js`, `src/controllers/activity-log.controller.js`, `src/routes/activity-log.routes.js`, `frontend/src/pages/ActivityLogsPage.jsx`, and `frontend/src/api/client.js`.
