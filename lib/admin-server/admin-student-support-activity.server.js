/**
 * Admin student support timeline — merges learning, coins, parent activities, analytics.
 * Admin-only consumption via guarded API routes.
 */

import { formatParentReportActivityIsrael } from "../learning-supabase/parent-report-activity-time.js";
import {
  formatAnalyticsEventNameHe,
  formatAnalyticsSubjectHe,
} from "../admin-portal/admin-analytics-labels.he.js";
import { ADMIN_MANUAL_COIN_REASON } from "./admin-manual-coin-credit.server.js";

const COIN_CATEGORY_HE = Object.freeze({
  compensation: "פיצוי",
  bonus: "בונוס",
  bugfix: "תיקון תקלה",
  other: "אחר",
});

const SUPPORT_ANALYTICS_EVENTS = new Set([
  "student_login",
  "student_home_opened",
  "parent_report_opened",
  "personal_activity_completed",
  "practice_completed",
]);

const ANALYTICS_EVENT_LINE_HE = Object.freeze({
  student_login: "כניסה לאתר",
  student_home_opened: "פתיחת בית תלמיד",
  parent_report_opened: "דוח הורים נפתח",
  personal_activity_completed: "פעילות אישית הושלמה",
  practice_completed: "השלמת תרגול",
});

/**
 * @param {string|null|undefined} iso
 */
export function formatAdminSupportTimestampHe(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return formatParentReportActivityIsrael(ms);
}

/**
 * @param {number} n
 */
function formatCoinAmountHe(n) {
  return Math.floor(Number(n) || 0).toLocaleString("he-IL");
}

/**
 * @param {unknown} meta
 */
function readSessionSummary(meta) {
  const root = meta && typeof meta === "object" ? meta : {};
  const summary =
    root.summary && typeof root.summary === "object" ? root.summary : root;
  const totalQuestions = Number(summary.totalQuestions ?? summary.total_questions);
  const accuracy = Number(summary.accuracy ?? summary.accuracy_pct);
  return {
    totalQuestions: Number.isFinite(totalQuestions) && totalQuestions > 0 ? totalQuestions : null,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? Math.round(accuracy) : null,
  };
}

/**
 * @param {number|null|undefined} durationSeconds
 */
function durationMinutesHe(durationSeconds) {
  const sec = Number(durationSeconds);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return Math.max(1, Math.round(sec / 60));
}

/**
 * @param {string|null|undefined} category
 */
function coinCategoryHe(category) {
  const key = typeof category === "string" ? category.trim() : "";
  return COIN_CATEGORY_HE[key] || COIN_CATEGORY_HE.other;
}

/**
 * @param {{
 *   atIso: string,
 *   sortMs: number,
 *   kind: string,
 *   lineHe: string,
 *   detailLineHe?: string|null,
 * }} row
 */
function normalizeEventRow(row) {
  const atLabelHe = formatAdminSupportTimestampHe(row.atIso);
  return {
    atIso: row.atIso,
    atLabelHe,
    kind: row.kind,
    lineHe: row.lineHe,
    detailLineHe: row.detailLineHe || null,
    displayLineHe: atLabelHe ? `${atLabelHe} - ${row.lineHe}` : row.lineHe,
    sortMs: row.sortMs,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ limit?: number }} [opts]
 */
