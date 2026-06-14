/**
 * בדיקות שלמות נתונים לפני/אחרי בניית דוח הורים V2 — מבנה JSON לבדיקה ולא אל UI.
 */

import { mistakeTimestampMs } from "./mistake-event.js";
import { mathReportBaseOperationKey } from "./math-report-generator.js";

const VALID_MODES = new Set([
  "learning",
  "practice",
  "challenge",
  "speed",
  "marathon",
  "graded",
  "normal",
  "mistakes",
  "practice_mistakes",
]);

const GRADE_RE = /^g[1-6]$/i;
const LEVEL_RE = /^(easy|medium|hard)$/i;

/** @param {unknown} session */
function parseSessionTime(session) {
  if (!session || typeof session !== "object") return null;
  const t1 = Number(session.timestamp);
  if (Number.isFinite(t1)) return t1;
  if (session.date == null || session.date === "") return null;
  const t2 = new Date(session.date).getTime();
  return Number.isFinite(t2) ? t2 : null;
}

function normalizeSessionsArray(sessions) {
  if (Array.isArray(sessions)) return sessions;
  if (sessions && typeof sessions === "object") return Object.values(sessions);
  return [];
}

/**
 * @param {object} params
 * @param {Record<string, Record<string, unknown>>} [params.trackingSnapshots] subjectId -> bucket map
 * @param {Record<string, unknown[]>} [params.rawMistakesBySubject]
 * @param {Record<string, Record<string, unknown>>} [params.maps] topic maps from V2
 * @param {unknown[]} [params.dailyActivity]
 * @param {number} [params.startMs]
 * @param {number} [params.endMs]
 * @returns {{ version: number, issueCount: number, issues: Array<{ code: string, severity: "error"|"warn", message: string, subjectId?: string, bucketKey?: string, detail?: unknown }> }}
 */
