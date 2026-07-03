import { getLearningSupabaseServerUserClient, getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import { getAuthenticatedStudentSession } from "../../../lib/learning-supabase/student-auth";
import { readJsonBody } from "../../../lib/learning-supabase/learning-activity";
import { guardCookieMutationOrigin } from "../../../lib/security/api-guards.js";
import { safeApiLog } from "../../../lib/security/safe-log.js";
import { ANALYTICS_EVENT_NAMES, analyticsEventDefaults } from "../../../lib/analytics/event-catalog.js";
import { assertTeacherCanManageStudentAccess } from "../../../lib/teacher-server/teacher-student-access.server.js";

const ALLOWED_ACTOR_TYPES = new Set(["parent", "student", "teacher", "admin", "system"]);
const ALLOWED_EVENTS = new Set(ANALYTICS_EVENT_NAMES);

function safeString(value, maxLen) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function safeUuid(value) {
  const s = safeString(value, 80);
  if (!s) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
    ? s
    : null;
}

function normalizeDeviceType(value) {
  const s = safeString(value, 20);
  if (s === "mobile" || s === "desktop" || s === "tablet") return s;
  return null;
}

function sanitizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const blocked = new Set([
    "answer",
    "answerText",
    "userAnswer",
    "expectedAnswer",
    "prompt",
    "question",
    "report",
    "reportPayload",
    "password",
    "token",
    "address",
    "nationalId",
    "medicalData",
    "freeText",
    "questionText",
    "accessToken",
    "refreshToken",
  ]);
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (blocked.has(key)) continue;
    if (raw == null) continue;
    if (typeof raw === "string") out[key] = safeString(raw, 160);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === "boolean") out[key] = raw;
  }
  return out;
}

async function resolveBearerActor(authHeader) {
  const bearer = typeof authHeader === "string" ? authHeader.trim() : "";
  if (!bearer.startsWith("Bearer ")) return null;
  const supabase = getLearningSupabaseServerUserClient(bearer);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) return null;
  const role = String(data.user.app_metadata?.role || "").toLowerCase();
  if (role === "admin") return { actorType: "admin", actorId: data.user.id, parentId: null };
  if (role === "teacher") return { actorType: "teacher", actorId: data.user.id, parentId: null };
  return { actorType: "parent", actorId: data.user.id, parentId: data.user.id };
}

/**
 * Resolve student_id for analytics — never trust body.studentId without ownership.
 * @param {{
 *   studentAuth: { studentId?: string } | null,
 *   bearerActor: { actorType?: string, actorId?: string, parentId?: string | null } | null,
 *   bodyStudentId: unknown,
 *   serviceRole: import("@supabase/supabase-js").SupabaseClient,
 * }} input
 * @returns {Promise<string | null>}
 */
async function resolveAuthorizedStudentIdForEvent({ studentAuth, bearerActor, bodyStudentId, serviceRole }) {
  if (studentAuth?.studentId) {
    return safeUuid(studentAuth.studentId);
  }

  const requested = safeUuid(bodyStudentId);
  if (!requested || !bearerActor?.actorType) return null;

  if (bearerActor.actorType === "parent" && bearerActor.parentId) {
    const { data, error } = await serviceRole
      .from("students")
      .select("id")
      .eq("id", requested)
      .eq("parent_id", bearerActor.parentId)
      .maybeSingle();
    if (error) return null;
    return data?.id || null;
  }

  if (bearerActor.actorType === "teacher" && bearerActor.actorId) {
    const linked = await assertTeacherCanManageStudentAccess(serviceRole, bearerActor.actorId, requested);
    return linked.ok ? requested : null;
  }

  if (bearerActor.actorType === "admin" && bearerActor.actorId) {
    const { data, error } = await serviceRole
      .from("students")
      .select("id")
      .eq("id", requested)
      .maybeSingle();
    if (error) return null;
    return data?.id || null;
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (guardCookieMutationOrigin(req, res)) return undefined;

  try {
    const body = readJsonBody(req);
    const eventName = safeString(body.eventName || body.event_name, 120);
    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return res.status(400).json({ ok: false, error: "invalid_event" });
    }

    const studentAuth = await getAuthenticatedStudentSession(req).catch(() => null);
    const bearerActor = studentAuth ? null : await resolveBearerActor(req.headers.authorization || "");
    const requestedActorType = safeString(body.actorType || body.actor_type, 20);
    let actorType = studentAuth ? "student" : bearerActor?.actorType || requestedActorType || "system";
    if (!ALLOWED_ACTOR_TYPES.has(actorType)) actorType = "system";

    if (!studentAuth && !bearerActor) {
      return res.status(401).json({ ok: false, error: "not_authenticated" });
    }

    const serviceRole = getLearningSupabaseServiceRoleClient();
    const authorizedStudentId = await resolveAuthorizedStudentIdForEvent({
      studentAuth,
      bearerActor,
      bodyStudentId: body.studentId,
      serviceRole,
    });

    const row = {
      event_version: 1,
      actor_type: actorType,
      actor_id: studentAuth ? studentAuth.studentId : bearerActor?.actorId || safeUuid(body.actorId),
      parent_id: studentAuth ? null : bearerActor?.parentId || safeUuid(body.parentId),
      student_id: authorizedStudentId,
      session_id: safeUuid(body.sessionId),
      event_name: eventName,
      event_family: safeString(body.eventFamily || body.event_family, 80) || analyticsEventDefaults(eventName).family,
      feature_key: safeString(body.featureKey || body.feature_key, 120) || analyticsEventDefaults(eventName).featureKey,
      object_type: safeString(body.objectType || body.object_type, 80),
      object_id: safeString(body.objectId || body.object_id, 160),
      page_path: safeString(body.pagePath || body.page_path, 500),
      subject: safeString(body.subject, 80),
      topic: safeString(body.topic, 160),
      grade: safeString(body.grade, 80),
      device_type: normalizeDeviceType(body.deviceType || body.device_type),
      app_surface: safeString(body.appSurface || body.app_surface || "web", 80),
      idempotency_key: safeString(body.idempotencyKey || body.idempotency_key, 240),
      metadata: sanitizeMetadata(body.metadata),
    };

    const { error } = await serviceRole.from("analytics_events").insert(row);
    if (error) {
      safeApiLog("analytics_event_insert_error", { eventName });
      return res.status(202).json({ ok: false, skipped: true, error: "insert_failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (_error) {
    safeApiLog("analytics_event_ingestion_error", { route: "analytics/events" });
    return res.status(202).json({ ok: false, skipped: true, error: "internal_error" });
  }
}
