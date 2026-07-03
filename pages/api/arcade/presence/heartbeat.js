import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import { touchArcadePresence } from "../../../../lib/arcade/club/friends.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  await touchArcadePresence(auth.supabase, auth.studentId);
  return res.status(200).json({ ok: true });
}
