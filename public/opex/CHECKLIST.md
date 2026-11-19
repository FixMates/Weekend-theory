# OPEX implementation and validation checklist

Legend: [x] implementation file exists; [~] partial implementation; [ ] not implemented. No item is considered release-validated until the named test has passed in a real multi-user shared-folder pilot.

## Round 1 — Foundation
- [~] 01 `index.html` — login and first-admin setup. Test: initialize workspace, sign in, refresh and reconnect.
- [~] 02 `js/core/crypto.js` — AES-GCM and PBKDF2 helpers. Test: encrypt/decrypt round trip; wrong passphrase must fail. Argon2id is not yet implemented.
- [~] 03 `js/core/storage.js` — File System Access API and directory-handle persistence. Test: create folder tree, reload page, restore permission.
- [~] 04 `js/core/auth.js` — encrypted vault and password verification. Test: valid/invalid user, inactive account, lockout after five failures.
- [~] 05 `js/core/session.js` — IndexedDB session with expiry/idle checks. Test: expiry and idle timeout; session is not yet encrypted/device-bound.
- [~] 06 `js/core/audit.js` — hash-chained audit records. Test: verify intact chain, alter one record and confirm failure.
- [~] 07 `js/core/permissions.js` — role capability checks. Test: each role allowed/denied matrix.
- [x] 08 `css/app.css` — responsive visual system. Test: desktop and mobile viewport review.

## Round 2 — Admin Console
- [~] 09 `admin.html` — admin console page. Test: admin-only access and tab navigation.
- [~] 10 `js/ui/form-builder.js` — add/remove basic fields and publish JSON. Test: create form, reload, verify form definition and version.
- [~] 11 `js/ui/components.js` — shared UI components, toast and page shell. Test: keyboard navigation and error states.
- [~] 12 Admin tabs — overview, users, teams, forms, dropdowns, dashboards, policies, audit, system. Test: CRUD, role assignment, team scoping, config validation, audit search. User edit/deactivate/bulk import and advanced policy UX remain incomplete.

## Round 3 — Submission Workflow
- [~] 13 `submit.html` — form submission page. Test: assigned-form filtering and required-field validation.
- [~] 14 `js/ui/form-renderer.js` — dynamic basic controls. Test: all field types, min/max, dropdowns, required fields and historical form versions.
- [~] 15 `js/workflow/submission.js` — create and version records. Test: submit once, retry, duplicate prevention and signed record verification. Signing is not yet wired.
- [~] 16 `js/workflow/versioning.js` — append version helper/latest-by-ID. Test: sequential versions and latest pointer.
- [~] 17 `js/data/outbox.js` — IndexedDB queue. Test: offline queue, reload, replay and duplicate replay.
- [~] 18 `js/data/ndjson.js` — NDJSON streaming and append. Test: UTF-8, large-file paging, malformed line and append consistency. Distributed-safe writes are not provided.

## Round 4 — Supervisor Review
- [~] 19 `review.html` — supervisor queue. Test: team scoping, approve, pend, reject, required reason and due date.
- [~] 20 `my-items.html` — submitter response view. Test: only own pended items, edit and resubmit.
- [~] 21 `js/workflow/pend.js` — review decisions and responses. Test: valid/invalid state transitions, repeat pend and audit event.
- [~] 22 `js/ui/notifications.js` — in-app notification file helpers. Test: append and unread display. UI integration is incomplete.

## Round 5 — Dashboards
- [~] 23 `dashboard.html` — dashboard viewer. Test: access rules, date filters and refresh.
- [~] 24 `js/ui/dashboard-builder.js` — dashboard definition builder. Test: save/load layout and widget permissions.
- [~] 25 `js/ui/widget-engine.js` — cache-backed KPI aggregation. Test: count/sum/avg/min/max against known fixture. Chart types, percentile, filters and visualization are incomplete.
- [~] 26 `js/data/cache.js` — TTL and dirty cache helpers. Test: stale detection, invalidation and recompute.

## Round 6 — Background Workers
- [~] 27 `sw.js` — static asset offline cache. Test: offline reload and update lifecycle. It cannot reliably run file-system consolidation.
- [~] 28 `js/data/aggregator.js` — monthly daily aggregate. Test: compare to known fixture. Current implementation loads records into memory and is not 1M-row validated.
- [ ] 29 Consolidation worker — durable, locked, idempotent, multi-user-safe outbox consolidation. Current foreground processor is only a prototype.

