import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import {
  isMissingColumnError,
  mergeJsonObjects,
  normalizeClientMeta,
  normalizeOptionalInteger,
  normalizeOptionalNumber,
  normalizeOptionalString,
  readJsonBody,
  normalizeLearningGameMode,
} from "../../../../lib/learning-supabase/learning-activity";
import {
  canonicalGradeLevelKeyFromAuth,
  logLearningPipelineDebug,
} from "../../../../lib/learning-supabase/canonical-learning-write-meta.server";
import { awardLearningSessionCoins } from "../../../../lib/learning-supabase/learning-coin-award.server";
import { updateDailyMissionProgress } from "../../../../lib/learning-supabase/mission-progress.server";
import { guardCookieMutationOrigin } from "../../../../lib/security/api-guards.js";
import { assertLearningSubjectSessionAllowed } from "../../../../lib/learning/subject-permissions/session-asserts.server.js";
import { resolveContentGradeFromSessionMetadata } from "../../../../lib/learning-supabase/practice-grade-resolution.js";
import { trackServerAnalyticsEvent } from "../../../../lib/analytics/track-event.server.js";
import { evaluateAndGrantAchievementCards } from "../../../../lib/rewards/server/achievement-evaluator.server.js";
import { syncIncrementalMonthlyPersistenceRewards } from "../../../../lib/learning-supabase/monthly-persistence-reward.server";
import { deriveSessionSummaryFromAnswers } from "../../../../lib/learning-supabase/learning-session-finish.server";
import { resolveSessionFinishCreditedDuration } from "../../../../lib/learning-supabase/learning-time-monthly-aggregate.server";

async function loadLearningSession(supabase, learningSessionId) {
  const { data, error } = await supabase
    .from("learning_sessions")
    .select("id,student_id,subject,metadata,status,started_at,ended_at,duration_seconds")
    .eq("id", learningSessionId)
    .maybeSingle();
  if (error || !data?.id) return null;
  return data;
}

