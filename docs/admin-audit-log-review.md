# Admin Audit Log Review

**Reviewed revision:** `origin/main` at `4859f66760767c4f283dd70aaa44a26088d911d6`  
**Review date:** 2026-10-04

## Finding 1: predictable temporary admin password

**Severity:** High  
**Status:** Intentionally retained at the user's direction.

New admin accounts initially use their username as the password. Because the
account can sign in before completing the required password change, someone
who knows or guesses the username could take control of the account first.
This behavior was explicitly requested and has not been changed.

## Finding 2: incomplete and forgeable audit trail

**Severity:** Medium  
**Status:** Fixed in the current local worktree.

Previously, mutations could be called without the dashboard's separate
client-submitted audit request. The audit API also accepted arbitrary event
details from an authenticated client.

The current implementation records successful protected mutations in their
server-side handlers using the authenticated admin username. This covers
booking, package, portfolio, testimonial, settings, and media operations.
Admin account creation and reset-link generation already record their events
server-side. The dashboard refreshes the server-generated trail after an
operation instead of submitting event descriptions. `POST /api/audit` now
returns `405`.

No database migration is required for this fix. The audit triggers from the
prior local implementation were removed from the configured database before
these changes were made.

### Verification and limitation

The dashboard can no longer suppress a successful operation's audit event
by omitting a separate request, and it cannot forge event descriptions via
the audit API. The mutation and audit insert are sequential rather than one
database transaction, so an audit-table/database failure after a successful
mutation can still leave an event missing; the API reports a failure and
server-side logging records the error. Fully atomic auditing would require
wrapping each mutation and its audit insert in the same database transaction.
