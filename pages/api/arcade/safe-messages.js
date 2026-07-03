import { requireArcadeStudent } from "../../../lib/arcade/server/arcade-auth";
import { listSafeMessagesForStudent } from "../../../lib/arcade/club/safe-messages.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const result = await listSafeMessagesForStudent(auth.supabase, auth.studentId);
  return res.status(200).json(result);
}
