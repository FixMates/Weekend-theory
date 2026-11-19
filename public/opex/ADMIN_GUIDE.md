# OPEX administrator guide

## Initial setup
Use a dedicated approved folder. Initialize the first admin and store the workspace passphrase securely; there is no recovery path if it is lost. Back up the entire workspace before onboarding users.

## Configure
1. Create teams.
2. Create user accounts and assign least-privilege roles.
3. Build and publish forms with required fields.
4. Configure dropdowns and policies.
5. Create dashboards and grant access.

## Operate
Review the system tab for outbox processing and automated self-tests. Use the audit viewer and integrity checker after configuration changes. Monitor failed outbox entries and cache freshness. Back up before modifying workspace files or schema.

## Security
Client-side roles are not a security boundary. Anyone able to modify the client or workspace files may bypass checks or tamper with records. Do not store secrets in the repository. Do not load regulated production data into this prototype.