async function updateLearningSessionWithFallback(supabase, learningSessionId, fullPatch, fallbackPatch) {
  const firstTry = await supabase
    .from("learning_sessions")
    .update(fullPatch)
    .eq("id", learningSessionId);
  if (!firstTry.error) return firstTry;
  if (!isMissingColumnError(firstTry.error)) return firstTry;
  return supabase
    .from("learning_sessions")
    .update(fallbackPatch)
    .eq("id", learningSessionId);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const body = readJsonBody(req);
    const learningSessionId = normalizeOptionalString(body.learningSessionId, 64);
    if (!learningSessionId) {
      return res.status(400).json({ ok: false, error: "learningSessionId is required" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const sessionRow = await loadLearningSession(supabase, learningSessionId);
    if (!sessionRow) {
      return res.status(404).json({ ok: false, error: "Learning session not found" });
    }
    if (sessionRow.student_id !== auth.studentId) {
      return res.status(403).json({ ok: false, error: "Session does not belong to student" });
    }

    if (sessionRow.status === "completed") {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    if (sessionRow.status && sessionRow.status !== "active") {
      return res.status(400).json({ ok: false, error: "Session is not active" });
    }

    const registeredGradeKey = canonicalGradeLevelKeyFromAuth(auth);
    const sessionMeta = sessionRow.metadata || {};
    const contentGradeKey = resolveContentGradeFromSessionMetadata(sessionMeta, registeredGradeKey);
    const accessGate = await assertLearningSubjectSessionAllowed(supabase, {
      studentId: auth.studentId,
      studentRow: auth.student,
      subject: sessionRow.subject,
      requestedGrade: contentGradeKey || registeredGradeKey,
    });
    if (!accessGate.ok) {
      return res.status(accessGate.status || 403).json({
        ok: false,
        error: accessGate.message,
        code: accessGate.code,
      });
    }

    const endedAt = new Date().toISOString();
    const clientDurationSeconds = normalizeOptionalInteger(body.durationSeconds, 0, 3600) ?? 0;
    const creditedFinish = await resolveSessionFinishCreditedDuration(supabase, learningSessionId, {
      clientAccruedMs: clientDurationSeconds * 1000,
    });
    const serverDurationSeconds = creditedFinish.durationSeconds;

    const derived = await deriveSessionSummaryFromAnswers(supabase, learningSessionId, {
      totalQuestions: normalizeOptionalInteger(body.totalQuestions, 0, 1000000),
      correctAnswers: normalizeOptionalInteger(body.correctAnswers, 0, 1000000),
      wrongAnswers: normalizeOptionalInteger(body.wrongAnswers, 0, 1000000),
      score: normalizeOptionalNumber(body.score, 0, 1000000000),
      accuracy: normalizeOptionalNumber(body.accuracy, 0, 100),
    });

    const summary = {
      totalQuestions: derived.totalQuestions,
      correctAnswers: derived.correctAnswers,
      wrongAnswers: derived.wrongAnswers,
      score: derived.score,
      accuracy: derived.accuracy,
      clientMeta: normalizeClientMeta(body.clientMeta),
      canonicalGradeLevelKey: canonicalGradeLevelKeyFromAuth(auth),
      summaryDerivedFromAnswers: derived.derivedFromAnswers === true,
      creditedMsTotal: creditedFinish.creditedMsTotal,
      orphanCreditedMs: creditedFinish.orphanCreditedMs,
      answerCreditedMs: creditedFinish.answerCreditedMs,
    };

    const finishMode = normalizeLearningGameMode(body.mode);
    const baseMeta =
      sessionRow.metadata && typeof sessionRow.metadata === "object" ? sessionRow.metadata : {};
    const metadataPatch = { summary: mergeJsonObjects(baseMeta.summary && typeof baseMeta.summary === "object" ? baseMeta.summary : {}, summary) };
    if (finishMode) {
      metadataPatch.mode = finishMode;
      metadataPatch.summary = mergeJsonObjects(metadataPatch.summary, { finishMode });
    }
    const metadata = mergeJsonObjects(baseMeta, metadataPatch);

    logLearningPipelineDebug("session-finish", {
      authenticatedStudentId: auth.studentId,
      canonicalGradeLevelKey: summary.canonicalGradeLevelKey,
      clientProvidedMode: body.mode ?? null,
      persistedMode: metadata.mode ?? null,
      learningSessionId,
      subject: sessionRow.subject ?? null,
    });

    const patch = {
      ended_at: endedAt,
      duration_seconds: serverDurationSeconds,
      status: "completed",
      metadata,
    };
    const fallbackPatch = {
      ended_at: patch.ended_at,
      duration_seconds: patch.duration_seconds,
    };

    const { data: updatedRow, error } = await supabase
      .from("learning_sessions")
      .update(patch)
      .eq("id", learningSessionId)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (error) {
      if (!isMissingColumnError(error)) {
        return res.status(500).json({ ok: false, error: "Failed to finish learning session" });
      }
      const fallback = await updateLearningSessionWithFallback(
        supabase,
        learningSessionId,
        patch,
        fallbackPatch
      );
      if (fallback.error) {
        return res.status(500).json({ ok: false, error: "Failed to finish learning session" });
      }
    } else if (!updatedRow?.id) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    void trackServerAnalyticsEvent(supabase, {
      eventName: "practice_completed",
      actorType: "student",
      actorId: auth.studentId,
      studentId: auth.studentId,
      sessionId: learningSessionId,
      subject: sessionRow.subject,
      grade: metadata?.gradeLevel || summary.canonicalGradeLevelKey,
      objectType: "learning_session",
      objectId: learningSessionId,
      idempotencyKey: `practice_completed:${learningSessionId}`,
      metadata: {
        durationSeconds: patch.duration_seconds,
        totalQuestions: summary.totalQuestions,
        accuracy: summary.accuracy,
        mode: metadata?.mode || null,
      },
    });

    // Phase 1 — Child World: award Learning Coins for a completed session.
    // Controlled by ENABLE_SESSION_COIN_AWARDS env flag.
    // Failure is caught and logged; it must never affect the session-finish response.
    try {
      await awardLearningSessionCoins(supabase, {
        studentId: auth.studentId,
        learningSessionId,
        durationSeconds: patch.duration_seconds,
        accuracy: summary.accuracy,
        subject: sessionRow.subject,
      }).then((coinResult) => {
        if (coinResult?.ok && !coinResult.skipped && !coinResult.duplicate && Number(coinResult.coinsAwarded) > 0) {
          void trackServerAnalyticsEvent(supabase, {
            eventName: "reward_earned",
            actorType: "student",
            actorId: auth.studentId,
            studentId: auth.studentId,
            sessionId: learningSessionId,
            subject: sessionRow.subject,
            grade: metadata?.gradeLevel || summary.canonicalGradeLevelKey,
            objectType: "coin_transaction_source",
            objectId: learningSessionId,
            idempotencyKey: `reward_earned:learning_session:${learningSessionId}`,
            metadata: {
              sourceType: "learning_session",
              coinsAwarded: coinResult.coinsAwarded,
            },
          });
        }
      });
    } catch (coinErr) {
      logLearningPipelineDebug("session-finish-coin-award-error", {
        learningSessionId,
        error: coinErr?.message || String(coinErr),
      });
    }

    // Phase 2 — Child World: update daily mission progress.
    // Failure is isolated — must never affect the session-finish response.
    try {
      await updateDailyMissionProgress(supabase, {
        studentId:      auth.studentId,
        gradeLevel:     auth.student?.grade_level ?? null,
        totalQuestions: summary.totalQuestions,
        durationSeconds: patch.duration_seconds,
        subject:        sessionRow.subject ?? null,
      });
    } catch (missionErr) {
      logLearningPipelineDebug("session-finish-mission-progress-error", {
        learningSessionId,
        error: missionErr?.message || String(missionErr),
      });
    }

    try {
      await evaluateAndGrantAchievementCards(supabase, auth.studentId);
    } catch (achievementErr) {
      logLearningPipelineDebug("session-finish-achievement-cards-error", {
        learningSessionId,
        error: achievementErr?.message || String(achievementErr),
      });
    }

    try {
      await syncIncrementalMonthlyPersistenceRewards(supabase, auth.studentId);
    } catch (monthlyPersistenceErr) {
      logLearningPipelineDebug("session-finish-monthly-persistence-error", {
        learningSessionId,
        error: monthlyPersistenceErr?.message || String(monthlyPersistenceErr),
      });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
