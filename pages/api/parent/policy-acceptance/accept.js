import { safeApiLog } from "../../../../lib/security/safe-log.js";
import {
  getPolicyAcceptanceServiceRole,
  recordParentPolicyAcceptance,
  resolveAuthenticatedParentUserId,
} from "../../../../lib/parent-server/policy-acceptance.server.js";
import { provisionParentEntitlementOnAccept } from "../../../../lib/parent-server/parent-entitlement-provision.server.js";
import { getLearningSupabaseServerUserClient } from "../../../../lib/learning-supabase/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await resolveAuthenticatedParentUserId(req.headers.authorization || "");
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const result = await recordParentPolicyAcceptance(getPolicyAcceptanceServiceRole(), {
      parentUserId: auth.parentUserId,
      termsVersion: req.body?.termsVersion,
      privacyVersion: req.body?.privacyVersion,
      source: req.body?.source,
      locale: req.body?.locale,
    });

    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: result.error });
    }

    let userEmail = null;
    try {
      const supabase = getLearningSupabaseServerUserClient(req.headers.authorization || "");
      const { data: userData } = await supabase.auth.getUser();
      userEmail = userData?.user?.email || null;
    } catch {
      userEmail = null;
    }

    const provision = await provisionParentEntitlementOnAccept(
      getPolicyAcceptanceServiceRole(),
      auth.parentUserId,
      userEmail
    );
    if (!provision.ok && !provision.skipped) {
      safeApiLog("parent_entitlement_provision_failed", {
        parentUserId: auth.parentUserId,
        code: provision.code || "internal_error",
      });
      return res.status(provision.status || 503).json({
        ok: false,
        error: provision.code || "entitlement_provision_failed",
      });
    }

    safeApiLog("parent_policy_acceptance_recorded", {
      parentUserId: auth.parentUserId,
      source: result.source || req.body?.source || "parent_login",
      alreadyAccepted: Boolean(result.alreadyAccepted),
    });

    return res.status(200).json({
      ok: true,
      accepted: true,
      acceptedAt: result.acceptedAt,
      termsVersion: result.termsVersion,
      privacyVersion: result.privacyVersion,
      alreadyAccepted: Boolean(result.alreadyAccepted),
    });
  } catch (_e) {
    safeApiLog("parent_policy_acceptance_accept_error", { route: "accept" });
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
