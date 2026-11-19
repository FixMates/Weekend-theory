# OPEX deployment and release procedure

## Hosting
The app is placed under `public/opex/`, which is inside the existing Firebase Hosting public directory. The existing root site and API rewrite are left unchanged. The app requires HTTPS, ES modules, IndexedDB, WebCrypto, Service Workers and the Chromium File System Access API. Use current desktop Chrome or Edge; mobile browsers are not supported for workspace folder access.

## Deploy
1. Review the pull request and confirm the existing `public/index.html`, `firebase.json`, `functions/` and Firestore rules remain unchanged.
2. From the repository root run `firebase deploy --only hosting` using the already configured Firebase project.
3. Open `https://<hosting-domain>/opex/`.
4. Verify the root Weekend-theory booking site and `/api/health` still behave as before.
5. Run the smoke tests below before inviting users.

## First-time setup
- Create a new, dedicated workspace folder in an approved location.
- Connect it from OPEX; do not point at a folder containing unrelated files.
- Initialize one admin account with a unique employee ID, 12+ character password and 14+ character workspace passphrase.
- Back up the workspace folder and passphrase using the organization's approved secure process.
- Create a pilot team, one supervisor, two submitters and one test form.

## Smoke-test sequence
1. Admin initializes and signs in.
2. Admin creates team and user accounts; verify the vault remains encrypted.
3. Admin creates a form with required text, date, dropdown and numeric fields.
4. Submitter submits valid data; invalid required fields must be blocked.
5. Supervisor approves one record and pends another with a reason and due date.
6. Submitter responds to the pended item; supervisor re-reviews it.
7. Dashboard aggregate matches the known test fixture.
8. CSV export opens correctly in Excel.
9. Verify audit chain, then modify a copy of an audit record and confirm the checker detects tampering.
10. Test reload, folder reconnection, offline queue, sync retry and restore from backup.

## Rollback
Hosting rollback uses Firebase Hosting release history. Keep the prior deployed release available. OPEX stores user data in the selected workspace folder, not Hosting; back up that folder independently before each pilot. Never overwrite production data while testing rollback.

## Known release blockers
- No server-enforced identity or role checks: client-side checks can be bypassed by a user with browser/devtools access.
- Shared-folder writes are not distributed transactions; concurrent writes can collide or be lost.
- IndexedDB outbox is per browser profile; the service worker does not guarantee background sync.
- 1,000 concurrent users and 1,000,000 monthly submissions are not validated or supportable claims for this architecture.
- Argon2id, record signing/key management, true locking, XLSX export, full chart widgets, complete notifications and multi-user conflict recovery remain incomplete.
- SMTP delivery needs an IT-approved relay/OAuth configuration and recipient resolution.

Do not use real PHI, financial, HR or otherwise regulated data until an independent security review and architecture redesign are complete. Choose either a small controlled prototype pilot with synthetic data or a transactional backend with managed identity, server-side authorization, durable queue and database for the stated scale.
