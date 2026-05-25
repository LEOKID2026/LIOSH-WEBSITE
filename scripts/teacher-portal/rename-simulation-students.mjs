#!/usr/bin/env node
/**
 * Rename the 20 teacher classroom simulation students to realistic Hebrew names.
 * Keeps the same student IDs — updates students.full_name only.
 *
 * node --env-file=.env.local scripts/teacher-portal/rename-simulation-students.mjs
 */
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";
import { SIM_STUDENT_NAMES, SIM_PARENT_EMAIL } from "./teacher-classroom-sim/config.mjs";
import { loadManifest } from "./teacher-classroom-sim/state.mjs";
import { parseConfig } from "./teacher-classroom-sim/config.mjs";

const config = parseConfig([]);
const manifest = loadManifest(config.stateDir);

if (!manifest?.students?.length) {
  console.error("No manifest with students — run bootstrap first.");
  process.exit(1);
}

const admin = createAdminClient();

const parentUser = await (async () => {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data?.users?.find((u) => u.email === SIM_PARENT_EMAIL);
    if (match?.id) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
})();

if (!parentUser?.id) {
  console.error("Sim parent not found:", SIM_PARENT_EMAIL);
  process.exit(1);
}

const sorted = [...manifest.students].sort((a, b) => (a.slot || 0) - (b.slot || 0));
let updated = 0;

for (let i = 0; i < sorted.length; i++) {
  const entry = sorted[i];
  const slot = entry.slot ?? i + 1;
  const targetName = SIM_STUDENT_NAMES[slot - 1];
  if (!targetName) {
    console.warn(`No name for slot ${slot}, skipping ${entry.id}`);
    continue;
  }

  const { data: row, error: fetchErr } = await admin
    .from("students")
    .select("id, full_name, parent_id")
    .eq("id", entry.id)
    .maybeSingle();

  if (fetchErr) {
    console.error(`Fetch failed for ${entry.id}:`, fetchErr.message);
    process.exit(1);
  }
  if (!row?.id) {
    console.error(`Student not found: ${entry.id} (slot ${slot})`);
    process.exit(1);
  }
  if (row.parent_id !== parentUser.id) {
    console.error(`Student ${entry.id} is not owned by sim parent — aborting.`);
    process.exit(1);
  }

  if (row.full_name === targetName) {
    console.log(`slot ${String(slot).padStart(2, "0")}: already "${targetName}"`);
    continue;
  }

  const { error: updErr } = await admin
    .from("students")
    .update({ full_name: targetName })
    .eq("id", entry.id);

  if (updErr) {
    console.error(`Update failed for ${entry.id}:`, updErr.message);
    process.exit(1);
  }

  console.log(`slot ${String(slot).padStart(2, "0")}: "${row.full_name}" → "${targetName}"`);
  updated += 1;
}

console.log(`\nDone. Updated ${updated} of ${sorted.length} students.`);
