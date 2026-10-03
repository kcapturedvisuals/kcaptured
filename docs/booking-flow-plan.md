# Booking Flow Implementation Plan

## 0. Decisions and implementation status

Decisions:
- Domain: `kcapturedstudio.com`. Sending address is configured with `EMAIL_FROM` or `RESEND_FROM_EMAIL`.
- Payment directions: editable in Admin > Settings > "Payment Instructions". Falls back to the FAQ deposit/Cash App/Zelle copy when empty.
- Cancellation: per the FAQ, deposits are non-refundable. Clients can self-cancel until 24 hours before the session; after that the page tells them to email the studio.

Implemented:
- [x] Migration `drizzle/0007_booking_manage_flow.sql` + `db/schema.ts` (manage_token, confirmed_at, cancelled_at, cancelled_by, confirmation_email_sent_at; `site_settings.payment_instructions`)
- [x] `lib/email.ts` (Resend REST API, idempotency keys, templates) and `lib/booking-status.ts`
- [x] `POST /api/bookings` creates token + sends the client "received" email
- [x] `PATCH /api/bookings` sends the confirmation email once when status becomes Confirmed
- [x] `POST /api/bookings/manage/[token]/cancel`, `POST /api/bookings/resend-link`
- [x] `/book` page (with "lost your link" form), `/booking/[token]` manage page (noindex)
- [x] Client dashboard magic links show all bookings, allow eligible cancellations, and provide the Google review link
- [x] Confirmation email includes the snapshotted package total, $20 deposit, balance, payment steps, and configured payment options
- [x] Dashboard magic links and sessions expire after 24 hours
- [x] Services "Book Now on Instagram" -> "Book Session" linking to `/book?package=...`
- [x] Admin settings field for payment instructions
- [x] Admin dashboard booking creation uses the same server-validated booking endpoint, captures the package price, and returns the created booking to refresh the admin list
- [x] Validate and normalize text, email, phone, URL, numeric, status, and upload metadata at first-party form/API boundaries
- [x] Route the contact form through a bounded, rate-limited server handler before forwarding to Formspree
- [x] Applied `drizzle/0007_booking_manage_flow.sql` to the database configured by `.env.local`
- [x] Mask the submitted email on the booking success message; do not persist booking form data in browser storage
- [x] Limit resend-link emails to two requests per email address per rolling 24 hours
- [x] Stop sending new-booking notification emails to admins
- [x] Redact recipient addresses from email-delivery audit logs
- [x] Applied `drizzle/0009_booking_link_rate_limits.sql` and `drizzle/0010_redact_email_audit_addresses.sql` to the database configured by `.env.local`
- [x] Applied `drizzle/0011_booking_price_snapshot.sql` to snapshot existing and new booking prices
- [x] Keep admin auth tokens in an HttpOnly cookie instead of browser-readable storage

Pending (needs you):
- [ ] Add `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` to the v0 project Vars
- [ ] End-to-end test: book -> email -> manage page -> admin confirm -> confirmation email -> cancel

## 1. Goal

Replace the "Book Now on Instagram" flow with a self-serve booking flow:

1. Client clicks **Book Session** and lands on `/book`.
2. Client fills the booking form and sees a success message: "Check your email for a link to manage your booking."
3. Resend emails one secure dashboard sign-in link to the address they entered.
4. The link opens `/dashboard`, where the client sees all bookings and their statuses, can cancel eligible bookings, and can leave a Google review. Links expire after 24 hours.
5. When the admin approves the booking, the client gets a confirmation email with the package total, deposit/balance, payment steps, and payment options.

## 2. Current state (what exists)

- `components/services-section.tsx`: "Book Now on Instagram" button opens `BookingForm` as a modal.
- `components/booking-form.tsx`: posts to `/api/bookings` (uses an idempotency key).
- `app/api/bookings/route.ts`: raw `pg` queries. GET (list), POST (create), PATCH (status), DELETE. No client-facing read or cancel.
- `db/schema.ts` `bookings` table: id, client_name, email, phone, package_name, preferred_date, status, notes, idempotency_key.
- Admin UI: `components/admin/figma-admin.tsx` (bookings section, status changes via PATCH).
- Env vars already present: `DATABASE_URL`, `JWT_SECRET`.

Gap: no public way for a client to view or cancel, and no email sending.

## 3. Architecture

### 3.1 Data changes

Booking lifecycle fields are added by `drizzle/0007_booking_manage_flow.sql`; `drizzle/0011_booking_price_snapshot.sql` stores the package price at request time so later catalog edits do not change a client's quoted amount. A booking dashboard link encrypts its email/expiry claim and expires after 24 hours. The resend quota stores only an HMAC of the normalized email.

Booking fields:

| Column | Type | Purpose |
| --- | --- | --- |
| `manage_token` | text, unique, not null for new rows | Random, unguessable id in the manage link (32 bytes, base64url) |
| `confirmed_at` | timestamptz null | When admin approved |
| `cancelled_at` | timestamptz null | When client or admin cancelled |
| `confirmation_email_sent_at` | timestamptz null | Prevents duplicate confirmation emails |
| `package_price` | integer null | Package price snapshot at the time of the booking request |

Backfill existing rows with generated tokens. Update `db/schema.ts` to match.

Status values: reuse the existing ones used by the admin (Pending, To Confirm, Confirmed, Cancelled). Client-facing labels:
- Pending / To Confirm -> "Awaiting verification"
- Confirmed -> "Verified"
- Cancelled -> "Cancelled"

### 3.2 Email (Resend)

