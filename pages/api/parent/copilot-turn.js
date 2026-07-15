/**
 * Server-side Parent Copilot turn - `runParentCopilotTurnAsync` only on the server (LLM keys stay server-side).
 *
 * Payload trust (launch hardening):
 * - **Production (strict):** Never executes Copilot against a client-supplied full report snapshot. The client may send
 *   `payload` for backward compatibility, but it is **ignored** for engine input unless
 *   `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION=true` (emergency operator escape - insecure).
 *   {@link resolveCopilotTurnPayloadForApi} rebuilds the detailed report payload server-side from Supabase (same rollup as
 *   GET `/api/parent/students/[studentId]/report-data`) plus existing report builders - see
 *   `lib/parent-copilot/copilot-turn-payload.server.js` and `lib/parent-server/db-input-to-detailed-report.server.js`.
 * - **Development:** After authorization, may use `body.payload` from the client (same as before), or unauthenticated
 *   local QA when `PARENT_COPILOT_ALLOW_UNAUTH_LOCAL_PAYLOAD` is not `"false"` and `NODE_ENV !== 'production'`.
 *
 * Authorization:
 * - Parent Bearer JWT (preferred when present): same gate as report-data - `reports_enabled` + student belongs to parent.
 * - Student session cookie: `studentId` must match logged-in student.
 * - Dev-only unauthenticated payload when allowed by env (disabled in production).
 *
 * Never mutates stored reports, banks, taxonomies, diagnostics, or planner output.
 */

import { runParentCopilotTurnAsync } from "../../../utils/parent-copilot/index.js";
import { stripParentCopilotResponseForClient } from "../../../lib/parent-copilot/strip-copilot-client-response.server.js";
import { requireParentApiContext, sendPersonaApiError } from "../../../lib/auth/persona-guard.server.js";
import {
  assertParentCopilotMonthlyLimit,
  recordParentCopilotUsage,
} from "../../../lib/parent-server/parent-copilot-limit.server.js";
import { getAuthenticatedStudentSession } from "../../../lib/learning-supabase/student-auth";
import { resolveCopilotTurnPayloadForApi } from "../../../lib/parent-copilot/copilot-turn-payload.server.js";
import { guardCookieMutationOrigin } from "../../../lib/security/api-guards.js";
import {
  rejectIfCopilotIpRateLimited,
  rejectIfCopilotAuthRateLimited,
} from "../../../lib/security/public-api-rate-limit.js";
import { MAX_COPILOT_UTTERANCE_LEN, clampTrimmedString } from "../../../lib/security/api-input.server.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
};

