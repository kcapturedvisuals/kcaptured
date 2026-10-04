# Admin Subdomain Plan

## Confirmed decisions

- Admin hostname: `admin.kcapturedstudio.com`.
- The existing domain is `kcapturedstudio.com`; use `admin` as a DNS
  subdomain. A separate domain purchase is not required.
- Hosting: Vercel.
- DNS management: Namecheap.
- Replace the shared-key login with individual admin credentials.
- Support two roles: `admin` and `super_admin`. You will provision the admin
  and super-admin credentials. The super-admin role should be represented and
  checked from the start, while its additional feature set can be added later.
  Exact role-specific permissions are not yet specified.
- Admin sign-in uses username and password. There is no self-service reset
  request flow; reset links are issued automatically for Nettey after three
  failed attempts to `nerquayex@gmail.com`, and super admins can manually
  generate one-time links for other admin accounts.
- Initial accounts: `kenny` is `admin`; `nettey` is `super_admin`. Temporary
  credentials match the supplied usernames and are required to change on
  first sign-in.
- The subdomain has been added to the Vercel project and verified through
  Namecheap DNS.
- The login page should have a retro, game-inspired visual style. Successful
  sign-in should reveal the dashboard with a curtain-lift transition.
- Log login-page visits and every login attempt with timestamp, IP address,
  and country when available.
- Show a caution message after the first failed attempt. After the second
  failure, show “relax and try again in 3 minutes or contact the dev” as a
  warning only; it is not a cooldown. On the third failed Nettey attempt,
  email a reset link. Four failed attempts lock that account for 30 minutes.
- Super admins can add standard admin accounts and generate reset links for
  them from the dashboard. Standard admins can view only their own dashboard
  activity; super admins can view all admin activity and sign-in events.

## Recommendation

Serve the existing Next.js application at both `kcapturedstudio.com` and
`admin.kcapturedstudio.com`, with the admin interface canonical on the
`admin.` host. Keep the marketing site and the admin UI in the same app and
deployment initially. The subdomain is a cleaner entry point and separates
admin navigation from the public site, but it is not itself an authentication
or security boundary.

Use `https://admin.kcapturedstudio.com/login` for sign-in and
`https://admin.kcapturedstudio.com/admin` for the protected dashboard. After
successful authentication, send the administrator to `/admin`. Requests to
`/admin` on the public host should redirect to the matching path on the admin
host. The admin host's `/` should redirect to `/login`. Public booking, client
dashboard, and public API routes should continue to use the main host.

## Repository state before this switch

- This is one Next.js application; no separate admin app or host-based routing
  was configured.
- `db/schema.ts` defines bookings, portfolio, package, settings, testimonial,
  rate-limit, and audit tables, but there were no admin-user, role, or session
  tables.
- Admin entry currently appears as a lock control in the public footer. It
  submitted a shared secret to `POST /api/auth/validate-key`.
- The shared-key flow issued a short-lived JWT cookie containing only
  `{ upload: true }`, with no user identity or role.
- The README identifies Vercel as the deployment host and Namecheap as the
  domain/DNS provider.

## Implemented authentication and role model

The shared-key implementation has been replaced with named accounts and
server-side authorization:

- Admin identities are in Neon `admin_users` with normalized unique
  usernames, scrypt password hashes, role, active status, forced-password-
  change state, failure count, and lock timestamp. Passwords are never stored
  in plaintext.
- Random session tokens are stored only as SHA-256 hashes in `admin_sessions`;
  the browser receives an HttpOnly, SameSite=Lax, Secure-in-production,
  host-only cookie. Sessions expire after eight hours and can be revoked.
- `admin` accounts have standard dashboard access. `super_admin` has that
  access plus the Admin Access panel for creating admins and issuing reset
  links. The API enforces role checks; hiding the panel is not the security
  boundary.
- New accounts start with `must_change_password=true`; the account creator
  supplies a temporary password, and the admin changes it on first sign-in.
  Current initial accounts in Neon are Kenny (`admin`) and Nettey
  (`super_admin`).
- The initial one-time provisioning script was removed after use. There is no
  public signup endpoint.
- Dashboard audit events are attributed to the authenticated username rather
  than trusting an actor supplied by the browser.
- Add a security-event log for login-page visits and login attempts,
  including event time, normalized username when supplied, outcome, source IP,
  and country code when available. Never log passwords, password hashes, or
  session tokens. Treat missing geolocation headers as an unknown country;
  do not make a third-party geolocation request.
- On Vercel, derive IP and country from platform request metadata. Do not
  make third-party geolocation requests. Local `::1` loopback records are
  stored/displayed as `127.0.0.1` / `localhost`; that is the local machine,
  not the user's public IP. Country is unavailable locally.
- Track failed attempts per account server-side. On the first failure, show a
  cautionary message; on the second, show the requested three-minute message
  without enforcing a cooldown; on the fourth consecutive failed attempt,
  lock that account for 30 minutes. Clear the consecutive-failure counter
  after successful authentication. Continue logging attempts while locked,
  but do not reveal whether a username exists or is locked in a way that
  enables account enumeration.
