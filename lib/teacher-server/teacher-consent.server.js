import crypto from "node:crypto";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";

export const TEACHER_CONSENT_PURPOSE = "teacher_student_link";
export const TEACHER_CONSENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_PREFIX = "tsc_";

function requireLearningAccessSecret() {
  const secret = process.env.LEARNING_STUDENT_ACCESS_SECRET;
  if (!secret || !String(secret).trim()) {
    throw new Error("Missing LEARNING_STUDENT_ACCESS_SECRET");
  }
  return String(secret).trim();
}

export function hashTeacherConsentToken(plaintext) {
  const secret = requireLearningAccessSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`teacher_consent:${plaintext}`)
    .digest("hex");
}

export function generateTeacherConsentPlaintext() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return `${TOKEN_PREFIX}${raw}`;
}

export function isTeacherConsentPlaintextFormat(token) {
  return typeof token === "string" && token.startsWith(TOKEN_PREFIX) && token.length >= 20;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} tokenHash
 */
export async function loadConsentTokenByHash(serviceRole, tokenHash) {
  const { data, error } = await serviceRole
    .from("teacher_student_consent_tokens")
    .select(
      "id, token_hash, teacher_id, student_id, issued_by_parent_id, purpose, issued_at, expires_at, consumed_at"
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, row: data || null };
}

/**
 * Validates token row against caller teacher and request student. Does not consume.
 */
export function validateConsentTokenRow(row, teacherId, studentId) {
  if (!row) return { valid: false, reason: "not_found" };
  if (row.consumed_at != null) return { valid: false, reason: "consumed" };
  if (row.purpose !== TEACHER_CONSENT_PURPOSE) return { valid: false, reason: "purpose" };
  if (row.teacher_id !== teacherId) return { valid: false, reason: "teacher" };
  if (row.student_id !== studentId) return { valid: false, reason: "student" };
  if (new Date(row.expires_at).getTime() <= Date.now()) return { valid: false, reason: "expired" };
  return { valid: true, row };
}

/**
 * Atomically consume token (single-use). Returns null if already consumed or missing.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} tokenId
 */
export async function consumeConsentTokenRow(serviceRole, tokenId) {
  const now = new Date().toISOString();
  const { data, error } = await serviceRole
    .from("teacher_student_consent_tokens")
    .update({ consumed_at: now })
    .eq("id", tokenId)
    .is("consumed_at", null)
    .select("id, teacher_id, student_id, issued_by_parent_id")
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: false, status: 403, code: "consent_invalid" };
  }

  return { ok: true, row: data };
}
