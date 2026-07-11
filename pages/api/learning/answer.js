import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import {
  isMissingColumnError,
  normalizeClientMeta,
  normalizeOptionalInteger,
  normalizeOptionalString,
  normalizeSubject,
  readJsonBody,
  normalizeLearningGameMode,
} from "../../../lib/learning-supabase/learning-activity";
import {
  canonicalGradeLevelKeyFromAuth,
  logLearningPipelineDebug,
} from "../../../lib/learning-supabase/canonical-learning-write-meta.server";
import {
  buildGradeEvidenceFields,
  resolveContentGradeFromAnswerPayload,
  resolveContentGradeFromSessionMetadata,
  normalizePracticeGradeKey,
} from "../../../lib/learning-supabase/practice-grade-resolution.js";
import { guardCookieMutationOrigin } from "../../../lib/security/api-guards.js";
import { assertLearningSubjectSessionAllowed } from "../../../lib/learning/subject-permissions/session-asserts.server.js";
import { classifyActivityEvidence } from "../../../lib/learning/activity-classification.js";
import { normalizeQuestionEnginePayload } from "../../../lib/learning/question-engine-metadata.js";
import { buildDiagnosticCanonicalMetadata } from "../../../lib/learning/diagnostic-canonical-metadata.js";
import { trackServerAnalyticsEvent } from "../../../lib/analytics/track-event.server.js";
import { buildAnswerLevelFields } from "../../../lib/learning/session-evidence-levels.js";
import {
  deriveTimingStatus,
  resolveServerAnswerCreditedMs,
} from "../../../lib/learning/learning-time-credit-policy.js";

async function verifyLearningSessionOwnership(supabase, learningSessionId, studentId) {
  const { data, error } = await supabase
    .from("learning_sessions")
    .select("id,student_id,metadata")
    .eq("id", learningSessionId)
    .maybeSingle();
  if (error || !data?.id) return { ok: false, reason: "not_found", metadata: null };
  if (data.student_id !== studentId) return { ok: false, reason: "forbidden", metadata: null };
  return { ok: true, metadata: data.metadata && typeof data.metadata === "object" ? data.metadata : {} };
}

