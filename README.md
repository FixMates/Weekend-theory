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
The Processing & Pending workspace shares the connected OPEX folder and active user profile. It contains two linked, role-aware forms: the Task Register (one record per assigned task) and the Question Log (multiple records linked by Task ID).

**Supervisor workflow:** supervisors assign tasks to active processors, set the team, received date/time, task/series, proposal number, priority and TAT target; they can see the teams in their team_id / supervises_teams scope, review workload, reassign tasks, and respond to questions. If no team scope is configured on a supervisor profile, the page currently shows all tasks and warns about the missing scope.

**Associate workflow:** associates (including the submitter role) see only tasks assigned to their profile. They can update task status, start/end timestamps and delayed reason, and raise questions against their assigned active tasks. They cannot create or reassign tasks, change task identity fields, or update completed/cancelled tasks. An associate can record a query response when they are the named owner; supervisors can respond to questions within their scope.

**Task Register headers / measures:** Sl No, Task ID, Processor Name, Insured Name, Task, Task Status, Proposal Number, Received Date Time, Processed Date Time, Gross TAT Hours, External Wait Hours, Net TAT Hours, Meet TAT, Delayed Reason, Start Time, End Time, and AHT Hours. Gross TAT, external wait, net TAT, Meet TAT and AHT are calculated; users enter the underlying assignment and work timestamps. The processed date/time is the task end time when the task is completed.

**Question Log headers:** Sl No, Query ID, Date, Task ID, Series, Processor, Insured Name, Team, Question, Response, Responded By, Responded Date, Category, SOP Update, Internal/External, Valid/Invalid, Comments, Owner, Due Date, and Status. Raised date/time and raised-by identity are captured automatically. Owner and follow-up due date are required; response fields are completed by the assigned owner or supervisor. Each question is linked to its Task ID.

External query intervals are excluded from net TAT; internal query intervals remain included. Overlapping external wait periods are merged to prevent double-deduction. A task cannot be completed while linked questions remain open; completed tasks with breached net TAT require a delayed reason. Every task/query update appends a new version and audit event. CSV exports contain the full headers above and are limited to the viewer's visible scope.

This register remains a dedicated operational task form; arbitrary dynamic form submissions do not automatically create tasks. A published form must have its Processing Integration mapping explicitly enabled and configured.
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
