# OPEX — browser-only rebuild

This repository is rebuilt using **HTML, CSS, vanilla JavaScript, and JSON/NDJSON only**. No .NET, C#, Node.js, npm, backend, database server, or build step.

## Run
1. Open `index.html` in current Microsoft Edge or Google Chrome.
2. Select **Connect shared folder** and choose the shared network folder or locally synced SharePoint/OneDrive folder.
3. Create a form and submit a test record.

## Implemented foundation
- Responsive static UI and navigation
- Shared-folder picker using the File System Access API
- Workspace bootstrap and JSON/NDJSON persistence
- Form creation/import and dynamic submission
- Append-only version records
- Supervisor approve / pend / reject flow
- Basic metrics and audit event log

## Not yet production-ready
This is a functional foundation, not a security-certified enterprise deployment. Argon2id, encrypted user vault, RSA signatures, cryptographic audit-chain verification, robust multi-user locking, offline sync, XLSX export, recovery tooling, and load tests are not implemented yet.

A browser-only shared folder is not a transactional database. Server-grade RBAC, reliable atomic writes across 1,000+ concurrent users, and 1M+ monthly submissions cannot be guaranteed by this design. OneDrive/SharePoint sync can also introduce propagation delay and conflict copies. Validate the actual storage platform before production use, and do not store sensitive or regulated data until security controls are independently implemented and tested.

All runtime code is local browser JavaScript; no remote libraries are loaded.