## Round 7 — Export & Email
- [~] 30 Excel export worker — CSV export helper exists; XLSX/async worker not implemented. Test: 10K-row export, escaping, date/field filters.
- [~] 31 Email outbox writer — pend event writes queue file. Recipient lookup and full trigger coverage are incomplete.
- [~] 32 `powershell/email-sender.ps1` — SMTP dispatcher sample. Test: internal mailbox, TLS, retry and failure recovery; M365 OAuth/relay may be required.
- [x] 33 `powershell/README.md` — dispatcher setup notes.

## Round 8 — Testing & Documentation
- [~] 34 `js/tests/data-generator.js` — synthetic record generator. Test: 1M rows only after batch optimization and disk benchmark.
- [~] 35 `js/tests/integrity-checker.js` — audit checker and initial submission-chain checker. Test: tamper detection; record signatures not wired.
- [ ] 36 `DEPLOYMENT.md` — initial deployment and architecture caveats; production deployment guide needs full pilot procedure.
- [x] 37 `USER_GUIDE.md` — basic end-user guide.
- [x] 38 `ADMIN_GUIDE.md` — basic administrator guide.
- [x] 39 `ARCHITECTURE.md` — architecture and limitations.

## Acceptance tests
- [~] Admin creates users, teams, forms and dashboards without manual JSON editing. Form/dashboard create works; full user/team CRUD incomplete.
- [~] User login, form submission and dashboard viewing. Basic paths exist; full role/security tests pending.
- [~] Supervisor approve/pend/reject. Basic workflow exists; no concurrent review lock.
- [~] Pended submission reopens for original submitter. Basic response UI exists.
- [~] Audit trail is tamper-evident. Audit chain exists; signature chain and protected checkpoints incomplete.
- [ ] Email notifications actually deliver for all specified triggers. SMTP dispatch must be configured and tested.
- [ ] XLSX export works for 10K+ rows in under 60 seconds. Current utility exports CSV, not XLSX.
- [ ] Cached dashboard loads under 3 seconds with 1M synthetic rows. Not benchmarked; current aggregator is not designed/validated for that load.
- [~] Offline submissions queue and can sync when a user reopens the app. Background sync is not automatic/reliable.
- [~] Hash-chain integrity verification. Audit verification exists; submission signatures/chain need completion.
- [ ] Concurrent edit, lock expiry, conflict and crash-recovery scenarios. Not validated.

## Hard architecture decision — release blocker
The specification simultaneously requires (a) no backend/database, (b) shared OneDrive/SharePoint/network JSON files, and (c) 1,000+ concurrent users with 1,000,000+ monthly submissions and tamper-proof authorization. Those constraints cannot be guaranteed together. File System Access API writes and sync folders do not provide distributed transactions, atomic compare-and-swap, server-enforced RBAC or a trusted signature verifier. This branch is a functional prototype foundation, not a production release for regulated/critical data. Choose either the no-backend pilot with a small controlled user cohort, or a transactional backend/identity/queue architecture for the stated scale.

## Validation evidence log
- [x] Static JavaScript syntax parse: all 34 repository JS modules fetched from this branch and parsed after removing module import/export declarations. This confirms syntax only, not browser runtime behavior.
- [ ] Browser self-tests: not executed in a real Chrome/Edge browser in this session. Run Admin → System → Run automated self-tests.
- [ ] Functional end-to-end and multi-user tests: not executed.
- [ ] Performance benchmarks: not executed.
- [ ] Security review: not executed.

### Remaining specification gaps
- [ ] Argon2id WASM; current password hashing is PBKDF2-SHA256.
- [ ] Chart.js, Gridstack.js, SheetJS and Font Awesome vendored locally; current UI has no charting/grid library and export is CSV, not XLSX.
- [ ] Per-user private-key provisioning, signing of every record and public-key signature verification.
- [ ] True transactional multi-writer locking, immutable file rotation at 500 MB, offset indexes and supersede-map maintenance.
- [ ] Full cache-based dashboard widget catalogue, percentile aggregation, global filters and dashboard layout editing.
- [ ] Durable background aggregation/consolidation scheduler, full email trigger set, recipient resolution and notification center integration.

## Validation evidence log
Record environment, browser version, test data size, expected result, actual result, tester and timestamp for each test. Do not change [ ] to [x] until repeatable evidence exists.


## Integration and deployment validation (2026-11-19)
- [x] OPEX app mirrored into Firebase Hosting public root at `public/opex/` (43 source/documentation files).
- [x] Existing Weekend-theory files under `public/`, Firebase Functions, API rewrite and Firestore configuration preserved in the integration branch.
- [x] Static JavaScript syntax parsing completed on the source modules; this is not browser execution.
- [ ] Pull request review and merge to `main`.
- [ ] Firebase Hosting deployment and live HTTPS smoke test.
- [ ] Browser self-tests and end-to-end functional acceptance.
- [ ] Multi-user concurrency, recovery, security and performance tests.