function safeStudentId(raw) {
  const s = String(raw || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return null;
  return s;
}

/** @param {string} label @param {Record<string, unknown>} meta */
function logCopilotAuthDebug(label, meta = {}) {
  if (process.env.PARENT_COPILOT_TURN_DEBUG_AUTH !== "true") return;
  const safe = { ...meta };
  if (typeof safe.bearerPresent === "boolean") safe.bearerPresent = safe.bearerPresent;
  if (typeof safe.studentSessionPresent === "boolean") safe.studentSessionPresent = safe.studentSessionPresent;
  console.info("[copilot-turn/auth]", label, safe);
}

/**
 * Parent Bearer path - same ownership gate as GET report-data (`reports_enabled` + parent_id match).
 * @returns {Promise<{ ok: boolean; mode?: string; error?: string; code?: string; status?: number; stopped?: boolean; parentUserId?: string; serviceRole?: object }>}
 */
async function authorizeParentBearer(req, res, studentId, authHeader) {
  if (!studentId) {
    logCopilotAuthDebug("parent_bearer_rejected", { reason: "missing_student_id" });
    return {
      ok: false,
      error: "studentId is required when using parent authorization",
      code: "STUDENT_ID_REQUIRED",
      status: 400,
    };
  }

  try {
    const ctx = await requireParentApiContext(res, authHeader, { requireFeature: "reports_enabled" });
    if (ctx.stopped) {
      logCopilotAuthDebug("parent_bearer_stopped", {
        studentId,
        parentUserId: null,
        reason: "requireParentApiContext",
      });
      return { ok: false, stopped: true };
    }

    logCopilotAuthDebug("parent_bearer_context", {
      studentId,
      parentUserId: ctx.parentUserId,
      reportsEnabled: ctx.settings?.reports_enabled === true,
    });

    const limitCheck = await assertParentCopilotMonthlyLimit(
      ctx.serviceRole,
      ctx.parentUserId,
      ctx.settings?.monthly_ai_limit
    );
    if (!limitCheck.ok) {
      if (limitCheck.code === "monthly_ai_limit_exceeded") {
        sendPersonaApiError(res, limitCheck.status, limitCheck.code, limitCheck.code);
      }
      logCopilotAuthDebug("parent_bearer_limit", {
        studentId,
        parentUserId: ctx.parentUserId,
        reason: limitCheck.code,
      });
      return {
        ok: false,
        stopped: limitCheck.code === "monthly_ai_limit_exceeded",
        error: limitCheck.code,
        code: limitCheck.code,
        status: limitCheck.status,
      };
    }

    const { data: row, error: rowErr } = await ctx.bearerSupabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .maybeSingle();
    if (rowErr) {
      logCopilotAuthDebug("parent_bearer_ownership_error", {
        studentId,
        parentUserId: ctx.parentUserId,
        reason: "db_error",
      });
      return {
        ok: false,
        error: "Could not verify student ownership",
        code: "PARENT_OWNERSHIP_DENIED",
        status: 403,
      };
    }
    if (!row?.id) {
      logCopilotAuthDebug("parent_bearer_ownership_denied", {
        studentId,
        parentUserId: ctx.parentUserId,
        reason: "student_not_found_for_parent",
      });
      return {
        ok: false,
        error: "Student not found for this parent",
        code: "STUDENT_NOT_FOUND",
        status: 404,
      };
    }

    res.setHeader("X-LIOSH-Parent-Copilot-Auth", "parent_bearer");
    logCopilotAuthDebug("parent_bearer_ok", { studentId, parentUserId: ctx.parentUserId });
    return {
      ok: true,
      mode: "parent_bearer",
      parentUserId: ctx.parentUserId,
      serviceRole: ctx.serviceRole,
    };
  } catch {
    logCopilotAuthDebug("parent_bearer_failed", { studentId, reason: "authorization_failed" });
    return { ok: false, error: "Authorization failed", code: "not_authenticated", status: 401 };
  }
}

/**
 * Sets X-LIOSH-Parent-Copilot-Auth only (grounding comes from payload resolution).
 * Bearer parent auth takes precedence over student session cookie (parent dashboard report view).
 * @returns {Promise<{ ok: boolean; mode?: string; error?: string; code?: string; status?: number; stopped?: boolean }>}
 */
async function authorizeRequest(req, res, studentIdFromBody) {
  const isProd = process.env.NODE_ENV === "production";
  const allowUnauthDevPayload =
    !isProd && process.env.PARENT_COPILOT_ALLOW_UNAUTH_LOCAL_PAYLOAD !== "false";

  const studentId = safeStudentId(studentIdFromBody);
  const authHeader = req.headers.authorization || "";
  const hasBearer = authHeader.startsWith("Bearer ");

  const studentAuthPeek = await getAuthenticatedStudentSession(req);
  logCopilotAuthDebug("authorize_start", {
    bearerPresent: hasBearer,
    studentSessionPresent: Boolean(studentAuthPeek?.student?.id),
    studentIdFromBody: studentId,
    studentSessionId: studentAuthPeek?.student?.id || null,
  });

  if (hasBearer) {
    return authorizeParentBearer(req, res, studentId, authHeader);
  }

  const studentAuth = studentAuthPeek;
  if (studentAuth?.student?.id) {
    if (!studentId || studentId !== studentAuth.student.id) {
      logCopilotAuthDebug("student_session_mismatch", {
        studentIdFromBody: studentId,
        studentSessionId: studentAuth.student.id,
      });
      return {
        ok: false,
        error: "studentId must match the authenticated student session",
        code: "STUDENT_SESSION_MISMATCH",
        status: 403,
      };
    }
    res.setHeader("X-LIOSH-Parent-Copilot-Auth", "student_session");
    logCopilotAuthDebug("student_session_ok", { studentId: studentAuth.student.id });
    return {
      ok: true,
      mode: "student_session",
      authenticatedStudentId: studentAuth.student.id,
    };
  }

  if (allowUnauthDevPayload) {
    if (isProd) {
      return { ok: false, error: "Unauthorized", status: 403 };
    }
    if (studentId) {
      return { ok: false, error: "studentId is not allowed in unauthenticated dev mode", status: 403 };
    }
    res.setHeader("X-LIOSH-Parent-Copilot-Auth", "dev_local_unverified");
    return { ok: true, mode: "dev_local" };
  }

  return {
    ok: false,
    error:
      "Unauthorized: sign in as a student on this site, use a parent Bearer token with studentId, or enable local dev payload (see API comment)",
    status: 401,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (rejectIfCopilotIpRateLimited(req, res)) return;

  const studentSessionPeek = await getAuthenticatedStudentSession(req);
  if (studentSessionPeek?.student?.id && guardCookieMutationOrigin(req, res)) {
    return;
  }

  try {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const utterance = clampTrimmedString(body.utterance, MAX_COPILOT_UTTERANCE_LEN);
    const sessionId = clampTrimmedString(body.sessionId, 128) || "default";
    const audience = clampTrimmedString(body.audience, 32) || "parent";

    if (!utterance) {
      return res.status(400).json({ ok: false, error: "Missing utterance" });
    }
    if (String(body.utterance || "").trim().length > MAX_COPILOT_UTTERANCE_LEN) {
      return res.status(400).json({ ok: false, error: "Utterance too long" });
    }

    const auth = await authorizeRequest(req, res, body.studentId);
    if (!auth.ok) {
      if (auth.stopped) return undefined;
      logCopilotAuthDebug("authorize_failed", {
        status: auth.status || 401,
        code: auth.code || null,
        error: auth.error || "Unauthorized",
      });
      return res.status(auth.status || 401).json({
        ok: false,
        error: auth.error || "Unauthorized",
        code: auth.code,
        errorCode: auth.code,
      });
    }

    if (process.env.NODE_ENV === "production" && auth.mode === "dev_local") {
      return res.status(403).json({ ok: false, error: "Unauthorized" });
    }

    const authBucketKey =
      auth.mode === "student_session"
        ? `student_session:${studentSessionPeek?.student?.id || body.studentId || ""}`
        : auth.mode === "parent_bearer"
          ? `parent_bearer:${body.studentId || ""}`
          : auth.mode === "dev_local"
            ? "dev_local"
            : "";
    if (rejectIfCopilotAuthRateLimited(req, res, authBucketKey)) return;

    const payloadResolution = await resolveCopilotTurnPayloadForApi({
      body,
      req,
      auth,
    });

    if (!payloadResolution.ok) {
      return res.status(payloadResolution.status || 400).json({
        ok: false,
        error: payloadResolution.error || "Payload resolution failed",
        code: payloadResolution.code,
      });
    }

    res.setHeader("X-LIOSH-Parent-Copilot-Grounding", payloadResolution.grounding);

    const selectedContextRef = body.selectedContextRef ?? null;
    const clickedFollowupFamily = body.clickedFollowupFamily ?? null;

    const result = await runParentCopilotTurnAsync({
      audience,
      payload: payloadResolution.payload,
      utterance,
      sessionId,
      selectedContextRef,
      clickedFollowupFamily,
    });

    if (auth.mode === "parent_bearer" && auth.parentUserId && auth.serviceRole) {
      await recordParentCopilotUsage(auth.serviceRole, auth.parentUserId);
    }

    return res.status(200).json({
      ok: true,
      result: stripParentCopilotResponseForClient(result),
      authMode: auth.mode,
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
