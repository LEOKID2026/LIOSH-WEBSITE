import crypto from "node:crypto";

import { upsertActiveEntitlement } from "../../../../lib/auth/persona-entitlement.server.js";
import { parentEmail } from "./config.mjs";
import { SEED_META_KEY } from "./constants.mjs";
import { createAdminClient, createServiceClient } from "./supabase.mjs";

function hashStudentSecret(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

async function findAuthUserByEmail(admin, email) {
  const target = String(email).trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === target);
    if (match) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function ensureParentAuth(admin, email, password) {
  const normalized = email.trim().toLowerCase();
  let user = await findAuthUserByEmail(admin, normalized);
  if (!user) {
    const { data, error } = await admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
      app_metadata: { role: "parent" },
      user_metadata: { source: "mass-virtual-students-qa", [SEED_META_KEY]: true },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: { role: "parent" },
    });
    if (error) throw error;
    user = data.user || user;
  }
  return user.id;
}

async function ensureParentProfile(supabase, parentId, { runId, maxChildren }) {
  const { data } = await supabase.from("parent_profiles").select("id").eq("id", parentId).maybeSingle();
  if (!data?.id) {
    const { error } = await supabase.from("parent_profiles").insert({ id: parentId });
    if (error && error.code !== "23505") throw error;
  }

  await upsertActiveEntitlement(supabase, parentId, "parent", { approvalSource: "mass_qa_sim" });

  const { data: settings } = await supabase
    .from("parent_account_settings")
    .select("parent_user_id, max_children")
    .eq("parent_user_id", parentId)
    .maybeSingle();

  const payload = {
    parent_user_id: parentId,
    max_children: maxChildren,
    plan_code: "free",
    account_status: "active",
    reports_enabled: true,
  };

  if (settings?.parent_user_id) {
    await supabase.from("parent_account_settings").update(payload).eq("parent_user_id", parentId);
  } else {
    await supabase.from("parent_account_settings").insert(payload);
  }
}

async function createStudentWithAccess(supabase, accessSecret, {
  parentId,
  fullName,
  grade,
  login,
  pin,
  runId,
}) {
  const { data: studentRow, error: stErr } = await supabase
    .from("students")
    .insert({
      parent_id: parentId,
      full_name: fullName,
      grade_level: grade,
      is_active: true,
    })
    .select("id")
    .single();
  if (stErr || !studentRow?.id) throw new Error(`student insert: ${stErr?.message}`);

  const username = login.toLowerCase();
  const codeHash = hashStudentSecret(username, accessSecret);
  const pinHash = hashStudentSecret(pin, accessSecret);

  const { error: codeErr } = await supabase.from("student_access_codes").insert({
    student_id: studentRow.id,
    code_hash: codeHash,
    pin_hash: pinHash,
    login_username: username,
    is_active: true,
    expires_at: null,
    revoked_at: null,
  });
  if (codeErr) throw new Error(`access code insert: ${codeErr?.message}`);

  return { studentId: studentRow.id, login: username };
}

/**
 * Provision QA parents + students for a run. Returns manifest slice.
 */
export async function provisionMassAccounts({
  cohort,
  parents,
  studentsPerParent,
  password,
  studentPin,
  emailDomain,
  runId,
  dryRun,
}) {
  if (dryRun) {
    const dryParents = [];
    for (let p = 1; p <= parents; p += 1) {
      dryParents.push({
        parentIndex: p,
        email: parentEmail(p, emailDomain),
        password,
        children: cohort.filter((s) => s.parentIndex === p).map((s) => ({
          login: s.login,
          pin: studentPin,
          displayName: s.displayName,
          grade: s.grade,
          profile: s.profile.id,
        })),
      });
    }
    return { dryRun: true, parents: dryParents, students: cohort };
  }

  const supabase = createServiceClient();
  const admin = createAdminClient();
  const accessSecret = process.env.LEARNING_STUDENT_ACCESS_SECRET;
  if (!accessSecret) throw new Error("Missing LEARNING_STUDENT_ACCESS_SECRET");

  const manifestParents = [];
  const manifestStudents = [];

  for (let p = 1; p <= parents; p += 1) {
    const email = parentEmail(p, emailDomain);
    const parentId = await ensureParentAuth(admin, email, password);
    const childCount = cohort.filter((s) => s.parentIndex === p).length;
    await ensureParentProfile(supabase, parentId, { runId, maxChildren: Math.max(studentsPerParent, childCount) });

    const children = [];
    for (const student of cohort.filter((s) => s.parentIndex === p)) {
      const created = await createStudentWithAccess(supabase, accessSecret, {
        parentId,
        fullName: student.displayName,
        grade: student.grade,
        login: student.login,
        pin: studentPin,
        runId,
      });
      children.push({
        ...student,
        studentId: created.studentId,
        pin: studentPin,
      });
      manifestStudents.push({
        studentId: created.studentId,
        parentId,
        parentIndex: p,
        login: created.login,
        displayName: student.displayName,
        grade: student.grade,
        profile: student.profile.id,
        primarySubject: student.primarySubject,
        displayLevel: student.displayLevel,
      });
    }

    manifestParents.push({
      parentIndex: p,
      parentId,
      email,
      password,
      childrenCount: children.length,
      children: children.map((c) => ({
        studentId: c.studentId,
        login: c.login,
        displayName: c.displayName,
        grade: c.grade,
        profile: c.profile.id,
      })),
    });
  }

  return { dryRun: false, parents: manifestParents, students: manifestStudents };
}
