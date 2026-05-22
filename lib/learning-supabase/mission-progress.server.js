/**
 * Child World Phase 2 — Daily Mission Progress
 *
 * Manages daily missions for students:
 *  - Selects 3 static MVP missions per grade band per Israel calendar day
 *  - Tracks progress incrementally after each completed session
 *  - Awards 20 Learning Coins per completed mission (idempotent)
 *
 * Owner decision (2026-05-22): All daily resets use Asia/Jerusalem calendar date.
 * UTC midnight must never be used for student-facing daily logic.
 *
 * Grade bands:
 *  g12 — grade_1, grade_2
 *  g34 — grade_3, grade_4
 *  g56 — grade_5, grade_6
 *
 * Daily state lives in student_learning_state.challenges.daily:
 *   {
 *     date:         "YYYY-MM-DD" (Israel calendar date),
 *     missions:     [{ id, textHe, type, target, progress, completed, coinAwarded, rewardCoins }],
 *     subjectsSeen: string[]      (distinct subjects practiced today — used for subjects-type missions)
 *   }
 *
 * Mission coin idempotency key: mission_complete_{studentId}_{date}_{missionId}
 * Mission rewards are separate from and do NOT count toward the 300/day session coin cap.
 */

import { applyArcadeCoinMove } from "../arcade/server/arcade-coins";

// ── Constants ──────────────────────────────────────────────────────────────
const MISSION_REWARD_COINS   = 20;
const MISSION_COIN_REASON     = "mission_complete";
const MISSION_COIN_SOURCE_TYPE = "mission_complete";

