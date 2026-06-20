import { applyArcadeCoinMove } from "../arcade/server/arcade-coins.js";
import { writeAdminAuditRow } from "./admin-audit.server.js";

export const ADMIN_MANUAL_COIN_REASON = "admin_manual_credit";
export const ADMIN_MANUAL_COIN_SOURCE_TYPE = "admin_manual_credit";

/** @type {readonly string[]} */
export const ADMIN_MANUAL_COIN_CATEGORIES = Object.freeze([
  "compensation",
  "bonus",
  "bugfix",
  "other",
]);

const NOTE_MAX_LEN = 500;
const CLIENT_REQUEST_ID_MAX_LEN = 128;
const PARENT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {unknown} raw
 */
export function parseParentLookupEmail(raw) {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email || !PARENT_EMAIL_RE.test(email)) {
    return { ok: false, code: "invalid_email" };
  }
  return { ok: true, email };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} email
 */
export async function lookupAdminParentStudentsByEmail(supabase, email) {
  const { findAuthUserByEmail } = await import("../auth/auth-registration-request.server.js");
  const { formatGradeLevelHe } = await import("../learning-student-defaults.js");

  let authUser;
  try {
    authUser = await findAuthUserByEmail(supabase, email);
  } catch {
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!authUser?.id) {
    return { ok: false, status: 404, code: "parent_not_found" };
  }

  const { data: students, error } = await supabase
    .from("students")
    .select("id,full_name,grade_level,is_active,student_coin_balances(balance)")
    .eq("parent_id", authUser.id)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const normalizedEmail = String(authUser.email || email).trim().toLowerCase();

  const mapped = (students || []).map((row) => {
    const rel = row.student_coin_balances;
    const balanceRaw = Array.isArray(rel) ? rel[0]?.balance : rel?.balance;
    const gradeLevel = row.grade_level || null;
    return {
      studentId: row.id,
      fullName: row.full_name || "",
      gradeLevel,
      gradeLabelHe: gradeLevel ? formatGradeLevelHe(gradeLevel) : null,
      balance: Math.floor(Number(balanceRaw ?? 0)),
      isActive: row.is_active === true,
    };
  });

  const { getStudentsLastActivitySummaries } = await import(
    "./admin-student-support-activity.server.js"
  );
  const activityById = await getStudentsLastActivitySummaries(
    supabase,
    mapped.map((s) => s.studentId)
  );

  return {
    ok: true,
    parent: {
      email: normalizedEmail,
    },
    students: mapped.map((s) => {
      const lastActivity = activityById[s.studentId] || {
        hasActivity: false,
        atLabelHe: null,
        shortLineHe: "אין פעילות",
        detailLineHe: null,
      };
      return {
        ...s,
        lastActivity: {
          hasActivity: lastActivity.hasActivity === true,
          atLabelHe: lastActivity.atLabelHe,
          shortLineHe: lastActivity.shortLineHe,
          detailLineHe: lastActivity.detailLineHe,
        },
      };
    }),
  };
}

/**
 * @param {unknown} raw
 */
export function parseManualCoinCreditAmount(raw) {
  if (raw === null || raw === undefined) {
    return { ok: false, code: "invalid_amount" };
  }
  if (typeof raw === "string" && raw.trim() === "") {
    return { ok: false, code: "invalid_amount" };
  }
  if (typeof raw === "boolean") {
    return { ok: false, code: "invalid_amount" };
  }

  const num = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(num)) {
    return { ok: false, code: "invalid_amount" };
  }
  if (!Number.isInteger(num)) {
    return { ok: false, code: "invalid_amount" };
  }
  if (num <= 0) {
    return { ok: false, code: "invalid_amount" };
  }

  return { ok: true, amount: num };
}

/**
 * @param {unknown} raw
 */
export function parseManualCoinCreditCategory(raw) {
  const category = typeof raw === "string" ? raw.trim() : "";
  if (!category || !ADMIN_MANUAL_COIN_CATEGORIES.includes(category)) {
    return { ok: false, code: "invalid_category" };
  }
  return { ok: true, category };
}

