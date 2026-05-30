import { safeApiLog } from "../../../../lib/security/safe-log.js";
import {
  getPolicyAcceptanceServiceRole,
  resolveAuthenticatedParentUserId,
  resolveParentPolicyAcceptanceStatus,
} from "../../../../lib/parent-server/policy-acceptance.server.js";
import { ensureParentEntitlementIfPolicyAccepted } from "../../../../lib/parent-server/parent-entitlement-provision.server.js";
import { getLearningSupabaseServerUserClient } from "../../../../lib/learning-supabase/server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await resolveAuthenticatedParentUserId(req.headers.authorization || "");
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const serviceRole = getPolicyAcceptanceServiceRole();
    const status = await resolveParentPolicyAcceptanceStatus(serviceRole, auth.parentUserId);

    if (status.accepted) {
      let userEmail = null;
      try {
        const supabase = getLearningSupabaseServerUserClient(req.headers.authorization || "");
        const { data: userData } = await supabase.auth.getUser();
        userEmail = userData?.user?.email || null;
      } catch {
        userEmail = null;
      }
      await ensureParentEntitlementIfPolicyAccepted(serviceRole, auth.parentUserId, userEmail);
    }

    return res.status(200).json({ ok: true, ...status });
  } catch (_e) {
    safeApiLog("parent_policy_acceptance_status_error", { route: "status" });
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
