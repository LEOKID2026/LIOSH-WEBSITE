#!/usr/bin/env node
/**
 * QA school manager: Auth user (role=teacher), teacher_profiles, test school, school_admin membership.
 *
 * Password must NOT be committed — pass at runtime only:
 *   SCHOOL_QA_PASSWORD=... node --env-file=.env.local scripts/school-portal/ensure-qa-school-manager.mjs
 *
 * Optional: SCHOOL_QA_EMAIL (default school@leo.com), SCHOOL_QA_DISPLAY_NAME, SCHOOL_QA_SCHOOL_NAME
 */
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const EMAIL = String(process.env.SCHOOL_QA_EMAIL || "school@leo.com").trim().toLowerCase();
const SCHOOL_NAME = String(process.env.SCHOOL_QA_SCHOOL_NAME || "בית ספר ניסיון LEO").trim();
const DISPLAY_NAME = String(process.env.SCHOOL_QA_DISPLAY_NAME || "מנהל/ת QA בית ספר").trim();
const PLAN_CODE = "teacher_basic_20";

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name} (set at runtime; do not commit passwords)`);
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

async function ensureTeacherProfileAndLimits(serviceRole, teacherId) {
  const { data: profile } = await serviceRole
    .from("teacher_profiles")
    .select("id")
    .eq("id", teacherId)
    .maybeSingle();

  if (!profile) {
    const { error: insErr } = await serviceRole.from("teacher_profiles").insert({
      id: teacherId,
      display_name: DISPLAY_NAME,
      preferred_language: "he",
      is_active: true,
    });
    if (insErr) throw insErr;
    console.log("Created teacher_profiles row");
  } else {
    await serviceRole
      .from("teacher_profiles")
      .update({ display_name: DISPLAY_NAME, is_active: true })
      .eq("id", teacherId);
    console.log("Updated teacher_profiles row");
  }

  const { data: limits } = await serviceRole
    .from("teacher_limits")
    .select("teacher_id")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (!limits) {
    const { error: limErr } = await serviceRole.from("teacher_limits").insert({
      teacher_id: teacherId,
      plan_code: PLAN_CODE,
    });
    if (limErr && limErr.code !== "23505") throw limErr;
    console.log("Created teacher_limits row");
  }
}

async function findOrCreateSchool(serviceRole) {
  const { data: existing } = await serviceRole
    .from("school_accounts")
    .select("id, name")
    .eq("name", SCHOOL_NAME)
    .maybeSingle();

  if (existing?.id) {
    console.log(`Using existing school: ${existing.name} (${existing.id})`);
    return existing.id;
  }

  const { data: created, error } = await serviceRole
    .from("school_accounts")
    .insert({ name: SCHOOL_NAME, is_active: true, city: "QA" })
    .select("id, name")
    .single();

  if (error) throw error;
  console.log(`Created school: ${created.name} (${created.id})`);
  return created.id;
}

async function main() {
  const password = requireEnv("SCHOOL_QA_PASSWORD");
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await findUserByEmail(admin, EMAIL);
  let userId;

  if (existing?.id) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
    });
    if (error) throw error;
    userId = data.user?.id || existing.id;
    console.log(`Updated auth user: ${EMAIL} (${userId}) role=teacher`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
    });
    if (error) throw error;
    userId = data.user?.id;
    console.log(`Created auth user: ${EMAIL} (${userId}) role=teacher`);
  }

  const role = (
    await admin.auth.admin.getUserById(userId)
  ).data?.user?.app_metadata?.role;
  if (String(role).toLowerCase() !== "teacher") {
    throw new Error(`Expected app_metadata.role=teacher, got ${JSON.stringify(role)}`);
  }

  await ensureTeacherProfileAndLimits(admin, userId);

  const schoolId = await findOrCreateSchool(admin);

  const { assignSchoolManager } = await import(u("lib/admin-server/admin-schools.server.js"));
  const assigned = await assignSchoolManager(admin, schoolId, userId);
  if (!assigned.ok) {
    throw new Error(`assignSchoolManager failed: ${assigned.code || assigned.status}`);
  }
  console.log("Assigned school_admin membership");

  const { data: membership } = await admin
    .from("school_teacher_memberships")
    .select("id, school_id, teacher_id, role, joined_at")
    .eq("school_id", schoolId)
    .eq("teacher_id", userId)
    .maybeSingle();

  if (!membership || membership.role !== "school_admin") {
    throw new Error("Membership verification failed");
  }

  console.log("\n--- QA school manager ready ---");
  console.log(JSON.stringify({
    email: EMAIL,
    teacherId: userId,
    schoolId,
    schoolName: SCHOOL_NAME,
    membershipId: membership.id,
    membershipRole: membership.role,
    loginPath: "/teacher/login",
    expectedDashboard: "/school/dashboard",
  }, null, 2));
}

main().catch((e) => {
  console.error("ensure-qa-school-manager: FAIL", e.message || e);
  process.exit(1);
});