/**
 * @param {unknown} raw
 */
export function parseManualCoinCreditNote(raw) {
  if (raw === null || raw === undefined) {
    return { ok: true, note: "" };
  }
  if (typeof raw !== "string") {
    return { ok: false, code: "invalid_note" };
  }
  const note = raw.trim();
  if (note.length > NOTE_MAX_LEN) {
    return { ok: false, code: "invalid_note" };
  }
  return { ok: true, note };
}

/**
 * @param {unknown} raw
 */
export function parseManualCoinClientRequestId(raw) {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id) {
    return { ok: false, code: "invalid_client_request_id" };
  }
  if (id.length > CLIENT_REQUEST_ID_MAX_LEN) {
    return { ok: false, code: "invalid_client_request_id" };
  }
  return { ok: true, clientRequestId: id };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getAdminStudentCoinInfo(supabase, studentId) {
  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select("id,full_name,grade_level,is_active")
    .eq("id", studentId)
    .maybeSingle();

  if (studentErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!student?.id) {
    return { ok: false, status: 404, code: "student_not_found" };
  }

  const { data: balanceRow } = await supabase
    .from("student_coin_balances")
    .select("balance,lifetime_earned,lifetime_spent")
    .eq("student_id", studentId)
    .maybeSingle();

  return {
    ok: true,
    student: {
      id: student.id,
      fullName: student.full_name || "",
      gradeLevel: student.grade_level || null,
      isActive: student.is_active === true,
    },
    balance: Math.floor(Number(balanceRow?.balance ?? 0)),
    lifetimeEarned: Math.floor(Number(balanceRow?.lifetime_earned ?? 0)),
    lifetimeSpent: Math.floor(Number(balanceRow?.lifetime_spent ?? 0)),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   adminUserId: string,
 *   studentId: string,
 *   amount: number,
 *   category: string,
 *   note: string,
 *   clientRequestId: string,
 * }} params
 */
export async function creditAdminManualCoins(supabase, params) {
  const { adminUserId, studentId, amount, category, note, clientRequestId } = params;

  const info = await getAdminStudentCoinInfo(supabase, studentId);
  if (!info.ok) {
    return info;
  }

  const balanceBefore = info.balance;
  const idempotencyKey = `admin_manual:${adminUserId}:${clientRequestId}`;

  const result = await applyArcadeCoinMove(supabase, {
    studentId,
    direction: "earn",
    amount,
    idempotencyKey,
    sourceType: ADMIN_MANUAL_COIN_SOURCE_TYPE,
    sourceId: clientRequestId,
    metadata: {
      admin_user_id: adminUserId,
      category,
      note: note || null,
      manual_admin_action: true,
    },
    reason: ADMIN_MANUAL_COIN_REASON,
  });

  if (!result.ok) {
    return {
      ok: false,
      status: 500,
      code: result.code || "coin_failed",
      message: result.message || "coin_failed",
    };
  }

  const balanceAfter = Math.floor(Number(result.balanceAfter ?? balanceBefore + amount));

  const audit = await writeAdminAuditRow(supabase, {
    adminUserId,
    targetType: "student",
    targetId: studentId,
    action: "admin_manual_coin_credit",
    beforeState: {
      balance: balanceBefore,
      studentId,
      studentName: info.student.fullName,
    },
    afterState: {
      balance: balanceAfter,
      amountCredited: amount,
      category,
      note: note || null,
      duplicate: result.duplicate === true,
      transactionId: result.transactionId || null,
    },
    notes: note || null,
  });

  return {
    ok: true,
    duplicate: result.duplicate === true,
    studentId,
    studentName: info.student.fullName,
    amountCredited: result.duplicate === true ? 0 : amount,
    balanceBefore,
    balanceAfter,
    transactionId: result.transactionId || null,
    category,
    auditOk: audit.ok === true,
    auditCode: audit.ok ? null : audit.code || "audit_failed",
  };
}
