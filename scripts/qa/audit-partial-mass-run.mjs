#!/usr/bin/env node
/** Read-only partial run audit — minimal queries with pagination */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { buildPlannedCohort } from "./lib/mass-virtual-students/cohort.mjs";
import { SEED_META_KEY } from "./lib/mass-virtual-students/constants.mjs";
import { cleanupMassSimulationRun } from "./lib/mass-virtual-students/cleanup.mjs";
import { createServiceClient, createAdminClient } from "./lib/mass-virtual-students/supabase.mjs";

const RUN_ID = process.argv.find((a) => a.startsWith("--runId="))?.slice(8) || "mass-2026-06-27T18-55-42";
const FROM = process.argv.find((a) => a.startsWith("--from="))?.slice(7) || "2026-06-27T18:55:42.048Z";
const TO = process.argv.find((a) => a.startsWith("--to="))?.slice(5) || "2026-06-28T00:42:00.000Z";

async function fetchAll(supabase, table, buildQuery) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    let q = buildQuery(supabase.from(table)).range(offset, offset + pageSize - 1);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

async function countExact(supabase, table, buildQuery) {
  const { count, error } = await buildQuery(
    supabase.from(table).select("*", { count: "exact", head: true }),
  );
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count || 0;
}

async function main() {
  const supabase = createServiceClient();
  const admin = createAdminClient();

  const windowCodes = await fetchAll(supabase, "student_access_codes", (q) =>
    q
      .select("student_id, login_username, created_at")
      .like("login_username", "qp%")
      .gte("created_at", FROM)
      .lte("created_at", TO),
  );

  const windowStudentIds = [...new Set(windowCodes.map((r) => r.student_id))];

  const sessionsTagged = await countExact(supabase, "learning_sessions", (q) =>
    q.contains("metadata", { [SEED_META_KEY]: RUN_ID }),
  );

  const sessionRows = await fetchAll(supabase, "learning_sessions", (q) =>
    q.select("id, student_id").contains("metadata", { [SEED_META_KEY]: RUN_ID }),
  );
  const sessionStudentIds = [...new Set(sessionRows.map((r) => r.student_id))];
  const sessionIds = sessionRows.map((r) => r.id);

  let answerCount = 0;
  for (let i = 0; i < sessionIds.length; i += 200) {
    const slice = sessionIds.slice(i, i + 200);
    answerCount += await countExact(supabase, "answers", (q) => q.in("learning_session_id", slice));
  }

  const activities = await fetchAll(supabase, "parent_assigned_activities", (q) =>
    q.select("id, student_id, title").like("title", `[${RUN_ID}]%`),
  );
  const activityIds = activities.map((a) => a.id);

  let attemptCount = 0;
  for (let i = 0; i < activityIds.length; i += 200) {
    const slice = activityIds.slice(i, i + 200);
    attemptCount += await countExact(supabase, "parent_activity_attempts", (q) => q.in("activity_id", slice));
  }

  const { cohort } = buildPlannedCohort({
    students: 1000,
    parents: 50,
    subjects: ["math", "geometry", "hebrew", "english", "science"],
    grades: ["g1", "g2", "g3", "g4", "g5", "g6"],
    runId: RUN_ID,
  });
  const plannedLogins = new Set(cohort.map((c) => c.login));
  const windowLoginSet = new Set(windowCodes.map((c) => c.login_username));
  const overlapPlanned = windowCodes.filter((c) => plannedLogins.has(c.login_username));

  let lastSeeded = null;
  for (const c of cohort) {
    if (!windowLoginSet.has(c.login)) continue;
    if (!lastSeeded || c.seq > lastSeeded.seq) lastSeeded = c;
  }

  let qaParentsInWindow = 0;
  const parentEmails = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data?.users || []) {
      const email = String(u.email || "").toLowerCase();
      const created = u.created_at ? new Date(u.created_at).toISOString() : null;
      const isQaParent = email.startsWith("qa-parent-") && email.endsWith("@leo.test");
      const meta = u.user_metadata?.[SEED_META_KEY];
      if (!isQaParent) continue;
      if (created && created >= FROM && created <= TO) {
        qaParentsInWindow += 1;
        parentEmails.push(email);
      } else if (meta === true && email.match(/qa-parent-(0[1-9]|[1-4][0-9]|50)@/)) {
        /* parent 1-50 for 1000 run — may pre-exist from earlier runs */
      }
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }

  const parents16to50New = parentEmails.filter((e) => {
    const m = e.match(/qa-parent-(\d+)@/);
    return m && Number(m[1]) >= 16;
  }).length;

  const cleanupDryRun = await cleanupMassSimulationRun(RUN_ID, {
    execute: false,
    provisionedAfter: FROM,
  });

  const cleanupDryRunBefore300 = await cleanupMassSimulationRun(RUN_ID, {
    execute: false,
    provisionedAfter: "2026-06-27T13:10:20.000Z",
  });

  const report = {
    runId: RUN_ID,
    window: { from: FROM, to: TO },
    counts: {
      studentsCreatedInWindow: windowCodes.length,
      uniqueStudentIdsInWindow: windowStudentIds.length,
      studentsMatchingPlanned1000Logins: overlapPlanned.length,
      learningSessionsTaggedRunId: sessionsTagged,
      answersOnTaggedSessions: answerCount,
      parentAssignedActivitiesTagged: activities.length,
      parentActivityAttempts: attemptCount,
      qaParentsCreatedInWindow: qaParentsInWindow,
      qaParents16to50CreatedInWindow: parents16to50New,
    },
    seedProgressEstimate: lastSeeded
      ? {
          lastLogin: lastSeeded.login,
          seq: lastSeeded.seq,
          parentIndex: lastSeeded.parentIndex,
          profile: lastSeeded.profile.id,
          pctOf1000: Math.round((lastSeeded.seq / 1000) * 1000) / 10,
        }
      : null,
    sessionStudentIdsCount: sessionStudentIds.length,
    cleanupDryRun,
    cleanupDryRunIfProvisionedAfter300Run: cleanupDryRunBefore300,
    riskNotes: {
      cleanupUsesTimeWindowNotRunIdForStudents:
        "Without manifest, cleanup resolves students via qp% logins created after --provisioned-after (no runId on student row).",
      parentIdsEmptyWithoutManifest: cleanupDryRun.parentIds === 0,
      sessionsFilteredByRunIdMetadata: true,
      activitiesFilteredByTitlePrefix: true,
    },
  };

  const outDir = join(process.cwd(), "reports", "mass-simulation", "_partial-audit");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${RUN_ID}-partial-audit.json`);
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
