import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import { getTodayMissions } from "../../../../lib/arcade/club/missions.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const result = await getTodayMissions(auth.supabase, auth.studentId);
  return res.status(200).json(result);
}
