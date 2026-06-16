import { getLearningSupabaseBrowserClient } from "../learning-supabase/client";
import { analyticsEventDefaults } from "./event-catalog.js";

function deviceType() {
  if (typeof window === "undefined") return null;
  const width = window.innerWidth || 0;
  if (width > 0 && width < 768) return "mobile";
  if (width >= 768 && width < 1024) return "tablet";
  return "desktop";
}

function pagePath() {
  if (typeof window === "undefined") return null;
  return `${window.location.pathname || ""}${window.location.search || ""}`.slice(0, 500);
}

async function resolveAccessToken() {
  try {
    const supabase = getLearningSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || "";
  } catch {
    return "";
  }
}

/**
 * Best-effort analytics event write. Failure must never affect product flows.
 *
 * @param {object} event
 * @param {string} event.eventName
 * @param {string} [event.actorType]
 * @param {string} [event.studentId]
 * @param {string} [event.sessionId]
 * @param {string} [event.subject]
 * @param {string} [event.topic]
 * @param {string} [event.grade]
 * @param {string} [event.objectType]
 * @param {string} [event.objectId]
 * @param {string} [event.idempotencyKey]
 * @param {object} [event.metadata]
 */
export async function trackProductEvent(event) {
  if (typeof window === "undefined" || !event?.eventName) return;
  try {
    const token = await resolveAccessToken();
    const defaults = analyticsEventDefaults(event.eventName);
    const body = JSON.stringify({
      ...event,
      eventFamily: event.eventFamily || defaults.family,
      featureKey: event.featureKey || defaults.featureKey,
      pagePath: pagePath(),
      deviceType: deviceType(),
      appSurface: "web",
    });
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "same-origin",
      cache: "no-store",
      keepalive: body.length < 60000,
      body,
    }).catch(() => {});
  } catch {
    /* analytics must never block learning/report flows */
  }
}
