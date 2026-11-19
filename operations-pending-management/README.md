# Operations Pending Management

## Deliverables
- `operations-pending-management.html` — standalone, offline HTML application.
- `sample-case-input-template.csv` — sample import file with expected columns and sample rows.

## Start
1. Download both files and open the HTML in a current Chrome or Edge browser.
2. Select **Import Excel / CSV** and load the sample CSV file.
3. Open **SLA & Settings**; set the operator label and adjust status SLA hours to your policy.
4. In **Case Register**, select a proposed status and click **Change**. A reason and operator are mandatory.
5. Use **Audit Trail** for a global view. Export CSV for analysis/printing and JSON for full backup.

## Canonical statuses
`Pending`, `Day Follow-up`, `Tomorrow`, `Duplicate`, `Later`, `Respond Again`, `In Progress`, `Escalated`, `Closed`.

A Duplicate transition requires a linked Case ID. A case is counted as reopened when its audit history contains `Closed → Respond Again`.

## Excel columns
`Case ID` is mandatory. Preferred columns: Customer / Account, Issue / Description, Current Status, Assigned To, Created Date, Last Updated, Priority, SLA Target Date, Remarks / Notes, Next Follow-up Date, Linked Case ID. Common header aliases are recognized. Dates should be Excel dates or ISO `YYYY-MM-DD`. Missing optional fields default to blank or Pending/Medium.

The HTML includes a small browser-native XLSX ZIP/XML reader, so it does not require a CDN or runtime network connection. If an older browser cannot decompress XLSX, save the workbook as CSV and import that instead.

## Operational logic
- Aging buckets use Created Date through today.
- Follow-up queues use Next Follow-up Date: due today, tomorrow and overdue.
- SLA measures elapsed time in the current status from the latest audited transition. If no status transition exists, Last Updated then Created Date is used. Closed is excluded. SLA Target Date is retained as source data but is not the status-duration SLA clock.
- Operator workload reports open count, average age, due today/tomorrow, overdue and SLA breaches.

## Persistence and limitations
Data and logs are saved in browser `localStorage` for this browser profile/origin. Back up JSON regularly. Import Previous Logs merges new event IDs without overwriting existing audit events; it also restores missing cases from the backup. Importing a workbook updates matching case snapshots but preserves their existing history.

This is a single-browser-profile tool: localStorage is not shared between computers/users and can be edited or cleared by anyone with access to the browser profile. Operator names are labels, not authenticated identities. Logs are append-only through the application workflow but are not cryptographically tamper-proof. It has no server-side authorization, cross-device sync or guaranteed evidentiary integrity. For regulated workflows, use authenticated append-only storage, access controls, backups and integrity verification.