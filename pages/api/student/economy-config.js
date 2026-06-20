import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { buildStudentEconomyConfigPayload } from "../../../lib/rewards/server/economy-config.server.js";
import { economyUnavailableHttpResponse } from "../../../lib/rewards/economy-errors.js";
import { guardEconomyAvailable } from "../../../lib/rewards/guards.server.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!guardEconomyAvailable(res)) return;

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Student session expired" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const economyConfig = await buildStudentEconomyConfigPayload(supabase);
    return res.status(200).json({ ok: true, economyConfig });
  } catch (e) {
    if (e?.name === "EconomyUnavailableError") {
      return res.status(503).json(economyUnavailableHttpResponse(e));
    }
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