- Add `resend` package, `lib/email.ts` with a single `sendEmail()` helper.
- Env vars: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `K Captured <bookings@mail.yourdomain.com>`), `NEXT_PUBLIC_SITE_URL` (to build links). The app also accepts `RESEND_FROM_EMAIL` and `NEXT_PUBLIC_APP_URL` as aliases.
- Booking-received and cancellation emails link to the shared client dashboard.
- Confirmation email includes the snapshotted package amount, $20 deposit, calculated remaining balance, payment steps, and payment options from Admin > Settings (or the FAQ fallback).
- Use Resend idempotency keys (`booking-received-{id}`, `booking-confirmed-{id}`) so retries do not double-send.
- Send from the server after the DB write. If sending fails, the booking still succeeds; log the error and expose a "resend link" option (see 3.4).

### 3.3 Pages

| Route | Type | Purpose |
| --- | --- | --- |
| `/book` | Server page + client form | Full-page booking form (reuse the fields/validation of `booking-form.tsx`, refactored into a shared `BookingFormFields`). Accepts `?package=` to preselect. On success shows the "check your email" message. |
| `/dashboard/access/[token]` | Route handler | Validates a 24-hour encrypted email sign-in link and sets an HttpOnly client dashboard cookie. |
| `/dashboard` | Server page | Shows all bookings for the authenticated email, supports eligible cancellations, payment information for confirmed sessions, and a Google review link. `noindex`. |
| `/booking/[token]` | Server component | Legacy per-booking manage page for previously issued links. |

Changes to existing UI:
- `services-section.tsx` and the hero/nav CTA: relabel to "Book a Session" and link to `/book` (with `?package=`) instead of opening the modal or Instagram. Remove the modal usage once `/book` is live.

### 3.4 API (Vercel Functions, Route Handlers)

All as Node runtime route handlers under `app/api`:

- `POST /api/bookings` (existing, modified): validate, snapshot the current package price, insert, and email a client dashboard sign-in link.
- `POST /api/bookings/manage/[token]/cancel`: sets Cancelled + `cancelled_at`; only allowed while Pending/To Confirm/Confirmed and before the session date. Optionally notifies admin by email.
- `POST /api/bookings/resend-link`: takes email, emails one dashboard sign-in link when the address has bookings; constant response and maximum two requests per email per rolling 24 hours.
- `POST /api/client-dashboard/bookings/[id]/cancel`: cancels only a booking owned by the authenticated dashboard email.
- `PATCH /api/bookings` (existing, admin): when status changes to Confirmed, set `confirmed_at`, send "confirmed" email once (guarded by `confirmation_email_sent_at`). Existing admin auth stays as is.

Optional: Vercel Cron to remind clients of upcoming sessions or expire stale pending bookings (not in v1).

### 3.5 Admin changes

- Show whether the confirmation email was sent, with a "Resend confirmation" action.
- Cancelled-by-client bookings show in the existing Cancelled filter with a note.
- (Later) Settings field for payment instructions so the email copy is editable without a deploy.

## 4. Build order

1. Migration + schema update (tokens, timestamps).
2. `lib/email.ts` + templates; test send to your own address.
3. Modify `POST /api/bookings` to create token and send the received email.
4. `/book` page and shared form; relabel CTAs.
5. `/booking/[token]` page + manage GET/cancel endpoints.
6. Hook confirmation email into the admin status change.
7. Resend-link flow.
8. End-to-end test: book -> email -> manage page -> admin confirm -> confirmation email -> cancel.

## 5. Needs from you

- Resend API key (after the domain is verified, see section 7).
- Chosen sending subdomain (suggested: `mail.<yourdomain>`) and sender address.
- Production site URL for links.
- Payment directions copy (bank/mobile money/etc.) for the confirmation email.
- Cancellation rules (any cutoff before the session date? any refund wording?).
- Confirm the status names you want shown to clients.

## 6. Complexity

| Piece | Complexity |
| --- | --- |
| Migration + schema | Low |
| Resend helper + templates | Low |
| `/book` page | Low |
| Manage page + cancel | Medium |
| Confirmation email on admin approve | Low-Medium (idempotency, once-only send) |
| Resend-link flow | Low-Medium (avoid revealing which emails exist) |
| Overall | Medium; roughly 8 to 12 files touched, 1 new dependency |

Risks: emails landing in spam if DNS is not fully verified; existing rows need token backfill; the modal and `/book` form should share code to avoid drift.

## 7. Resend subdomain setup

The domain is created in **Resend**, and the DNS records are added where your **DNS is hosted**.

1. In Resend: **Domains -> Add Domain**. Enter a subdomain such as `mail.yourdomain.com`. Pick the region closest to your clients.
2. Resend shows DNS records (typically an MX and SPF TXT for the `send` subdomain, and a DKIM TXT record such as `resend._domainkey`). Keep this page open.
3. Find where your DNS is managed:
   - If your domain is on Vercel (nameservers `ns1.vercel-dns.com`): Vercel dashboard -> **Domains** -> your domain -> **DNS Records** -> **Add**.
   - Otherwise (GoDaddy, Namecheap, Cloudflare, etc.): add them at that provider's DNS page.
4. Add each record exactly as Resend lists them (type, name/host, value, priority for MX). On Vercel, enter only the host part (for example `send.mail` rather than the full domain) and do not add trailing dots. If using Cloudflare, set records to **DNS only** (grey cloud).
5. Back in Resend, click **Verify DNS Records**. This can take a few minutes up to a few hours.
6. Once status shows **Verified**, go to **API Keys -> Create API Key** (permission: Sending access, domain: your new domain).
7. Share the key and the sender address you want (for example `bookings@mail.yourdomain.com`).
