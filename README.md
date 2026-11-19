# OPEX — separate browser workspaces

**Runtime:** static HTML, CSS, vanilla JavaScript, JSON and NDJSON only. No .NET, C#, Node.js, npm, build step, backend or database server.

## Pages
- `index.html` — navigation home
- `admin.html` — separate Admin Console: form builder, users, teams and master dropdown library
- `submit.html` — separate Form Workspace: published form picker, assigned forms, conditional fields, dependent dropdowns, submitter recent items and pended corrections
- `review.html` — separate Supervisor Review: approve, pend, reject, reason and due date
- `dashboard.html` — separate operational dashboard with status queues and five-second refresh

## Shared data flow
- Admin form index: `_system/forms.json`
- Individual current form definitions: `forms/{formId}.json`
- Versioned form definitions: `forms/{formId}/v{version}.json`
- User and team definitions: `_system/users.json`, `_system/teams.json`
- Reusable dropdown values: `_system/dropdowns.json`
- Submission versions: `data/{formId}/YYYY-MM.ndjson`
- Audit events: `_audit/YYYY-MM.ndjson`

All pages use the same shared-folder storage abstraction and read the same submission files. The dashboard and review queue project the latest version for each submission ID, so a pend, response or decision updates the current queue state without deleting earlier versions.

## Conditional and dependent fields
In Admin Console, each field can define:
- `Depends on field ID` — parent field identifier
- `Show only when parent equals` — exact parent value that makes the field visible
- `Master dropdown key` — use a reusable list from the dropdown library
- `Options` — for dependent dropdowns, enter mappings such as `Pending => Missing document | Clarification needed,Rejected => Invalid data | Policy mismatch`

Example: create a `status` dropdown with values Pending and Rejected. Add a `pend_reason` dropdown, set its parent to `status`, and enter the mapping above. Add a `correction_details` textarea with parent `status` and show-when value `Pending`. The form renderer updates the dependent options and hides/shows conditional fields when the parent changes.

## Run
1. Open the repository's `index.html` in current Microsoft Edge or Chrome.
2. Open Admin Console and connect the shared folder.
3. Create teams and user profiles. Switch the active profile from the header when testing each role.
4. Build and publish a form. Assign it to one or more teams or users.
5. Open Form Workspace. The published form appears in the picker for assigned users.
6. Submit a record. Open Supervisor Review as a supervisor assigned to that team and pend it with a reason and due date.
7. Return to Form Workspace as the original submitter. The pending correction appears; correct and resubmit.
8. Verify the latest status and version in Dashboard. The dashboard refreshes every five seconds.

## Accuracy and operational constraints
The dashboard displays the latest version found in the shared-folder files and its last read time. Five-second polling is the application refresh interval, **not a guarantee of five-second cross-device visibility**. OneDrive/SharePoint sync propagation and network-share caching can delay when another workstation sees a write.

This is a browser-side shared-folder system, not a transactional database. Concurrent writes from multiple workstations can race; there is no server-enforced authorization, reliable distributed lock, Argon2id login, encrypted user vault, signature verification, hash-chained audit, offline sync, precomputed aggregation worker, or Excel export in this iteration. Profile switching is for workflow testing, not secure authentication. The original 1,000+ concurrent user and 1M+ monthly submission targets are not validated. Pilot with real network storage and concurrency tests before production use; do not store regulated/sensitive data until security controls are independently implemented and verified.