- Because account-specific lockouts can be abused to deny an admin access,
  also apply IP-based/server-side throttling and generic login responses.
  Ensure the UI messaging does not reveal account existence. Define log
  retention and access controls before production rollout; recommended
  starting retention is 90 days.

Reset links are random, single-use tokens with a 30-minute expiry; only a
SHA-256 hash is stored in Neon. The token is put in the URL fragment so it is
not sent to the web server in the initial page request. Completing a reset
revokes that account's active sessions. After three or more consecutive
failed attempts for Nettey, the app sends one reset link through the existing
Resend helper to `nerquayex@gmail.com`; it does not send another link for 30
minutes. Super-admin-generated links are displayed once in the dashboard and
must be shared through a private channel. No password reset token is logged.

### Login experience

- Use a dedicated retro, game-inspired login screen on the admin host.
- On valid credentials, transition with a curtain-lift/reveal effect into the
  existing admin dashboard. The transition is presentation only; enforce
  authentication on the server before serving protected content and APIs.
- On invalid credentials, do not distinguish unknown username, wrong
  password, disabled account, and locked account in a way that reveals account
  state. Show the requested progressive messages without changing the
  server-side lockout policy.
- After the third failed attempt, tell the user to check the recovery inbox if
  they are signing into Nettey's account; do not display the recovery address
  in the login UI.
- Log a page-visit event when the login page is requested and a separate event
  for each login attempt, whether successful, failed, or blocked by lockout.

## Implementation plan

### 1. Attach the hostname to the current deployment

- In Vercel, add `admin.kcapturedstudio.com` to the existing project that
  serves `kcapturedstudio.com`; do not create a second deployment for the
  initial implementation.
- In Namecheap's Advanced DNS settings, add exactly the record and target
  Vercel shows for the `admin` host. Usually this is a CNAME, but follow the
  per-project Vercel instructions rather than guessing the target. Do not
  alter the existing apex/root domain records.
- Wait for DNS and HTTPS certificate provisioning, then verify HTTPS on both
  hosts. Do not move the main domain or change its existing records.
- No new Vercel project or separate domain purchase is needed. DNS hosting
  costs or existing domain charges remain unchanged; verify any provider
  account-specific pricing if Vercel prompts for a plan change.
- No new hosting project, database, or application deployment is expected
  for the recommended same-app design.

### 2. Add host-aware routing and canonical URLs

- `proxy.ts` implements Next.js 16 host-aware request routing to:
  - redirect public-host `/admin` and `/admin/*` requests to the admin host,
    preserving path and query string;
  - serve the admin login and admin routes on the admin host;
  - avoid redirect loops and avoid changing public/client/API routes.
- `app/login/page.tsx` and `components/admin/admin-login-form.tsx` provide a
  dedicated retro login experience, log each page view, and reveal the
  existing admin dashboard with a curtain-lift transition after successful
  authentication. The public-footer shared-key prompt has been removed.
- `/change-password` and its API require newly provisioned accounts to change
  their temporary password before accessing any admin pages or APIs.
- Configure a server-only admin base URL, defaulting to
  `https://admin.kcapturedstudio.com`, and use it for admin email links. Do not
  construct privileged links from an untrusted request `Host` header.
- Redirect the admin host's `/` to `/login`. Admin paths should render the
  existing admin pages on that host. Redirect public-host `/admin` paths to
  the same path on the admin host, preserving query parameters and preventing
  loops.
- Log page visits at the server boundary (not only in a browser effect), so
  automated requests and clients with JavaScript disabled are recorded too.

### 3. Preserve and tighten the authentication boundary

- Keep the `admin_session` cookie host-only (do not set
  `Domain=.kcapturedstudio.com`).
  This lets the cookie go to the admin host without making it available to
  the public host or other subdomains.
- Preserve server-side checks in `app/admin/layout.tsx` and every protected
  API route. Ensure admin requests originate on the admin host and continue
  to use same-origin relative API paths.
- `lib/auth-utils.ts` and auth routes implement scrypt password hashing,
  opaque random server-side sessions, sign-out, host-only cookies, and
  per-request session checks across protected APIs.
- `drizzle/0012_admin_accounts_sessions.sql` adds account, session, and
  security-event tables. The migration has been applied to the configured
  Neon database; Kenny (`admin`) and Nettey (`super_admin`) are provisioned
  with forced first-login password changes. The one-time provisioning script
  was removed after use; no plaintext password is stored in the database.
- Login attempts are logged with timestamp, username when supplied, outcome,
  Vercel client IP/country headers when available, and user agent. Login-page
  visits are also recorded. Passwords, hashes, and session tokens are not
  logged. Security events older than 90 days are pruned during event writes.
