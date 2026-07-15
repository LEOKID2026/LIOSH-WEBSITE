import { buildAccountSnapshotForParentReport } from "../learning-shared/student-account-state-view.js";
import {
  computeStudentLearningDerived,
  ensureStudentLearningStateRow,
  LEARNING_PROFILE_SUBJECT_KEYS,
  normalizeLearningProfileRow,
} from "./student-learning-profile.server.js";
import { ensureDailyMissionsInDb } from "./mission-progress.server.js";
import { evaluateMonthlyPersistenceReward, buildMonthlyPersistenceStatusPayload } from "./monthly-persistence-reward.server.js";
import { trackServerAnalyticsEvent } from "../analytics/track-event.server.js";
import { evaluateAndGrantAchievementCards } from "../rewards/server/achievement-evaluator.server.js";
import { buildStudentEconomyConfigPayload } from "../rewards/server/economy-config.server.js";
import { runStudentHomeAchievementGrantsGated } from "./student-home-achievement-grants-gate.server.js";

const DERIVED_CACHE_TTL_MS = 45_000;
/** @type {Map<string, { loadedAt: number, value: Awaited<ReturnType<typeof computeStudentLearningDerived>> }>} */
const derivedCacheByStudent = new Map();

export function shouldLogStudentHomeProfilePerf() {
  return (
    process.env.STUDENT_HOME_PROFILE_PERF === "true" ||
    process.env.NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY === "true"
  );
}

export function createStudentHomeProfileTimer(label = "student-home-profile") {
  const enabled = shouldLogStudentHomeProfilePerf();
  const startedAt = Date.now();
  /** @type {Record<string, number>} */
  const steps = {};

  return {
    mark(step) {
      if (!enabled) return;
      steps[step] = Date.now() - startedAt;
    },
    finish(extra = {}) {
      if (!enabled) return;
      console.info(`[LIOSH ${label}] perf`, { totalMs: Date.now() - startedAt, steps, ...extra });
    },
  };
}

/**
 * Strip heavy scoresStore from subjects — client receives accountSnapshot computed with full row on server.
 * @param {ReturnType<typeof normalizeLearningProfileRow>} normalized
 */
export function buildSubjectsProgressOnly(normalized) {
  /** @type {Record<string, { progressStore: Record<string, unknown> }>} */
  const out = {};
  for (const key of LEARNING_PROFILE_SUBJECT_KEYS) {
    const v = normalized.subjects[key];
    const sub = v && typeof v === "object" && !Array.isArray(v) ? v : {};
    const ps =
      sub.progressStore && typeof sub.progressStore === "object" && !Array.isArray(sub.progressStore)
        ? sub.progressStore
        : {};
    out[key] = { progressStore: ps };
  }
  return out;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ useCache?: boolean }} [opts]
 */
export async function loadStudentLearningDerivedCached(supabase, studentId, opts = {}) {
  const useCache = opts.useCache !== false;
  if (useCache) {
    const hit = derivedCacheByStudent.get(studentId);
    if (hit && Date.now() - hit.loadedAt < DERIVED_CACHE_TTL_MS) {
      return hit.value;
    }
  }

  const value = await computeStudentLearningDerived(supabase, studentId);
  derivedCacheByStudent.set(studentId, { loadedAt: Date.now(), value });
  return value;
}

export function invalidateStudentLearningDerivedCache(studentId) {
  if (studentId) derivedCacheByStudent.delete(studentId);
  else derivedCacheByStudent.clear();
}

/**
 * Fast path - learning state row, today's missions, economy config, row-based account snapshot.
 * All 8 home tiles can render from this payload without derived/analytics.
 */
export async function loadStudentHomeSummaryPayload(supabase, auth, ctx = {}) {
  const timer = ctx.timer;
  const studentId = auth.studentId;
  const displayName = String(auth.student?.full_name || "").trim() || "Student";
  const gradeLevel = String(auth.student?.grade_level || "");

  timer?.mark("auth_done");

  let row = ctx.row;
  if (!row) {
    row = await ensureStudentLearningStateRow(supabase, studentId);
    timer?.mark("learning_state_row");
  }

  const normalized = ctx.normalized || normalizeLearningProfileRow(row);
  const subjectsProgressOnly = buildSubjectsProgressOnly(normalized);

  let currentChallenges = normalized.challenges;
  try {
    const freshChallenges = await ensureDailyMissionsInDb(supabase, studentId, gradeLevel);
    if (freshChallenges != null) currentChallenges = freshChallenges;
  } catch {
    /* non-fatal */
  }
  timer?.mark("missions");

  let economyConfig = null;
  let economyConfigLoadError = false;
  try {
    economyConfig = await buildStudentEconomyConfigPayload(supabase);
  } catch {
    economyConfigLoadError = true;
  }
  timer?.mark("economy_config");

  const accountSnapshot = buildAccountSnapshotForParentReport(normalized, null, displayName);
  timer?.mark("account_snapshot");

  return {
    ok: true,
    phase: "summary",
    studentId,
    accountSnapshot,
    monthly: normalized.monthly,
    profile: normalized.profile,
    challenges: currentChallenges,
    streaks: normalized.streaks,
    achievements: normalized.achievements,
    subjectsProgressOnly,
    economyConfig,
    economyConfigLoadError,
    updated_at: row.updated_at,
    derivedPending: true,
    analyticsPending: false,
  };
}

