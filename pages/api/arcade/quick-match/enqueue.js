import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import { enqueueQuickMatch } from "../../../../lib/arcade/server/arcade-quick-match";
import { assertStudentCanPlayGame } from "../../../../lib/games/server/game-access.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const gameKey = String(body.gameKey || "").trim();
  const entryCost = body.entryCost;

  if (!gameKey) {
    return res.status(400).json({ ok: false, error: "חסר משחק", code: "bad_request" });
  }

  const access = await assertStudentCanPlayGame(auth.supabase, auth.studentId, gameKey);
  if (!access.ok) {
    return res.status(access.status || 403).json({
      ok: false,
      error: access.message,
      code: access.code,
      category: access.category,
    });
  }

  const result = await enqueueQuickMatch(auth.supabase, {
    studentId: auth.studentId,
    gameKey,
    entryCost,
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
    queue: result.queue,
    matched: result.matched || null,
    alreadyQueued: result.alreadyQueued === true,
  });
}
