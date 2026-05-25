#!/usr/bin/env node
/**
 * Ensure a Supabase Auth user with app_metadata.role=admin (no teacher_profiles row).
 * node --env-file=.env.local scripts/admin-portal/ensure-admin-test-user.mjs
 *
 * Optional env overrides:
 *   ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD
 */
import { createClient } from "@supabase/supabase-js";

const EMAIL = String(process.env.ADMIN_TEST_EMAIL || "office@leo.com").trim().toLowerCase();
const PASSWORD = String(process.env.ADMIN_TEST_PASSWORD || "leo7479");

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === email);
    if (match) return match;
    if (!data?.users?.length) break;
  }
  return null;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await findUserByEmail(admin, EMAIL);
  let userId;

  if (existing?.id) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (error) throw error;
    userId = data.user?.id || existing.id;
    console.log(`Updated admin user: ${EMAIL} (${userId})`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (error) throw error;
    userId = data.user?.id;
    console.log(`Created admin user: ${EMAIL} (${userId})`);
  }

  const { data: profile } = await admin
    .from("teacher_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.id) {
    console.warn(
      "WARN: user has teacher_profiles row — admin should not use teacher APIs. Remove manually if unintended."
    );
  } else {
    console.log("OK: no teacher_profiles row (admin not treated as teacher).");
  }

  console.log("app_metadata.role=admin set. Login via /teacher/login then open /admin/teachers.");
}

main().catch((e) => {
  console.error("ensure-admin-test-user: FAIL", e.message || e);
  process.exit(1);
});
