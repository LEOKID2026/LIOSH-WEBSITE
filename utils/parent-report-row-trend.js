/**
 * מגמות ברמת שורת דוח — השוואות מבוססות נתונים בין חלונות זמן (ללא UI).
 * לא תלוי ב window; ניתן לבדיקות יחידה.
 */

import {
  splitBucketModeRowKey,
  splitTopicRowKey,
  canonicalMistakeLookupKeyForDiagnostics,
  mathMistakeEventMatchesScopedRow,
  mathScopeGradeFromSession,
  mathScopeLevelFromSession,
  normalizeSessionModeForMath,
} from "./parent-report-row-diagnostics.js";
import { normalizeMistakeEvent } from "./mistake-event.js";
import { mathReportBaseOperationKey } from "./math-report-generator.js";
import { TOPIC_EVIDENCE_THRESHOLDS } from "./parent-report-topic-evidence.js";

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

function sessionInRange(session, startMs, endMs) {
  const t = parseSessionTime(session);
  if (!Number.isFinite(t)) return false;
  return t >= startMs && t <= endMs;
}

/**
 * עקביות עם parent-report-v2:
 * - סופרים רק מפגשים עם total תקין וחיובי.
 * - בלי השלמת correct אוטומטית מנתוני legacy.
 */
export function sumQuestionsCorrectForSessions(sessions, legacyProgress) {
  let q = 0;
  let correctKnown = 0;
  if (!Array.isArray(sessions)) return { questions: 0, correct: 0 };
  sessions.forEach((s) => {
    const t =
      s && s.total !== undefined && s.total !== null ? Number(s.total) : NaN;
    if (!Number.isFinite(t) || t <= 0) return;
    const c =
      typeof s.correct === "number" &&
      Number.isFinite(s.correct) &&
      s.correct >= 0 &&
      s.correct <= t
        ? s.correct
        : NaN;
    if (!Number.isFinite(c)) return;
    q += t;
    correctKnown += c;
  });
  return { questions: q, correct: correctKnown };
}

export const MIN_TREND_POINTS = 3;

function isValidSessionForAccuracyAggregation(s) {
  if (!s || typeof s !== "object") return false;
  const t = s.total !== undefined && s.total !== null ? Number(s.total) : NaN;
  const c =
    typeof s.correct === "number" &&
    Number.isFinite(s.correct) &&
    s.correct >= 0 &&
    Number.isFinite(t) &&
    s.correct <= t
      ? s.correct
      : NaN;
  return Number.isFinite(t) && t > 0 && Number.isFinite(c);
}

function sessionDurationSeconds(session) {
  if (!session || typeof session !== "object") return 0;
  if (session.duration !== undefined && session.duration !== null) {
    const n = Number(session.duration);
    if (Number.isFinite(n) && n >= 0) return n;
    return 0;
  }
  const total = session.total !== undefined && session.total !== null ? Number(session.total) : 0;
  const t = Number.isFinite(total) ? total : 0;
  return t * 30;
}

function fixAccuracy(agg) {
  const q = Number(agg?.questions) || 0;
  if (q <= 0) return null;
  return Math.round(((Number(agg.correct) || 0) / q) * 100);
}

function directionFromDelta(delta, threshold = 5) {
  if (delta == null || !Number.isFinite(delta)) return "unknown";
  if (delta >= threshold) return "up";
  if (delta <= -threshold) return "down";
  return "flat";
}

function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function mean(nums) {
  const a = nums.filter((n) => Number.isFinite(n));
  if (!a.length) return null;
  return a.reduce((s, n) => s + n, 0) / a.length;
}

function mistakeMatchesRowEsm(subjectId, topicRowKey, row, ev) {
  const split = splitBucketModeRowKey(String(topicRowKey || ""));
  const bucketKey = row?.bucketKey || split.bucketKey || null;
  const to = String(ev.topicOrOperation || ev.bucketKey || "").trim();
  const b = String(bucketKey || "").trim();
  if (!b && !to) return false;
  if (subjectId === "math") {
    const kb = mathReportBaseOperationKey(String(bucketKey || ""));
    const kt = mathReportBaseOperationKey(String(to || ""));
    if (!kb || !kt || kb !== kt) return false;
    const parts = splitTopicRowKey(String(topicRowKey || ""));
    if (parts.gradeScope != null && parts.levelScope != null) {
      return mathMistakeEventMatchesScopedRow(String(topicRowKey || ""), ev);
    }
    return true;
  }
  const c1 = canonicalMistakeLookupKeyForDiagnostics(subjectId, b);
  const c2 = canonicalMistakeLookupKeyForDiagnostics(subjectId, to);
  return c1 && c2 && c1 === c2;
}

