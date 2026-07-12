import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import { joinArcadeRoomById } from "../../../../lib/arcade/server/arcade-rooms";
import { assertArcadePlayAccess } from "../../../../lib/arcade/club/arcade-access.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const roomId = String(body.roomId || "").trim();
  if (!roomId) {
    return res.status(400).json({ ok: false, error: "חסר מזהה חדר", code: "bad_request" });
  }

  const { data: roomPreview } = await auth.supabase
    .from("arcade_rooms")
    .select("game_key")
    .eq("id", roomId)
    .maybeSingle();

  if (roomPreview?.game_key) {
    // Joining an existing room is not "creating" a room — it must only be gated by the
    // per-game guest access check (assertArcadePlayAccess with no featureKey), not by the
    // Admin "room_public_create" toggle. Otherwise an Admin disabling public room *creation*
    // would accidentally also block guests from *joining* rooms others already created.
    const access = await assertArcadePlayAccess(
      auth.supabase,
      auth.studentId,
      roomPreview.game_key,
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

  const result = await joinArcadeRoomById(auth.supabase, auth.studentId, roomId);

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
              : code === "session_start_failed" || code === "room_activate_failed"
                ? 500
                : 400;
    return res.status(status).json({ ok: false, error: result.error.message, code });
  }

  return res.status(200).json({
    ok: true,
    room: result.room,
    player: result.player,
  });
}
