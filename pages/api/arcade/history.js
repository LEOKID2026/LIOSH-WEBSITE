import { requireArcadeStudent } from "../../../lib/arcade/server/arcade-auth";
import { listArcadeGameHistory } from "../../../lib/arcade/club/history.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const limit = req.query.limit;
  const offset = req.query.offset;
  const result = await listArcadeGameHistory(auth.supabase, auth.studentId, { limit, offset });

  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.message, code: result.code });
  }

  return res.status(200).json({ ok: true, history: result.history, limit: result.limit, offset: result.offset });
}
