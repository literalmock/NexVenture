import crypto from "node:crypto";
import { env } from "../config/env.js";

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export function createAuthToken(userId) {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({
    sub: userId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  });
  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function getUserIdFromToken(token) {
  if (!token) return null;

  const [header, payload, signature] = String(token).split(".");
  if (!header || !payload || !signature) return null;

  const unsignedToken = `${header}.${payload}`;
  if (!safeEqual(signature, sign(unsignedToken))) return null;

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!data.sub || data.exp < Math.floor(Date.now() / 1000)) return null;

  return data.sub;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}
