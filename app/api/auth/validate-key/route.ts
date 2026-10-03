import { appendUploadLog, getClientIp } from "@/lib/logger";
import { generateUploadToken } from "@/lib/auth-utils";
import { pool } from "@/lib/db";
import { randomUUID } from "crypto";
import { isRecord, readJsonBody } from "@/lib/input-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  let body: unknown;
  try {
    body = await readJsonBody(request, 4 * 1024);
  } catch {
    await appendUploadLog({
      type: "key_failed",
      error: "Invalid request body",
      ip,
      userAgent,
    });
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isRecord(body) || typeof body.key !== "string" || body.key.length > 256) {
    await appendUploadLog({
      type: "key_failed",
      error: "Invalid key input",
      ip,
      userAgent,
    });
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const providedKey = body.key;
  const secretKey = process.env.UPLOAD_KEY;

  if (!secretKey) {
    await appendUploadLog({
      type: "key_failed",
      error: "UPLOAD_KEY not configured",
      ip,
      userAgent,
    });
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (providedKey === secretKey) {
    const token = generateUploadToken();
    await pool.query(
      "INSERT INTO audit_logs (id, action, entity_type, description, actor, created_at) VALUES ($1,$2,$3,$4,$5,now())",
      [randomUUID(), "login", "System", "Admin login", "admin"],
    );
    await appendUploadLog({
      type: "key_success",
      ip,
      userAgent,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `admin_session=${token}; Max-Age=1200; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      },
    });
  }

  await appendUploadLog({
    type: "key_failed",
    error: "Invalid upload key",
    ip,
    userAgent,
  });

  return new Response(JSON.stringify({ error: "Invalid key" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
