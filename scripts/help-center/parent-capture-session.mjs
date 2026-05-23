/**
 * Help Center capture-only parent session helpers (policy accept + API token).
 * Does not modify product auth pages or server logic.
 */
import { loadParentAccounts, selectParentAccount } from "../virtual-student-qa/lib/config.mjs";

export function selectHelpParentAccount() {
  const parents = loadParentAccounts();
  return selectParentAccount(parents, null, null);
}

/** @returns {Promise<string>} Bearer access token */
export async function getParentAccessToken(parentAccount) {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "").trim();
  const anonKey = String(process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY || "").trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_LEARNING_SUPABASE_* required for parent capture session");
  }
  const { createClient } = await import("@supabase/supabase-js");
  const node = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await node.auth.signInWithPassword({
    email: parentAccount.email,
    password: parentAccount.password,
  });
  if (error || !data?.session?.access_token) {
    throw new Error(`parent sign-in failed: ${error?.message || "no session"}`);
  }
  return data.session.access_token;
}

/** Ensures demo parent has accepted current policy versions (capture-only). */
export async function ensureParentPolicyAccepted(baseUrl, accessToken, log) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const statusRes = await fetch(new URL("/api/parent/policy-acceptance/status", baseUrl).toString(), {
    headers,
  });
  const status = await statusRes.json().catch(() => ({}));
  if (!statusRes.ok || !status?.ok) {
    throw new Error(`policy status failed: ${status?.error || statusRes.status}`);
  }
  if (status.accepted) {
    log?.("parent policy already accepted");
    return;
  }
  const acceptRes = await fetch(new URL("/api/parent/policy-acceptance/accept", baseUrl).toString(), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      termsVersion: status.requiredTermsVersion,
      privacyVersion: status.requiredPrivacyVersion,
      source: "parent_dashboard",
      locale: "he",
    }),
  });
  const accept = await acceptRes.json().catch(() => ({}));
  if (!acceptRes.ok || !accept?.ok) {
    throw new Error(`policy accept failed: ${accept?.error || acceptRes.status}`);
  }
  log?.("parent policy accepted for capture session");
}
