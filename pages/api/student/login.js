import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import { devStudentIdentityPayload } from "../../../lib/dev-student-identity-api";
import { isStudentIdentityDebugEnabled } from "../../../lib/student-identity-debug-flag";
import {
  clearStudentSessionCookie,
  generateStudentSessionToken,
  hashStudentSecret,
  normalizeStudentCode,
  normalizeStudentUsername,
  normalizeStudentPin,
  sessionExpiryIsoFromNow,
  setStudentSessionCookie,
} from "../../../lib/learning-supabase/student-auth";
import { validateStudentLoginUsername } from "../../../lib/learning-supabase/student-login-username.server.js";
import { guardCookieMutationOrigin } from "../../../lib/security/api-guards.js";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  recordLoginSuccess,
} from "../../../lib/security/login-rate-limit.js";
import { safeApiLog } from "../../../lib/security/safe-log.js";
import { trackServerAnalyticsEvent } from "../../../lib/analytics/track-event.server.js";

const GENERIC_LOGIN_FAILURE = { ok: false, error: "שם משתמש או PIN שגויים" };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;

  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const usernameNormalized = normalizeStudentUsername(req.body?.username);
  const codeFallback = normalizeStudentCode(req.body?.code);
  const pin = normalizeStudentPin(req.body?.pin);
  const credential = usernameNormalized || codeFallback;

  if (!credential || pin.length !== 4) {
    return res.status(401).json(GENERIC_LOGIN_FAILURE);
  }

  const rate = checkLoginRateLimit(req, credential);
  if (!rate.allowed) {
    if (rate.retryAfterSec) {
      res.setHeader("Retry-After", String(rate.retryAfterSec));
    }
    return res.status(429).json(GENERIC_LOGIN_FAILURE);
  }

  try {
    const supabase = getLearningSupabaseServiceRoleClient();
    const nowIso = new Date().toISOString();
    const codeHash = hashStudentSecret(credential);
    const pinHash = hashStudentSecret(pin);

    const { data: accessCode, error: codeErr } = await supabase
      .from("student_access_codes")
      .select("id,student_id,is_active,revoked_at,expires_at,login_username,created_at")
      .eq("code_hash", codeHash)
      .eq("pin_hash", pinHash)
      .eq("is_active", true)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeErr || !accessCode?.id) {
      recordLoginFailure(req, credential);
      clearStudentSessionCookie(res);
      return res.status(401).json(GENERIC_LOGIN_FAILURE);
    }

    if (accessCode.expires_at) {
      const expMs = new Date(accessCode.expires_at).getTime();
      if (!Number.isFinite(expMs) || expMs <= Date.now()) {
        recordLoginFailure(req, credential);
        clearStudentSessionCookie(res);
        return res.status(401).json(GENERIC_LOGIN_FAILURE);
      }
    }

    const usernameCheck = validateStudentLoginUsername({
      usernameNormalized,
      storedLoginUsernameRaw: accessCode.login_username,
    });
    if (!usernameCheck.ok) {
      recordLoginFailure(req, credential);
      clearStudentSessionCookie(res);
      return res.status(401).json(GENERIC_LOGIN_FAILURE);
    }

    if (isStudentIdentityDebugEnabled()) {
      safeApiLog("[student-login-api] matched credential", {
        submittedUsername: usernameNormalized || null,
        matchedStudentId: accessCode.student_id,
        accessCodeId: accessCode.id,
      });
    }

    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id,full_name,grade_level,is_active")
      .eq("id", accessCode.student_id)
      .maybeSingle();
    if (studentErr || !student?.id || student.is_active !== true) {
      recordLoginFailure(req, credential);
      clearStudentSessionCookie(res);
      return res.status(401).json(GENERIC_LOGIN_FAILURE);
    }

    const token = generateStudentSessionToken();
    const tokenHash = hashStudentSecret(token);
    const expiresAt = sessionExpiryIsoFromNow();

    const { data: sessionRow, error: sessErr } = await supabase
      .from("student_sessions")
      .insert({
        student_id: accessCode.student_id,
        access_code_id: accessCode.id,
        session_token_hash: tokenHash,
        started_at: nowIso,
        last_seen_at: nowIso,
        expires_at: expiresAt,
        ended_at: null,
        revoked_at: null,
        client_meta: {},
      })
      .select("id")
      .maybeSingle();
    if (sessErr) {
      recordLoginFailure(req, credential);
      clearStudentSessionCookie(res);
      return res.status(401).json(GENERIC_LOGIN_FAILURE);
    }

    recordLoginSuccess(req, credential);
    setStudentSessionCookie(res, token);
    void trackServerAnalyticsEvent(supabase, {
      eventName: "student_login",
      actorType: "student",
      actorId: accessCode.student_id,
      studentId: accessCode.student_id,
      sessionId: sessionRow?.id,
      grade: student.grade_level,
      objectType: "student_session",
      objectId: sessionRow?.id,
      idempotencyKey: sessionRow?.id ? `student_login:${sessionRow.id}` : null,
    });
    const debugStudentIdentity = devStudentIdentityPayload("student-login-api", student);
    if (isStudentIdentityDebugEnabled() && debugStudentIdentity) {
      safeApiLog("[LIOSH student identity] API", debugStudentIdentity);
    }
    return res.status(200).json({
      ok: true,
      student,
      ...(debugStudentIdentity ? { debugStudentIdentity } : {}),
    });
  } catch (_e) {
    recordLoginFailure(req, credential);
    clearStudentSessionCookie(res);
    return res.status(401).json(GENERIC_LOGIN_FAILURE);
  }
}
