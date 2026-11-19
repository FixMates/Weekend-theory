# OPEX Control

OPEX Control is an isolated browser workspace for operational forms, submission review, dashboards and audit history.

## Open
After deployment to Firebase Hosting, open `/opex/`. The existing Weekend-theory booking site remains at the root.

## First run
1. Open in desktop Chrome or Edge over HTTPS.
2. Choose a dedicated shared workspace folder.
3. Create the first administrator and retain the workspace passphrase securely.
4. Sign in, create teams and users, then publish a form.
5. Create a dashboard and test with non-production data.

See `DEPLOYMENT.md`, `ADMIN_GUIDE.md`, `USER_GUIDE.md`, `ARCHITECTURE.md` and `CHECKLIST.md`.

**Status:** functional prototype foundation. It is not approved for regulated or production-critical information. The no-backend/shared-folder design cannot guarantee 1,000 concurrent users, transactional writes or server-enforced security.