export function filterMistakesForRow(subjectId, topicRowKey, row, mistakes, startMs, endMs) {
  const arr = Array.isArray(mistakes) ? mistakes : [];
  const out = [];
  for (const m of arr) {
    if (!m || typeof m !== "object") continue;
    const ev = normalizeMistakeEvent(m, subjectId);
    const t = ev.timestamp;
    if (t == null || t < startMs || t > endMs) continue;
    if (!mistakeMatchesRowEsm(subjectId, topicRowKey, row, ev)) continue;
    out.push(ev);
  }
  return out;
}

function independenceMetrics(mistakes) {
  const ws = mistakes.filter((e) => !e.isCorrect);
  const n = ws.length;
  if (!n) return { hintRate: null, avgRetry: null, changedRate: null, firstTryCorrectRate: null };
  let hints = 0;
  let hintKnown = 0;
  let retries = 0;
  let retryKnown = 0;
  let changed = 0;
  let changedKnown = 0;
  let firstTry = 0;
  let firstKnown = 0;
  for (const e of ws) {
    if (e.hintUsed === true) hints += 1;
    if (e.hintUsed === true || e.hintUsed === false) hintKnown += 1;
    if (e.retryCount != null && Number.isFinite(e.retryCount)) {
      retries += Number(e.retryCount);
      retryKnown += 1;
    }
    if (e.changedAnswer === true) changed += 1;
    if (e.changedAnswer === true || e.changedAnswer === false) changedKnown += 1;
    if (e.firstTryCorrect === false) firstTry += 1;
    if (e.firstTryCorrect === true || e.firstTryCorrect === false) firstKnown += 1;
  }
  return {
    hintRate: hintKnown ? hints / hintKnown : null,
    avgRetry: retryKnown ? retries / retryKnown : null,
    changedRate: changedKnown ? changed / changedKnown : null,
    firstTryCorrectRate: firstKnown ? 1 - firstTry / firstKnown : null,
  };
}

function scoreIndependence(m) {
  const hr = m.hintRate;
  const ar = m.avgRetry;
  const cr = m.changedRate;
  const f = m.firstTryCorrectRate;
  let score = 0.5;
  if (hr != null) score += 0.25 * (1 - Math.min(1, hr * 2));
  if (ar != null) score += 0.15 * (1 - Math.min(1, ar / 3));
  if (cr != null) score += 0.15 * (1 - Math.min(1, cr * 2));
  if (f != null) score += 0.2 * f;
  return Math.max(0, Math.min(1, score));
}

/**
 * @param {object} params
 * @param {string} params.subjectId
 * @param {string} params.topicRowKey
 * @param {Record<string, unknown>} params.row
 * @param {unknown[]} params.sessionsCurrentPeriod
 * @param {unknown[]} params.prevPeriodSessions
 * @param {unknown} params.legacyProgress
 * @param {number} params.periodStartMs
 * @param {number} params.periodEndMs
 * @param {unknown[]} [params.rawMistakesSubject]
 */
