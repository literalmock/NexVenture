import crypto from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPasswordHash) {
  if (!storedPasswordHash) return false;

  const [salt, storedHash] = storedPasswordHash.split(":");
  if (!salt || !storedHash) return false;

  const hash = crypto.scryptSync(String(password), salt, KEY_LENGTH);
  const stored = Buffer.from(storedHash, "hex");

  return hash.length === stored.length && crypto.timingSafeEqual(hash, stored);
}
