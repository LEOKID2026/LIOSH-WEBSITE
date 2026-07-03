import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import {
  listPendingInvites,
  respondArcadeInvite,
  sendArcadeInvite,
} from "../../../../lib/arcade/club/invites.server.js";

export default async function handler(req, res) {
  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const result = await listPendingInvites(auth.supabase, auth.studentId);
    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const action = String(body.action || "send").trim();

    if (action === "send") {
      const result = await sendArcadeInvite(
        auth.supabase,
        auth.studentId,
        String(body.toStudentId || ""),
        String(body.gameKey || ""),
        body.roomId ? String(body.roomId) : null
      );
      if (!result.ok) return res.status(result.status || 400).json(result);
      return res.status(200).json(result);
    }

    if (action === "respond") {
      const result = await respondArcadeInvite(
        auth.supabase,
        auth.studentId,
        String(body.inviteId || ""),
        body.accept === true ? "accept" : "decline"
      );
      if (!result.ok) return res.status(400).json(result);
      return res.status(200).json(result);
    }

    return res.status(400).json({ ok: false, error: "פעולה לא תקינה", code: "bad_request" });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
