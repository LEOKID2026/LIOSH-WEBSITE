/**
 * Learning time credit — מקור אמת יחיד לחוק המוצר.
 *
 * שאלות: עד 10 דקות לשאלה בנפרד; סכום שאלות ללא תקרה כוללת.
 * למידה פתוחה (ספרים/הסברים): ללא תקרת יחידה; הקפאה אחרי 10 דק׳ idle.
 * אין תקרת 10 על פעילות / ביקור / רצף / סשן / יום / חודש.
 * משחקים אינם מזכים.
 */

/** תקרת זמן מזוכה לשאלה אחת בלבד — 10 דקות */
export const LEARNING_UNIT_CREDIT_CAP_MS = 600_000;
export const LEARNING_UNIT_CREDIT_CAP_SECONDS = 600;
export const LEARNING_UNIT_CREDIT_CAP_MINUTES = 10;

/** הקפאת idle ללמידה פתוחה / נטישה — 10 דקות מאז פעילות לימודית אחרונה */
export const LEARNING_IDLE_FREEZE_MS = 600_000;

/** תקרת צבירה לפגישת למידה שלמה (3 שעות מזוכות) — sanity בלבד, לא תקרת 10 */
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
 * זמן מזוכה לשאלה — תקרה 10 דקות לאותה שאלה בלבד.
 * @param {number} rawMs
 */
export function creditLearningUnitMs(rawMs) {
  const n = Math.floor(Number(rawMs));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, LEARNING_UNIT_CREDIT_CAP_MS);
}

/**
 * למידה פתוחה (ספר/הסבר) — אין תקרת יחידה; sanity בלבד.
 * Idle מוחל בנפרד דרך createLearningIdleController.
 * @param {number} rawMs
 */
export function creditOpenLearningMs(rawMs) {
  const n = Math.floor(Number(rawMs));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_LEARNING_SESSION_CREDITED_MS);
}

/**
 * בקרת idle: אחרי LEARNING_IDLE_FREEZE_MS בלי פעילות לימודית — הקפאה.
 * עד אז ניתן לזכות לכל היותר idleFreezeMs מאז הפעילות האחרונה.
 * @param {{ idleFreezeMs?: number, now?: number }} [opts]
 */
export function createLearningIdleController(opts = {}) {
  const idleFreezeMs = Math.max(
    0,
    Math.floor(Number(opts.idleFreezeMs) || LEARNING_IDLE_FREEZE_MS)
  );
  let lastActivityAt = Number.isFinite(opts.now) ? Number(opts.now) : Date.now();
  let creditedSinceActivity = 0;
  let frozen = false;

  return {
    signalActivity(now = Date.now()) {
      lastActivityAt = now;
      creditedSinceActivity = 0;
      frozen = false;
    },
    /**
     * @param {number} deltaMs
     * @param {number} [now]
     */
    filterDelta(deltaMs, now = Date.now()) {
      const d = Math.floor(Number(deltaMs));
      if (!Number.isFinite(d) || d <= 0) return 0;
      if (frozen) return 0;
      if (idleFreezeMs <= 0) {
        creditedSinceActivity += d;
        return d;
      }
      const room = Math.max(0, idleFreezeMs - creditedSinceActivity);
      const credit = Math.min(d, room);
      creditedSinceActivity += credit;
      if (creditedSinceActivity >= idleFreezeMs) {
        frozen = true;
      }
      // If wall clock since last activity already past freeze and room exhausted
      if (now - lastActivityAt >= idleFreezeMs && creditedSinceActivity >= idleFreezeMs) {
        frozen = true;
      }
      return credit;
    },
    isFrozen: () => frozen,
    getCreditedSinceActivity: () => creditedSinceActivity,
    getLastActivityAt: () => lastActivityAt,
  };
}

/**
 * @param {number} totalMs
 */
export function creditedMsToRoundedMinutes(totalMs) {
  const ms = Math.max(0, Math.floor(Number(totalMs) || 0));
  return Math.round((ms / 60_000) * 100) / 100;
}

/**
 * @param {number} sessionMs
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
 */
export function deriveTimingStatus(rawMs, capMs = LEARNING_UNIT_CREDIT_CAP_MS) {
  if (rawMs == null || typeof rawMs !== "number" || rawMs <= 0) return "no_timer";
  if (rawMs <= capMs) return "normal";
  if (rawMs <= capMs * 2) return "long";
  return "very_long";
}

/**
 * @param {unknown} payload
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
 * יתום — זמן יחידה פתוחה שלא נשמרה כתשובה (נטישה/יציאה).
 * תקרה 10 דק׳ ליחידה נטושה בלבד (idle), לא לסשן שלם.
 */
export function resolveSessionOrphanCreditedMs(
  answerSumMs,
  clientAccruedMs,
  storedDurationSeconds = 0
) {
  const answers = Math.max(0, Math.floor(Number(answerSumMs) || 0));
  const clientTotal = Math.max(0, Math.floor(Number(clientAccruedMs) || 0));
  const fromClient = Math.max(0, clientTotal - answers);
  const storedMs = capStoredSessionDurationSeconds(storedDurationSeconds) * 1000;
  const fromStored = Math.max(0, storedMs - answers);
  const gap = Math.max(fromClient, fromStored);
  return creditLearningUnitMs(gap);
}

/**
 * סכום זמני שאלות מזוכות (כל אחת capped ל-10) — ללא תקרה על הסכום.
 * @param {number[]} questionRawMsList
 */
export function sumQuestionCreditedMs(questionRawMsList) {
  let total = 0;
  for (const raw of questionRawMsList || []) {
    total += creditLearningUnitMs(raw);
  }
  return total;
}
