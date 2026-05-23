/**
 * Server-only Terms + Privacy acceptance helpers (append-only parent_policy_acceptances).
 */

import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../../data/legal/sitePolicies.he.js";
import { getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";

export const POLICY_ACCEPTANCE_SOURCES = new Set([
  "parent_signup",
  "parent_login",
  "parent_dashboard",
]);

export function getRequiredPolicyVersions() {
  return {
    requiredTermsVersion: TERMS_VERSION,
    requiredPrivacyVersion: PRIVACY_VERSION,
  };
}

/**
 * @param {string} version
 */
export function isValidPolicyVersionString(version) {
  if (typeof version !== "string") return false;
  const v = version.trim();
  return v.length >= 1 && v.length <= 64;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} parentUserId
 */
export async function fetchLatestPolicyAcceptance(serviceRole, parentUserId) {
  const { data, error } = await serviceRole
    .from("parent_policy_acceptances")
    .select("id, terms_version, privacy_version, accepted_at, source, locale, created_at")
    .eq("parent_user_id", parentUserId)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("policy_acceptance_fetch_failed");
  }
  return data || null;
}

/**
 * @param {{ terms_version?: string, privacy_version?: string } | null} latest
 */
export function isCurrentPolicyAccepted(latest) {
  if (!latest) return false;
  return (
    latest.terms_version === TERMS_VERSION && latest.privacy_version === PRIVACY_VERSION
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} parentUserId
 */
export async function resolveParentPolicyAcceptanceStatus(serviceRole, parentUserId) {
  const { requiredTermsVersion, requiredPrivacyVersion } = getRequiredPolicyVersions();
  const latest = await fetchLatestPolicyAcceptance(serviceRole, parentUserId);
  const accepted = isCurrentPolicyAccepted(latest);

  return {
    requiredTermsVersion,
    requiredPrivacyVersion,
    accepted,
    acceptedAt: accepted && latest?.accepted_at ? latest.accepted_at : null,
    latestAcceptedTermsVersion: latest?.terms_version ?? null,
    latestAcceptedPrivacyVersion: latest?.privacy_version ?? null,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {{
 *   parentUserId: string;
 *   termsVersion: string;
 *   privacyVersion: string;
 *   source?: string;
 *   locale?: string;
 * }} input
 */
export async function recordParentPolicyAcceptance(serviceRole, input) {
  const termsVersion = String(input.termsVersion || "").trim();
  const privacyVersion = String(input.privacyVersion || "").trim();
  const source = String(input.source || "parent_login").trim();
  const locale = String(input.locale || "he").trim();

  if (!isValidPolicyVersionString(termsVersion) || !isValidPolicyVersionString(privacyVersion)) {
    return { ok: false, error: "Invalid policy version", status: 400 };
  }
  if (termsVersion !== TERMS_VERSION || privacyVersion !== PRIVACY_VERSION) {
    return { ok: false, error: "Policy version mismatch", status: 409 };
  }
  if (!POLICY_ACCEPTANCE_SOURCES.has(source)) {
    return { ok: false, error: "Invalid source", status: 400 };
  }
  if (locale.length < 2 || locale.length > 16) {
    return { ok: false, error: "Invalid locale", status: 400 };
  }

  const latest = await fetchLatestPolicyAcceptance(serviceRole, input.parentUserId);
  if (isCurrentPolicyAccepted(latest)) {
    return {
      ok: true,
      alreadyAccepted: true,
      acceptedAt: latest.accepted_at,
      termsVersion: latest.terms_version,
      privacyVersion: latest.privacy_version,
    };
  }

  const { data, error } = await serviceRole
    .from("parent_policy_acceptances")
    .insert({
      parent_user_id: input.parentUserId,
      terms_version: termsVersion,
      privacy_version: privacyVersion,
      source,
      locale,
    })
    .select("id, accepted_at, terms_version, privacy_version, source")
    .single();

  if (error) {
    throw new Error("policy_acceptance_insert_failed");
  }

  return {
    ok: true,
    alreadyAccepted: false,
    acceptedAt: data.accepted_at,
    termsVersion: data.terms_version,
    privacyVersion: data.privacy_version,
    source: data.source,
  };
}

/**
 * Authenticate parent bearer token; returns user id or error shape.
 * @param {string} authHeader
 */
export async function resolveAuthenticatedParentUserId(authHeader) {
  const { getLearningSupabaseServerUserClient } = await import("../learning-supabase/server.js");
  const bearer = typeof authHeader === "string" ? authHeader.trim() : "";
  if (!bearer.startsWith("Bearer ")) {
    return { ok: false, error: "Missing bearer token", status: 401 };
  }

  const supabase = getLearningSupabaseServerUserClient(bearer);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { ok: false, error: "Invalid session", status: 401 };
  }

  return { ok: true, parentUserId: userData.user.id };
}

export function getPolicyAcceptanceServiceRole() {
  return getLearningSupabaseServiceRoleClient();
}
