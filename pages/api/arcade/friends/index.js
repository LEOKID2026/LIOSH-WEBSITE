import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import {
  listArcadeFriends,
  removeArcadeFriend,
  respondFriendRequest,
  sendFriendRequest,
} from "../../../../lib/arcade/club/friends.server.js";

export default async function handler(req, res) {
  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const result = await listArcadeFriends(auth.supabase, auth.studentId);
    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const action = String(body.action || "").trim();

    if (action === "request") {
      const result = await sendFriendRequest(auth.supabase, auth.studentId, body.query || body.leoNumber);
      if (!result.ok) return res.status(400).json(result);
      return res.status(200).json(result);
    }

    if (action === "respond") {
      const result = await respondFriendRequest(
        auth.supabase,
        auth.studentId,
        String(body.requestId || ""),
        body.accept === true ? "accept" : "decline"
      );
      if (!result.ok) return res.status(400).json(result);
      return res.status(200).json(result);
    }

    return res.status(400).json({ ok: false, error: "פעולה לא תקינה", code: "bad_request" });
  }

  if (req.method === "DELETE") {
    const friendId = String(req.query.friendId || req.body?.friendId || "").trim();
    if (!friendId) return res.status(400).json({ ok: false, error: "חסר מזהה חבר", code: "bad_request" });
    const result = await removeArcadeFriend(auth.supabase, auth.studentId, friendId);
    return res.status(200).json(result);
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
