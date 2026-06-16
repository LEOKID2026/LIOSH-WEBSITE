import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { buildAccountSnapshotForParentReport } from "../../../lib/learning-shared/student-account-state-view";
import {
  computeStudentLearningDerived,
  ensureStudentLearningStateRow,
  LEARNING_PROFILE_SUBJECT_KEYS,
  normalizeLearningProfileRow,
} from "../../../lib/learning-supabase/student-learning-profile.server";
import { ensureDailyMissionsInDb } from "../../../lib/learning-supabase/mission-progress.server";
import { evaluateMonthlyPersistenceReward } from "../../../lib/learning-supabase/monthly-persistence-reward.server";
import { trackServerAnalyticsEvent } from "../../../lib/analytics/track-event.server.js";

function shouldLogStudentHomeDebug() {
  return process.env.NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY === "true";
}

/**
 * Strip heavy scoresStore from subjects — client receives accountSnapshot computed with full row on server.
 * @param {ReturnType<typeof normalizeLearningProfileRow>} normalized
 */
function buildSubjectsProgressOnly(normalized) {
  /** @type {Record<string, { progressStore: Record<string, unknown> }>} */
  const out = {};
  for (const key of LEARNING_PROFILE_SUBJECT_KEYS) {
    const v = normalized.subjects[key];
    const sub = v && typeof v === "object" && !Array.isArray(v) ? v : {};
    const ps = sub.progressStore && typeof sub.progressStore === "object" && !Array.isArray(sub.progressStore) ? sub.progressStore : {};
    out[key] = { progressStore: ps };
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Student session expired" });
    }

    const studentId = auth.studentId;
    const displayName = String(auth.student?.full_name || "").trim() || "Student";
    const supabase = getLearningSupabaseServiceRoleClient();

    const row = await ensureStudentLearningStateRow(supabase, studentId);
    const normalized = normalizeLearningProfileRow(row);
    const derived = await computeStudentLearningDerived(supabase, studentId);
    const accountSnapshot = buildAccountSnapshotForParentReport(normalized, derived, displayName);
    const subjectsProgressOnly = buildSubjectsProgressOnly(normalized);

    // Phase 2 — Child World: ensure today's daily missions exist in DB.
    // Non-fatal: falls back to whatever is in normalized.challenges if init fails.
    let currentChallenges = normalized.challenges;
    try {
      const gradeLevel = String(auth.student?.grade_level || "");
      const freshChallenges = await ensureDailyMissionsInDb(supabase, studentId, gradeLevel);
      if (freshChallenges != null) currentChallenges = freshChallenges;
    } catch {
      // Keep existing challenges; do not fail the page load
    }

    let monthlyPersistenceStatus = null;
    let monthlyPersistenceLoadError = false;
    try {
      const evalResult = await evaluateMonthlyPersistenceReward(supabase, { studentId });
      if (evalResult.ok) {
        monthlyPersistenceStatus = {
          yearMonthIsrael: evalResult.yearMonthIsrael,
          activeMinutes: evalResult.activeMinutes,
          tierMinutes: evalResult.tierMinutes,
          wouldAward: evalResult.wouldAward,
          alreadyAwarded: evalResult.alreadyAwarded,
          eligible: evalResult.eligible,
        };
      } else {
        monthlyPersistenceLoadError = true;
      }
    } catch {
      monthlyPersistenceLoadError = true;
    }

    const payload = {
      ok: true,
      studentId,
      derived,
      accountSnapshot,
      monthly: normalized.monthly,
      profile: normalized.profile,
      challenges: currentChallenges,
      streaks: normalized.streaks,
      achievements: normalized.achievements,
      subjectsProgressOnly,
      monthlyPersistenceStatus,
      monthlyPersistenceLoadError,
      updated_at: row.updated_at,
    };

    void trackServerAnalyticsEvent(supabase, {
      eventName: "student_home_opened",
      actorType: "student",
      actorId: studentId,
      studentId,
      sessionId: auth.studentSessionId,
      grade: auth.student?.grade_level ?? null,
      idempotencyKey: `student_home_opened:${studentId}:${new Date().toISOString().slice(0, 13)}`,
    });

    if (shouldLogStudentHomeDebug()) {
      try {
        const subjKeys = Object.keys(normalized.subjects || {});
        console.info("[LIOSH student-home-profile]", {
          studentId,
          rowHasSubjects: subjKeys.length > 0,
          derivedHasBySubject: !!derived?.bySubject,
          snapshotLevel: accountSnapshot?.summaryPlayerLevel,
          snapshotStars: accountSnapshot?.summaryStars,
        });
      } catch {
        /* ignore */
      }
    }

    return res.status(200).json(payload);
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
    if (shouldLogStudentHomeDebug()) {
      console.error("[LIOSH student-home-profile] error", msg);
    }
    return res.status(500).json({ ok: false, error: "Server error", detail: msg.slice(0, 500) });
  }
}
