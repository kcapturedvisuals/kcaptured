import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "20m";

export function generateUploadToken() {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured in environment variables");
  }

  return jwt.sign({ upload: true }, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyUploadToken(token: string) {
  if (!JWT_SECRET) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET as string) as unknown as {
      upload: boolean;
    };
  } catch {
    return null;
  }
}

export function verifyUploadRequest(request: Request) {
  if (request.headers.get("x-upload-source") !== "kc-upload") {
    return false;
  }

  const sessionCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("admin_session="));
  const token = sessionCookie?.slice("admin_session=".length);

  return Boolean(token && verifyUploadToken(token));
}