async function insertAnswerRow(supabase, row) {
  const firstTry = await supabase
    .from("answers")
    .insert(row)
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!firstTry.error) return firstTry;
  if (!isMissingColumnError(firstTry.error)) return firstTry;

  const fallback = {
    student_id: row.student_id,
    learning_session_id: row.learning_session_id,
    question_id: row.question_id,
    answer_payload: row.answer_payload,
    is_correct: row.is_correct,
  };
  return supabase
    .from("answers")
    .insert(fallback)
    .select("id")
    .limit(1)
    .maybeSingle();
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
    if (typeof body.isCorrect !== "boolean") {
      return res.status(400).json({ ok: false, error: "isCorrect must be boolean" });
    }

    const learningSessionId = normalizeOptionalString(body.learningSessionId, 64);
    if (!learningSessionId) {
      return res.status(400).json({ ok: false, error: "learningSessionId is required" });
    }

    const questionId =
      normalizeOptionalString(body.questionId, 180) ||
      normalizeOptionalString(body.questionFingerprint, 180);
    if (!questionId) {
      return res.status(400).json({ ok: false, error: "questionId or questionFingerprint is required" });
    }

    const subject = normalizeSubject(body.subject);
    if (!subject) {
      return res.status(400).json({ ok: false, error: "Invalid subject" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const ownership = await verifyLearningSessionOwnership(
      supabase,
      learningSessionId,
      auth.studentId
    );
    if (!ownership.ok) {
      if (ownership.reason === "forbidden") {
        return res.status(403).json({ ok: false, error: "Session does not belong to student" });
      }
      return res.status(404).json({ ok: false, error: "Learning session not found" });
    }

    const sessionMeta = ownership.metadata || {};
    const sessionMode =
      normalizeLearningGameMode(sessionMeta.mode) || "learning";
    const clientGameMode =
      normalizeLearningGameMode(body.gameMode) || normalizeLearningGameMode(body.mode);
    const answerMode = clientGameMode || sessionMode;
    const registeredGradeKey = canonicalGradeLevelKeyFromAuth(auth);
    const clientGradeHint = normalizeOptionalString(body.gradeLevel, 40);
    const clientMeta = {
      ...normalizeClientMeta(body.clientMeta),
      gameMode: answerMode,
    };
    const answerParams =
      body.params && typeof body.params === "object" && !Array.isArray(body.params)
        ? body.params
        : null;
    const contentGradeKey =
      normalizePracticeGradeKey(clientGradeHint) ||
      resolveContentGradeFromAnswerPayload(
        { clientMeta, gradeLevel: clientGradeHint },
        sessionMeta,
        registeredGradeKey
      ) ||
      resolveContentGradeFromSessionMetadata(sessionMeta, registeredGradeKey);

    const accessGate = await assertLearningSubjectSessionAllowed(supabase, {
      studentId: auth.studentId,
      studentRow: auth.student,
      subject,
      requestedGrade: contentGradeKey || clientGradeHint || registeredGradeKey,
    });
    if (!accessGate.ok) {
      return res.status(accessGate.status || 403).json({
        ok: false,
        error: accessGate.message,
        code: accessGate.code,
      });
    }
    const gradeEvidence = buildGradeEvidenceFields(registeredGradeKey, contentGradeKey);

    const hintsUsed = normalizeOptionalInteger(body.hintsUsed, 0, 1000) ?? 0;
    const afterStepByStep = clientMeta.afterStepByStep === true;
    const contextAfterBookReading = clientMeta.contextAfterBookReading === true;

    // Phase 3: timing truth — accept separate raw and credited values
    const rawTimeSpentMs =
      normalizeOptionalInteger(body.rawTimeSpentMs, 0, 36_000_000) ??
      normalizeOptionalInteger(body.timeSpentMs, 0, 36_000_000);
    const clientCreditedTimeMs =
      normalizeOptionalInteger(body.creditedTimeMs, 0, 36_000_000) ?? rawTimeSpentMs;
    const creditedTimeMs = resolveServerAnswerCreditedMs({
      rawTimeSpentMs,
      creditedTimeMs: clientCreditedTimeMs,
      gameMode: answerMode,
    });
    const timingStatus =
      typeof body.timingStatus === "string"
        ? body.timingStatus.slice(0, 40)
        : deriveTimingStatus(rawTimeSpentMs);

    const classification = classifyActivityEvidence(
      answerMode,
      "free_practice",
      { afterStepByStep, contextAfterBookReading, hintsUsed }
    );

    let questionEngine = normalizeQuestionEnginePayload(body.questionEngine);
    const bodyLevel = normalizeOptionalString(body.level, 40);
    const levelFields = buildAnswerLevelFields({
      subjectId: subject,
      bodyLevel,
      bodyDisplayLevel: normalizeOptionalString(body.displayLevel, 40),
      bodySourceDifficulty: normalizeOptionalString(body.sourceDifficulty, 40),
      bodyRegularInternalState: normalizeOptionalString(body.regularInternalState, 40),
      bodyScienceInternalState: normalizeOptionalString(body.scienceInternalState, 40),
      clientMeta,
      sessionMeta,
      questionEngine,
    });
    if (questionEngine && levelFields.questionEngineDifficulty) {
      questionEngine = { ...questionEngine, difficulty: levelFields.questionEngineDifficulty };
    }

    const answerPayload = {
      subject,
      topic: normalizeOptionalString(body.topic, 120),
      displayLevel: levelFields.displayLevel,
      sourceDifficulty: levelFields.sourceDifficulty,
      level: levelFields.level,
      ...(levelFields.regularInternalState
        ? { regularInternalState: levelFields.regularInternalState }
        : {}),
      ...(levelFields.scienceInternalState
        ? { scienceInternalState: levelFields.scienceInternalState }
        : {}),
      questionFingerprint: normalizeOptionalString(body.questionFingerprint, 300),
      prompt: normalizeOptionalString(body.prompt, 5000),
      expectedAnswer: normalizeOptionalString(body.expectedAnswer, 1000),
      userAnswer: normalizeOptionalString(body.userAnswer, 1000),
      hintsUsed,
      // Phase 3: raw wall time preserved; credited time capped by policy
      timeSpentMs: rawTimeSpentMs,
      rawTimeSpentMs,
      creditedTimeMs,
      timingStatus,
      clientMeta: levelFields.clientMeta,
      registeredGradeLevel: gradeEvidence.registeredGradeLevel,
      contentGradeLevel: gradeEvidence.contentGradeLevel,
      gradeRelation: gradeEvidence.gradeRelation,
      gradeLevel: gradeEvidence.contentGradeLevel || gradeEvidence.registeredGradeLevel,
      gameMode: answerMode,
      // Phase 1: activity classification
      evidenceCategory: classification.evidenceCategory,
      isDiagnosticEligible: classification.isDiagnosticEligible,
      contextFlags: classification.contextFlags,
    };
    if (answerParams) {
      answerPayload.params = answerParams;
    }

    const canonicalBundle = buildDiagnosticCanonicalMetadata({
      subject,
      topic: answerPayload.topic,
      contentGradeKey: gradeEvidence.contentGradeLevel,
      questionId,
      isDiagnosticEligible: classification.isDiagnosticEligible,
      source: {
        ...answerPayload,
        params: answerParams || undefined,
        questionEngine,
      },
      questionEngine,
    });

    if (canonicalBundle.enrichedQuestionEngine) {
      answerPayload.questionEngine = canonicalBundle.enrichedQuestionEngine;
    } else if (questionEngine) {
      answerPayload.questionEngine = questionEngine;
    }
    if (canonicalBundle.diagnosticMetadata) {
      answerPayload.diagnosticMetadata = canonicalBundle.diagnosticMetadata;
    }

    logLearningPipelineDebug("answer-save", {
      authenticatedStudentId: auth.studentId,
      authenticatedGradeLevel: auth.student?.grade_level ?? null,
      canonicalGradeLevelKey: registeredGradeKey,
      clientProvidedGradeLevel: clientGradeHint,
      finalPersistedContentGradeLevelKey: gradeEvidence.contentGradeLevel,
      finalPersistedRegisteredGradeLevelKey: gradeEvidence.registeredGradeLevel,
      sessionGameMode: sessionMode,
      answerGameMode: answerMode,
      finalPersistedGameMode: answerMode,
      learningSessionId,
      subject,
    });

    const { data, error } = await insertAnswerRow(supabase, {
      student_id: auth.studentId,
      learning_session_id: learningSessionId,
      question_id: questionId,
      answer_payload: answerPayload,
      is_correct: body.isCorrect,
      answered_at: new Date().toISOString(),
    });
    if (error || !data?.id) {
      return res.status(500).json({ ok: false, error: "Failed to record answer" });
    }

    void trackServerAnalyticsEvent(supabase, {
      eventName: "question_answered",
      actorType: "student",
      actorId: auth.studentId,
      studentId: auth.studentId,
      sessionId: learningSessionId,
      subject,
      topic: answerPayload.topic,
      grade: answerPayload.gradeLevel,
      objectType: "answer",
      objectId: data.id,
      idempotencyKey: `question_answered:${data.id}`,
      metadata: {
        isCorrect: body.isCorrect,
        gameMode: answerMode,
        evidenceCategory: classification.evidenceCategory,
      },
    });
    if (afterStepByStep) {
      void trackServerAnalyticsEvent(supabase, {
        eventName: "explanation_opened",
        actorType: "student",
        actorId: auth.studentId,
        studentId: auth.studentId,
        sessionId: learningSessionId,
        subject,
        topic: answerPayload.topic,
        grade: answerPayload.gradeLevel,
        objectType: "answer",
        objectId: data.id,
        idempotencyKey: `explanation_opened:answer:${data.id}`,
        metadata: { source: "after_step_by_step" },
      });
    }

    return res.status(200).json({
      ok: true,
      answerId: data.id,
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
