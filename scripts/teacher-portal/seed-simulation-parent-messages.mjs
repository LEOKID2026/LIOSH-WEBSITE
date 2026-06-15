#!/usr/bin/env node
/**
 * Seed sample teacher-to-parent messages for classroom simulation students.
 * Requires migration 023_teacher_parent_messages.sql applied by owner first.
 *
 *   node --env-file=.env.local scripts/teacher-portal/seed-simulation-parent-messages.mjs
 */
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";
import { SIM_TEACHER_EMAIL, parseConfig } from "./teacher-classroom-sim/config.mjs";
import { loadManifest } from "./teacher-classroom-sim/state.mjs";
import { bootstrapTeacherDbWriteGuard } from "./lib/teacher-db-write-guard.mjs";

const SAMPLE_MESSAGES = Object.freeze([
  "נועה משתפרת יפה, מומלץ להמשיך תרגול קצר במתמטיקה השבוע.",
  "כדאי לחזק קריאה והבנת הנקרא בעזרת טקסט קצר מדי יום.",
  "יש לשים לב לבעיות מילוליות — מומלץ לתרגל יחד לאט ולבדוק דרך פתרון.",
  "התלמיד/ה מראה מוטיבציה טובה — כדאי לשמור על רצף תרגול קצר.",
  "מומלץ לחזור על טעויות אחרונות ביחד, בקצב נעים וללא לחץ.",
]);

async function findAuthUserByEmail(admin, email) {
  const target = String(email || "").trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === target);
    if (match?.id) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function assertTableReady(admin) {
  const { error } = await admin.from("teacher_parent_messages").select("id").limit(1);
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message || "")) {
      throw new Error(
        "Table teacher_parent_messages missing. Owner must apply supabase/migrations/023_teacher_parent_messages.sql first."
      );
    }
    throw new Error(`Schema check failed: ${error.message}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const guard = bootstrapTeacherDbWriteGuard(
    "teacher-portal/seed-simulation-parent-messages",
    "SEED_SIMULATION_PARENT_MESSAGES",
    argv
  );
  if (guard.isDryRun) {
    console.log("[production-guard] dry-run: no DB mutations (pass --write)");
    guard.printEndSummary();
    return;
  }
  const config = parseConfig([]);
  const manifest = loadManifest(config.stateDir);
  const admin = createAdminClient();
  await assertTableReady(admin);

  const simTeacher = await findAuthUserByEmail(admin, SIM_TEACHER_EMAIL);
  if (!simTeacher?.id) throw new Error(`Simulation teacher not found: ${SIM_TEACHER_EMAIL}`);

  const students = (manifest.students || [])
    .slice()
    .sort((a, b) => (a.slot || 0) - (b.slot || 0));

  if (!students.length) throw new Error("No students in simulation manifest");

  const targetSlots = [1, 3, 5, 7, 9];
  let inserted = 0;
  let skipped = 0;

  for (const slot of targetSlots) {
    const row = students.find((s) => s.slot === slot);
    if (!row?.id) {
      console.warn(`Slot ${slot}: no student in manifest — skip`);
      continue;
    }

    const text = SAMPLE_MESSAGES[(slot - 1) % SAMPLE_MESSAGES.length];

    const { count, error: countErr } = await admin
      .from("teacher_parent_messages")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", simTeacher.id)
      .eq("student_id", row.id)
      .eq("message", text);

    if (countErr) throw new Error(`count failed slot ${slot}: ${countErr.message}`);
    if ((count || 0) > 0) {
      skipped += 1;
      console.log(`Slot ${slot} (${row.name || row.id}): already seeded — skip`);
      continue;
    }

    const now = new Date().toISOString();

    const { error } = await admin.from("teacher_parent_messages").insert({
      teacher_id: simTeacher.id,
      student_id: row.id,
      message: text,
      is_hidden: false,
      created_at: now,
      updated_at: now,
    });

    if (error) throw new Error(`insert slot ${slot}: ${error.message}`);
    inserted += 1;
    console.log(`Slot ${slot} (${row.name || row.id}): seeded message`);
  }

  console.log(`\nDone. inserted=${inserted} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
