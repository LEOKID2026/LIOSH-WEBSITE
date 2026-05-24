import crypto from "node:crypto";

function requireAccessSecret() {
  const secret = process.env.LEARNING_STUDENT_ACCESS_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("Missing LEARNING_STUDENT_ACCESS_SECRET");
  }
  return secret.trim();
}

export function hashStudentSecret(value) {
  const secret = requireAccessSecret();
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

export function normalizeStudentUsername(raw) {
  return String(raw || "").toLowerCase().trim();
}

export function normalizeStudentPin(raw) {
  return String(raw || "").replace(/\D/g, "").trim();
}

export function generateStudentPin() {
  let pin = "";
  for (let i = 0; i < 4; i += 1) {
    pin += String(crypto.randomInt(0, 10));
  }
  return pin;
}

export function generateGuardianSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateMagicLinkToken() {
  return crypto.randomBytes(32).toString("base64url");
}

const USERNAME_CHARS = "abcdefghijklmnopqrstuvwxyz234567";

/**
 * Collision-free opaque guardian login username (e.g. g_a3k9m2).
 */
export function generateGuardianLoginUsername() {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += USERNAME_CHARS[crypto.randomInt(0, USERNAME_CHARS.length)];
  }
  return `g_${suffix}`;
}

/**
 * @param {string} ip
 */
export function hashIpForAudit(ip) {
  const raw = String(ip || "").trim();
  if (!raw) return null;
  try {
    return hashStudentSecret(`guardian-ip:${raw}`);
  } catch {
    return null;
  }
}

/**
 * @param {import('http').IncomingMessage} req
 */
export function requestOriginBase(req) {
  const host = String(req.headers?.host || "").trim();
  if (!host) return null;
  const proto =
    host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}
