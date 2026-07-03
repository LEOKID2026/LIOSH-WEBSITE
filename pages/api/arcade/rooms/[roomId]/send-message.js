import { requireArcadeStudent } from "../../../../../lib/arcade/server/arcade-auth";
import { sendSafeMessageToRoom } from "../../../../../lib/arcade/club/safe-messages.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const roomId = String(req.query.roomId || req.body?.roomId || "").trim();
  const messageId = String(req.body?.messageId || "").trim();

  if (!roomId || !messageId) {
    return res.status(400).json({ ok: false, error: "חסר חדר או הודעה", code: "bad_request" });
  }

  const result = await sendSafeMessageToRoom(auth.supabase, auth.studentId, roomId, messageId);
  if (!result.ok) {
    return res.status(result.status || 400).json(result);
  }

  return res.status(200).json(result);
}
