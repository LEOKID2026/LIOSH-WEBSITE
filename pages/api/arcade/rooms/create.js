import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import { createArcadeRoom } from "../../../../lib/arcade/server/arcade-rooms";
import { assertArcadePlayAccess } from "../../../../lib/arcade/club/arcade-access.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const gameKey = String(body.gameKey || "").trim();
  const roomType = String(body.roomType || "").trim();
  const entryCost = body.entryCost;
  const maxPlayers = body.maxPlayers;

  const allowedTypes = new Set(["public", "private"]);
  if (!gameKey || !allowedTypes.has(roomType)) {
    return res.status(400).json({
      ok: false,
      error: "סוג חדר לא תקין (מותר public או private)",
      code: "bad_request",
    });
  }

  const access = await assertArcadePlayAccess(auth.supabase, auth.studentId, gameKey, {
    roomAction: roomType === "private" ? "private" : "public",
  });
  if (!access.ok) {
    return res.status(access.status || 403).json({
      ok: false,
      error: access.message,
      code: access.code,
      category: access.category,
    });
  }

  const result = await createArcadeRoom(auth.supabase, {
    studentId: auth.studentId,
    gameKey,
    roomType,
    entryCost,
    maxPlayers,
  });

  if (result.error) {
    const code = result.error.code || "bad_request";
    const status =
      code === "insufficient_funds"
        ? 402
        : code === "unknown_game"
          ? 404
          : code === "game_not_active"
            ? 403
            : 400;
    return res.status(status).json({ ok: false, error: result.error.message, code });
  }

  return res.status(200).json({
    ok: true,
    room: result.room,
  });
}
