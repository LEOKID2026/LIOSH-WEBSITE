import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import { updateArcadeDisplayName } from "../../../../lib/arcade/club/player-profile.server.js";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const displayName = body.displayName ?? body.display_name;

  const result = await updateArcadeDisplayName(auth.supabase, auth.studentId, displayName);
  if (!result.ok) {
    return res.status(result.status || 400).json({
      ok: false,
      error: result.message,
      code: result.code,
    });
  }

  return res.status(200).json({ ok: true, profile: result.profile });
}
