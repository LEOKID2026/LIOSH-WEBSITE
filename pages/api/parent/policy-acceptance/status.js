import { safeApiLog } from "../../../../lib/security/safe-log.js";
import {
  getPolicyAcceptanceServiceRole,
  resolveAuthenticatedParentUserId,
  resolveParentPolicyAcceptanceStatus,
} from "../../../../lib/parent-server/policy-acceptance.server.js";

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

    return res.status(200).json({ ok: true, ...status });
  } catch (_e) {
    safeApiLog("parent_policy_acceptance_status_error", { route: "status" });
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
