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

async function loadLearningSession(supabase, learningSessionId) {
  const { data, error } = await supabase
    .from("learning_sessions")
    .select("id,student_id,subject,metadata")
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

    const summary = {
      totalQuestions: normalizeOptionalInteger(body.totalQuestions, 0, 1000000),
      correctAnswers: normalizeOptionalInteger(body.correctAnswers, 0, 1000000),
      wrongAnswers: normalizeOptionalInteger(body.wrongAnswers, 0, 1000000),
      score: normalizeOptionalNumber(body.score, 0, 1000000000),
      accuracy: normalizeOptionalNumber(body.accuracy, 0, 100),
      clientMeta: normalizeClientMeta(body.clientMeta),
      canonicalGradeLevelKey: canonicalGradeLevelKeyFromAuth(auth),
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
      ended_at: new Date().toISOString(),
      duration_seconds: normalizeOptionalInteger(body.durationSeconds, 0, 8640000) ?? 0,
      status: "completed",
      metadata,
    };
    const fallbackPatch = {
      ended_at: patch.ended_at,
      duration_seconds: patch.duration_seconds,
    };

    const { error } = await updateLearningSessionWithFallback(
      supabase,
      learningSessionId,
      patch,
      fallbackPatch
    );
    if (error) {
      return res.status(500).json({ ok: false, error: "Failed to finish learning session" });
    }

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

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