export async function buildStudentSupportTimeline(supabase, studentId, opts = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  /** @type {ReturnType<typeof normalizeEventRow>[]} */
  const raw = [];

  const [sessionsRes, coinsRes, parentStatusRes, analyticsRes] = await Promise.all([
    supabase
      .from("learning_sessions")
      .select("id,subject,topic,started_at,ended_at,updated_at,duration_seconds,status,metadata")
      .eq("student_id", studentId)
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("coin_transactions")
      .select("id,amount,direction,reason,source_type,metadata,created_at,balance_after")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("parent_activity_status")
      .select(
        "submitted_at,updated_at,answers_count,correct_count,score_pct,status,parent_assigned_activities(subject,title)"
      )
      .eq("student_id", studentId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(20),
    supabase
      .from("analytics_events")
      .select("event_name,created_at,subject,metadata")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;
  if (coinsRes.error) throw coinsRes.error;
  if (parentStatusRes.error) throw parentStatusRes.error;
  if (analyticsRes.error) throw analyticsRes.error;

  for (const row of sessionsRes.data || []) {
    const atIso = row.ended_at || row.updated_at || row.started_at;
    const ms = atIso ? new Date(atIso).getTime() : NaN;
    if (!Number.isFinite(ms)) continue;
    const status = String(row.status || "").toLowerCase();
    if (status !== "completed" && !row.ended_at) continue;

    const { totalQuestions, accuracy } = readSessionSummary(row.metadata);
    const subjectHe = formatAnalyticsSubjectHe(row.subject) || "למידה";
    const minutes = durationMinutesHe(row.duration_seconds);
    const parts = [`סיים תרגול ${subjectHe}`];
    if (totalQuestions != null) parts.push(`${totalQuestions} שאלות`);
    if (accuracy != null) parts.push(`${accuracy}%`);
    if (minutes != null) parts.push(`${minutes} דקות`);

    const lineHe = parts.join(" - ");
    const cardParts = [`תרגול ${subjectHe}`];
    if (totalQuestions != null) cardParts.push(`${totalQuestions} שאלות`);
    if (accuracy != null) cardParts.push(`${accuracy}%`);
    if (minutes != null) cardParts.push(`${minutes} דקות`);

    raw.push(
      normalizeEventRow({
        atIso,
        sortMs: ms,
        kind: "learning_session",
        lineHe,
        detailLineHe: cardParts.join(" · "),
      })
    );
  }

  for (const row of coinsRes.data || []) {
    const atIso = row.created_at;
    const ms = atIso ? new Date(atIso).getTime() : NaN;
    if (!Number.isFinite(ms)) continue;
    const amount = Math.floor(Number(row.amount) || 0);
    if (amount <= 0) continue;
    const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    const direction = String(row.direction || "");

    let lineHe;
    if (row.reason === ADMIN_MANUAL_COIN_REASON || meta.manual_admin_action === true) {
      const cat = coinCategoryHe(meta.category);
      lineHe = `נוספו ${formatCoinAmountHe(amount)} מטבעות ידנית - סיבה: ${cat}`;
    } else if (direction === "spend") {
      lineHe = `הוצאו ${formatCoinAmountHe(amount)} מטבעות`;
    } else if (direction === "earn") {
      lineHe = `נוספו ${formatCoinAmountHe(amount)} מטבעות`;
    } else {
      continue;
    }

    raw.push(
      normalizeEventRow({
        atIso,
        sortMs: ms,
        kind: "coin_transaction",
        lineHe,
        detailLineHe:
          row.reason === ADMIN_MANUAL_COIN_REASON
            ? `${lineHe}${meta.note ? ` · ${String(meta.note).slice(0, 80)}` : ""}`
            : lineHe,
      })
    );
  }

  for (const row of parentStatusRes.data || []) {
    const atIso = row.submitted_at || row.updated_at;
    const ms = atIso ? new Date(atIso).getTime() : NaN;
    if (!Number.isFinite(ms)) continue;
    const rel = row.parent_assigned_activities;
    const activity = Array.isArray(rel) ? rel[0] : rel;
    const subjectHe = formatAnalyticsSubjectHe(activity?.subject) || "פעילות";
    const answers = Number(row.answers_count) || 0;
    const score = row.score_pct != null ? Math.round(Number(row.score_pct)) : null;
    let lineHe = "פעילות אישית הושלמה";
    if (activity?.title) {
      lineHe = `הושלמה ${String(activity.title).slice(0, 40)}`;
    }
    const detailParts = [subjectHe];
    if (answers > 0) detailParts.push(`${answers} שאלות`);
    if (score != null) detailParts.push(`${score}%`);

    raw.push(
      normalizeEventRow({
        atIso,
        sortMs: ms,
        kind: "parent_activity",
        lineHe,
        detailLineHe: detailParts.join(" · "),
      })
    );
  }

  for (const row of analyticsRes.data || []) {
    const eventName = String(row.event_name || "");
    if (!SUPPORT_ANALYTICS_EVENTS.has(eventName)) continue;
    const atIso = row.created_at;
    const ms = atIso ? new Date(atIso).getTime() : NaN;
    if (!Number.isFinite(ms)) continue;

    const lineHe =
      ANALYTICS_EVENT_LINE_HE[eventName] || formatAnalyticsEventNameHe(eventName);

    raw.push(
      normalizeEventRow({
        atIso,
        sortMs: ms,
        kind: "analytics",
        lineHe,
        detailLineHe: lineHe,
      })
    );
  }

  raw.sort((a, b) => b.sortMs - a.sortMs);

  const deduped = [];
  const seen = new Set();
  for (const ev of raw) {
    const key = `${ev.atIso}|${ev.kind}|${ev.lineHe}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ev);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

/**
 * @param {ReturnType<typeof normalizeEventRow>[]} events
 */
export function summarizeLastStudentActivity(events) {
  if (!events?.length) {
    return {
      hasActivity: false,
      atIso: null,
      atLabelHe: null,
      shortLineHe: "אין פעילות",
      detailLineHe: null,
    };
  }
  const latest = events[0];
  return {
    hasActivity: true,
    atIso: latest.atIso,
    atLabelHe: latest.atLabelHe,
    shortLineHe: latest.atLabelHe || "-",
    detailLineHe: latest.detailLineHe || latest.lineHe,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentLastActivitySummary(supabase, studentId) {
  const events = await buildStudentSupportTimeline(supabase, studentId, { limit: 1 });
  return summarizeLastStudentActivity(events);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string[]} studentIds
 */
export async function getStudentsLastActivitySummaries(supabase, studentIds) {
  const ids = [...new Set((studentIds || []).map(String).filter(Boolean))];
  const out = Object.create(null);
  if (!ids.length) return out;

  await Promise.all(
    ids.map(async (id) => {
      try {
        out[id] = await getStudentLastActivitySummary(supabase, id);
      } catch {
        out[id] = summarizeLastStudentActivity([]);
      }
    })
  );
  return out;
}
