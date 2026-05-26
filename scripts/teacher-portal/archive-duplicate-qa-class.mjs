#!/usr/bin/env node
/**
 * Owner-approved cleanup only. Default: --dry-run (no writes).
 *
 *   node --env-file=.env.local scripts/teacher-portal/archive-duplicate-qa-class.mjs --dry-run
 *   node --env-file=.env.local scripts/teacher-portal/archive-duplicate-qa-class.mjs --execute
 */
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";
import {
  CANONICAL_LEO_QA_CLASS_ID,
  LEO_QA_CLASS_DISPLAY_NAME,
  isTeacherDashboardHiddenClass,
} from "../../lib/teacher-portal/teacher-smoke-artifacts.js";
import { SIM_TEACHER_EMAIL } from "./teacher-classroom-sim/config.mjs";

const dryRun = !process.argv.includes("--execute");

async function findTeacherId(admin) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === SIM_TEACHER_EMAIL);
    if (match?.id) return match.id;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  throw new Error(`teacher not found: ${SIM_TEACHER_EMAIL}`);
}

async function main() {
  const admin = createAdminClient();
  const teacherId = await findTeacherId(admin);
  const { data: classes, error } = await admin
    .from("teacher_classes")
    .select("id, name, is_archived")
    .eq("teacher_id", teacherId);
  if (error) throw new Error(error.message);

  const toArchive = (classes || []).filter((c) =>
    isTeacherDashboardHiddenClass({ classId: c.id, name: c.name })
  );

  console.log(dryRun ? "DRY RUN — no database writes" : "EXECUTE — archiving classes");
  console.log(`Canonical QA class: ${CANONICAL_LEO_QA_CLASS_ID} (${LEO_QA_CLASS_DISPLAY_NAME})`);
  for (const c of toArchive) {
    console.log(`  archive: ${c.name} (${c.id})`);
    if (!dryRun) {
      const { error: upErr } = await admin
        .from("teacher_classes")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", c.id)
        .eq("teacher_id", teacherId);
      if (upErr) throw new Error(upErr.message);
    }
  }
  if (!toArchive.length) console.log("  (none)");
}

main().catch((e) => {
  console.error("archive-duplicate-qa-class: FAIL", e.message || e);
  process.exit(2);
});
