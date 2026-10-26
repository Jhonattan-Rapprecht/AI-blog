# Known Issues and Product Follow-ups

This document tracks confirmed problems and product decisions that still need work. Each item records its current status and the next decision or implementation step.

## Resolved

### Applied suggestion status was not saved

- **Status:** Fixed.
- **Reported:** 2026-10-26.
- **Area:** Editor → AI article review history.
- **Cause:** The browser sends `PATCH /api/ai/review-findings/:findingId` to persist an applied/dismissed status, but the API's CORS allowlist omitted `PATCH`. The browser blocked the preflight and showed a generic Network Error after the editor text had already changed.
- **Resolution:** Added `PATCH` to the CORS methods and added a **Retry saving status** action for transient status-save failures. Identical status updates are idempotent, so retries now succeed even if the first request reached the server. If a title replacement already reached the editor before the status request failed, clicking Apply again recognizes the replacement and retries only the history update.

### Article review failed while saving its review timestamp

- **Status:** Fixed in the current working changes.
- **Reported:** 2026-10-26.
- **Area:** Editor → AI article review persistence.
- **Cause:** The review timestamp was serialized as an ISO string (`T` and `Z`) and supplied to MySQL's `TIMESTAMP` column, which rejected that value in this configuration.
- **Resolution:** The database now assigns `reviewed_at` with `CURRENT_TIMESTAMP`; the API's ISO timestamp remains for display in the Editor.

### Article reviewer: safe actions for unverified factual claims

- **Status:** Implemented on `feat/article-reviewer-v2.3`; changes are currently uncommitted.
- **Reported:** 2026-10-26.
- **Area:** Editor → AI article review.
- **Problem:** Fact-check findings currently identify a short quoted claim and provide a verification reminder, but no safe action for handling that claim. Removing only the quoted words can leave an unfinished or awkward sentence. Replacing the phrase with AI-generated factual wording is also unsafe because the reviewer does not check live sources.
- **Current behavior:** Fact-check cards are visually distinct and intentionally have no Apply suggestion button. The current finding data does not reliably provide the full sentence or paragraph needed for a context-aware edit.
- **Resolution:** Fact-check findings now request the exact complete sentence and an optional neutral rewrite that avoids asserting the unverified claim. The Editor offers **Remove sentence** and **Use neutral rewrite**. Both actions preview the sentence and proposed change in a confirmation prompt, require a unique exact sentence match against the current article, keep the finding visible as handled, and update the Editor without saving automatically. If the AI cannot produce safe neutral wording, that action is unavailable.
- **Verification note:** Runtime behavior has not been tested yet.