export function computeRowTrend({
  subjectId,
  topicRowKey,
  row,
  sessionsCurrentPeriod,
  prevPeriodSessions,
  legacyProgress,
  periodStartMs,
  periodEndMs,
  rawMistakesSubject,
}) {
  const curSess = Array.isArray(sessionsCurrentPeriod) ? sessionsCurrentPeriod : [];
  const prevSess = Array.isArray(prevPeriodSessions) ? prevPeriodSessions : [];
  const validCurSessionCount = curSess.filter(isValidSessionForAccuracyAggregation).length;
  const validPrevSessionCount = prevSess.filter(isValidSessionForAccuracyAggregation).length;
  const trendEvidencePoints = validCurSessionCount + validPrevSessionCount;
  const hasMinTrendEvidence = trendEvidencePoints >= MIN_TREND_POINTS;
  const aggCurrent = sumQuestionsCorrectForSessions(curSess, legacyProgress || {});
  const aggPrev = sumQuestionsCorrectForSessions(prevSess, legacyProgress || {});
  const accCurrent = fixAccuracy(aggCurrent);
  const accPrev = fixAccuracy(aggPrev);

  const durationMs = Math.max(1, periodEndMs - periodStartMs);
  const shortWindowMs = Math.min(3 * 24 * 60 * 60 * 1000, Math.floor(durationMs * 0.25));
  const recentStart = periodEndMs - shortWindowMs;
  const recentSessions = curSess.filter((s) => {
    const t = parseSessionTime(s);
    return Number.isFinite(t) && t >= recentStart && t <= periodEndMs;
  });
  const aggRecent = sumQuestionsCorrectForSessions(recentSessions, legacyProgress || {});
  const accRecent = fixAccuracy(aggRecent);

  const sorted = [...curSess].sort((a, b) => (parseSessionTime(a) || 0) - (parseSessionTime(b) || 0));
  const lastFew = sorted.slice(-4);
  const aggLastFew = sumQuestionsCorrectForSessions(lastFew, legacyProgress || {});
  const accLastFew = fixAccuracy(aggLastFew);

  const accuracyDirection =
    !hasMinTrendEvidence || accCurrent == null || accPrev == null
      ? "unknown"
      : directionFromDelta((accCurrent || 0) - (accPrev || 0), 5);

  const durFull = curSess.map(sessionDurationSeconds).filter((x) => x > 0);
  const durRecent = recentSessions.map(sessionDurationSeconds).filter((x) => x > 0);
  const medFull = median(durFull);
  const medRecent = median(durRecent);
  let fluencyDirection = "unknown";
  if (
    hasMinTrendEvidence &&
    medFull != null &&
    medRecent != null &&
    durFull.length >= 2 &&
    durRecent.length >= 1
  ) {
    const deltaSec = medRecent - medFull;
    if (deltaSec <= -8) fluencyDirection = "up";
    else if (deltaSec >= 8) fluencyDirection = "down";
    else fluencyDirection = "flat";
  }

  const prevStart = periodStartMs - (periodEndMs - periodStartMs + 1);
  const prevEnd = periodStartMs - 1;
  const mCur = filterMistakesForRow(subjectId, topicRowKey, row, rawMistakesSubject || [], periodStartMs, periodEndMs);
  const mPrev = filterMistakesForRow(subjectId, topicRowKey, row, rawMistakesSubject || [], prevStart, prevEnd);
  const indCur = independenceMetrics(mCur);
  const indPrev = independenceMetrics(mPrev);
  const sCur = mCur.filter((e) => !e.isCorrect).length >= 3 ? scoreIndependence(indCur) : null;
  const sPrev = mPrev.filter((e) => !e.isCorrect).length >= 3 ? scoreIndependence(indPrev) : null;
  let independenceDirection = "unknown";
  if (hasMinTrendEvidence && sCur != null && sPrev != null) {
    independenceDirection = directionFromDelta((sCur - sPrev) * 100, 8);
  } else if (sCur != null && sPrev == null && mPrev.length === 0) {
    independenceDirection = "unknown";
  }

  const nCur = aggCurrent.questions || 0;
  const nPrev = aggPrev.questions || 0;
  const nWrongSignals = mCur.filter((e) => !e.isCorrect).length;
  const trendConfidence = Math.round(
    Math.max(
      0,
      Math.min(
        1,
        0.35 * Math.min(1, nCur / 24) +
          0.35 * Math.min(1, nPrev / 24) +
          0.2 * Math.min(1, nWrongSignals / 10) +
          0.1 * (lastFew.length >= 3 ? 1 : lastFew.length / 3)
      )
    ) * 100
  ) / 100;

  const hasEnoughQuestionsForStatus =
    nCur >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate;
  const parts = [];
  if (accCurrent != null) parts.push(`בטווח הנוכחי כ-${accCurrent}% דיוק על ${nCur} שאלות`);
  if (accPrev != null && nPrev > 0) parts.push(`בתקופה המקבילה הקודמת כ-${accPrev}% (${nPrev} שאלות)`);
  if (accRecent != null && recentSessions.length) parts.push(`בחלון האחרון בטווח כ-${accRecent}% דיוק`);
  if (!parts.length && !hasEnoughQuestionsForStatus) {
    parts.push("אין מספיק מפגשים בטווח כדי להשוות מגמה");
  }
  if (!hasMinTrendEvidence && !hasEnoughQuestionsForStatus) {
    parts.push(`אין מספיק מפגשים תקינים להשוואת מגמה אמינה (נדרשים לפחות ${MIN_TREND_POINTS})`);
  }
  let summaryHe = parts.join(" · ") + ".";
  if (trendConfidence < 0.35) {
    summaryHe +=
      " בשלב הזה ההשוואה בין תקופות רגישה לרעש - כדאי לאמת שוב אחרי עוד תרגול.";
  } else if (trendConfidence < 0.55) {
    summaryHe += " ההשוואה לתקופה קודמת עדיין עדינה - שווה לצבור עוד קצת נתון.";
  }

  return {
    version: 1,
    windows: {
      currentPeriod: {
        startMs: periodStartMs,
        endMs: periodEndMs,
        questions: nCur,
        accuracy: accCurrent,
        sessionCount: curSess.length,
      },
      previousComparablePeriod: {
        startMs: prevStart,
        endMs: prevEnd,
        questions: nPrev,
        accuracy: accPrev,
        sessionCount: prevSess.length,
      },
      recentShortWindow: {
        startMs: recentStart,
        endMs: periodEndMs,
        questions: aggRecent.questions || 0,
        accuracy: accRecent,
        sessionCount: recentSessions.length,
        windowMs: shortWindowMs,
      },
      lastSessionsInRow: {
        sessionCount: lastFew.length,
        questions: aggLastFew.questions || 0,
        accuracy: accLastFew,
      },
    },
    accuracyDirection,
    fluencyDirection,
    independenceDirection,
    confidence: trendConfidence,
    trendEvidenceStatus: hasMinTrendEvidence ? "sufficient" : "insufficient",
    summaryHe,
    evidence: {
      validCurrentSessionCount: validCurSessionCount,
      validPreviousSessionCount: validPrevSessionCount,
      trendEvidencePoints,
      minTrendPointsRequired: MIN_TREND_POINTS,
      medianSessionDurationSecFullPeriod: medFull,
      medianSessionDurationSecRecentWindow: medRecent,
      mistakeWrongCountCurrent: mCur.filter((e) => !e.isCorrect).length,
      mistakeWrongCountPrevious: mPrev.filter((e) => !e.isCorrect).length,
      independenceCurrent: indCur,
      independencePrevious: indPrev,
    },
  };
}

