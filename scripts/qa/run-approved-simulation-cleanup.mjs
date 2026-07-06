#!/usr/bin/env node
/**
 * Approved simulation cleanup (dry-run by default).
 *
 *   node --env-file=.env.local scripts/qa/run-approved-simulation-cleanup.mjs
 *   node --env-file=.env.local scripts/qa/run-approved-simulation-cleanup.mjs --execute
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { DEMO_PARENT_EMAIL } from "../school-portal/demo-school-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../..");

const KEEP_RUN_ID = "mass-2026-06-30T20-32-14";
const CUTOFF_ISO = "2026-06-30T20:32:14.000Z";
const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const ADMIN_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";
const OLD_RUN_IDS = ["mass-2026-06-28T06-22-20"];

const PRESERVE_EMAILS = [
  "18eran@gmail.com",
  "admin@admin.com",
  "etiliam7@gmail.com",
  "hagoel@gmail.com",
  "leokid2026@gmail.com",
];

const AAA_KEEP = new Set(
  Array.from({ length: 12 }, (_, i) => `aaa${i + 1}`),
);

const CHUNK = 40;
const ACTIVITY_CHUNK = 80;
const IN_CHUNK = 40;

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function createServiceClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL"),
    requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function chunkArray(arr, size = CHUNK) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function countExact(sb, table, build) {
  const { count, error } = await build(sb.from(table).select("id", { count: "exact", head: true }));
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count || 0;
}

async function fetchAllRows(sb, table, build, pageSize = 1000) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await build(sb.from(table).select("*")).range(offset, offset + pageSize - 1);
    if (error) throw new Error(`${table} fetch: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

async function listAuthUsers(sb) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data.users || []));
    if (!data.users?.length || data.users.length < 200) break;
  }
  return users;
}

async function collectOldQpStudentIds(sb) {
  const ids = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb
      .from("student_access_codes")
      .select("student_id, created_at, login_username")
      .like("login_username", "qp%")
      .lt("created_at", CUTOFF_ISO)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (row?.student_id) ids.add(String(row.student_id));
    }
    if (data.length < 1000) break;
  }
  return [...ids];
}

async function collectKeepQpStudentIds(sb) {
  const ids = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb
      .from("student_access_codes")
      .select("student_id")
      .like("login_username", "qp%")
      .gte("created_at", CUTOFF_ISO)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (row?.student_id) ids.add(String(row.student_id));
    }
    if (data.length < 1000) break;
  }
  return [...ids];
}

async function collectDemoStudentIds(sb) {
  const ids = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb
      .from("student_access_codes")
      .select("student_id, login_username")
      .like("login_username", "demo-%")
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) if (row?.student_id) ids.add(String(row.student_id));
    if (data.length < 1000) break;
  }
  return [...ids];
}

async function collectAdminExtraStudentIds(sb) {
  const { data: kids, error } = await sb.from("students").select("id").eq("parent_id", ADMIN_PARENT_ID);
  if (error) throw error;
  const ids = (kids || []).map((k) => String(k.id));
  if (!ids.length) return [];

  const extras = [];
  for (const chunk of chunkArray(ids, 200)) {
    const { data: codes, error: cErr } = await sb
      .from("student_access_codes")
      .select("student_id, login_username")
      .in("student_id", chunk);
    if (cErr) throw cErr;
    const byStudent = new Map((codes || []).map((c) => [String(c.student_id), String(c.login_username || "").toLowerCase()]));
    for (const sid of chunk) {
      const login = byStudent.get(sid) || "";
      if (AAA_KEEP.has(login)) continue;
      if (
        login === "aaa13" ||
        login === "admin" ||
        login === "mth" ||
        login.startsWith("qax")
      ) {
        extras.push(sid);
      }
    }
  }
  return extras;
}

async function countForStudentIds(sb, table, column, studentIds, sampleSize = 5) {
  if (!studentIds.length) return { total: 0, sample: 0 };
  let sample = 0;
  for (const sid of studentIds.slice(0, sampleSize)) {
    sample += await countExact(sb, table, (q) => q.eq(column, sid));
  }
  const avg = sample / Math.min(sampleSize, studentIds.length);
  return { total: Math.round(avg * studentIds.length), sample, avg };
}

async function inventory(sb) {
  const users = await listAuthUsers(sb);
  const preserve = PRESERVE_EMAILS.map((email) => {
    const hit = users.find((u) => String(u.email || "").toLowerCase() === email.toLowerCase());
    return { email, found: Boolean(hit), id: hit?.id || null };
  });

  const oldQpStudentIds = await collectOldQpStudentIds(sb);
  const keepQpStudentIds = await collectKeepQpStudentIds(sb);
  const overlap = oldQpStudentIds.filter((id) => keepQpStudentIds.includes(id));

  const demoStudentIds = await collectDemoStudentIds(sb);
  const adminExtraStudentIds = await collectAdminExtraStudentIds(sb);

  const demoActivityCount = await countExact(sb, "classroom_activities", (q) =>
    q.eq("school_id", DEMO_SCHOOL_ID),
  );
  const totalAttempts = await countExact(sb, "classroom_activity_attempts", (q) => q);
  const keepRunActivities = await countExact(sb, "parent_assigned_activities", (q) =>
    q.like("title", `[${KEEP_RUN_ID}]%`),
  );
  const keepRunSessions = await countExact(sb, "learning_sessions", (q) =>
    q.contains("metadata", { massVirtualStudents: KEEP_RUN_ID }),
  );
  const oldMassActivities = await countExact(sb, "parent_assigned_activities", (q) =>
    q.like("title", "[mass-%").not("title", "like", `[${KEEP_RUN_ID}]%`),
  );

  const oldQpAnswers = await countForStudentIds(sb, "answers", "student_id", oldQpStudentIds);
  const oldQpSessions = await countForStudentIds(sb, "learning_sessions", "student_id", oldQpStudentIds);

  const orphanOldRunSessions = {};
  for (const runId of OLD_RUN_IDS) {
    orphanOldRunSessions[runId] = await countExact(sb, "learning_sessions", (q) =>
      q.contains("metadata", { massVirtualStudents: runId }),
    );
  }

  let adminAaaCount = 0;
  for (const login of AAA_KEEP) {
    const { count } = await sb
      .from("student_access_codes")
      .select("id", { count: "exact", head: true })
      .eq("login_username", login);
    adminAaaCount += count || 0;
  }

  return {
    preserve,
    leoKAuthCount: users.filter((u) => String(u.email || "").toLowerCase().endsWith("@leo-k.com")).length,
    qaParentAuthCount: users.filter((u) => /^qa-parent-\d{2}@leo\.test$/i.test(String(u.email || ""))).length,
    oldQpStudentIds: oldQpStudentIds.length,
    keepQpStudentIds: keepQpStudentIds.length,
    overlapOldAndKeep: overlap.length,
    demoStudentIds: demoStudentIds.length,
    adminExtraStudentIds: adminExtraStudentIds.length,
    adminAaaCount,
    demoActivityCount,
    totalAttempts,
    keepRunActivities,
    keepRunSessions,
    oldMassActivities,
    oldQpAnswersEstimate: oldQpAnswers.total,
    oldQpSessionsEstimate: oldQpSessions.total,
    orphanOldRunSessions,
    ids: {
      oldQpStudentIds,
      keepQpStudentIds,
      demoStudentIds,
      adminExtraStudentIds,
    },
  };
}

async function deleteByInChunks(sb, table, column, ids, execute) {
  let affected = 0;
  for (const chunk of chunkArray(ids, IN_CHUNK)) {
    if (!execute) {
      affected += await countExact(sb, table, (q) => q.in(column, chunk));
      continue;
    }
    const { error } = await sb.from(table).delete().in(column, chunk);
    if (error) throw new Error(`${table} delete failed: ${error.message}`);
    affected += chunk.length;
  }
  return affected;
}

async function deleteAnswersForSessions(sb, sessionIds, execute) {
  if (!execute) {
    return deleteByInChunks(sb, "answers", "learning_session_id", sessionIds, false);
  }
  return deleteByInChunks(sb, "answers", "learning_session_id", sessionIds, true);
}

async function bulkDeleteStudentLearningData(sb, studentIds, { execute, excludeKeepRunActivities = true }) {
  let sessionsRemoved = 0;
  let answersRemoved = 0;
  let activitiesRemoved = 0;

  for (let i = 0; i < studentIds.length; i += 40) {
    const chunk = studentIds.slice(i, i + 40);
    if (execute && i > 0 && i % 400 === 0) {
      console.log(`[bulk-delete] progress ${i}/${studentIds.length}`);
    }

    if (!execute) {
      answersRemoved += await countExact(sb, "answers", (q) => q.in("student_id", chunk));
      sessionsRemoved += await countExact(sb, "learning_sessions", (q) => q.in("student_id", chunk));
    } else {
      await deleteByInChunks(sb, "answers", "student_id", chunk, true);
      await deleteByInChunks(sb, "learning_sessions", "student_id", chunk, true);
      await deleteByInChunks(sb, "analytics_events", "student_id", chunk, true);
      await deleteByInChunks(sb, "coin_transactions", "student_id", chunk, true);
      await deleteByInChunks(sb, "classroom_activity_attempts", "student_id", chunk, true);
      await deleteByInChunks(sb, "classroom_activity_student_status", "student_id", chunk, true);
      await deleteByInChunks(sb, "arcade_results", "student_id", chunk, true);
      await deleteByInChunks(sb, "arcade_quick_match_queue", "student_id", chunk, true);
      await deleteByInChunks(sb, "arcade_room_players", "student_id", chunk, true);
      await sb.from("arcade_rooms").delete().in("host_student_id", chunk);
    }

    const { data: acts, error: aErr } = await sb
      .from("parent_assigned_activities")
      .select("id, title")
      .in("student_id", chunk);
    if (aErr) throw aErr;
    const actIds = (acts || [])
      .filter((a) => !excludeKeepRunActivities || !String(a.title || "").startsWith(`[${KEEP_RUN_ID}]`))
      .map((a) => a.id);
    if (actIds.length) {
      if (!execute) {
        activitiesRemoved += actIds.length;
      } else {
        await deleteByInChunks(sb, "parent_activity_attempts", "activity_id", actIds, true);
        await deleteByInChunks(sb, "parent_activity_status", "activity_id", actIds, true);
        await deleteByInChunks(sb, "parent_assigned_activities", "id", actIds, true);
        activitiesRemoved += actIds.length;
      }
    }
  }

  return { sessionsRemoved, answersRemoved, activitiesRemoved };
}

async function deleteGuestLinkEventsForStudents(sb, studentIds, execute) {
  if (!studentIds.length) return 0;
  if (!execute) return studentIds.length;
  for (const chunk of chunkArray(studentIds, 20)) {
    await sb.from("guest_link_events").delete().in("guest_student_id", chunk);
    await sb.from("guest_link_events").delete().in("target_student_id", chunk);
  }
  return studentIds.length;
}

async function deleteStudentRecords(sb, studentIds, execute) {
  if (!execute) return { studentsRemoved: studentIds.length, accessCodesRemoved: studentIds.length };
  let studentsRemoved = 0;
  for (const chunk of chunkArray(studentIds, 20)) {
    await deleteGuestLinkEventsForStudents(sb, chunk, true);
    await sb.from("student_access_codes").delete().in("student_id", chunk);
    const { error } = await sb.from("students").delete().in("id", chunk);
    if (error) throw error;
    studentsRemoved += chunk.length;
  }
  return { studentsRemoved, accessCodesRemoved: studentsRemoved };
}

async function phase1OldQp(sb, studentIds, execute) {
  console.log(`[phase1] old qp students: ${studentIds.length}`);
  const learning = await bulkDeleteStudentLearningData(sb, studentIds, {
    execute,
    excludeKeepRunActivities: true,
  });
  const students = await deleteStudentRecords(sb, studentIds, execute);
  return { ...learning, ...students };
}

async function phase3DemoClassroom(sb, execute) {
  const remaining = await countExact(sb, "classroom_activity_attempts", (q) => q);
  const demoRemaining = await countExact(sb, "classroom_activities", (q) =>
    q.eq("school_id", DEMO_SCHOOL_ID),
  );
  if (remaining === 0 && demoRemaining === 0) {
    console.log("[phase3] skipped — demo classroom data already removed");
    return { activitiesRemoved: 0, attemptsRemoved: 0, statusesRemoved: 0, skipped: true };
  }
  const activityRows = await fetchAllRows(sb, "classroom_activities", (q) =>
    q.select("id").eq("school_id", DEMO_SCHOOL_ID),
  );
  const activityIds = activityRows.map((r) => r.id);
  console.log(`[phase3] demo classroom activities: ${activityIds.length}`);

  let attemptsRemoved = 0;
  let statusesRemoved = 0;
  let activitiesRemoved = 0;

  for (let i = 0; i < activityIds.length; i += ACTIVITY_CHUNK) {
    const chunk = activityIds.slice(i, i + ACTIVITY_CHUNK);
    if (!execute) {
      attemptsRemoved += await countExact(sb, "classroom_activity_attempts", (q) => q.in("activity_id", chunk));
      statusesRemoved += await countExact(sb, "classroom_activity_student_status", (q) => q.in("activity_id", chunk));
    } else {
      const { error: aErr } = await sb.from("classroom_activity_attempts").delete().in("activity_id", chunk);
      if (aErr) throw aErr;
      const { error: sErr } = await sb.from("classroom_activity_student_status").delete().in("activity_id", chunk);
      if (sErr) throw sErr;
      const { error: cErr } = await sb.from("classroom_activities").delete().in("id", chunk);
      if (cErr) throw cErr;
      if ((i / ACTIVITY_CHUNK) % 50 === 0) {
        console.log(`[phase3] progress ${i + chunk.length}/${activityIds.length} activities`);
      }
    }
    activitiesRemoved += chunk.length;
  }

  return { activitiesRemoved, attemptsRemoved, statusesRemoved };
}

async function phase3DemoStudents(sb, studentIds, execute) {
  console.log(`[phase3b] demo-g students: ${studentIds.length}`);
  const learning = await bulkDeleteStudentLearningData(sb, studentIds, {
    execute,
    excludeKeepRunActivities: false,
  });

  if (!execute) {
    return { ...learning, studentsRemoved: studentIds.length, enrollmentsRemoved: studentIds.length };
  }

  for (const chunk of chunkArray(studentIds, 100)) {
    await sb.from("teacher_class_students").delete().in("student_id", chunk);
    await sb
      .from("school_student_enrollments")
      .delete()
      .eq("school_id", DEMO_SCHOOL_ID)
      .in("student_id", chunk);
    await sb.from("school_student_profiles").delete().in("student_id", chunk);
  }

  const students = await deleteStudentRecords(sb, studentIds, true);
  return { ...learning, ...students, enrollmentsRemoved: studentIds.length };
}

async function phase4AdminExtras(sb, studentIds, execute) {
  console.log(`[phase4] admin extra students: ${studentIds.length}`);
  const learning = await bulkDeleteStudentLearningData(sb, studentIds, {
    execute,
    excludeKeepRunActivities: false,
  });
  const students = await deleteStudentRecords(sb, studentIds, execute);
  return { ...learning, ...students };
}

async function cleanupOrphanOldRunSessions(sb, execute) {
  const results = {};
  for (const runId of OLD_RUN_IDS) {
    const sessions = await fetchAllRows(sb, "learning_sessions", (q) =>
      q.select("id").contains("metadata", { massVirtualStudents: runId }),
    );
    const sessionIds = sessions.map((s) => s.id);
    console.log(`[orphan] ${runId} sessions: ${sessionIds.length}`);
    if (!sessionIds.length) {
      results[runId] = 0;
      continue;
    }
    if (execute) {
      await deleteAnswersForSessions(sb, sessionIds, true);
      await sb.from("learning_sessions").delete().in("id", sessionIds);
    }
    results[runId] = sessionIds.length;
  }
  return results;
}

async function verify(sb) {
  const users = await listAuthUsers(sb);
  const preserve = PRESERVE_EMAILS.map((email) => ({
    email,
    found: users.some((u) => String(u.email || "").toLowerCase() === email.toLowerCase()),
  }));

  const counts = {
    students: await countExact(sb, "students", (q) => q),
    answers: await countExact(sb, "answers", (q) => q),
    learning_sessions: await countExact(sb, "learning_sessions", (q) => q),
    classroom_activity_attempts: await countExact(sb, "classroom_activity_attempts", (q) => q),
    classroom_activities: await countExact(sb, "classroom_activities", (q) => q),
    parent_assigned_activities_keep: await countExact(sb, "parent_assigned_activities", (q) =>
      q.like("title", `[${KEEP_RUN_ID}]%`),
    ),
    keep_run_sessions: await countExact(sb, "learning_sessions", (q) =>
      q.contains("metadata", { massVirtualStudents: KEEP_RUN_ID }),
    ),
    qp_keep_students: (await collectKeepQpStudentIds(sb)).length,
    qp_old_students: (await collectOldQpStudentIds(sb)).length,
    demo_students: (await collectDemoStudentIds(sb)).length,
    admin_aaa: await countExact(sb, "student_access_codes", (q) => q.in("login_username", [...AAA_KEEP])),
    qa_parents: users.filter((u) => /^qa-parent-\d{2}@leo\.test$/i.test(String(u.email || ""))).length,
    leo_k_auth: users.filter((u) => String(u.email || "").toLowerCase().endsWith("@leo-k.com")).length,
  };

  return { preserve, counts };
}

async function main() {
  const execute = process.argv.includes("--execute");
  const skipPhase3 = process.argv.includes("--skip-phase3");
  const onlyPhase = process.argv.find((a) => a.startsWith("--only-phase="))?.split("=")[1] || null;
  const sb = createServiceClient();

  console.log(execute ? "=== EXECUTE MODE ===" : "=== DRY-RUN MODE ===");
  const inv = await inventory(sb);

  if (inv.overlapOldAndKeep > 0) {
    throw new Error(`Safety stop: ${inv.overlapOldAndKeep} student ids overlap old/keep qp sets`);
  }
  if (!inv.preserve.every((p) => p.found)) {
    throw new Error(`Safety stop: missing preserve email(s): ${JSON.stringify(inv.preserve.filter((p) => !p.found))}`);
  }

  const report = {
    mode: execute ? "execute" : "dry-run",
    at: new Date().toISOString(),
    inventory: inv,
    results: {},
  };

  const { ids, ...rest } = inv;
  const summary = {
    ...rest,
    idCounts: {
      oldQpStudentIds: ids.oldQpStudentIds.length,
      keepQpStudentIds: ids.keepQpStudentIds.length,
      demoStudentIds: ids.demoStudentIds.length,
      adminExtraStudentIds: ids.adminExtraStudentIds.length,
    },
  };
  console.log(JSON.stringify(summary, null, 2));

  if (execute) {
    if (!onlyPhase || onlyPhase === "3") {
      report.results.phase3_classroom = skipPhase3
        ? { skipped: true, reason: "cli" }
        : await phase3DemoClassroom(sb, true);
    }
    if (!onlyPhase || onlyPhase === "1") {
      report.results.phase1_old_qp = await phase1OldQp(sb, inv.ids.oldQpStudentIds, true);
    }
    if (!onlyPhase || onlyPhase === "3b") {
      report.results.phase3_demo_students = await phase3DemoStudents(sb, inv.ids.demoStudentIds, true);
    }
    if (!onlyPhase || onlyPhase === "4") {
      report.results.phase4_admin_extras = await phase4AdminExtras(sb, inv.ids.adminExtraStudentIds, true);
    }
    if (!onlyPhase || onlyPhase === "orphan") {
      report.results.orphan_sessions = await cleanupOrphanOldRunSessions(sb, true);
    }
    report.verify = await verify(sb);
  }

  const outDir = join(REPO_ROOT, "reports", "simulation-cleanup");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `${execute ? "execute" : "dry-run"}-${stamp}.json`);
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Report written: ${outPath}`);

  if (!execute) {
    console.log("Dry-run complete. Re-run with --execute to apply deletions.");
    return;
  }

  console.log("=== POST-CLEANUP VERIFY ===");
  console.log(JSON.stringify(report.verify, null, 2));
}

main().catch((err) => {
  console.error("FATAL", err?.message || err);
  process.exit(1);
});
