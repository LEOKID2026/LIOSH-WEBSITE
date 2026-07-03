import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import { getArcadePlayerProfileView } from "../../../../lib/arcade/club/player-profile.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const studentId = String(req.query.studentId || "").trim();
  if (!studentId) {
    return res.status(400).json({ ok: false, error: "חסר מזהה שחקן", code: "bad_request" });
  }

  const profile = await getArcadePlayerProfileView(auth.supabase, studentId, {
    viewerStudentId: auth.studentId,
  });

  if (!profile) {
    return res.status(404).json({ ok: false, error: "שחקן לא נמצא", code: "not_found" });
  }

  return res.status(200).json({ ok: true, profile });
}
