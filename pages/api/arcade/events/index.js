import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import {
  claimEventReward,
  getActiveDailyEvent,
  getActiveTournament,
  getTournamentBracket,
  registerForTournament,
} from "../../../../lib/arcade/club/events.server.js";

export default async function handler(req, res) {
  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  const resource = String(req.query.resource || "events").trim();

  if (req.method === "GET") {
    if (resource === "tournament") {
      const tournament = await getActiveTournament(auth.supabase, auth.studentId);
      const tournamentId = String(req.query.tournamentId || "").trim();
      if (tournamentId) {
        const bracket = await getTournamentBracket(auth.supabase, tournamentId);
        return res.status(200).json({ ok: true, tournament: bracket });
      }
      return res.status(200).json({ ok: true, tournament });
    }

    const event = await getActiveDailyEvent(auth.supabase, auth.studentId);
    return res.status(200).json({ ok: true, event });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const action = String(body.action || "").trim();

    if (action === "claim_event") {
      const result = await claimEventReward(auth.supabase, auth.studentId, String(body.eventId || ""));
      if (!result.ok) return res.status(400).json(result);
      return res.status(200).json(result);
    }

    if (action === "register_tournament") {
      const result = await registerForTournament(auth.supabase, auth.studentId, String(body.tournamentId || ""));
      if (!result.ok) return res.status(400).json(result);
      return res.status(200).json(result);
    }

    return res.status(400).json({ ok: false, error: "פעולה לא תקינה", code: "bad_request" });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
