# Future Feature Requests

This tracker records approved product ideas that are intentionally not implemented yet. Entries describe the intended outcome and safety constraints so a future change does not imply functionality that does not exist.

## Research fact from a review finding

**Status:** Proposed — not implemented

**Requested outcome:** Add a future **Research fact** action to fact-check finding cards in the Editor.

**Why this label:** “Research fact” clearly communicates a follow-up investigation. “Log fact check” could imply that the system already verified or recorded a completed investigation.

### Intended workflow

1. The action opens a focused research brief for the selected fact-check finding.
2. The brief carries the claim, complete article sentence, article title, and relevant category/context.
3. A future researcher can add source URLs, notes, a verdict, and an optional editorial follow-up.
4. Any final article edit continues to use the existing preview-and-confirmation workflow; research must never silently change article content.

### Safety and product constraints

- Do not add a non-functional button that implies live research or verification exists.
- The current Ollama reviewer does not browse the web and cannot verify live claims; this action must not claim otherwise.
- Source fetching, if added later, needs an explicit trusted search/source integration, URL validation, provenance, and user confirmation.
- Research records should be article- and finding-linked, access-controlled, auditable, and kept separate from the article’s sanitized HTML.
- The initial UI may open a manual research brief, but it must clearly say whether source retrieval is manual or automated.

### Deferred design decisions

- Storage model for research briefs, sources, verdicts, and reviewer identity.
- Whether approved sources are manually entered, selected from search results, or both.
- Citation rendering and any publication workflow for unresolved claims.
- Permissions and activity-log coverage for research actions.
