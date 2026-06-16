import { analyticsEventDefaults } from "./event-catalog.js";

const SENSITIVE_METADATA_KEYS = new Set([
  "answer",
  "answerText",
  "userAnswer",
  "expectedAnswer",
  "prompt",
  "question",
  "questionText",
  "freeText",
  "report",
  "reportPayload",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "address",
  "nationalId",
  "medicalData",
]);

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

function sanitizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (SENSITIVE_METADATA_KEYS.has(key) || raw == null) continue;
    if (typeof raw === "string") out[key] = safeString(raw, 160);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === "boolean") out[key] = raw;
  }
  return out;
}

/**
 * Server-side best-effort analytics insert. Never throws.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} event
 * @param {string} event.eventName
 */
export async function trackServerAnalyticsEvent(supabase, event) {
  if (!supabase || !event?.eventName) return { ok: false, skipped: true, reason: "invalid_event" };
  try {
    const defaults = analyticsEventDefaults(event.eventName);
    const { error } = await supabase.from("analytics_events").insert({
      event_version: 1,
      actor_type: safeString(event.actorType, 20) || "system",
      actor_id: safeUuid(event.actorId),
      parent_id: safeUuid(event.parentId),
      student_id: safeUuid(event.studentId),
      session_id: safeUuid(event.sessionId),
      event_name: safeString(event.eventName, 120),
      event_family: safeString(event.eventFamily, 80) || defaults.family,
      feature_key: safeString(event.featureKey, 120) || defaults.featureKey,
      object_type: safeString(event.objectType, 80),
      object_id: safeString(event.objectId, 160),
      page_path: safeString(event.pagePath, 500),
      subject: safeString(event.subject, 80),
      topic: safeString(event.topic, 160),
      grade: safeString(event.grade, 80),
      device_type: safeString(event.deviceType, 20),
      app_surface: safeString(event.appSurface, 80) || "web",
      idempotency_key: safeString(event.idempotencyKey, 240),
      metadata: sanitizeMetadata(event.metadata),
    });
    if (error) return { ok: false, skipped: true, reason: "insert_failed" };
    return { ok: true };
  } catch {
    return { ok: false, skipped: true, reason: "internal_error" };
  }
}
