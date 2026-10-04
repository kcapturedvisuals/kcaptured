import { randomBytes, randomUUID } from "crypto";
import { pool } from "@/lib/db";
import { verifyUploadRequest } from "@/lib/auth-utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { DEFAULT_PAYMENT_INSTRUCTIONS, isBookingStatus } from "@/lib/booking-status";
import { isRecord, isValidEmail, isValidIsoDate, readJsonBody, sanitizePhone, sanitizeText } from "@/lib/input-validation";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  bookingReceivedEmail,
  clientDashboardUrl,
  getSiteUrl,
  sendEmail,
} from "@/lib/email";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function isAdmin(request: Request) {
  return verifyUploadRequest(request);
}

function mapRow(row: any) {
  return {
    id: row?.id == null ? "" : String(row.id),
    client: row?.client_name == null ? "" : String(row.client_name),
    email: row?.email == null ? "" : String(row.email),
    phone: row?.phone == null ? "" : String(row.phone),
    package: row?.package_name == null ? "" : String(row.package_name),
    preferredDate:
      row?.preferred_date == null
        ? null
        : new Date(row.preferred_date).toISOString(),
    requestDate:
      row?.request_date == null
        ? null
        : new Date(row.request_date).toISOString(),
    status: row?.status == null ? "pending" : String(row.status),
    notes: row?.notes == null ? null : String(row.notes),
  };
}

async function getStudioSettings() {
  try {
    const result = await pool.query(
      "SELECT booking_email, email, payment_instructions FROM site_settings LIMIT 1",
    );
    return result.rows[0] ?? {};
  } catch (error) {
    console.error("[bookings] failed to load settings", error);
    return {};
  }
}

async function sendReceivedEmails(row: any, siteUrl: string) {
  const settings = await getStudioSettings();
  const replyTo = settings.booking_email || settings.email || null;
  if (row.email) {
    const message = bookingReceivedEmail({
      clientName: row.client_name,
      packageName: row.package_name ?? "",
      preferredDate: row.preferred_date,
      link: clientDashboardUrl(siteUrl, row.email),
    });
    await sendEmail({ to: row.email, ...message, replyTo, idempotencyKey: `booking-received-${row.id}` });
  }
}

async function sendCancellationOnce(row: any, siteUrl: string, cancelledBy: 'admin' | 'client') {
  if (!row.email) return
  const claim = await pool.query(
    "UPDATE bookings SET cancellation_email_sent_at = now() WHERE id = $1 AND cancellation_email_sent_at IS NULL RETURNING id",
    [row.id],
  )
  if (!claim.rows[0]) return
  const settings = await getStudioSettings()
  const message = bookingCancelledEmail({
    clientName: row.client_name,
    packageName: row.package_name ?? '',
    preferredDate: row.preferred_date,
    link: clientDashboardUrl(siteUrl, row.email),
    cancelledBy,
  })
  const result = await sendEmail({
    to: row.email,
    ...message,
    replyTo: settings.booking_email || settings.email || null,
    idempotencyKey: `booking-cancelled-${row.id}`,
  })
  if (!result.ok) await pool.query("UPDATE bookings SET cancellation_email_sent_at = NULL WHERE id = $1", [row.id])
}

