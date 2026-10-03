import { createHmac } from "crypto";
import { pool } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { bookingDashboardEmail, clientDashboardUrl, getSiteUrl, sendEmail } from "@/lib/email";
import { isRecord, isValidEmail, readJsonBody, sanitizeText } from "@/lib/input-validation";

export const runtime = "nodejs";

const GENERIC_RESPONSE = {
  ok: true,
  message: "If bookings match, a dashboard link will be emailed when you are within the request limit. You may request a link twice within 24 hours.",
};

async function consumeEmailRequest(email: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required to rate-limit dashboard link requests");

  const emailHash = createHmac("sha256", secret).update(email).digest("hex");
  await pool.query(
    "DELETE FROM booking_link_rate_limits WHERE window_started_at <= now() - interval '24 hours'",
  );
  const result = await pool.query(
    `INSERT INTO booking_link_rate_limits (email_hash, request_count, window_started_at)
     VALUES ($1, 1, now())
     ON CONFLICT (email_hash) DO UPDATE SET
       request_count = CASE
         WHEN booking_link_rate_limits.window_started_at <= now() - interval '24 hours' THEN 1
         WHEN booking_link_rate_limits.request_count < 3 THEN booking_link_rate_limits.request_count + 1
         ELSE 3
       END,
       window_started_at = CASE
         WHEN booking_link_rate_limits.window_started_at <= now() - interval '24 hours' THEN now()
         ELSE booking_link_rate_limits.window_started_at
       END
     RETURNING request_count`,
    [emailHash],
  );
  return Number(result.rows[0]?.request_count) <= 2;
}

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
    const body = await readJsonBody(request);
    if (!isRecord(body) || typeof body.email !== "string")
      return json({ error: "Enter a valid email address" }, 400);
    const email = sanitizeText(body.email).toLowerCase();
    if (!isValidEmail(email))
      return json({ error: "Enter a valid email address" }, 400);

    if (!(await consumeEmailRequest(email))) return json(GENERIC_RESPONSE);

    const result = await pool.query(
      `SELECT id FROM bookings WHERE lower(email) = $1 LIMIT 1`,
      [email],
    );
    if (result.rows.length === 0) return json(GENERIC_RESPONSE);

    const siteUrl = getSiteUrl(request);
    const message = bookingDashboardEmail(clientDashboardUrl(siteUrl, email));
    await sendEmail({ to: email, ...message });
    return json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[bookings][resend-link] error", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
