#!/usr/bin/env node
/**
 * Promote an existing or new auth user to platform main admin.
 * Does NOT print passwords. Password is optional via ADMIN_TEST_PASSWORD env only.
 *
 * Usage:
 *   node --env-file=.env.local scripts/admin-portal/promote-main-admin.mjs
 *
 * Optional env:
 *   MAIN_ADMIN_EMAIL (default: leokid2026@gmail.com)
 *   ADMIN_TEST_PASSWORD — if set, updates password; otherwise skipped (owner sets in Dashboard)
 */
import { createClient } from "@supabase/supabase-js";

const EMAIL = String(process.env.MAIN_ADMIN_EMAIL || "leokid2026@gmail.com")
  .trim()
  .toLowerCase();
const PASSWORD = String(process.env.ADMIN_TEST_PASSWORD || "").trim();

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === email);
    if (match) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function upsertAdminEntitlement(db, userId) {
  const { error } = await db.from("account_persona_entitlements").upsert(
    {
      user_id: userId,
      persona: "admin",
      status: "active",
      approval_source: "admin",
      approved_at: new Date().toISOString(),
    },
    { onConflict: "user_id,persona" }
  );
  if (error) throw error;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let user = await findUserByEmail(admin, EMAIL);
  let userId;

  if (user?.id) {
    const patch = {
      email_confirm: true,
      app_metadata: { ...(user.app_metadata || {}), role: "admin" },
    };
    if (PASSWORD) {
      patch.password = PASSWORD;
    }
    const { data, error } = await admin.auth.admin.updateUserById(user.id, patch);
    if (error) throw error;
    userId = data.user?.id || user.id;
    console.log(`Promoted existing user: ${EMAIL} (${userId})`);
    if (!PASSWORD) {
      console.log("Password unchanged — set via Supabase Dashboard if needed.");
    }
  } else {
    if (!PASSWORD) {
      throw new Error(
        `User ${EMAIL} not found. Create in Supabase Dashboard or set ADMIN_TEST_PASSWORD to create.`
      );
    }
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

  await upsertAdminEntitlement(admin, userId);

  const { data: profile } = await admin
    .from("teacher_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.id) {
    console.warn("WARN: user has teacher_profiles row — review if unintended for admin login.");
  }

  console.log("Done: app_metadata.role=admin + active admin entitlement.");
  console.log("Login via /teacher/login then open /admin/teachers.");
}

main().catch((e) => {
  console.error("promote-main-admin: FAIL", e.message || e);
  process.exit(1);
});
