import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../../data/legal/sitePolicies.he.js";
import { getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import {
  assertPolicyAcceptanceParentEligible,
  recordParentPolicyAcceptance,
} from "./policy-acceptance.server.js";
import { provisionParentEntitlementOnAccept } from "./parent-entitlement-provision.server.js";

const BLOCKED_PERSONA_MESSAGE_HE =
  "כניסה עם Google זמינה להורים בלבד. השתמשו בפורטל המורים או המנהלים.";

/**
 * @param {import("@supabase/supabase-js").User} user
 */
export function userHasGoogleIdentity(user) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  return identities.some((identity) => identity?.provider === "google");
}

/**
 * @param {import("@supabase/supabase-js").User} user
 */
export function resolveUserDisplayName(user) {
  const meta = user?.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
  const candidates = [meta.full_name, meta.name, meta.display_name];
  for (const value of candidates) {
    const trimmed = String(value || "").trim();
    if (trimmed) return trimmed.slice(0, 80);
  }
  return null;
}

/**
 * Silently record policy acceptance and provision parent entitlement/settings.
 * Used after email login, email signup, and Google OAuth — no UI gate.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {import("@supabase/supabase-js").User} user
 * @param {{
 *   source?: string;
 *   signupMethod?: "email" | "google" | null;
 *   requireGoogle?: boolean;
 * }} [options]
 */
export async function finalizeParentSessionReady(serviceRole, user, options = {}) {
  const db = serviceRole || getLearningSupabaseServiceRoleClient();
  const source = String(options.source || "parent_login").trim();
  const requireGoogle = Boolean(options.requireGoogle);
  const signupMethod = options.signupMethod || null;

  const eligible = await assertPolicyAcceptanceParentEligible(user, db);
  if (!eligible.ok) {
    return {
      ok: false,
      status: eligible.status || 403,
      error: eligible.error || "not_authorized",
      messageHe: BLOCKED_PERSONA_MESSAGE_HE,
    };
  }

  if (requireGoogle && !userHasGoogleIdentity(user)) {
    return {
      ok: false,
      status: 403,
      error: "google_identity_required",
      messageHe: "לא הצלחנו לאמת התחברות Google. נסו שוב.",
    };
  }

  const parentUserId = user.id;
  const email = user.email || null;
  const displayName = resolveUserDisplayName(user);

  const { data: existingProfile } = await db
    .from("parent_profiles")
    .select("id, display_name, signup_method")
    .eq("id", parentUserId)
    .maybeSingle();

  if (!existingProfile) {
    const { error: insertErr } = await db.from("parent_profiles").insert({ id: parentUserId });
    if (insertErr) {
      return { ok: false, status: 500, error: "parent_profile_create_failed" };
    }
  }

  const profilePatch = {};
  if (displayName && !String(existingProfile?.display_name || "").trim()) {
    profilePatch.display_name = displayName;
  }
  if (signupMethod && !existingProfile?.signup_method) {
    profilePatch.signup_method = signupMethod;
  }
  if (Object.keys(profilePatch).length > 0) {
    await db.from("parent_profiles").update(profilePatch).eq("id", parentUserId);
  }

  const policyResult = await recordParentPolicyAcceptance(db, {
    parentUserId,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    source,
    locale: "he",
  });

  if (!policyResult.ok) {
    return { ok: false, status: policyResult.status || 500, error: policyResult.error || "policy_accept_failed" };
  }

  const provision = await provisionParentEntitlementOnAccept(db, parentUserId, email);
  if (!provision.ok && !provision.skipped) {
    return {
      ok: false,
      status: provision.status || 503,
      error: provision.code || "entitlement_provision_failed",
    };
  }

  return {
    ok: true,
    parentUserId,
    isNewSignup: Boolean(signupMethod && !existingProfile?.signup_method),
    policyAlreadyAccepted: Boolean(policyResult.alreadyAccepted),
  };
}
