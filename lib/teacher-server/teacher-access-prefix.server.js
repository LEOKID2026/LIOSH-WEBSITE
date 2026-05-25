import crypto from "node:crypto";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import {
  hashStudentSecret,
  normalizeStudentUsername,
} from "../guardian-server/guardian-crypto.server.js";

const PREFIX_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const SIMULATION_TEACHER_PREFIX = "leo";
const SIMULATION_TEACHER_EMAIL = "teacher@leo.com";
export const TEACHER_ACCESS_KIND_PARENT = "p";
export const TEACHER_ACCESS_KIND_STUDENT = "s";

/**
 * @param {number} sequence
 */
export function formatAccessSequence(sequence) {
  const n = Math.max(1, Math.floor(Number(sequence) || 1));
  if (n < 100) return String(n).padStart(2, "0");
  return String(n);
}

/**
 * @param {string} prefix
 * @param {"p"|"s"} kind
 * @param {number} sequence
 */
export function formatTeacherAccessUsername(prefix, kind, sequence) {
  const p = String(prefix || "").trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(p)) {
    throw new Error("invalid_access_prefix");
  }
  if (kind !== TEACHER_ACCESS_KIND_PARENT && kind !== TEACHER_ACCESS_KIND_STUDENT) {
    throw new Error("invalid_access_kind");
  }
  return `${p}-${kind}${formatAccessSequence(sequence)}`;
}

/** @deprecated use formatTeacherAccessUsername(prefix, "p", sequence) */
export function formatPrefixedParentAccessUsername(prefix, sequence) {
  return formatTeacherAccessUsername(prefix, TEACHER_ACCESS_KIND_PARENT, sequence);
}

/** @deprecated use formatTeacherAccessUsername(prefix, "p", sequence) */
export function formatParentAccessSequence(sequence) {
  return formatAccessSequence(sequence);
}

/**
 * @param {string} username
 * @returns {{ prefix: string, kind: "p"|"s", sequence: number }|null}
 */
export function parseTeacherAccessUsername(username) {
  const normalized = normalizeStudentUsername(username);
  const modern = /^([a-z]{3})-([ps])(\d+)$/.exec(normalized);
  if (modern) {
    return {
      prefix: modern[1],
      kind: modern[2],
      sequence: Number(modern[3]) || 0,
    };
  }
  const legacy = /^([a-z]{3})-(\d+)$/.exec(normalized);
  if (legacy) {
    return {
      prefix: legacy[1],
      kind: TEACHER_ACCESS_KIND_PARENT,
      sequence: Number(legacy[2]) || 0,
    };
  }
  return null;
}

