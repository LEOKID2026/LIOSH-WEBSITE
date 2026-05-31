#!/usr/bin/env node
/**
 * Read-only audit of platform admin auth users (no passwords printed).
 * Usage: node --env-file=.env.local scripts/admin-portal/audit-admin-emails.mjs
 */
import { createClient } from "@supabase/supabase-js";

const AUDIT_EMAILS = [
  "leokid2026@gmail.com",
  "office@leo-k.com",
  "office@leo.com",
  "admin@admin.com",
];

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function findUserByEmail(admin, email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === target);
    if (match) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function loadEntitlements(db, userId) {
  const { data, error } = await db
    .from("account_persona_entitlements")
    .select("persona, status")
    .eq("user_id", userId);
  if (error) return { error: error.code };
  return { rows: data || [] };
}

async function loadProfileFlags(db, userId) {
  const [parent, teacher] = await Promise.all([
    db.from("parent_profiles").select("id").eq("id", userId).maybeSingle(),
    db.from("teacher_profiles").select("id").eq("id", userId).maybeSingle(),
  ]);
  return {
    parentProfile: Boolean(parent.data?.id),
    teacherProfile: Boolean(teacher.data?.id),
  };
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Admin email audit (read-only):\n");

  for (const email of AUDIT_EMAILS) {
    const user = await findUserByEmail(admin, email);
    if (!user) {
      console.log(`- ${email}: NOT FOUND`);
      continue;
    }
    const role = user.app_metadata?.role || user.raw_app_meta_data?.role || null;
    const ents = await loadEntitlements(admin, user.id);
    const profiles = await loadProfileFlags(admin, user.id);
    const adminEnt = (ents.rows || []).find((e) => e.persona === "admin");
    const parentEnt = (ents.rows || []).find((e) => e.persona === "parent");
    console.log(`- ${email}:`);
    console.log(`    userId: ${user.id}`);
    console.log(`    app_metadata.role: ${role || "(none)"}`);
    console.log(`    admin entitlement: ${adminEnt ? adminEnt.status : "(none)"}`);
    console.log(`    parent entitlement: ${parentEnt ? parentEnt.status : "(none)"}`);
    console.log(`    parent_profiles: ${profiles.parentProfile}`);
    console.log(`    teacher_profiles: ${profiles.teacherProfile}`);
  }
}

main().catch((e) => {
  console.error("audit-admin-emails: FAIL", e.message || e);
  process.exit(1);
});