// ── Static mission pool ────────────────────────────────────────────────────
const MISSION_POOL = {
  g12: [
    { id: "questions_10", textHe: "ענה על 10 שאלות היום",    type: "questions", target: 10 },
    { id: "minutes_5",    textHe: "למד 5 דקות היום",          type: "minutes",   target: 5  },
    { id: "subjects_1",   textHe: "תרגל מקצוע אחד לפחות",    type: "subjects",  target: 1  },
  ],
  g34: [
    { id: "questions_15", textHe: "ענה על 15 שאלות היום",    type: "questions", target: 15 },
    { id: "minutes_8",    textHe: "למד 8 דקות היום",          type: "minutes",   target: 8  },
    { id: "subjects_2",   textHe: "תרגל שני מקצועות שונים",  type: "subjects",  target: 2  },
  ],
  g56: [
    { id: "questions_20", textHe: "ענה על 20 שאלות היום",    type: "questions", target: 20 },
    { id: "minutes_10",   textHe: "למד 10 דקות היום",         type: "minutes",   target: 10 },
    { id: "subjects_2",   textHe: "תרגל שני מקצועות שונים",  type: "subjects",  target: 2  },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Today's calendar date in Asia/Jerusalem timezone, formatted as "YYYY-MM-DD".
 * Owner decision (2026-05-22): always use Israel calendar day for student-facing daily logic.
 */
export function getIsraelDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

/**
 * Map grade_level key (e.g. "grade_3") to a grade band string.
 * Defaults to "g34" for unknown/missing grade levels.
 */
export function getGradeBand(gradeLevel) {
  const k = String(gradeLevel || "").toLowerCase().trim();
  if (k === "grade_1" || k === "grade_2") return "g12";
  if (k === "grade_5" || k === "grade_6") return "g56";
  return "g34"; // grade_3, grade_4, and fallback
}

/** Build a fresh daily state for a given grade band and date string. */
function buildFreshDailyState(gradeBand, date) {
  const pool = MISSION_POOL[gradeBand] ?? MISSION_POOL.g34;
  return {
    date,
    missions: pool.map((m) => ({
      id:          m.id,
      textHe:      m.textHe,
      type:        m.type,
      target:      m.target,
      progress:    0,
      completed:   false,
      coinAwarded: false,
      rewardCoins: MISSION_REWARD_COINS,
    })),
    subjectsSeen: [],
  };
}

// ── Pure state helpers (exported for testing) ──────────────────────────────

/**
 * Ensure the challenges object contains today's daily missions.
 * Returns `{ challenges, changed }`.
 *   - If today's missions already exist → unchanged.
 *   - If stale/missing → creates fresh missions for today.
 */
export function ensureTodayMissions(challenges, gradeLevel, today) {
  const ch = isPlainObject(challenges) ? challenges : {};
  const daily = ch.daily;
  if (
    isPlainObject(daily) &&
    daily.date === today &&
    Array.isArray(daily.missions) &&
    daily.missions.length === 3
  ) {
    return { challenges: ch, changed: false };
  }
  const band = getGradeBand(gradeLevel);
  return {
    challenges: { ...ch, daily: buildFreshDailyState(band, today) },
    changed: true,
  };
}

/**
 * Apply one completed session's data to today's missions.
 * Ensures today's missions exist (creates if stale/missing) then updates progress.
 *
 * @param {object} challenges  - raw challenges JSON from student_learning_state
 * @param {string} gradeLevel  - student grade key (e.g. "grade_3")
 * @param {{ totalQuestions: number, durationSeconds: number, subject: string|null }} session
 * @param {string} today       - "YYYY-MM-DD" in Israel timezone
 * @returns {{ updatedChallenges: object, newlyCompleted: string[] }}
 */
export function applySessionToMissions(challenges, gradeLevel, session, today) {
  const { challenges: ch } = ensureTodayMissions(challenges, gradeLevel, today);
  const daily = { ...ch.daily };

  const { totalQuestions = 0, durationSeconds = 0, subject = null } = session;
  const durationMinutes = typeof durationSeconds === "number" && durationSeconds > 0
    ? durationSeconds / 60 : 0;

  // Track distinct subjects seen today
  const subjectsSeen = Array.isArray(daily.subjectsSeen) ? [...daily.subjectsSeen] : [];
  if (subject && typeof subject === "string" && !subjectsSeen.includes(subject)) {
    subjectsSeen.push(subject);
  }

  const newlyCompleted = [];
  const missions = (Array.isArray(daily.missions) ? daily.missions : []).map((m) => {
    if (m.completed) return m;
    const m2 = { ...m };
    if (m2.type === "questions") {
      m2.progress = Math.min(m2.target, (m2.progress || 0) + (Number(totalQuestions) || 0));
    } else if (m2.type === "minutes") {
      m2.progress = Math.min(m2.target, (m2.progress || 0) + durationMinutes);
    } else if (m2.type === "subjects") {
      m2.progress = Math.min(m2.target, subjectsSeen.length);
    }
    if (m2.progress >= m2.target && !m2.completed) {
      m2.completed = true;
      newlyCompleted.push(m2.id);
    }
    return m2;
  });

  return {
    updatedChallenges: { ...ch, daily: { ...daily, missions, subjectsSeen } },
    newlyCompleted,
  };
}

// ── DB helpers ─────────────────────────────────────────────────────────────

/**
 * Award 20 Learning Coins for each completed mission (idempotent per key).
 * Returns an array of award results.
 */
async function awardMissionCoins(supabase, studentId, date, missionIds) {
  const results = [];
  for (const missionId of missionIds) {
    const idempotencyKey = `mission_complete_${studentId}_${date}_${missionId}`;
    const r = await applyArcadeCoinMove(supabase, {
      studentId,
      direction:      "earn",
      amount:          MISSION_REWARD_COINS,
      idempotencyKey,
      sourceType:      MISSION_COIN_SOURCE_TYPE,
      sourceId:        missionId,
      metadata:        { date, missionId },
      reason:          MISSION_COIN_REASON,
    });
    results.push({ missionId, ok: r.ok, duplicate: r.duplicate === true, balanceAfter: r.balanceAfter });
  }
  return results;
}

/**
 * Ensure today's daily missions exist in the DB for a student.
 * Called from home-profile.js on page load.
 * Returns the (potentially updated) challenges object, or null on error.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} gradeLevel
 * @returns {Promise<object|null>}
 */
export async function ensureDailyMissionsInDb(supabase, studentId, gradeLevel) {
  const today = getIsraelDateString();

  const { data: row } = await supabase
    .from("student_learning_state")
    .select("id,challenges")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!row?.id) return null;

  const existing = isPlainObject(row.challenges) ? row.challenges : {};
  const { challenges: updated, changed } = ensureTodayMissions(existing, gradeLevel, today);

  if (!changed) return updated;

  const { error } = await supabase
    .from("student_learning_state")
    .update({ challenges: updated })
    .eq("student_id", studentId);

  if (error) return existing; // Return old on write failure; non-fatal
  return updated;
}

/**
 * Update mission progress after a completed learning session.
 * Called from session/finish.js — never throws, never fails the HTTP response.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   studentId: string,
 *   gradeLevel: string|null|undefined,
 *   totalQuestions: number,
 *   durationSeconds: number,
 *   subject: string|null,
 * }} params
 * @returns {Promise<{ ok: boolean, newlyCompleted?: string[], reason?: string }>}
 */
export async function updateDailyMissionProgress(supabase, {
  studentId,
  gradeLevel,
  totalQuestions,
  durationSeconds,
  subject,
}) {
  try {
    const today = getIsraelDateString();

    const { data: row } = await supabase
      .from("student_learning_state")
      .select("id,challenges")
      .eq("student_id", studentId)
      .maybeSingle();

    if (!row?.id) return { ok: false, reason: "no_state_row" };

    const existing = isPlainObject(row.challenges) ? row.challenges : {};
    const { updatedChallenges, newlyCompleted } = applySessionToMissions(
      existing,
      gradeLevel,
      { totalQuestions, durationSeconds, subject },
      today
    );

    // Award coins for newly completed missions first (idempotent RPC handles dedup)
    let awardResults = [];
    if (newlyCompleted.length > 0) {
      awardResults = await awardMissionCoins(supabase, studentId, today, newlyCompleted);
    }

    // Mark coinAwarded for successfully-awarded missions (non-duplicate)
    const freshlyAwarded = new Set(
      awardResults.filter((r) => r.ok && !r.duplicate).map((r) => r.missionId)
    );
    const finalMissions = (updatedChallenges.daily?.missions || []).map((m) => ({
      ...m,
      coinAwarded: freshlyAwarded.has(m.id) ? true : m.coinAwarded,
    }));
    const finalChallenges = {
      ...updatedChallenges,
      daily: { ...updatedChallenges.daily, missions: finalMissions },
    };

    // Save final state once
    const { error: saveErr } = await supabase
      .from("student_learning_state")
      .update({ challenges: finalChallenges })
      .eq("student_id", studentId);

    if (saveErr) {
      return { ok: false, reason: "save_failed", detail: saveErr.message };
    }

    return { ok: true, newlyCompleted, awardResults };
  } catch (err) {
    return { ok: false, reason: "error", detail: err?.message || String(err) };
  }
}
