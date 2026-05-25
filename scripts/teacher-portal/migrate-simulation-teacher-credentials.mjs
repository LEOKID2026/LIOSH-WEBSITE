#!/usr/bin/env node
/**
 * One-time: migrate simulation teacher Auth credentials to teacher@leo.com / 747975.
 * Renames the existing auth user (same UUID) so teacher_profiles/classes/links stay intact.
 *
 *   node --env-file=.env.local scripts/teacher-portal/migrate-simulation-teacher-credentials.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadManifest } from "./teacher-classroom-sim/state.mjs";
import { parseConfig, SIM_TEACHER_EMAIL } from "./teacher-classroom-sim/config.mjs";
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";

const OLD_TEACHER_EMAIL = "teacher-class-sim@liosh-dev.invalid";
const NEW_EMAIL = SIM_TEACHER_EMAIL;
const NEW_PASSWORD = "747975";
const NEW_DISPLAY_NAME = "מורה LEO";

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const match = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match?.id) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function main() {
  const config = parseConfig([]);
  const manifest = loadManifest(config.stateDir);
  const admin = createAdminClient();
  const anon = createClient(requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
  });

  let teacherUser =
    (manifest?.teacherId ? (await admin.auth.admin.getUserById(manifest.teacherId)).data?.user : null) ||
    (await findAuthUserByEmail(admin, OLD_TEACHER_EMAIL)) ||
    (await findAuthUserByEmail(admin, NEW_EMAIL));

  if (!teacherUser?.id) {
    throw new Error("Simulation teacher auth user not found (manifest, old email, or new email)");
  }

  const existingNew = await findAuthUserByEmail(admin, NEW_EMAIL);
  if (existingNew?.id && existingNew.id !== teacherUser.id) {
    throw new Error(`Email ${NEW_EMAIL} already belongs to a different auth user (${existingNew.id})`);
  }

  const action = teacherUser.email?.toLowerCase() === NEW_EMAIL.toLowerCase() ? "updated" : "renamed";

  const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(teacherUser.id, {
    email: NEW_EMAIL,
    password: NEW_PASSWORD,
    email_confirm: true,
    app_metadata: { ...(teacherUser.app_metadata || {}), role: "teacher" },
    user_metadata: { ...(teacherUser.user_metadata || {}), source: "teacher-classroom-sim" },
  });
  if (updErr) throw new Error(`updateUserById failed: ${updErr.message}`);

  await admin
    .from("teacher_profiles")
    .update({ display_name: NEW_DISPLAY_NAME })
    .eq("id", teacherUser.id);

  const { data: profile } = await admin.from("teacher_profiles").select("id, display_name").eq("id", teacherUser.id).maybeSingle();
  const { data: limits } = await admin.from("teacher_limits").select("plan_code").eq("teacher_id", teacherUser.id).maybeSingle();
  const { count: classCount } = await admin
    .from("teacher_classes")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherUser.id)
    .eq("is_archived", false);
  const { count: studentLinkCount } = await admin
    .from("teacher_students")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherUser.id)
    .is("archived_at", null);

  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email: NEW_EMAIL,
    password: NEW_PASSWORD,
  });
  if (signErr || !signIn.session?.access_token) {
    throw new Error(`signInWithPassword failed: ${signErr?.message || "no token"}`);
  }

  console.log(JSON.stringify({
    action,
    teacherId: teacherUser.id,
    oldEmail: teacherUser.email,
    newEmail: updated.user?.email || NEW_EMAIL,
    role: updated.user?.app_metadata?.role,
    profile: profile?.display_name,
    planCode: limits?.plan_code,
    classCount,
    studentLinkCount,
    loginTest: "pass",
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