/** @deprecated use parseTeacherAccessUsername */
export function parsePrefixedParentAccessUsername(username) {
  return parseTeacherAccessUsername(username);
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
 * @param {string} usernameNormalized
 * @param {string|null} exceptStudentId
 */
async function isStudentLoginUsernameAvailable(serviceRole, usernameNormalized, exceptStudentId = null) {
  const codeHash = hashStudentSecret(usernameNormalized);
  const { data, error } = await serviceRole
    .from("student_access_codes")
    .select("id, student_id")
    .eq("code_hash", codeHash)
    .eq("is_active", true)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (error && !isDbSchemaNotReadyError(error)) {
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!data?.id) return { ok: true, available: true };
  if (exceptStudentId && data.student_id === exceptStudentId) {
    return { ok: true, available: true };
  }
  return { ok: true, available: false };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} prefix
 * @param {"p"|"s"} kind
 */
async function maxSequenceForTeacherKind(serviceRole, teacherId, prefix, kind) {
  let maxSeq = 0;

  if (kind === TEACHER_ACCESS_KIND_PARENT) {
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

    for (const row of data || []) {
      const parsed = parseTeacherAccessUsername(String(row.login_username_normalized || ""));
      if (parsed?.prefix === prefix && parsed.kind === TEACHER_ACCESS_KIND_PARENT) {
        maxSeq = Math.max(maxSeq, parsed.sequence);
      }
    }
    return { ok: true, maxSeq };
  }

  const { data: links, error: linkErr } = await serviceRole
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId)
    .is("archived_at", null);

  if (linkErr) {
    if (isDbSchemaNotReadyError(linkErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const studentIds = (links || []).map((r) => r.student_id).filter(Boolean);
  if (!studentIds.length) return { ok: true, maxSeq: 0 };

  const { data: codes, error: codeErr } = await serviceRole
    .from("student_access_codes")
    .select("login_username, student_id")
    .in("student_id", studentIds);

  if (codeErr) {
    if (isDbSchemaNotReadyError(codeErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  for (const row of codes || []) {
    const parsed = parseTeacherAccessUsername(String(row.login_username || ""));
    if (parsed?.prefix === prefix && parsed.kind === TEACHER_ACCESS_KIND_STUDENT) {
      maxSeq = Math.max(maxSeq, parsed.sequence);
    }
  }

  return { ok: true, maxSeq };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 * @param {string} prefix
 */
async function resolveMatchedSequenceForStudent(serviceRole, teacherId, studentId, prefix) {
  const { data: codeRow } = await serviceRole
    .from("student_access_codes")
    .select("login_username")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeRow?.login_username) {
    const parsed = parseTeacherAccessUsername(codeRow.login_username);
    if (parsed?.prefix === prefix && parsed.sequence > 0) {
      return parsed.sequence;
    }
  }

  const { data: parentRow } = await serviceRole
    .from("student_guardian_access")
    .select("login_username_normalized")
    .eq("created_by_teacher_id", teacherId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (parentRow?.login_username_normalized) {
    const parsed = parseTeacherAccessUsername(parentRow.login_username_normalized);
    if (parsed?.prefix === prefix && parsed.sequence > 0) {
      return parsed.sequence;
    }
  }

  return null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {"p"|"s"} kind
 * @param {{ studentId?: string|null, preferredSequence?: number|null }} opts
 */
export async function allocateTeacherAccessUsername(serviceRole, teacherId, kind, opts = {}) {
  const prefixResult = await ensureTeacherAccessPrefix(serviceRole, teacherId);
  if (!prefixResult.ok) return prefixResult;

  const prefix = prefixResult.prefix;
  const maxResult = await maxSequenceForTeacherKind(serviceRole, teacherId, prefix, kind);
  if (!maxResult.ok) return maxResult;

  let startSeq = maxResult.maxSeq + 1;
  if (opts.preferredSequence && Number(opts.preferredSequence) > 0) {
    startSeq = Number(opts.preferredSequence);
  } else if (opts.studentId) {
    const matched = await resolveMatchedSequenceForStudent(
      serviceRole,
      teacherId,
      opts.studentId,
      prefix
    );
    if (matched && matched > 0) startSeq = matched;
  }

  for (let seq = startSeq; seq <= startSeq + 500; seq += 1) {
    const username = formatTeacherAccessUsername(prefix, kind, seq);
    const normalized = normalizeStudentUsername(username);

    if (kind === TEACHER_ACCESS_KIND_PARENT) {
      const check = await isGuardianUsernameAvailable(serviceRole, normalized);
      if (!check.ok) return check;
      if (!check.available) continue;
      return { ok: true, loginUsername: username, loginUsernameNormalized: normalized, sequence: seq };
    }

    const check = await isStudentLoginUsernameAvailable(
      serviceRole,
      normalized,
      opts.studentId || null
    );
    if (!check.ok) return check;
    if (!check.available) continue;
    return { ok: true, loginUsername: username, loginUsernameNormalized: normalized, sequence: seq };
  }

  return { ok: false, status: 500, code: "internal_error" };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string|null} studentId
 */
export async function generateTeacherPrefixedGuardianUsername(serviceRole, teacherId, studentId = null) {
  return allocateTeacherAccessUsername(serviceRole, teacherId, TEACHER_ACCESS_KIND_PARENT, {
    studentId,
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ studentId?: string|null, preferredSequence?: number|null }} opts
 */
export async function generateTeacherPrefixedStudentUsername(serviceRole, teacherId, opts = {}) {
  return allocateTeacherAccessUsername(serviceRole, teacherId, TEACHER_ACCESS_KIND_STUDENT, opts);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
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
