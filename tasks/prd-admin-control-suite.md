# PRD: Admin Control Suite (Admin Console Redesign)

## 1. Introduction / Overview
Redesign the admin console (Next.js) so a single super administrator can fully control roles, prompts, role presentation pages (含雲旅遊等素材), and underlying backend data with strong auditing, quick rollout/rollback, and in-console testing. Frontend may be restructured; existing APIs are preferred and reused where possible (per constraint 4B).

## 2. Goals
- Give the super admin end-to-end control of role lifecycle, prompts, and linked assets from one console.
- Ship/publish or roll back role & prompt changes in under 2 minutes, with clear audit trails.
- Enable safe direct edits/imports to backend data with reversible history.
- Provide rich previews for role presentation pages (含雲旅遊素材) before publishing.
- Surface operational visibility (dashboards, logs) to validate outcomes and catch regressions.

## 3. User Stories

### US-001: Super admin access & session hardening
**Description:** As the super admin, I want secure access with session controls so only I can operate the console.

**Acceptance Criteria:**
- [ ] Super admin login gated by existing auth; idle timeout configurable; forced re-auth for sensitive actions.
- [ ] All privileged actions require CSRF protection and audit log entries.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-002: Role lifecycle control
**Description:** As the super admin, I can create, edit, clone, publish, or archive roles and set their capabilities.

**Acceptance Criteria:**
- [ ] Role list with filters/search; open role detail to edit metadata, capabilities, and status.
- [ ] Clone and draft modes; publish/rollback within 2 minutes.
- [ ] Audit log entry for every change (who/when/what diff); exportable CSV/JSON.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-003: Prompt editing, versioning, and rollback
**Description:** As the super admin, I can edit prompts linked to roles, track versions, diff changes, and rollback quickly.

**Acceptance Criteria:**
- [ ] Inline editor with syntax highlighting and autosave draft.
- [ ] Version history with diff view between any two versions.
- [ ] Publish and rollback actions complete < 2 minutes and write to audit log.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-004: Prompt testing & A/B experiments
**Description:** As the super admin, I can run test cases against prompts (single or A/B variants) and see responses/metrics.

**Acceptance Criteria:**
- [ ] Create reusable test cases (input + expected tone/output notes) and run against selected prompt versions.
- [ ] Capture latency, token usage, and rating; show side-by-side for A/B.
- [ ] Mark a winner and optionally promote to production version.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-005: Role presentation pages & 雲旅遊素材管理
**Description:** As the super admin, I can build/display role cards and rich presentation pages with assets (e.g., 雲旅遊場景、圖片、影片、音效）。

**Acceptance Criteria:**
- [ ] Page builder with sections (hero, story, gallery, CTA); supports drag/drop reordering.
- [ ] Asset picker from library (images/video/audio/docs) with license/rights tags and usage tracking.
- [ ] Live preview and shareable staging link; publish writes audit entry.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-006: Asset library & rights management
**Description:** As the super admin, I can upload/import/tag assets, see usage, and enforce rights/expiry.

**Acceptance Criteria:**
- [ ] Bulk upload/import (CSV/ZIP) with validation; map metadata (tags, rights, expiry, locale).
- [ ] Asset detail shows preview, linked roles/prompts/pages, and last-used timestamp.
- [ ] Expired/flagged assets blocked from publish flows; warnings surface in builder and publish modal.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-007: Backend data editing with safety nets
**Description:** As the super admin, I can directly edit or import backend data records with guardrails.

**Acceptance Criteria:**
- [ ] Tabular editor with search/filter; supports single edit, bulk edit, CSV/JSON import.
- [ ] Preflight validation and diff summary before commit; dry-run mode.
- [ ] Commit creates immutable audit log + point-in-time snapshot for rollback.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-008: Dashboards & logs
**Description:** As the super admin, I can see operational dashboards and inspect logs tied to recent changes.

**Acceptance Criteria:**
- [ ] Overview dashboard shows recent publishes/rollbacks, error rate, and prompt test outcomes.
- [ ] Log viewer with filters (action type, actor, timeframe) and deep link into affected role/prompt/data.
- [ ] Exports and alerts (email/webhook) for failure thresholds.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements
- FR-1: Restrict console to a single super admin account; enforce session timeout and re-auth on sensitive actions.
- FR-2: Role CRUD with draft/publish/rollback, clone, search, and status controls; all changes audited.
- FR-3: Prompt editor with version history, diff, publish/rollback, and A/B test runner with metrics.
- FR-4: Role presentation page builder with structured sections, live preview, staging link, and publish flow.
- FR-5: Asset library with upload/import, tagging, rights/expiry enforcement, and usage linkage to roles/pages.
- FR-6: Backend data editor/importer with validation, dry-run, diff summary, and snapshot-based rollback.
- FR-7: Dashboards and log viewer aggregating actions, performance, and errors; export and alert hooks.
- FR-8: Audit log must capture actor, timestamp, entity, action, diff/summary, and rollback pointer; exportable.

## 5. Non-Goals (Out of Scope)
- No multi-tenant isolation or multi-role approval flows in this phase (single super admin only).
- No public end-user exposure of role pages beyond admin-controlled staging/share links.
- No automated ML-based prompt optimization; tests are manual/experiment-driven.
- No new backend service migrations; reuse existing APIs unless a gap is identified and approved.

## 6. Design Considerations
- Frontend: Next.js; restructure UI for clarity and speed; reuse design system if present.
- Navigation should prioritize role/prompt workflows; global search for roles/prompts/assets.
- Confirm existing component library; if none, define minimal token set for consistency.

## 7. Technical Considerations
- Prefer existing APIs; add minimal endpoints for audit log queries, snapshots, and prompt tests if not present.
- Ensure all mutating actions emit audit events; store snapshots for rollback where data model allows.
- Large imports should stream/chunk with progress; cap size to protect API.
- Protect secrets/tokens used for prompt testing (do not log raw payloads with PII).

## 8. Success Metrics
- SM-1: Publish or rollback of a role/prompt completes in < 2 minutes (p95) end-to-end.
- SM-2: 100% of mutating actions recorded in audit log with diff and actor metadata.
- SM-3: Zero unauthorized accesses in security tests; session timeout and re-auth work as configured.
- SM-4: P95 page load/primary actions < 300 ms server time for admin console pages.
- SM-5: At least 80% of prompt changes validated via test cases before publish (tracked in dashboard).

## 9. Open Questions
- Do we need any limited secondary roles (e.g., viewer) despite choosing single super admin? If yes, which capabilities are read-only?
- Which existing APIs are mandatory to keep unchanged, and where can we add endpoints (audit, snapshots, test runner)?
- What asset volume/size limits and file types must be supported for 雲旅遊素材?
- Do staging links require auth or signed URLs with expiry?
