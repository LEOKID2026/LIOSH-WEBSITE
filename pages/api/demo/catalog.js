import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  buildDemoGameAccessPayload,
  buildDemoSubjectAccessPayload,
} from "../../../lib/demo/demo-catalog.server.js";
import { normalizePracticeGradeKey } from "../../../lib/learning-supabase/practice-grade-resolution.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const gradeLevel =
      normalizePracticeGradeKey(String(req.query.gradeLevel || "g3")) || "g3";
    const supabase = getLearningSupabaseServiceRoleClient();

    const [gameAccess, subjectPayload] = await Promise.all([
      buildDemoGameAccessPayload(supabase),
      buildDemoSubjectAccessPayload(supabase, gradeLevel),
    ]);

    return res.status(200).json({
      ok: true,
      gradeLevel,
      ...gameAccess,
      subjects: subjectPayload.subjects,
      subjectAccess: subjectPayload.subjectAccess,
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
