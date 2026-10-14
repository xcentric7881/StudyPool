# Email-code authentication

On branch `feature/email-otp-login`, users authenticate with a one-time six-digit email code. No password or self-registration is supported.

1. An administrator imports a roster of approved users and roles.
2. An active user enters the roster email address at `/login`.
3. The service sends a code via Resend (requires `RESEND_API_KEY`, `LOGIN_EMAIL_FROM`, `AUTH_CODE_SECRET`).
4. A correct code creates or updates the user record from the current roster and issues a secure HTTP-only session cookie for up to 30 days.
5. All server-side authorization continues to use the user's role, with the roster's active state checked on each authenticated request.

Codes expire in 10 minutes, permit at most five verification attempts, and are consumed once. Sending is restricted to one per email per minute and five per hour, with matching UI responses for unknown and approved addresses. Do not log codes or commit secrets. Deploy behind HTTPS and add an IP-based rate limiter at the ingress/proxy; email-only throttling is not sufficient to prevent large-scale abuse. Consider extra authentication for privileged administrators.

**Data safety:** The `EmailLoginCode` table and its relation on `User` are additive. Review the generated Prisma schema changes before applying, particularly in any shared database. Never use `--accept-data-loss`.

**Deployment:** This branch has deliberately not been deployed. Configure a verified email sender and secrets, apply the non-destructive schema change, and verify delivery in a non-production environment before switching users from the prototype. The demo-login form is replaced only on this branch. No real data should be introduced until delivery, security and privacy checks pass.

If an approved roster address is removed or made inactive, existing sessions are denied on the next request. Users and booking history remain intact.

No GitHub Actions workflow configuration has been changed by this branch. Do not enable or re-enable CI/CD without an explicit decision.
