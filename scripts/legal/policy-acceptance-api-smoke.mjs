#!/usr/bin/env node
/**
 * Phase D.1 — Policy acceptance API smoke (dev/QA).
 * Reads existing .env.local vars only; does not modify ENV files.
 *
 * Usage:
 *   node --env-file=.env.local scripts/legal/policy-acceptance-api-smoke.mjs
 *   node --env-file=.env.local scripts/legal/policy-acceptance-api-smoke.mjs --base http://localhost:3105
 *
 * Parent credentials (first match wins):
 *   E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD
 *   VIRTUAL_STUDENT_PARENT_ACCOUNTS JSON
 *   Auto-setup: LEARNING_SUPABASE_SERVICE_ROLE_KEY → ephemeral policy-smoke-* user (deleted after)
 */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  TERMS_VERSION,
  PRIVACY_VERSION,
} from "../../data/legal/sitePolicies.he.js";
import { isCurrentPolicyAccepted } from "../../lib/parent-server/policy-acceptance.server.js";

const EMAIL_PREFIX = "policy-smoke-";

const baseUrl = (() => {
  const argIdx = process.argv.indexOf("--base");
  if (argIdx >= 0 && process.argv[argIdx + 1]) return process.argv[argIdx + 1].replace(/\/$/, "");
  return String(process.env.POLICY_SMOKE_BASE_URL || "http://localhost:3099").replace(/\/$/, "");
})();

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) fail(`Missing ${name}`);
  return v;
}

function optionalEnv(name) {
  const v = String(process.env[name] || "").trim();
  return v || null;
}

function resolveParentCredentials() {
  const email = String(process.env.E2E_PARENT_EMAIL || "").trim();
  const password = String(process.env.E2E_PARENT_PASSWORD || "");
  if (email && password) return { email, password, auto: false };

  const raw = String(process.env.VIRTUAL_STUDENT_PARENT_ACCOUNTS || "").trim();
  if (raw) {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr[0]?.email && arr[0]?.password) {
      return { email: arr[0].email, password: arr[0].password, auto: false };
    }
  }
  return null;
}

