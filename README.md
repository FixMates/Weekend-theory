# OPEX — separate browser workspaces

**Runtime:** static HTML, CSS, vanilla JavaScript, JSON and NDJSON only. No .NET, C#, Node.js, npm, build step, backend or database server.

## Pages
- `index.html` — navigation home
- `admin.html` — separate Admin Console: form builder, users, teams and master dropdown library
- `submit.html` — separate Form Workspace: published form picker, assigned forms, conditional fields, dependent dropdowns, submitter recent items and pended corrections
- `review.html` — separate Supervisor Review: approve, pend, reject, reason and due date
- `dashboard.html` — separate operational dashboard with status queues and five-second refresh
- `processing.html` — integrated Processing & Pending Control Tower with task register, question log, TAT/AHT and query lifecycle

## Shared data flow
- Admin form index: `_system/forms.json`
- Individual current form definitions: `forms/{formId}.json`
- Versioned form definitions: `forms/{formId}/v{version}.json`
- User and team definitions: `_system/users.json`, `_system/teams.json`
- Reusable dropdown values: `_system/dropdowns.json`
- Submission versions: `data/{formId}/YYYY-MM.ndjson`
- Audit events: `_audit/YYYY-MM.ndjson`
- Processing tasks: `_operations/tasks/YYYY-MM.ndjson` (append-only versions projected by task ID)
- Processing queries: `_operations/queries/YYYY-MM.ndjson` (append-only versions projected by query ID)

## Processing & Pending Management
The Processing & Pending workspace shares the same connected OPEX folder and active user profile. It maintains a task register and a linked question log: each task can have multiple queries, and each query carries its Task ID, processor, insured, team, owner, response, category, validity, SOP-update flag and follow-up date. Task records include received/processed timestamps, start/end time, per-task TAT target, delayed reason, gross TAT, external wait, net TAT and AHT. External query intervals are excluded from net TAT; internal query intervals remain included. Gross TAT remains available for transparency. External waiting intervals are merged before deduction so overlapping external queries are not double-counted. Completed tasks with breached net TAT require a delayed reason. Task and query changes append new versions and audit events. The page exports task and query CSVs.

This register is a dedicated operational task form and is not automatically populated from arbitrary dynamic form submissions. If you want an existing published form to create task records, its field mapping must be configured explicitly before enabling that workflow.

All pages use the same shared-folder storage abstraction and read the same submission files. The dashboard and review queue project the latest version for each submission ID, so a pend, response or decision updates the current queue state without deleting earlier versions.

## Admin access and form-to-processing integration
The Admin Console is a privileged workspace for `admin` and `builder` roles. Its navigation entry is hidden for other roles, and the page itself checks the active role before showing form, user, team or dropdown administration. The default active profile on a new browser is a submitter when one exists. This is a browser-side role gate only: the shared-folder architecture does not provide secure authentication or server-enforced authorization, so it must not be treated as a security boundary.

In Admin Console, a form can enable **Create a Processing & Pending task when submitted** and map its Insured Name and Task / Series fields, plus optional Proposal Number, Received Date & Time, Processor Name and TAT target fields. The Form Workspace uses that configuration to create a linked task in `_operations/tasks/YYYY-MM.ndjson` when a user submits the form. Corrected resubmissions update the same linked task instead of creating a second one. The task stores its source submission and form IDs. Use the `datetime-local` field type when mapping a precise Received Date & Time.

All OPEX pages now share the light dashboard visual language used by Processing & Pending.

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
