import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { listGuestAwareTopicsForSelfPractice, resolveGuestPracticeGrade } from "../../../../lib/guest/guest-topic-access.server.js";
import { isGuestStudent } from "../../../../lib/guest/guest-display.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const subject = String(req.query?.subject || "").trim();
  if (!subject) {
    return res.status(400).json({ ok: false, error: "subject is required" });
  }

  const auth = await getAuthenticatedStudentSession(req);
  if (!auth) {
    clearStudentSessionCookie(res);
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  if (!isGuestStudent(auth.student)) {
    return res.status(200).json({ ok: true, isGuest: false, topics: [] });
  }

  const topicsRaw = req.query?.topics;
  const curriculumTopics =
    typeof topicsRaw === "string" && topicsRaw.trim()
      ? topicsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  const grade = resolveGuestPracticeGrade(auth.student);
  const supabase = getLearningSupabaseServiceRoleClient();
  const topics = await listGuestAwareTopicsForSelfPractice(
    supabase,
    auth.student,
    subject,
    grade,
    curriculumTopics
  );

  return res.status(200).json({ ok: true, isGuest: true, topics });
}
