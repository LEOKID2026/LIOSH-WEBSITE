import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import { joinArcadeRoomByCode } from "../../../../lib/arcade/server/arcade-rooms";
import { assertArcadePlayAccess } from "../../../../lib/arcade/club/arcade-access.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const joinCode = body.joinCode;

  const { data: roomPreview } = await auth.supabase
    .from("arcade_rooms")
    .select("game_key")
    .eq("join_code", String(joinCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim())
    .maybeSingle();

  if (roomPreview?.game_key) {
    const access = await assertArcadePlayAccess(
      auth.supabase,
      auth.studentId,
      roomPreview.game_key,
      { roomAction: "join_by_code" }
    );
    if (!access.ok) {
      return res.status(access.status || 403).json({
        ok: false,
        error: access.message,
        code: access.code,
        category: access.category,
      });
    }
  }

  const result = await joinArcadeRoomByCode(auth.supabase, auth.studentId, joinCode);

  if (result.error) {
    const code = result.error.code || "bad_request";
    const status =
      code === "insufficient_funds"
        ? 402
        : code === "room_not_found"
          ? 404
          : code === "game_not_active"
            ? 403
            : code === "room_full" || code === "already_joined" || code === "seat_taken"
              ? 409
              : 400;
    return res.status(status).json({ ok: false, error: result.error.message, code });
  }

  return res.status(200).json({
    ok: true,
    room: result.room,
    player: result.player,
  });
}
