# Implementation Plan: Admin Control Suite

## 0) Assumptions
- Frontend: Next.js (existing codebase), can restructure UI but prefer existing API contracts when they suffice.
- Security posture: single super admin; all mutating actions must be audited.
- Navigation confirmed from PRD.

## 1) New/Adjusted APIs (additions allowed)
- Auth hardening
  - `POST /auth/reverify` — trigger step-up re-auth for sensitive actions.
  - CSRF token issuance on login; require header on all POST/PATCH/DELETE.
- Audit & snapshots
  - `POST /audit` (actor, entityType, entityId, action, summary, diffHash, snapshotId?, meta).
  - `GET /audit` with filters (entityId, entityType, action, actor, from/to, limit, cursor).
  - `POST /snapshots` — store immutable blob for rollback; returns snapshotId.
  - `POST /snapshots/:id/rollback` — restore prior snapshot (where model permits).
- Roles
  - `POST /roles` create draft; `PATCH /roles/:id` update; `POST /roles/:id/publish`; `POST /roles/:id/rollback`.
  - `GET /roles?status=&q=&capability=` search/filter.
- Prompts
  - `POST /prompts` (roleId?, content, metadata); `PATCH /prompts/:id`; `POST /prompts/:id/publish`; `POST /prompts/:id/rollback`.
  - `GET /prompts/:id/versions` (with diff endpoints `GET /prompts/:id/diff?v1=&v2=`).
- Prompt tests
  - `POST /prompt-tests/run` (cases[], variantIds[], env) -> metrics (latency, tokens, rating).
  - `GET /prompt-tests/:id` — results history.
  - `POST /prompt-tests/:id/promote` — mark winner -> publish target prompt version.
- Assets & pages
  - `POST /assets/import` (CSV/ZIP + metadata map); `POST /assets/upload` (pre-signed URL flow).
  - `PATCH /assets/:id` (rights, expiry, locale, tags, status).
  - `GET /assets/usage?assetId=` — returns linked roles/pages/prompts.
  - `POST /pages` builder save draft; `POST /pages/:id/publish`; `POST /pages/:id/preview` (staging link).
- Data editor
  - `POST /data/dry-run` (table, operations[]) -> validation + diff.
  - `POST /data/commit` -> commits validated diff, writes snapshot + audit.
- Alerts
  - `POST /alerts` (type: publish_failure|rights_violation|latency_threshold, channel: email|webhook, config).
  - `POST /alerts/test` — send test alert.

## 2) Asset Limits & Type Policy (best practice defaults)
- Images: jpg/png/webp, max 15 MB, max 10k x 10k px; reject CMYK; auto-create webp preview.
- Video: mp4 (h264/h265) preferred, max 300 MB per file, max 10 minutes; transcode to streaming renditions; capture thumbnail.
- Audio: mp3/wav, max 50 MB; generate waveform preview.
- Docs: pdf only for now, max 25 MB.
- Bundles: ZIP import capped at 500 MB; must contain only allowed types.
- Virus/extension checks on upload; mime sniff + checksum; store rights/expiry; block publish if expired/flagged.

## 3) Staging Link Auth Model (best practice)
- Default: signed URL with HMAC token + expiresAt (max 7 days); scope to pageId + versionId; one-time revocation supported.
- Optional hardening toggle: require authenticated admin session even for signed link (for sensitive content); default OFF.
- All accesses logged (ip, userAgent, tokenId); rate-limit by IP; disallow embedding (X-Frame-Options DENY, CSP).

## 4) Execution Plan by Phase (tickets)
- Phase 0 Setup
  - T0.1 Feature flag `admin-control-suite`; seed super admin; add CSRF middleware and `/auth/reverify`.
  - T0.2 Audit + snapshot services (endpoints + storage); wire middleware to emit audit events.
- Phase 1 Roles & Prompts
  - T1.1 Role CRUD + draft/publish/rollback UI + API wiring; audit on all writes.
  - T1.2 Prompt editor (Monaco), autosave drafts, version list, diff view; publish/rollback with audit.
- Phase 2 Testing & Experiments
  - T2.1 Test case model + run endpoint; results table + metrics.
  - T2.2 A/B runner UI with side-by-side responses; promote winner flow.
- Phase 3 Presentation & Assets
  - T3.1 Page builder (hero/story/gallery/CTA blocks), live preview, staging link issuance per policy.
  - T3.2 Asset library: upload/import wizard with metadata mapping, rights/expiry validation, usage graph.
- Phase 4 Data & Ops
  - T4.1 Data editor with search/filter, inline edits, bulk CSV/JSON import, dry-run + commit + snapshot rollback.
  - T4.2 Dashboards (publish latency, success rate, test coverage) and log viewer with filters/export/alerts.
- Phase 5 Hardening
  - T5.1 Security passes: re-auth on sensitive actions, CSRF, signed-link abuse tests, log PI-scrub.
  - T5.2 Performance tuning to hit p95 < 300 ms server actions; SLA timers for publish/rollback (<2 min).

## 5) Success Checks per Phase
- Phase 1: role/prompt publish+rollback measured p95 < 2 min; 100% writes audited.
- Phase 3: publish blocked on expired/flagged assets; staging links honor expiry/revocation.
- Phase 4: data commits create snapshots and can rollback without data loss in test runs.
- Phase 5: security tests pass; observability dashboards live; alert channels verified.
