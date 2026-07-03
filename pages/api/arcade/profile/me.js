import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import { getArcadePlayerProfileView } from "../../../../lib/arcade/club/player-profile.server.js";
import { getStudentCoinBalance } from "../../../../lib/rewards/server/reward-coins.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const profile = await getArcadePlayerProfileView(auth.supabase, auth.studentId, {
    viewerStudentId: auth.studentId,
  });
  const balance = await getStudentCoinBalance(auth.supabase, auth.studentId);

  return res.status(200).json({ ok: true, profile, coinBalance: balance });
}
