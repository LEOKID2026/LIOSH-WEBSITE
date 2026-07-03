import { requireArcadeStudent } from "../../../lib/arcade/server/arcade-auth";
import { getPersonalRoom, updatePersonalRoom } from "../../../lib/arcade/club/personal-room.server.js";

export default async function handler(req, res) {
  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const result = await getPersonalRoom(auth.supabase, auth.studentId);
    return res.status(200).json(result);
  }

  if (req.method === "PUT") {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const result = await updatePersonalRoom(auth.supabase, auth.studentId, {
      roomName: body.roomName,
      backgroundId: body.backgroundId,
      decorationSlots: body.decorationSlots,
    });
    if (!result.ok) return res.status(result.status || 400).json(result);
    return res.status(200).json(result);
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
