# OPEX — browser-only workflow application

**Runtime:** HTML + CSS + vanilla JavaScript + JSON / NDJSON. No .NET, C#, Node.js, npm, bundler, database server, or application server.

## Start
1. Open `index.html` using the current Microsoft Edge or Google Chrome.
2. Click **Connect shared folder** and select the shared OPEX folder.
3. The first connection creates the workspace folders and a default `System Admin` profile.
4. In **Users & teams**, add teams and user profiles.
5. In **Form builder**, create a form, add fields, assign it to teams/users/roles and publish it.
6. Change **Active user** in the left panel to the intended submitter.
7. Open **Assigned forms**, fill the form and submit.
8. Switch to a Supervisor profile and use **Supervisor queue** to approve, pend or reject.
9. Switch back to the submitter profile, open **My submissions**, open the pended record, correct it and resubmit.
10. Use **Overview**, **Dashboards**, and **Status queues** to inspect the latest state.

## Implemented in this iteration
- Classic script loading (no ES modules), to support direct static-file launch.
- Workspace folder picker and initial folder/config bootstrap.
- User profiles, teams, and role/team/user form assignment.
- Admin form builder with text, number, date, textarea, select, and checkbox fields.
- Assigned form delivery and dynamic submission UI.
- NDJSON append-only submission versions stored under `data/{formId}/YYYY-MM.ndjson`.
- Submitter's pended-item correction and resubmission.
- Supervisor approve / pend / reject with reason required for pend/reject.
- Latest-version projection for dashboard counts and status-based queues.
- Audit event log for form, user, team, submission and review actions.

## Data layout
- `_system/forms.json`
- `_system/users.json`
- `_system/teams.json`
- `data/{formId}/YYYY-MM.ndjson`
- `_audit/YYYY-MM.ndjson`

## Important limitations
This is a browser-side shared-folder workflow prototype, not a secure transactional database. Each workstation/browser profile must grant access to the same folder. File System Access API support depends on a current Chromium browser and a secure/allowed browser context; if the browser blocks folder access from a network `file://` location, the app must be opened from an approved secure static origin.

The active-user selector is a workflow test/profile switch, **not secure login**. Browser-side role checks are not an authorization boundary. Password hashing, encrypted user vault, MFA, cryptographic signatures, tamper-evident audit verification, supervisor-to-team authorization, email dispatch, offline sync, XLSX export, conflict recovery, and scale/load tests remain unimplemented.

Direct shared-folder writes are not guaranteed atomic across multiple devices or OneDrive/SharePoint sync clients. The original target of 1,000+ concurrent users and 1M+ submissions/month is not validated and must not be represented as achieved. Run a controlled multi-user pilot and verify the actual storage platform before operational rollout. Do not store sensitive or regulated data until authentication and security controls are implemented and independently tested.
