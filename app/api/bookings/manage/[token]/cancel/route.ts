import { pool } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { canClientCancel } from "@/lib/booking-status";
import { adminNotificationEmail, bookingCancelledEmail, clientDashboardUrl, getSiteUrl, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length > 100) return json({ error: "Booking not found" }, 404);

  const rate = checkRateLimit(`booking-cancel:${getClientIp(request)}`, 10, 10 * 60 * 1000);
  if (!rate.allowed) return json({ error: "Too many attempts. Please try again later." }, 429);

  try {
    const existing = await pool.query(
      "SELECT * FROM bookings WHERE manage_token = $1 LIMIT 1",
      [token],
    );
    const booking = existing.rows[0];
    if (!booking) return json({ error: "Booking not found" }, 404);

    const check = canClientCancel(booking.status, booking.preferred_date);
    if (!check.allowed) return json({ error: check.reason }, 409);

    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client', updated_at = now()
       WHERE id = $1 AND status <> 'cancelled' RETURNING *`,
      [booking.id],
    );
    const row = result.rows[0];
    if (!row) return json({ ok: true });

    const settings = await pool
      .query("SELECT booking_email FROM site_settings LIMIT 1")
      .then((r) => r.rows[0] ?? {})
      .catch(() => ({}));
    if (row.email && row.manage_token) {
      const clientMessage = bookingCancelledEmail({
        clientName: row.client_name,
        packageName: row.package_name ?? "",
        preferredDate: row.preferred_date,
        link: clientDashboardUrl(getSiteUrl(request), row.email),
        cancelledBy: "client",
      });
      const delivery = await sendEmail({
        to: row.email,
        ...clientMessage,
        idempotencyKey: `booking-cancelled-${row.id}`,
      });
      if (delivery.ok) {
        await pool.query(
          'UPDATE bookings SET cancellation_email_sent_at = COALESCE(cancellation_email_sent_at, now()) WHERE id = $1',
          [row.id],
        );
      }
    }
    if (settings.booking_email) {
      const message = adminNotificationEmail("cancelled", {
        clientName: row.client_name,
        email: row.email ?? "",
        phone: row.phone ?? "",
        packageName: row.package_name ?? "",
        preferredDate: row.preferred_date,
        adminUrl: `${getSiteUrl(request)}/admin`,
      });
      await sendEmail({
        to: settings.booking_email,
        ...message,
        idempotencyKey: `booking-admin-cancel-${row.id}`,
      });
    }
    return json({ ok: true });
  } catch (error) {
    console.error("[bookings][cancel] error", error);
    return json({ error: "Failed to cancel booking" }, 500);
  }
}
