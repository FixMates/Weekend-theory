# OPEX architecture

## Layers
- Static application shell: login, administration, submission, review, action items and dashboards.
- Core: directory-handle storage, encrypted user vault, session state, role capabilities and audit chain.
- Workflow: append-version submission, supervisor approve/pend/reject and submitter response.
- Data: monthly NDJSON, IndexedDB outbox, daily aggregate cache and CSV export.
- Offline: service-worker static asset cache and user-triggered outbox consolidation.
- Integration: PowerShell SMTP dispatcher sample.

## Data flow
A user submits a form; the app writes a job to IndexedDB and attempts to consolidate it into a monthly NDJSON file under the selected workspace. Each update creates a new version. Dashboards aggregate the latest version per submission. Audit entries are hash chained.

## Trust and consistency
AES-GCM encrypts the local user vault. Password hashing currently uses PBKDF2-SHA256. Role checks are client-side. Hash chains are tamper-evident only when trusted checkpoints are protected. The File System Access API and OneDrive/SharePoint sync do not provide distributed transactions, strong locks or server-side access control.

## Scale
This design is a prototype for a small controlled cohort using synthetic data. It cannot guarantee 1,000 concurrent writers or 1,000,000 monthly submissions. A production-scale version requires managed identity, server-enforced RBAC, transactional database, durable queue, object storage, server-side signatures and monitoring.