async function sendConfirmationOnce(row: any, siteUrl: string) {
  if (!row.email) return;
  const claim = await pool.query(
    "UPDATE bookings SET confirmation_email_sent_at = now() WHERE id = $1 AND confirmation_email_sent_at IS NULL RETURNING id",
    [row.id],
  );
  if (!claim.rows[0]) return;
  const settings = await getStudioSettings();
  const message = bookingConfirmedEmail({
    clientName: row.client_name,
    packageName: row.package_name ?? "",
    preferredDate: row.preferred_date,
    link: clientDashboardUrl(siteUrl, row.email),
    paymentInstructions: settings.payment_instructions || DEFAULT_PAYMENT_INSTRUCTIONS,
    packagePrice: row.package_price == null ? null : Number(row.package_price),
  });
  const result = await sendEmail({
    to: row.email,
    ...message,
    replyTo: settings.booking_email || settings.email || null,
    idempotencyKey: `booking-confirmed-${row.id}`,
  });
  if (!result.ok)
    await pool.query(
      "UPDATE bookings SET confirmation_email_sent_at = NULL WHERE id = $1",
      [row.id],
    );
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return json({ error: "Unauthorized" }, 401);
  try {
    const result = await pool.query(
      "SELECT * FROM bookings ORDER BY request_date DESC",
    );
    return json(result.rows.map(mapRow));
  } catch (error) {
    console.error("[bookings][GET] error", error);
    return json({ error: "Failed to load bookings" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await isAdmin(request);
    if (!admin) {
      const rate = checkRateLimit(
        `booking:${getClientIp(request)}`,
        5,
        10 * 60 * 1000,
      );
      if (!rate.allowed)
        return new Response(
          JSON.stringify({
            error: "Too many booking attempts. Please try again later.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil(rate.retryAfter / 1000)),
            },
          },
        );
    }
    const body = await readJsonBody(request);
    if (!isRecord(body)) return json({ error: "Invalid booking details" }, 400);
    if (
      (body.clientName != null && typeof body.clientName !== "string") ||
      (body.email != null && typeof body.email !== "string") ||
      (body.phone != null && typeof body.phone !== "string") ||
      (body.packageName != null && typeof body.packageName !== "string") ||
      (body.notes != null && typeof body.notes !== "string") ||
      (body.idempotencyKey != null && typeof body.idempotencyKey !== "string")
    ) {
      return json({ error: "Booking fields must be text" }, 400);
    }
    const clientName = sanitizeText(body.clientName);
    const email = sanitizeText(body.email).toLowerCase();
    const phone = sanitizePhone(body.phone);
    const packageName = sanitizeText(body.packageName);
    const notes = sanitizeText(body.notes);
    if (!clientName) return json({ error: "Name is required" }, 400);
    if (!admin && !email)
      return json({ error: "Email is required so we can send your dashboard link" }, 400);
    if (admin && !email && !phone)
      return json({ error: "Name and at least one contact method are required" }, 400);
    if (
      clientName.length > 120 ||
      email.length > 254 ||
      packageName.length > 120 ||
      notes.length > 2000
    )
      return json({ error: "Booking details are too long" }, 400);
    if (phone === null || phone.length > 40)
      return json({ error: "Enter a valid phone number" }, 400);
    if (email && !isValidEmail(email))
      return json({ error: "Enter a valid email address" }, 400);

    let preferredDate: Date | null = null;
    if (body.preferredDate) {
      if (typeof body.preferredDate !== "string" || !isValidIsoDate(body.preferredDate))
        return json({ error: "Enter a valid preferred date" }, 400);
      preferredDate = new Date(`${body.preferredDate}T00:00:00.000Z`);
      if (!admin) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        if (preferredDate < today)
          return json({ error: "Preferred date cannot be in the past" }, 400);
      }
    }

    const idempotencyKey = sanitizeText(body.idempotencyKey);
    if (!idempotencyKey || idempotencyKey.length > 100)
      return json(
        { error: "Invalid booking request. Please refresh and try again." },
        400,
      );

    const publicResponse = (row: any, status: number, alreadyCreated = false) =>
      admin
        ? json({ booking: mapRow(row), alreadyCreated }, status)
        : json({ ok: true, alreadyCreated }, status);

    const existing = await pool.query(
      "SELECT * FROM bookings WHERE idempotency_key = $1 LIMIT 1",
      [idempotencyKey],
    );
    if (existing.rows[0]) return publicResponse(existing.rows[0], 200, true);

    const packageResult = packageName
      ? await pool.query("SELECT price FROM packages WHERE name = $1 ORDER BY updated_at DESC LIMIT 1", [packageName])
      : { rows: [] };
    const packagePrice = packageResult.rows[0]?.price == null ? null : Number(packageResult.rows[0].price);
    if (admin && body.status !== undefined && !isBookingStatus(body.status))
      return json({ error: "Enter a valid booking status" }, 400);
    const status = admin && isBookingStatus(body.status) ? body.status : "pending";
    try {
      const result = await pool.query(
        `INSERT INTO bookings (id, client_name, email, phone, package_name, package_price, preferred_date, request_date, status, notes, idempotency_key, manage_token, confirmed_at, cancelled_at, cancelled_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,now(),$8,$9,$10,$11,$12,$13,$14,now(),now()) RETURNING *`,
        [
          randomUUID(),
          clientName,
          email,
          phone,
          packageName,
          packagePrice,
          preferredDate,
          status,
          notes || null,
          idempotencyKey,
          randomBytes(32).toString("base64url"),
          status === "confirmed" ? new Date() : null,
          status === "cancelled" ? new Date() : null,
          status === "cancelled" ? "admin" : null,
        ],
      );
      const row = result.rows[0];
      const siteUrl = getSiteUrl(request);
      if (status !== "cancelled") await sendReceivedEmails(row, siteUrl);
      if (status === "confirmed") await sendConfirmationOnce(row, siteUrl);
      if (status === "cancelled") await sendCancellationOnce(row, siteUrl, "admin");
      return publicResponse(row, 201);
    } catch (error: any) {
      if (error?.code !== "23505") throw error;
      const duplicate = await pool.query(
        "SELECT * FROM bookings WHERE idempotency_key = $1 LIMIT 1",
        [idempotencyKey],
      );
      if (duplicate.rows[0]) return publicResponse(duplicate.rows[0], 200, true);
      throw error;
    }
  } catch (error) {
    console.error("[bookings][POST] error", error);
    return json({ error: "Failed to create booking" }, 500);
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin(request))) return json({ error: "Unauthorized" }, 401);
  try {
    const body = await readJsonBody(request);
    if (!isRecord(body) || typeof body.id !== "string" || !sanitizeText(body.id) || sanitizeText(body.id).length > 120 || !isBookingStatus(body.status))
      return json({ error: "A valid booking id and status are required" }, 400);
    const result = await pool.query(
      `UPDATE bookings SET
         status = $1,
         confirmed_at = CASE WHEN $1 = 'confirmed' THEN COALESCE(confirmed_at, now()) ELSE confirmed_at END,
         cancelled_at = CASE WHEN $1 = 'cancelled' THEN now() ELSE NULL END,
         cancelled_by = CASE WHEN $1 = 'cancelled' THEN 'admin' ELSE NULL END,
         updated_at = now()
       WHERE id = $2 RETURNING *`,
      [body.status, sanitizeText(body.id)],
    );
    const row = result.rows[0];
    if (!row) return json({ error: "Booking not found" }, 404);
    if (body.status === "confirmed") await sendConfirmationOnce(row, getSiteUrl(request));
    if (body.status === "cancelled") await sendCancellationOnce(row, getSiteUrl(request), "admin");
    return json({ booking: mapRow(row) });
  } catch (error) {
    console.error("[bookings][PATCH] error", error);
    return json({ error: "Failed to update booking" }, 500);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin(request))) return json({ error: "Unauthorized" }, 401);
  try {
    const body = await readJsonBody(request);
    if (!isRecord(body) || typeof body.id !== "string" || !sanitizeText(body.id) || sanitizeText(body.id).length > 120) return json({ error: "Missing booking id" }, 400);
    const result = await pool.query(
      "DELETE FROM bookings WHERE id = $1 RETURNING id",
      [sanitizeText(body.id)],
    );
    if (!result.rows[0]) return json({ error: "Booking not found" }, 404);
    return json({ success: true });
  } catch (error) {
    console.error("[bookings][DELETE] error", error);
    return json({ error: "Failed to delete booking" }, 500);
  }
}
