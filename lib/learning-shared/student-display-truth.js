/**
 * Phase 3 — Student dashboard display truth states.
 * Pure helpers (browser + Node). Never treat localStorage / defaults as server truth.
 */

/** @typedef {"loading"|"unavailable"|"noData"|"realZero"|"estimated"|"serverConfirmed"} StudentDisplayTruthState */

export const StudentDisplayTruthState = Object.freeze({
  loading: "loading",
  unavailable: "unavailable",
  noData: "noData",
  realZero: "realZero",
  estimated: "estimated",
  serverConfirmed: "serverConfirmed",
});

export const STUDENT_TRUTH_LABELS_HE = Object.freeze({
  noData: "אין עדיין נתונים",
  unavailable: "הנתון לא זמין כרגע",
  loading: "טוען…",
  cumulative: "מצטבר",
  periodThisMonth: "לחודש הנוכחי (ישראל)",
  periodLifetime: "מצטבר מכל הפגישות",
  completedSessionsOnly: "מפגישות שהושלמו",
  allSessionsWithDuration: "מכל הפגישות עם משך",
  creditedLearningMinutes: "זמן למידה מזוכה - שאלות, ספרים ופעילות מהורה",
});

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function finiteNumberOrNull(raw) {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Classify a server numeric field for display.
 * @param {unknown} raw
 * @param {{ gradedCount?: number | null, serverConfirmed?: boolean }} [opts]
 */
export function classifyServerNumber(raw, opts = {}) {
  const { gradedCount = null, serverConfirmed = true } = opts;
  const n = finiteNumberOrNull(raw);

  if (n === null) {
    return {
      value: null,
      state: serverConfirmed ? StudentDisplayTruthState.noData : StudentDisplayTruthState.unavailable,
      displayHe: serverConfirmed ? STUDENT_TRUTH_LABELS_HE.noData : STUDENT_TRUTH_LABELS_HE.unavailable,
    };
  }

  if (n === 0 && gradedCount === 0) {
    return {
      value: 0,
      state: StudentDisplayTruthState.noData,
      displayHe: STUDENT_TRUTH_LABELS_HE.noData,
    };
  }

  if (n === 0) {
    return {
      value: 0,
      state: StudentDisplayTruthState.realZero,
      displayHe: "0",
    };
  }

  return {
    value: n,
    state: StudentDisplayTruthState.serverConfirmed,
    displayHe: String(n),
  };
}

/**
 * @param {unknown} pct — percent 0–100 or null
 * @param {{ gradedCount?: number | null }} [opts]
 */
export function formatStudentPercentHe(pct, opts = {}) {
  const graded = opts.gradedCount;
  if (graded === 0) return STUDENT_TRUTH_LABELS_HE.noData;
  if (pct === null || pct === undefined) return STUDENT_TRUTH_LABELS_HE.noData;
  const n = Number(pct);
  if (!Number.isFinite(n)) return STUDENT_TRUTH_LABELS_HE.noData;
  const rounded = Math.round(n);
  if (graded != null && graded > 0 && rounded === 0) return "0%";
  if (rounded === 0 && graded == null) return STUDENT_TRUTH_LABELS_HE.noData;
  return `${rounded}%`;
}

/**
 * Subject accuracy from derived.bySubject slice — null when no graded answers.
 * @param {{ correctTotal?: unknown, wrongTotal?: unknown, accuracy?: unknown } | null | undefined} sub
 */
export function subjectAccuracyFromDerivedSub(sub) {
  if (!sub || typeof sub !== "object") {
    return { pct: null, gradedCount: 0, state: StudentDisplayTruthState.noData };
  }
  const correct = Math.max(0, Math.floor(finiteNumberOrNull(sub.correctTotal) ?? 0));
  const wrong = Math.max(0, Math.floor(finiteNumberOrNull(sub.wrongTotal) ?? 0));
  const graded = correct + wrong;
  if (graded <= 0) {
    return { pct: null, gradedCount: 0, state: StudentDisplayTruthState.noData };
  }
  const raw = sub.accuracy;
  const fromDerived = typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : null;
  const pct = fromDerived != null ? fromDerived : Math.round((correct / graded) * 100);
  return {
    pct,
    gradedCount: graded,
    state: pct === 0 ? StudentDisplayTruthState.realZero : StudentDisplayTruthState.serverConfirmed,
  };
}

/**
 * @param {unknown} balance
 * @param {"loading"|"ready"|"error"} [loadPhase]
 */
export function formatStudentCoinBalance(balance, loadPhase = "ready") {
  if (loadPhase === "loading") {
    return {
      value: null,
      state: StudentDisplayTruthState.loading,
      displayHe: STUDENT_TRUTH_LABELS_HE.loading,
    };
  }
  if (loadPhase === "error") {
    return {
      value: null,
      state: StudentDisplayTruthState.unavailable,
      displayHe: STUDENT_TRUTH_LABELS_HE.unavailable,
    };
  }
  const n = finiteNumberOrNull(balance);
  if (n === null) {
    return {
      value: null,
      state: StudentDisplayTruthState.unavailable,
      displayHe: STUDENT_TRUTH_LABELS_HE.unavailable,
    };
  }
  return classifyServerNumber(n, { serverConfirmed: true });
}

/**
 * @param {unknown} minutes
 * @param {{ serverConfirmed?: boolean, filterNoteHe?: string | null }} [opts]
 */
export function classifyMonthlyMinutes(minutes, opts = {}) {
  const { serverConfirmed = true, filterNoteHe = null } = opts;
  const base = classifyServerNumber(minutes, { serverConfirmed });
  return {
    ...base,
    filterNoteHe,
    scopeLabelHe: STUDENT_TRUTH_LABELS_HE.periodThisMonth,
  };
}

/**
 * Daily / weekly challenge progress — mark inferred/reconciled separately from server-only.
 * @param {{ reconciled?: boolean, questionsToday?: number, serverOnly?: boolean }} meta
 * @param {number | null} progressPct
 */
export function classifyChallengeProgressPct(meta, progressPct) {
  if (meta?.reconciled) {
    return {
      pct: progressPct,
      state: StudentDisplayTruthState.estimated,
      displayHe: progressPct != null ? `${progressPct}% (משוער)` : STUDENT_TRUTH_LABELS_HE.noData,
    };
  }
  if (meta?.serverOnly === false) {
    return {
      pct: progressPct,
      state: StudentDisplayTruthState.estimated,
      displayHe: progressPct != null ? `${progressPct}%` : STUDENT_TRUTH_LABELS_HE.noData,
    };
  }
  const q = Number(meta?.questionsToday) || 0;
  if (q <= 0 && (progressPct === 0 || progressPct == null)) {
    return {
      pct: null,
      state: StudentDisplayTruthState.noData,
      displayHe: STUDENT_TRUTH_LABELS_HE.noData,
    };
  }
  if (progressPct === 0) {
    return { pct: 0, state: StudentDisplayTruthState.realZero, displayHe: "0%" };
  }
  return {
    pct: progressPct,
    state: StudentDisplayTruthState.serverConfirmed,
    displayHe: progressPct != null ? `${progressPct}%` : STUDENT_TRUTH_LABELS_HE.noData,
  };
}
