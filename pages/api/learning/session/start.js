import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  getAuthenticatedStudentSession,
  clearStudentSessionCookie,
} from "../../../../lib/learning-supabase/student-auth";
import {
  readJsonBody,
  normalizeSubject,
  normalizeOptionalString,
  normalizeClientMeta,
  isMissingColumnError,
  mergeJsonObjects,
  normalizeLearningGameMode,
} from "../../../../lib/learning-supabase/learning-activity";
import {
  canonicalGradeLevelKeyFromAuth,
  logLearningPipelineDebug,
} from "../../../../lib/learning-supabase/canonical-learning-write-meta.server";
import {
  buildGradeEvidenceFields,
  resolveContentGradeForSessionWrite,
} from "../../../../lib/learning-supabase/practice-grade-resolution.js";
import { guardCookieMutationOrigin } from "../../../../lib/security/api-guards.js";
import { assertGuestTopicPlayable } from "../../../../lib/guest/guest-topic-access.server.js";
import { isGuestStudent } from "../../../../lib/guest/guest-display.js";
import { trackServerAnalyticsEvent } from "../../../../lib/analytics/track-event.server.js";
import { buildSessionStartLevelMetadata } from "../../../../lib/learning/session-evidence-levels.js";
import { assertLearningSubjectSessionAllowed } from "../../../../lib/learning/subject-permissions/session-asserts.server.js";

async function insertLearningSession(supabase, row) {
  const fullInsert = await supabase
    .from("learning_sessions")
    .insert(row)
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!fullInsert.error) return fullInsert;
  if (!isMissingColumnError(fullInsert.error)) return fullInsert;

  const fallbackRow = {
    student_id: row.student_id,
    subject: row.subject,
    topic: row.topic ?? null,
    started_at: row.started_at,
  };

  return supabase
    .from("learning_sessions")
    .insert(fallbackRow)
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
    const subject = normalizeSubject(body.subject);
    if (!subject) {
      return res.status(400).json({ ok: false, error: "Invalid subject" });
    }

    const topic = normalizeOptionalString(body.topic, 120);
    const clientMode = normalizeLearningGameMode(body.mode) || "learning";

    if (topic && isGuestStudent(auth.student || {})) {
      const guestTopic = await assertGuestTopicPlayable(
        getLearningSupabaseServiceRoleClient(),
        auth.student,
        subject,
        topic
      );
      if (!guestTopic.ok) {
        return res.status(guestTopic.status || 403).json({
          ok: false,
          error: guestTopic.message,
          code: guestTopic.code,
        });
      }
    }

    const clientGradeHint = normalizeOptionalString(body.gradeLevel, 40);
    const level = normalizeOptionalString(body.level, 40);
    const displayLevel = normalizeOptionalString(body.displayLevel, 40);
    const regularInternalState = normalizeOptionalString(body.regularInternalState, 40);
    const scienceInternalState = normalizeOptionalString(body.scienceInternalState, 40);
    const clientMeta = normalizeClientMeta(body.clientMeta);
    const startedAt = new Date().toISOString();

    const supabase = getLearningSupabaseServiceRoleClient();
    const registeredGradeKey = canonicalGradeLevelKeyFromAuth(auth);
    const contentGradeKey = resolveContentGradeForSessionWrite(clientGradeHint, registeredGradeKey);

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
    const sessionLevelFields = buildSessionStartLevelMetadata({
      subjectId: subject,
      level,
      displayLevel,
      regularInternalState,
      scienceInternalState,
      clientMeta,
    });
    const metadata = mergeJsonObjects(clientMeta, {
      mode: clientMode,
      ...sessionLevelFields,
      registeredGradeLevel: gradeEvidence.registeredGradeLevel,
      contentGradeLevel: gradeEvidence.contentGradeLevel,
      gradeRelation: gradeEvidence.gradeRelation,
      ...(contentGradeKey && registeredGradeKey && contentGradeKey !== registeredGradeKey
        ? { clientReportedGradeLevel: contentGradeKey }
        : {}),
      gradeLevel: contentGradeKey || registeredGradeKey,
    });

    logLearningPipelineDebug("session-start", {
      authenticatedStudentId: auth.studentId,
      authenticatedGradeLevel: auth.student?.grade_level ?? null,
      canonicalGradeLevelKey: registeredGradeKey,
      clientProvidedGradeLevel: clientGradeHint,
      clientProvidedMode: body.mode ?? null,
      persistedMode: clientMode,
      persistedContentGradeLevelKey: contentGradeKey,
      persistedRegisteredGradeLevelKey: registeredGradeKey,
      subject,
      topic,
    });

    const { data, error } = await insertLearningSession(supabase, {
      student_id: auth.studentId,
      subject,
      topic,
      started_at: startedAt,
      status: "active",
      metadata,
    });

    if (error || !data?.id) {
      return res.status(500).json({ ok: false, error: "Failed to create learning session" });
    }

    for (const eventName of ["subject_opened", "topic_opened", "practice_started"]) {
      void trackServerAnalyticsEvent(supabase, {
        eventName,
        actorType: "student",
        actorId: auth.studentId,
        studentId: auth.studentId,
        sessionId: data.id,
        subject,
        topic,
        grade: gradeEvidence.contentGradeLevel || gradeEvidence.registeredGradeLevel,
        objectType: "learning_session",
        objectId: data.id,
        idempotencyKey: `${eventName}:${data.id}`,
        metadata: { mode: clientMode, level },
      });
    }

    return res.status(200).json({
      ok: true,
      learningSessionId: data.id,
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