/**
 * מוסיף לכל שורה אובייקט trend לפי אחסון גולמי (אותו מפתח דלי כמו ב V2).
 * @param {Record<string, Record<string, unknown>>} maps
 * @param {Record<string, unknown>} trackingSnapshots bucket פר מקצוע (operations/topics)
 * @param {Record<string, unknown[]>} rawMistakesBySubject
 * @param {number} periodStartMs
 * @param {number} periodEndMs
 */
export function enrichTopicMapsWithRowTrends(
  maps,
  trackingSnapshots,
  rawMistakesBySubject,
  periodStartMs,
  periodEndMs
) {
  const duration = Math.max(0, periodEndMs - periodStartMs);
  const prevEndMs = periodStartMs - 1;
  const prevStartMs = periodStartMs - duration - 1;

  const subjects = Object.entries(maps || {});
  for (const [subjectId, topicMap] of subjects) {
    if (!topicMap || typeof topicMap !== "object") continue;
    const bucket = trackingSnapshots?.[subjectId] || {};
    const mistakes = rawMistakesBySubject?.[subjectId] || [];
    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const tp = splitTopicRowKey(String(topicRowKey || ""));
      const bucketKey = tp.bucketKey;
      const modeKey = tp.modeKey;
      const storageKey =
        subjectId === "math" ? Object.keys(bucket).find((k) => mathReportBaseOperationKey(k) === bucketKey) : bucketKey;
      const rawItem = storageKey != null ? bucket[storageKey] : null;
      const list = normalizeSessionsArray(rawItem?.sessions);
      const modeNorm = modeKey && String(modeKey) !== "" ? String(modeKey) : String(row.modeKey || "learning");
      const sessionsCurrent = list.filter((s) => {
        if (!sessionInRange(s, periodStartMs, periodEndMs)) return false;
        if (normalizeSessionModeForMath(s) !== modeNorm) return false;
        if (
          subjectId === "math" &&
          tp.gradeScope != null &&
          tp.levelScope != null &&
          String(topicRowKey).split("\u0001").length >= 4
        ) {
          return (
            mathScopeGradeFromSession(s) === tp.gradeScope && mathScopeLevelFromSession(s) === tp.levelScope
          );
        }
        return true;
      });
      const prevSessions = list.filter((s) => {
        if (!sessionInRange(s, prevStartMs, prevEndMs)) return false;
        if (normalizeSessionModeForMath(s) !== modeNorm) return false;
        if (
          subjectId === "math" &&
          tp.gradeScope != null &&
          tp.levelScope != null &&
          String(topicRowKey).split("\u0001").length >= 4
        ) {
          return (
            mathScopeGradeFromSession(s) === tp.gradeScope && mathScopeLevelFromSession(s) === tp.levelScope
          );
        }
        return true;
      });
      const legacyProgress = { total: 0, correct: 0 };
      row.trend = computeRowTrend({
        subjectId,
        topicRowKey,
        row,
        sessionsCurrentPeriod: sessionsCurrent,
        prevPeriodSessions: prevSessions,
        legacyProgress,
        periodStartMs,
        periodEndMs,
        rawMistakesSubject: mistakes,
      });
    }
  }
}