- Four consecutive failures lock the account for 30 minutes; success clears
  the counter. The second-failure three-minute message is a warning, not a
  cooldown. On Nettey's third consecutive failed attempt, a hashed,
  single-use, 30-minute reset token is mailed through the existing Resend
  helper to `nerquayex@gmail.com`. Login also applies a server-side IP
  threshold.
- All admin API protections were switched from the shared token to database
  sessions. Inactive package listing now requires an authenticated admin.
- `drizzle/0013_admin_password_resets.sql` and
  `drizzle/0014_admin_logout_event.sql` add reset-token storage and logout
  event support; both were applied to Neon.
- The super-admin-only Admin Access dashboard can create standard admin
  accounts using the username as the temporary password, which must be
  changed at first sign-in. It can generate 30-minute, single-use reset links
  and optionally email them to an address entered by the super admin. If no
  email is supplied, the link is shown for private copying; failed email
  delivery also exposes the link as a fallback.
- The audit trail now scopes ordinary admins to actions attributed to their
  username; super admins see all operational audit entries and login-page /
  sign-in / logout events with IP and country where available.
- Local loopback `::1` is normalized to `127.0.0.1` and displayed as
  `localhost (127.0.0.1)`; country is unknown in local development.

### 4. Update links, robots, and deployment settings

- Admin notification/cancellation links now use the configured admin URL.
- Keep admin pages and sign-in pages `noindex`; update `robots.ts` if required
  for the admin-host routes. Robots directives are not access control.
- Configure the server-side admin URL in the production deployment and
  preview environments. Do not expose authentication secrets as
  `NEXT_PUBLIC_*` values.
- Set the non-secret Vercel environment variable
  `ADMIN_BASE_URL=https://admin.kcapturedstudio.com` for Production and
  Preview as appropriate. The app has this same production default if unset.
- Ensure previews do not send real admin notification links to production
  unless explicitly intended.
- Remove `UPLOAD_KEY` from production configuration only after all callers
  have been migrated to the individual-account session mechanism.
- Do not add usernames/passwords or a bootstrap secret to Vercel environment
  variables. `DATABASE_URL` must point at the Neon database containing the
  accounts. `JWT_SECRET` remains required by other existing booking flows,
  but admin sessions themselves are random database-backed tokens.
- Remove the old `UPLOAD_KEY` from Vercel after deploying this version and
  verifying the new login. The old login endpoint was removed.

### 5. Verify before cutover

- Confirm both hosts resolve to the same application and have valid HTTPS.
- Test unauthenticated access to `/admin` on both hosts and to every protected
  API method; each must remain blocked.
- Test successful sign-in for both roles, cookie flags/host scope, admin page
  navigation, uploads, bookings, settings, packages, testimonials, portfolio
  editing, audit trail, and sign-out/session expiry.
- Test that role checks distinguish admins from super admins and that a
  session can be revoked without affecting other users.
- Verify login page visits and all login outcomes record timestamp, IP, and
  country when Vercel supplies it; verify passwords and session secrets never
  appear in logs.
- Verify progressive login messages, no three-minute enforced cooldown after
  the second failure, account lock after the fourth failure, unlock after
  30 minutes, and IP-level throttling.
- If account management is included, verify disabled users cannot sign in and
  the last active super admin cannot be accidentally disabled or demoted.
- Verify public booking and client dashboard flows remain on the main host.
- Verify admin notification links open the admin host and return to sign-in
  when the session is absent or expired.
- Test redirect preservation (paths/query strings), loop prevention, and
  unknown admin-host paths.

## Scope and difficulty

**Difficulty: moderate-to-high.** The host and DNS configuration is already
complete. The application now includes individual credentials,
database-backed sessions, server-side role data, login auditing, lockout,
reset links, role-scoped trails, and super-admin account controls. Remaining
work is production deployment and end-to-end testing of reset-email delivery
and every admin operation. Splitting the admin into a separate app/deployment
would add cross-origin API, cookie, CORS, and deployment complexity and is not
recommended for the first version.

## User inputs and remaining setup

Confirmed:

1. Hostname is `admin.kcapturedstudio.com`.
2. Vercel hosts the app; Namecheap manages DNS.
3. Replace shared-key sign-in with individual admin credentials.
4. Kenny is the standard admin; Nettey is the super admin.
5. Initial temporary credentials matched usernames and were forced to change
   on first login.
6. The Vercel subdomain was configured and verified in Namecheap DNS.
7. Nettey's recovery email is `nerquayex@gmail.com`.

Remaining deployment work:

- Deploy the changes to Vercel and confirm `DATABASE_URL` there points to the
  Neon database in which the accounts were provisioned.
- Set `ADMIN_BASE_URL` in Vercel (recommended, though the production default
  is already the admin hostname).
- After deployment, sign in as each user and immediately replace the
  temporary password with a unique password of at least 12 characters.
- Remove `UPLOAD_KEY` from Vercel once the new login is confirmed working.
- Security-event retention defaults to 90 days.

The app code and configured Neon database have been updated; Vercel
environment settings for the new URL and removal of `UPLOAD_KEY` remain to be
done after deployment.
