import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { getLearningSupabaseServerUserClient } from "../../../../lib/learning-supabase/server.js";
import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server.js";
import { finalizeParentSessionReady } from "../../../../lib/parent-server/parent-session-ready.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const bearer = typeof req.headers.authorization === "string" ? req.headers.authorization.trim() : "";
    if (!bearer.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "Missing bearer token" });
    }

    const supabase = getLearningSupabaseServerUserClient(bearer);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const flow = String(req.body?.flow || "login").trim().toLowerCase();
    const requireGoogle = flow === "google";
    const source =
      flow === "google" ? "parent_google_signup" : flow === "signup" ? "parent_signup" : "parent_login";
    const signupMethod =
      flow === "google" ? "google" : flow === "signup" ? "email" : null;

    const result = await finalizeParentSessionReady(
      getLearningSupabaseServiceRoleClient(),
      userData.user,
      { source, signupMethod, requireGoogle }
    );

    if (!result.ok) {
      safeApiLog("parent_session_ready_failed", {
        flow,
        error: result.error,
        status: result.status,
      });
      return res.status(result.status || 500).json({
        ok: false,
        error: result.error,
        messageHe: result.messageHe || null,
      });
    }

    safeApiLog("parent_session_ready_ok", {
      flow,
      parentUserId: result.parentUserId,
      isNewSignup: Boolean(result.isNewSignup),
    });

    return res.status(200).json({
      ok: true,
      isNewSignup: Boolean(result.isNewSignup),
    });
  } catch (_e) {
    safeApiLog("parent_session_ready_error", { route: "session/ready" });
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
