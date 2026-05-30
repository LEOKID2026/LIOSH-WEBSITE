import { safeApiLog } from "../../../../lib/security/safe-log.js";
import {
  buildDiscussionQuestionPreview,
  listDiscussionPermittedSubjects,
} from "../../../../lib/teacher-server/discussion-question-preview.server.js";
import {
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
  unknownQueryParams,
} from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "classroom_activities")) return undefined;

    if (req.method === "GET") {
      const unknown = unknownQueryParams(req.query, new Set(["gradeLevel"]));
      if (unknown.length) {
        return sendTeacherApiError(res, 400, "validation_failed", "Unknown query parameters");
      }

      const gradeLevel =
        req.query?.gradeLevel != null ? String(req.query.gradeLevel).trim() : null;

      const listed = await listDiscussionPermittedSubjects(
        ctx.serviceRole,
        ctx.teacherId,
        gradeLevel || null
      );
      if (!listed.ok) {
        return sendTeacherApiError(res, listed.status, listed.code, listed.code);
      }

      return res.status(200).json({ data: { subjects: listed.subjects } });
    }

    if (req.method === "POST") {
      const body = readJsonBody(req);
      const result = await buildDiscussionQuestionPreview(ctx.serviceRole, ctx.teacherId, {
        subject: body.subject,
        gradeLevel: body.gradeLevel,
        topic: body.topic,
        subtopic: body.subtopic,
        difficulty: body.difficulty,
        count: body.count,
      });

      if (!result.ok) {
        return sendTeacherApiError(
          res,
          result.status || 400,
          result.code,
          result.message || result.code
        );
      }

      return res.status(200).json({ data: { questions: result.questions } });
    }

    res.setHeader("Allow", "GET, POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (err) {
    safeApiLog("teacher/discussion/question-preview", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
