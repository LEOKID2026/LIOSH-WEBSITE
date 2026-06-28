import crypto from "node:crypto";
import { getLearningSupabaseServiceRoleClient } from "./server";
import { isSessionCookieSecure } from "../security/session-cookie-secure.js";
import { isStudentSessionAccessCodeBindingValid } from "./student-session-access-code.server.js";
import { isGuestStudent } from "../guest/guest-display.js";

export { isStudentSessionAccessCodeBindingValid } from "./student-session-access-code.server.js";

const COOKIE_NAME = "liosh_student_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function requireAccessSecret() {
  const secret = process.env.LEARNING_STUDENT_ACCESS_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("Missing LEARNING_STUDENT_ACCESS_SECRET");
  }
  return secret.trim();
}

export function normalizeStudentCode(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export function normalizeStudentUsername(raw) {
  return String(raw || "").toLowerCase().trim();
}

export function normalizeStudentPin(raw) {
  return String(raw || "").replace(/\D/g, "").trim();
}

export { validateStudentLoginUsername } from "./student-login-username.server.js";

export function hashStudentSecret(value) {
  const secret = requireAccessSecret();
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

export function generateStudentCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

export function generateStudentPin() {
  let pin = "";
  for (let i = 0; i < 4; i += 1) {
    pin += String(crypto.randomInt(0, 10));
  }
  return pin;
}

export function generateStudentSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function sessionExpiryIsoFromNow(seconds = SESSION_MAX_AGE_SECONDS) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function getStudentSessionCookie(req) {
  return req?.cookies?.[COOKIE_NAME] || "";
}

export function setStudentSessionCookie(res, token) {
  const secure = isSessionCookieSecure();
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export function clearStudentSessionCookie(res) {
  const secure = isSessionCookieSecure();
  const cookie = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
}

function isMissingColumnError(error) {
  const message = String(error?.message || "");
  const details = String(error?.details || "");
  const hint = String(error?.hint || "");
  const full = `${message} ${details} ${hint}`.toLowerCase();
  return full.includes("column") && full.includes("does not exist");
}

function isSessionStillActive(sessionRow, nowMs) {
  if (!sessionRow || typeof sessionRow !== "object") return false;
  if ("revoked_at" in sessionRow && sessionRow.revoked_at) return false;
  if ("ended_at" in sessionRow && sessionRow.ended_at) return false;
  if ("expires_at" in sessionRow && sessionRow.expires_at) {
    const expiresMs = new Date(sessionRow.expires_at).getTime();
    if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) return false;
  }
  return true;
}

async function findSessionByTokenHash(supabase, tokenHash) {
  const selectWithOptionalFields =
    "id,student_id,access_code_id,session_kind,started_at,last_seen_at,created_at,expires_at,revoked_at,ended_at,client_meta";
  const selectMinimalFields = "id,student_id,access_code_id,started_at,last_seen_at,created_at";

  const runQuery = async (selectColumns) => {
    return supabase
      .from("student_sessions")
      .select(selectColumns)
      .eq("session_token_hash", tokenHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  };

  const firstTry = await runQuery(selectWithOptionalFields);
  if (!firstTry.error) return firstTry;
  if (!isMissingColumnError(firstTry.error)) return firstTry;

  const secondTry = await runQuery(selectMinimalFields);
  if (secondTry.error) return secondTry;
  return secondTry;
}

export async function getAuthenticatedStudentSession(req) {
  const token = getStudentSessionCookie(req);
  if (!token) return null;

  const supabase = getLearningSupabaseServiceRoleClient();
  const nowMs = Date.now();
  const tokenHash = hashStudentSecret(token);

  const { data: sessionRow, error: sessionError } = await findSessionByTokenHash(supabase, tokenHash);
  if (sessionError || !sessionRow?.id) return null;
  if (!isSessionStillActive(sessionRow, nowMs)) return null;

  const sessionKind = sessionRow.session_kind || "registered";
  const isGuestSession = sessionKind === "guest";

  if (!isGuestSession) {
    if (!sessionRow.access_code_id) {
      return null;
    }

    const { data: codeRow } = await supabase
      .from("student_access_codes")
      .select("id, is_active, revoked_at")
      .eq("id", sessionRow.access_code_id)
      .maybeSingle();
    if (!isStudentSessionAccessCodeBindingValid(sessionRow, codeRow)) {
      return null;
    }
  }

  const studentSelectFull =
    "id,full_name,grade_level,is_active,account_kind,leo_number,guest_status,student_coin_balances(balance)";
  const studentSelectFallback = "id,full_name,grade_level,is_active,student_coin_balances(balance)";

  let studentResult = await supabase
    .from("students")
    .select(studentSelectFull)
    .eq("id", sessionRow.student_id)
    .maybeSingle();

  if (studentResult.error && isMissingColumnError(studentResult.error)) {
    studentResult = await supabase
      .from("students")
      .select(studentSelectFallback)
      .eq("id", sessionRow.student_id)
      .maybeSingle();
  }

  const { data: student, error: studentError } = studentResult;

  if (studentError || !student?.id || student.is_active !== true) {
    return null;
  }

  if (isGuestSession) {
    const kind = student.account_kind || "registered";
    if (kind !== "guest") return null;
    if (student.guest_status === "linked") return null;
  } else if (isGuestStudent(student)) {
    return null;
  }

  return {
    studentId: student.id,
    studentSessionId: sessionRow.id,
    student,
    session: sessionRow,
    isGuestSession,
  };
}

