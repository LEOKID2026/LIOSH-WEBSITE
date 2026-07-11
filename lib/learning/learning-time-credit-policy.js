/**
 * Learning time credit — מקור אמת יחיד לחוק המוצר.
 *
 * כל יחידת למידה (שאלה, עמוד ספר, שלב צעד-צעד וכו') מזכה עד 10 דקות.
 * עדיף לזכות מעט יותר מאשר פחות — אין קנס על רמזים, הסברים או השהייה.
 * משחקים (Solo, חינוכי, Arcade, Offline, עם חברים) אינם מזכים.
 */

/** תקרת זמן מזוכה ליחידת למידה אחת — 10 דקות */
export const LEARNING_UNIT_CREDIT_CAP_MS = 600_000;
export const LEARNING_UNIT_CREDIT_CAP_SECONDS = 600;
export const LEARNING_UNIT_CREDIT_CAP_MINUTES = 10;

/** תקרת צבירה לפגישת למידה שלמה (3 שעות מזוכות) */
export const MAX_LEARNING_SESSION_CREDITED_MS = 10_800_000;
export const MAX_LEARNING_SESSION_SECONDS = 3600;
export const MIN_LEARNING_SESSION_SECONDS = 5;

/**
 * מצבי למידה שמזכים בזמן — כל מסלול לימודי באתר.
 * (לא כולל משחקים — ראה NON_CREDITING_PLAY_ACTIVITY_TYPES)
 */
export const CREDITABLE_LEARNING_MODES = Object.freeze([
  "learning",
  "practice",
  "challenge",
  "speed",
  "marathon",
  "review",
  "drill",
  "graded",
  "practice_mistakes",
  "normal",
  "mistakes",
  "quiz",
  "homework",
  "guided_practice",
  "live_lesson",
  "discussion",
  "worksheet",
  "learning_book",
  "step_by_step",
  "parent_assigned",
]);

/**
 * סוגי פעילות שלא מזכים בזמן למידה.
 */
export const NON_CREDITING_PLAY_ACTIVITY_TYPES = Object.freeze([
  "solo_game",
  "solo",
  "educational_game",
  "educational",
  "arcade",
  "offline_game",
  "offline",
  "multiplayer_game",
  "friend_game",
  "friends_game",
  "play_with_friends",
]);

/**
 * @param {number} rawMs — זמן גולמי ביחידה (ms)
 * @returns {number} זמן מזוכה לאחר תקרת 10 דקות
 */
export function creditLearningUnitMs(rawMs) {
  const n = Math.floor(Number(rawMs));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, LEARNING_UNIT_CREDIT_CAP_MS);
}

/**
 * @param {number} totalMs
 * @returns {number} דקות מעוגלות ל-2 ספרות
 */
export function creditedMsToRoundedMinutes(totalMs) {
  const ms = Math.max(0, Math.floor(Number(totalMs) || 0));
  return Math.round((ms / 60_000) * 100) / 100;
}

/**
 * @param {number} sessionMs — סכום מזוכה לפגישה
 * @returns {number} שניות לשמירה ב-learning_sessions.duration_seconds
 */
export function creditedMsToSessionDurationSeconds(sessionMs) {
  const capped = capSessionCreditedMs(sessionMs);
  if (capped <= 0) return 0;
  return Math.max(
    MIN_LEARNING_SESSION_SECONDS,
    Math.min(MAX_LEARNING_SESSION_SECONDS, Math.round(capped / 1000))
  );
}

/**
 * @param {number} sessionMs
 */
export function capSessionCreditedMs(sessionMs) {
  const n = Math.floor(Number(sessionMs));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_LEARNING_SESSION_CREDITED_MS);
}

/**
 * @param {number|null|undefined} rawSeconds
 */
export function capStoredSessionDurationSeconds(rawSeconds) {
  const ds = Math.floor(Number(rawSeconds) || 0);
  if (ds <= 0) return 0;
  return Math.min(ds, MAX_LEARNING_SESSION_SECONDS);
}

/**
 * @param {unknown} mode
 */
export function isLearningModeCreditable(mode) {
  if (mode == null) return false;
  const v = String(mode).trim().toLowerCase();
  return v.length > 0 && CREDITABLE_LEARNING_MODES.includes(v);
}

/**
 * @param {unknown} activityType
 */
export function isNonCreditingPlayActivity(activityType) {
  if (activityType == null) return false;
  const v = String(activityType).trim().toLowerCase();
  return v.length > 0 && NON_CREDITING_PLAY_ACTIVITY_TYPES.includes(v);
}

/**
 * @param {number|null} rawMs
 * @param {number} [capMs]
 * @returns {"no_timer"|"normal"|"long"|"very_long"}
 */
export function deriveTimingStatus(rawMs, capMs = LEARNING_UNIT_CREDIT_CAP_MS) {
  if (rawMs == null || typeof rawMs !== "number" || rawMs <= 0) return "no_timer";
  if (rawMs <= capMs) return "normal";
  if (rawMs <= capMs * 2) return "long";
  return "very_long";
}

/**
 * @param {unknown} payload
 * @returns {number}
 */
export function extractCreditedMsFromAnswerPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  const credited = Number(payload.creditedTimeMs);
  if (Number.isFinite(credited) && credited > 0) {
    return creditLearningUnitMs(credited);
  }
  const raw = Number(payload.rawTimeSpentMs ?? payload.timeSpentMs);
  if (Number.isFinite(raw) && raw > 0) {
    return creditLearningUnitMs(raw);
  }
  return 0;
}

/**
 * אימות שרת — מחשב זמן מזוכה ליחידה מתשובה נכנסת.
 * @param {{ rawTimeSpentMs?: number|null, creditedTimeMs?: number|null, gameMode?: string|null }} input
 */
export function resolveServerAnswerCreditedMs(input = {}) {
  const raw = Number(input.rawTimeSpentMs);
  const clientCredited = Number(input.creditedTimeMs);
  const hasRaw = Number.isFinite(raw) && raw > 0;
  const hasClient = Number.isFinite(clientCredited) && clientCredited > 0;

  if (hasRaw) {
    return creditLearningUnitMs(raw);
  }
  if (hasClient) {
    return creditLearningUnitMs(clientCredited);
  }
  return 0;
}

/**
 * יתום בפגישה — זמן של יחידה שלא נשמרה כתשובה (למשל יציאה לפני submit).
 * @param {number} answerSumMs
 * @param {number} clientAccruedMs
 * @param {number} [storedDurationSeconds]
 */
export function resolveSessionOrphanCreditedMs(
  answerSumMs,
  clientAccruedMs,
  storedDurationSeconds = 0
) {
  const answers = Math.max(0, Math.floor(Number(answerSumMs) || 0));
  const clientTotal = Math.max(0, Math.floor(Number(clientAccruedMs) || 0));
  const fromClient = Math.max(0, clientTotal - answers);
  const storedMs =
    capStoredSessionDurationSeconds(storedDurationSeconds) * 1000;
  const fromStored = Math.max(0, storedMs - answers);
  const gap = Math.max(fromClient, fromStored);
  return creditLearningUnitMs(gap);
}
