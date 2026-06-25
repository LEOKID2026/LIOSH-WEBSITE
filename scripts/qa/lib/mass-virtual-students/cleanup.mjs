import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { SEED_META_KEY } from "./constants.mjs";
import { REPO_ROOT } from "./config.mjs";
import { createAdminClient, createServiceClient } from "./supabase.mjs";

async function cleanTaggedSessions(supabase, studentIds, runId) {
  const { data: sessions } = await supabase
    .from("learning_sessions")
    .select("id")
    .in("student_id", studentIds)
    .contains("metadata", { [SEED_META_KEY]: runId });

  const sessionIds = (sessions || []).map((s) => s.id).filter(Boolean);
  if (sessionIds.length) {
    await supabase.from("answers").delete().in("learning_session_id", sessionIds);
    await supabase.from("learning_sessions").delete().in("id", sessionIds);
  }
  return sessionIds.length;
}

async function cleanParentActivities(supabase, studentIds, runId) {
  const { data: acts } = await supabase
    .from("parent_assigned_activities")
    .select("id")
    .in("student_id", studentIds)
    .like("title", `[${runId}]%`);

  const actIds = (acts || []).map((a) => a.id);
  if (actIds.length) {
    await supabase.from("parent_activity_attempts").delete().in("activity_id", actIds);
    await supabase.from("parent_activity_status").delete().in("activity_id", actIds);
    await supabase.from("parent_assigned_activities").delete().in("id", actIds);
  }
  return actIds.length;
}

async function deleteStudents(supabase, studentIds) {
  if (!studentIds.length) return 0;
  await supabase.from("student_access_codes").delete().in("student_id", studentIds);
  await supabase.from("students").delete().in("id", studentIds);
  return studentIds.length;
}

async function deleteQaParents(admin, supabase, parentIds, emailDomain) {
  let deleted = 0;
  for (const parentId of parentIds) {
    const { data: user } = await admin.getUserById(parentId);
    const email = String(user?.user?.email || "").toLowerCase();
    if (!email.endsWith(`@${emailDomain}`) || !email.startsWith("qa-parent-")) {
      throw new Error(`Refusing to delete non-QA parent: ${email}`);
    }
    await supabase.from("parent_account_settings").delete().eq("parent_user_id", parentId);
    await supabase.from("parent_profiles").delete().eq("id", parentId);
    await admin.deleteUser(parentId);
    deleted += 1;
  }
  return deleted;
}

/**
 * Delete only data created by a specific mass simulation run.
 */
export async function cleanupMassSimulationRun(runId, { execute = false, emailDomain = "leo.test" } = {}) {
  const manifestPath = join(REPO_ROOT, "reports", "mass-simulation", runId, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    throw new Error(`manifest not found for runId=${runId} at ${manifestPath}`);
  }

  const studentIds = (manifest.students || []).map((s) => s.studentId).filter(Boolean);
  const parentIds = (manifest.parents || []).map((p) => p.parentId).filter(Boolean);

  if (!execute) {
    return {
      dryRun: true,
      runId,
      studentIds: studentIds.length,
      parentIds: parentIds.length,
    };
  }

  const supabase = createServiceClient();
  const admin = createAdminClient();

  const removedSessions = await cleanTaggedSessions(supabase, studentIds, runId);
  const removedActivities = await cleanParentActivities(supabase, studentIds, runId);
  const removedStudents = await deleteStudents(supabase, studentIds);
  const removedParents = await deleteQaParents(admin, supabase, parentIds, emailDomain);

  return {
    dryRun: false,
    runId,
    removedSessions,
    removedActivities,
    removedStudents,
    removedParents,
  };
}