export function validateParentReportDataIntegrity(params) {
  const issues = [];
  const p = params && typeof params === "object" ? params : {};
  const trackingSnapshots = p.trackingSnapshots && typeof p.trackingSnapshots === "object" ? p.trackingSnapshots : {};
  const rawMistakesBySubject =
    p.rawMistakesBySubject && typeof p.rawMistakesBySubject === "object" ? p.rawMistakesBySubject : {};
  const maps = p.maps && typeof p.maps === "object" ? p.maps : {};
  const dailyActivity = Array.isArray(p.dailyActivity) ? p.dailyActivity : [];
  const startMs = Number(p.startMs);
  const endMs = Number(p.endMs);

  const push = (code, severity, message, extra = {}) => {
    issues.push({ code, severity, message, ...extra });
  };

  for (const [subjectId, bucket] of Object.entries(trackingSnapshots)) {
    if (!bucket || typeof bucket !== "object" || Array.isArray(bucket)) continue;
    for (const [bucketKey, item] of Object.entries(bucket)) {
      if (!item || typeof item !== "object") continue;
      const sessions = normalizeSessionsArray(item.sessions);
      const seenTs = new Map();
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        if (!s || typeof s !== "object") {
          push("malformed_session", "warn", "מפגש לא אובייקט בתוך אחסון", {
            subjectId,
            bucketKey,
            detail: { index: i },
          });
          continue;
        }
        const t = parseSessionTime(s);
        if (t == null) {
          push("missing_session_timestamp", "warn", "מפגש ללא חותמת זמן תקפה", {
            subjectId,
            bucketKey,
            detail: { index: i },
          });
        }
        const mode = s.mode != null && s.mode !== "" ? String(s.mode).trim() : "learning";
        if (mode && !VALID_MODES.has(mode)) {
          push("unknown_session_mode", "warn", "מצב מפגש לא מוכר", {
            subjectId,
            bucketKey,
            detail: { mode },
          });
        }
        const g = s.grade != null && s.grade !== "" ? String(s.grade).trim() : null;
        if (g && !GRADE_RE.test(g)) {
          push("invalid_session_grade", "warn", "כיתה במפגש לא בפורמט צפוי (g1–g6)", {
            subjectId,
            bucketKey,
            detail: { grade: g },
          });
        }
        const lv = s.level != null && s.level !== "" ? String(s.level).trim() : null;
        if (lv && !LEVEL_RE.test(lv)) {
          push("invalid_session_level", "warn", "רמת קושי במפגש לא easy/medium/hard", {
            subjectId,
            bucketKey,
            detail: { level: lv },
          });
        }
        if (Number.isFinite(t)) {
          const total = s.total !== undefined && s.total !== null ? Number(s.total) : 1;
          const sig = `${t}\u0001${Number.isFinite(total) ? total : "na"}`;
          const k = `${bucketKey}:${sig}`;
          const prev = seenTs.get(k);
          if (prev !== undefined) {
            push("duplicate_session_signature", "warn", "חשד לכפילות מפגשים (אותו זמן ונפח)", {
              subjectId,
              bucketKey,
              detail: { indices: [prev, i] },
            });
          } else seenTs.set(k, i);
        }
      }
    }
  }

  for (const [subjectId, mistakes] of Object.entries(rawMistakesBySubject)) {
    const arr = Array.isArray(mistakes) ? mistakes : [];
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (m == null || typeof m !== "object") {
        push("malformed_mistake_event", "error", "אירוע טעות לא אובייקט", {
          subjectId,
          detail: { index: i },
        });
        continue;
      }
      const ts = mistakeTimestampMs(m);
      if (ts === null) {
        push("missing_mistake_timestamp", "warn", "אירוע טעות ללא חותמת זמן אחרי נירמול", {
          subjectId,
          detail: { index: i },
        });
      }
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && ts !== null && (ts < startMs || ts > endMs)) {
        push("mistake_outside_declared_range", "warn", "אירוע טעות מחוץ לטווח הדיווח המוצהר (ייתכן סינון כפול)", {
          subjectId,
          detail: { index: i, ts },
        });
      }
      const hasTopic =
        m.topic != null ||
        m.operation != null ||
        (m.snapshot && typeof m.snapshot === "object" && (m.snapshot.topic != null || m.snapshot.operation != null));
      if (!hasTopic) {
        push("legacy_mistake_missing_topic", "warn", "אירוע טעות ללא נושא/פעולה (נירמול legacy)", {
          subjectId,
          detail: { index: i },
        });
      }
    }
  }

  for (const [subjectId, topicMap] of Object.entries(maps)) {
    if (!topicMap || typeof topicMap !== "object") continue;
    const bucket = trackingSnapshots[subjectId] || {};
    for (const [rowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const bk = row.bucketKey != null ? String(row.bucketKey) : "";
      if (!bk) {
        push("row_missing_bucket_key", "warn", "שורת דוח ללא bucketKey", { subjectId, detail: { rowKey } });
        continue;
      }
      const storageKeys = Object.keys(bucket);
      if (!storageKeys.length) continue;
      if (subjectId === "math") {
        const canonRow = mathReportBaseOperationKey(bk);
        const found = storageKeys.some((k) => mathReportBaseOperationKey(k) === canonRow);
        if (!found) {
          push("bucket_key_mismatch_math", "warn", "מפתח שורה לא תואם לאף דלי באחסון (מתמטיקה לאחר נירמול)", {
            subjectId,
            bucketKey: bk,
            detail: { rowKey },
          });
        }
      } else if (!storageKeys.includes(bk)) {
        push("bucket_key_mismatch", "warn", "מפתח שורה לא תואם למפתח אחסון גולמי", {
          subjectId,
          bucketKey: bk,
          detail: { rowKey },
        });
      }
    }
  }

  if (Number.isFinite(startMs) && Number.isFinite(endMs) && dailyActivity.length) {
    let sumDailyQ = 0;
    for (const d of dailyActivity) {
      if (d && typeof d === "object" && Number.isFinite(Number(d.questions))) sumDailyQ += Number(d.questions);
    }
    let sumMapQ = 0;
    for (const topicMap of Object.values(maps)) {
      if (!topicMap || typeof topicMap !== "object") continue;
      for (const row of Object.values(topicMap)) {
        if (row && typeof row === "object" && Number.isFinite(Number(row.questions))) sumMapQ += Number(row.questions);
      }
    }
    if (sumDailyQ > 0 && sumMapQ > 0) {
      const ratio = sumDailyQ / sumMapQ;
      if (ratio < 0.5 || ratio > 2.5) {
        push("daily_vs_row_question_divergence", "warn", "פער גדול בין סכום שאלות יומי לבין סכום שורות (ייתכן כפילויות או מפתחות שונים)", {
          detail: { sumDailyQuestions: sumDailyQ, sumRowQuestions: sumMapQ },
        });
      }
    }
  }

  return {
    version: 1,
    issueCount: issues.length,
    issues,
  };
}
