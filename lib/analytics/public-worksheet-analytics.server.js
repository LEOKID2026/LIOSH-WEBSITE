import { waitUntil } from "@vercel/functions";
import { trackServerAnalyticsEvent } from "./track-event.server.js";
import {
  PUBLIC_WORKSHEET_ANALYTICS_EVENT_SET,
  PUBLIC_WORKSHEET_PAGE_PATH,
} from "./public-worksheet-analytics.constants.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isValidPublicWorksheetVisitSessionId(value) {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizePublicWorksheetEventName(value) {
  const name = String(value || "").trim();
  return PUBLIC_WORKSHEET_ANALYTICS_EVENT_SET.has(name) ? name : null;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ eventName: string, visitSessionId: string }} params
 */
export async function insertPublicWorksheetAnalyticsEvent(supabase, { eventName, visitSessionId }) {
  if (!supabase || !isValidPublicWorksheetVisitSessionId(visitSessionId)) {
    return { ok: false, skipped: true, reason: "invalid_event" };
  }
  const normalizedEvent = normalizePublicWorksheetEventName(eventName);
  if (!normalizedEvent) {
    return { ok: false, skipped: true, reason: "invalid_event_name" };
  }

  const idempotencyKey =
    normalizedEvent === "public_worksheet_page_viewed"
      ? `public_worksheet_page_viewed:${visitSessionId}`
      : null;

  return trackServerAnalyticsEvent(supabase, {
    eventName: normalizedEvent,
    actorType: "visitor",
    actorId: null,
    sessionId: visitSessionId,
    pagePath: PUBLIC_WORKSHEET_PAGE_PATH,
    appSurface: "web",
    idempotencyKey,
    metadata: {},
  });
}

export function schedulePublicWorksheetAnalyticsWork(_context, work) {
  const task = Promise.resolve(work).catch(() => {});
  try {
    waitUntil(task);
  } catch {
    task.catch(() => {});
  }
}

function roundRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(1));
}

/**
 * Build admin metrics for public worksheet visit funnel.
 *
 * @param {Array<{ event_name?: string, session_id?: string | null, actor_type?: string | null }> | null | undefined} events
 */
export function buildPublicWorksheetVisitAnalytics(events) {
  const pageViewSessions = new Set();
  const generatedSessions = new Set();
  let totalGenerations = 0;

  for (const row of events || []) {
    if (row?.actor_type !== "visitor" || !row?.session_id) continue;
    if (row.event_name === "public_worksheet_page_viewed") {
      pageViewSessions.add(row.session_id);
    }
    if (row.event_name === "public_worksheet_generated") {
      generatedSessions.add(row.session_id);
      totalGenerations += 1;
    }
  }

  const visitCount = pageViewSessions.size;
  const visitsWithGeneration = [...pageViewSessions].filter((sessionId) =>
    generatedSessions.has(sessionId)
  ).length;
  const visitsWithoutGeneration = [...pageViewSessions].filter(
    (sessionId) => !generatedSessions.has(sessionId)
  ).length;
  const usageRate =
    visitCount > 0 ? roundRate((visitsWithGeneration / visitCount) * 100) : null;

  const metric = (label, value, source, options = {}) => ({
    label,
    displayLabel: options.displayLabel || label,
    value,
    status: options.status || "available",
    source,
    unit: options.unit || null,
    note: options.note || null,
    dataReadiness: options.dataReadiness || options.status || "available",
    minimumRequirement: options.minimumRequirement || null,
  });

  const emptyNote = "אין נתונים עדיין";

  return {
    cards: [
      metric("ביקורים במחולל", visitCount, "analytics_events.public_worksheet_page_viewed", {
        unit: "ביקורים",
        status: visitCount ? "available" : "empty",
        note: visitCount ? null : emptyNote,
      }),
      metric(
        "ביקורים עם יצירת דף",
        visitsWithGeneration,
        "analytics_events.public_worksheet_generated",
        {
          unit: "ביקורים",
          status: visitsWithGeneration ? "available" : "empty",
          note: visitsWithGeneration ? null : emptyNote,
        }
      ),
      metric("נכנסו ולא יצרו", visitsWithoutGeneration, "analytics_events.public_worksheet funnel", {
        unit: "ביקורים",
        status: visitCount ? "available" : "empty",
        note: visitCount ? null : emptyNote,
      }),
      metric("דפים שנוצרו (סה״כ)", totalGenerations, "analytics_events.public_worksheet_generated", {
        unit: "דפים",
        status: totalGenerations ? "available" : "empty",
        note: totalGenerations ? null : emptyNote,
      }),
      metric("שיעור שימוש במחולל", usageRate, "analytics_events.public_worksheet funnel", {
        unit: "%",
        status: visitCount ? "available" : "empty",
        note: visitCount ? null : emptyNote,
      }),
    ],
    visitCount,
    visitsWithGeneration,
    visitsWithoutGeneration,
    totalGenerations,
    usageRate,
  };
}
