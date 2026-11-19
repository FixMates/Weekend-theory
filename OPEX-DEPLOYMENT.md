# OPEX workspace deployment

## Integration layout
- Existing Weekend-theory production site remains unchanged.
- OPEX application source and documentation: `/opex/`
- Firebase Hosting-served application: `/public/opex/`
- Public route after deployment: `https://fixmates-v2.web.app/opex/`
- Firebase Hosting is configured to serve `public/`; the existing `/api/**` Cloud Function rewrite is not modified.

## Deploy
1. Merge the `opex-integration` pull request into `main` after review.
2. From the repository root, install/use the Firebase CLI and authenticate with the project owner account.
3. Run `firebase deploy --only hosting`.
4. Open `/opex/` over HTTPS in desktop Chrome or Edge.
5. Select a dedicated shared workspace folder. Complete first-admin setup once.
6. Run Admin → System → Run automated self-tests.
7. Execute the functional and multi-user acceptance tests in `/opex/CHECKLIST.md` and record evidence before onboarding real users.

## Deployment safety
- Do not deploy Functions or Firestore as part of this OPEX-only change.
- The existing Weekend-theory homepage, booking flow, Firebase Functions and Firestore rules are not replaced by this branch.
- Never use real PHI or sensitive production data in the prototype pilot.
- Back up the selected workspace folder before testing.

## Known release blockers
The file-backed browser architecture does not provide server-enforced RBAC, distributed transactions, atomic multi-user writes, durable background processing, or guaranteed conflict resolution. The current implementation is a controlled pilot prototype, not a production-ready system for regulated records or high concurrency. XLSX export, Argon2id, complete record signatures, full notification delivery and large-scale performance validation remain outstanding.
