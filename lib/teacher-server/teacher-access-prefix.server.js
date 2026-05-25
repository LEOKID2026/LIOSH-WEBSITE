import crypto from "node:crypto";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import {
  hashStudentSecret,
  normalizeStudentUsername,
} from "../guardian-server/guardian-crypto.server.js";

const PREFIX_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const SIMULATION_TEACHER_PREFIX = "leo";
const SIMULATION_TEACHER_EMAIL = "teacher@leo.com";

/**
 * @param {number} sequence
 */
export function formatParentAccessSequence(sequence) {
  const n = Math.max(1, Math.floor(Number(sequence) || 1));
  if (n < 100) return String(n).padStart(2, "0");
  return String(n);
}

/**
 * @param {string} prefix
 * @param {number} sequence
 */
export function formatPrefixedParentAccessUsername(prefix, sequence) {
  const p = String(prefix || "").trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(p)) {
    throw new Error("invalid_access_prefix");
  }
  return `${p}-${formatParentAccessSequence(sequence)}`;
}

/**
 * @param {string} username
 */
export function parsePrefixedParentAccessUsername(username) {
  const normalized = normalizeStudentUsername(username);
  const m = /^([a-z]{3})-(\d+)$/.exec(normalized);
  if (!m) return null;
  return { prefix: m[1], sequence: Number(m[2]) };
}

function randomAccessPrefix() {
  let out = "";
  for (let i = 0; i < 3; i += 1) {
    out += PREFIX_LETTERS[crypto.randomInt(0, PREFIX_LETTERS.length)];
  }
  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 */
async function isAccessPrefixAvailable(serviceRole, prefix) {
  const { data, error } = await serviceRole
    .from("teacher_profiles")
    .select("id")
    .eq("access_prefix", prefix)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  return { ok: true, available: !data?.id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function loadTeacherAccessPrefix(serviceRole, teacherId) {
  const { data, error } = await serviceRole
    .from("teacher_profiles")
    .select("access_prefix")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const prefix = data?.access_prefix ? String(data.access_prefix).trim().toLowerCase() : null;
  if (prefix && /^[a-z]{3}$/.test(prefix)) {
    return { ok: true, prefix };
  }
  return { ok: true, prefix: null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} email
 */
async function resolveTeacherIdByEmail(serviceRole, email) {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return null;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await serviceRole.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === target);
    if (match?.id) return match.id;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string|null} preferredPrefix
 */
async function assignTeacherAccessPrefix(serviceRole, teacherId, preferredPrefix = null) {
  const candidates = [];
  if (preferredPrefix && /^[a-z]{3}$/.test(preferredPrefix)) {
    candidates.push(preferredPrefix);
  }

  const simTeacherId = await resolveTeacherIdByEmail(serviceRole, SIMULATION_TEACHER_EMAIL);
  if (simTeacherId && simTeacherId === teacherId) {
    if (!candidates.includes(SIMULATION_TEACHER_PREFIX)) {
      candidates.unshift(SIMULATION_TEACHER_PREFIX);
    }
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (candidates.length <= attempt) {
      candidates.push(randomAccessPrefix());
    }
    const prefix = candidates[attempt];
    const avail = await isAccessPrefixAvailable(serviceRole, prefix);
    if (!avail.ok) return avail;
    if (!avail.available) continue;

    const { error: updErr } = await serviceRole
      .from("teacher_profiles")
      .update({ access_prefix: prefix, updated_at: new Date().toISOString() })
      .eq("id", teacherId);

    if (updErr) {
      if (updErr.code === "23505") continue;
      if (isDbSchemaNotReadyError(updErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    return { ok: true, prefix };
  }

  return { ok: false, status: 500, code: "internal_error" };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function ensureTeacherAccessPrefix(serviceRole, teacherId) {
  const loaded = await loadTeacherAccessPrefix(serviceRole, teacherId);
  if (!loaded.ok) return loaded;
  if (loaded.prefix) return { ok: true, prefix: loaded.prefix };
  return assignTeacherAccessPrefix(serviceRole, teacherId);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} usernameNormalized
 */
async function isGuardianUsernameAvailable(serviceRole, usernameNormalized) {
  const { data, error } = await serviceRole
    .from("student_guardian_access")
    .select("id")
    .eq("login_username_normalized", usernameNormalized)
    .eq("is_active", true)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (error && !isDbSchemaNotReadyError(error)) {
    return { ok: false, status: 500, code: "internal_error" };
  }
  return { ok: true, available: !data?.id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} prefix
 */
async function maxSequenceForTeacherPrefix(serviceRole, teacherId, prefix) {
  const { data, error } = await serviceRole
    .from("student_guardian_access")
    .select("login_username_normalized")
    .eq("created_by_teacher_id", teacherId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  let maxSeq = 0;
  const prefixRe = new RegExp(`^${prefix}-(\\d+)$`);
  for (const row of data || []) {
    const normalized = String(row.login_username_normalized || "");
    const m = prefixRe.exec(normalized);
    if (m) {
      maxSeq = Math.max(maxSeq, Number(m[1]) || 0);
    }
  }

  return { ok: true, maxSeq };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function generateTeacherPrefixedGuardianUsername(serviceRole, teacherId) {
  const prefixResult = await ensureTeacherAccessPrefix(serviceRole, teacherId);
  if (!prefixResult.ok) return prefixResult;

  const prefix = prefixResult.prefix;
  const maxResult = await maxSequenceForTeacherPrefix(serviceRole, teacherId, prefix);
  if (!maxResult.ok) return maxResult;

  for (let seq = maxResult.maxSeq + 1; seq <= maxResult.maxSeq + 500; seq += 1) {
    const username = formatPrefixedParentAccessUsername(prefix, seq);
    const normalized = normalizeStudentUsername(username);
    const check = await isGuardianUsernameAvailable(serviceRole, normalized);
    if (!check.ok) return check;
    if (check.available) {
      return { ok: true, loginUsername: username, loginUsernameNormalized: normalized };
    }
  }

  return { ok: false, status: 500, code: "internal_error" };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} accessId
 * @param {string} username
 * @param {string} usernameNormalized
 */
export async function applyGuardianAccessUsername(serviceRole, accessId, username, usernameNormalized) {
  const codeHash = hashStudentSecret(usernameNormalized);
  const { error } = await serviceRole
    .from("student_guardian_access")
    .update({
      login_username: username,
      login_username_normalized: usernameNormalized,
      code_hash: codeHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accessId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  return { ok: true };
}