/**
 * Derived refresh — aggregates + monthly persistence. Does NOT grant achievements (separate endpoint).
 */
export async function loadStudentHomeAnalyticsPayload(supabase, params, ctx = {}) {
  const timer = ctx.timer;
  const { studentId, displayName } = params;

  let row = params.row;
  let normalized = params.normalized;
  if (!row || !normalized) {
    row = await ensureStudentLearningStateRow(supabase, studentId);
    normalized = normalizeLearningProfileRow(row);
    timer?.mark("learning_state_row");
  }

  const derived = await loadStudentLearningDerivedCached(supabase, studentId);
  timer?.mark("learning_derived");

  const accountSnapshot = buildAccountSnapshotForParentReport(normalized, derived, displayName);
  timer?.mark("account_snapshot");

  let monthlyPersistenceStatus = null;
  let monthlyPersistenceLoadError = false;
  try {
    const evalResult = await evaluateMonthlyPersistenceReward(supabase, { studentId });
    if (evalResult.ok) {
      monthlyPersistenceStatus = buildMonthlyPersistenceStatusPayload(evalResult);
    } else {
      monthlyPersistenceLoadError = true;
    }
  } catch {
    monthlyPersistenceLoadError = true;
  }
  timer?.mark("monthly_persistence");

  return {
    ok: true,
    phase: "analytics",
    studentId,
    derived,
    accountSnapshot,
    monthlyPersistenceStatus,
    monthlyPersistenceLoadError,
    derivedPending: false,
    analyticsPending: false,
  };
}

/**
 * Awaited achievement/card grants — must complete inside the request (Vercel-safe).
 * Failures are non-fatal for analytics payload but surfaced in achievementGrants.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function runStudentHomeAchievementGrants(supabase, studentId, opts = {}) {
  return runStudentHomeAchievementGrantsGated(supabase, studentId, async (client, sid) => {
    try {
      const result = await evaluateAndGrantAchievementCards(client, sid);
      const granted = Array.isArray(result?.granted) ? result.granted : [];
      return {
        ok: result?.ok !== false,
        grantedCount: granted.length,
        granted,
      };
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
      return { ok: false, grantedCount: 0, granted: [], error: msg.slice(0, 500) };
    }
  }, opts);
}

/**
 * Non-critical telemetry only (summary path). Card/coin grants use runStudentHomeAchievementGrants.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   studentId: string,
 *   studentSessionId?: string | null,
 *   gradeLevel?: string | null,
 * }} params
 */
export function trackStudentHomeOpenedEvent(supabase, params) {
  const { studentId, studentSessionId, gradeLevel } = params;
  void trackServerAnalyticsEvent(supabase, {
    eventName: "student_home_opened",
    actorType: "student",
    actorId: studentId,
    studentId,
    sessionId: studentSessionId ?? null,
    grade: gradeLevel ?? null,
    idempotencyKey: `student_home_opened:${studentId}:${new Date().toISOString().slice(0, 13)}`,
  });
}

/**
 * Full payload for legacy GET /api/student/home-profile (tests + subject modals).
 * Includes awaited achievement grants before response.
 */
export async function buildLegacyStudentHomeProfilePayload(supabase, auth) {
  const timer = createStudentHomeProfileTimer("student-home-profile");
  const studentId = auth.studentId;
  const displayName = String(auth.student?.full_name || "").trim() || "Student";

  const row = await ensureStudentLearningStateRow(supabase, studentId);
  timer.mark("learning_state_row");
  const normalized = normalizeLearningProfileRow(row);

  const summary = await loadStudentHomeSummaryPayload(supabase, auth, { timer, row, normalized });
  const analytics = await loadStudentHomeAnalyticsPayload(
    supabase,
    { studentId, displayName, row, normalized },
    { timer }
  );

  const achievementGrants = await runStudentHomeAchievementGrants(supabase, studentId, { force: true });
  timer.mark("achievement_grants");

  timer.finish({ studentId, mode: "legacy" });

  return {
    ok: true,
    studentId,
    derived: analytics.derived,
    accountSnapshot: analytics.accountSnapshot,
    monthly: summary.monthly,
    profile: summary.profile,
    challenges: summary.challenges,
    streaks: summary.streaks,
    achievements: summary.achievements,
    subjectsProgressOnly: summary.subjectsProgressOnly,
    monthlyPersistenceStatus: analytics.monthlyPersistenceStatus,
    monthlyPersistenceLoadError: analytics.monthlyPersistenceLoadError,
    achievementGrants,
    economyConfig: summary.economyConfig,
    economyConfigLoadError: summary.economyConfigLoadError,
    updated_at: summary.updated_at,
    derivedPending: false,
    analyticsPending: false,
  };
}
