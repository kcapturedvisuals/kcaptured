import { pool } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { bookingLinksEmail, getSiteUrl, manageUrl, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const GENERIC_RESPONSE = {
  ok: true,
  message: "If we have bookings for that email, we just sent you the links.",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`booking-lookup:${getClientIp(request)}`, 3, 15 * 60 * 1000);
  if (!rate.allowed) return json({ error: "Too many attempts. Please try again later." }, 429);

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))
      return json({ error: "Enter a valid email address" }, 400);

    const result = await pool.query(
      `SELECT package_name, preferred_date, manage_token FROM bookings
       WHERE lower(email) = $1 AND manage_token IS NOT NULL AND status <> 'cancelled'
       ORDER BY request_date DESC LIMIT 10`,
      [email],
    );
    if (result.rows.length === 0) return json(GENERIC_RESPONSE);

    const siteUrl = getSiteUrl(request);
    const message = bookingLinksEmail(
      result.rows.map((row) => ({
        packageName: row.package_name ?? "",
        preferredDate: row.preferred_date,
        link: manageUrl(siteUrl, row.manage_token),
      })),
    );
    await sendEmail({ to: email, ...message });
    return json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[bookings][resend-link] error", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