async function createEphemeralParent(admin) {
  const password = crypto.randomBytes(24).toString("base64url");
  const runId = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
  const email = `${EMAIL_PREFIX}${runId}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: "policy-acceptance-smoke" },
  });
  if (created.error || !created.data.user?.id) {
    fail(`auto-setup createUser failed: ${created.error?.message || "unknown"}`);
  }
  return { email, password, userId: created.data.user.id };
}

async function deleteEphemeralParent(admin, userId) {
  if (!userId) return;
  await admin.auth.admin.deleteUser(userId);
}

async function apiFetch(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  return { status: res.status, payload };
}

async function main() {
  ok(`baseUrl=${baseUrl}`);

  if (!isCurrentPolicyAccepted(null)) ok("isCurrentPolicyAccepted(null) === false");
  else fail("isCurrentPolicyAccepted(null) should be false");

  if (isCurrentPolicyAccepted({ terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION })) {
    ok("current versions accepted");
  } else fail("current version pair should be accepted");

  if (!isCurrentPolicyAccepted({ terms_version: "1999-01-01", privacy_version: PRIVACY_VERSION })) {
    ok("stale terms version rejected");
  } else fail("stale terms should not count as accepted");

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const serviceRoleKey = optionalEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");

  let creds = resolveParentCredentials();
  let admin = null;
  let ephemeralUserId = null;

  if (!creds) {
    if (!serviceRoleKey) {
      fail("No parent credentials and no LEARNING_SUPABASE_SERVICE_ROLE_KEY for auto-setup");
    }
    admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    creds = await createEphemeralParent(admin);
    ephemeralUserId = creds.userId;
    ok("auto-setup: ephemeral parent created");
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.password,
    });
    if (signInErr || !signInData?.session?.access_token) {
      fail(`parent sign-in failed: ${signInErr?.message || "no session"}`);
    }
    const token = signInData.session.access_token;
    const parentUserId = signInData.session.user.id;
    ok("parent signed in");

    if (ephemeralUserId && parentUserId !== ephemeralUserId) {
      fail("auto-setup user id mismatch after sign-in");
    }

    const unauth = await apiFetch("/api/parent/policy-acceptance/status");
    if (unauth.status === 401) ok("GET status without auth → 401");
    else fail(`GET without auth expected 401, got ${unauth.status}`);

    const badVersion = await apiFetch("/api/parent/policy-acceptance/accept", {
      method: "POST",
      token,
      body: { termsVersion: "1999-01-01", privacyVersion: PRIVACY_VERSION, source: "parent_dashboard" },
    });
    if (badVersion.status === 409) ok("POST wrong terms version → 409");
    else fail(`POST wrong version expected 409, got ${badVersion.status}`);

    const badSource = await apiFetch("/api/parent/policy-acceptance/accept", {
      method: "POST",
      token,
      body: {
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        source: "invalid_source",
      },
    });
    if (badSource.status === 400) ok("POST invalid source → 400");
    else fail(`POST invalid source expected 400, got ${badSource.status}`);

    const before = await apiFetch("/api/parent/policy-acceptance/status", { token });
    if (before.status !== 200 || !before.payload?.ok) {
      fail(`GET status failed: HTTP ${before.status} ${JSON.stringify(before.payload)}`);
    }
    if (before.payload.requiredTermsVersion !== TERMS_VERSION) fail("requiredTermsVersion mismatch");
    if (before.payload.requiredPrivacyVersion !== PRIVACY_VERSION) fail("requiredPrivacyVersion mismatch");
    if (before.payload.accepted !== false) {
      fail(`expected accepted=false before first accept, got ${before.payload.accepted}`);
    }
    ok("GET status before accept → accepted=false");

    const accept = await apiFetch("/api/parent/policy-acceptance/accept", {
      method: "POST",
      token,
      body: {
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        source: ephemeralUserId ? "parent_signup" : "parent_dashboard",
      },
    });
    if (accept.status !== 200 || !accept.payload?.ok) {
      fail(`POST accept failed: HTTP ${accept.status} ${JSON.stringify(accept.payload)}`);
    }
    ok("POST accept current versions → 200");

    const after = await apiFetch("/api/parent/policy-acceptance/status", { token });
    if (after.status !== 200 || !after.payload?.accepted) {
      fail(`GET after accept expected accepted=true, got ${JSON.stringify(after.payload)}`);
    }
    if (!after.payload.acceptedAt) fail("acceptedAt missing after accept");
    ok("GET after accept → accepted=true with acceptedAt");

    const again = await apiFetch("/api/parent/policy-acceptance/accept", {
      method: "POST",
      token,
      body: {
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        source: "parent_dashboard",
      },
    });
    if (again.status === 200 && again.payload?.alreadyAccepted) {
      ok("duplicate POST is idempotent (alreadyAccepted)");
    } else if (again.status === 200) {
      ok("duplicate POST returned 200");
    } else {
      fail(`idempotent accept unexpected: ${again.status}`);
    }

  // Verify DB row via service role when available
    if (serviceRoleKey) {
      const sr = admin || createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: rows, error: rowErr } = await sr
        .from("parent_policy_acceptances")
        .select("parent_user_id, terms_version, privacy_version, source")
        .eq("parent_user_id", parentUserId)
        .order("accepted_at", { ascending: false })
        .limit(1);
      if (rowErr) fail(`service-role row check failed: ${rowErr.message}`);
      if (!rows?.length) fail("expected one acceptance row in DB");
      if (rows[0].terms_version !== TERMS_VERSION || rows[0].privacy_version !== PRIVACY_VERSION) {
        fail("DB row version mismatch");
      }
      ok("service-role DB row verified (append-only insert)");
    }

    console.log("\nPASS: policy acceptance API smoke");
    console.log(`parent_user_id = auth.users.id = parent_profiles.id (${parentUserId.slice(0, 8)}…)`);
  } finally {
    if (admin && ephemeralUserId) {
      await deleteEphemeralParent(admin, ephemeralUserId);
      ok("auto-setup: ephemeral parent deleted");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
