#!/usr/bin/env node
/**
 * Write gitignored student username/PIN map for school sim UI sampling.
 *
 * PINs are not recoverable from DB hashes. This script records:
 * - login_username from student_access_codes
 * - PIN from existing local artifact, or DEMO_STUDENT_PIN only when you confirm
 *   it matches the value used during seed-demo-school --phase=students
 *
 *   node --env-file=.env.local scripts/school-portal/export-demo-student-credentials.mjs
 */
import { createServiceRole, loadSimState } from "./demo-school-lib.mjs";
import {
  credentialsArtifactPath,
  loadCredentialsArtifact,
  writeCredentialsArtifact,
} from "./sim/student-credentials.mjs";

async function main() {
  const state = loadSimState();
  const studentIds = state.studentIds || [];
  if (!studentIds.length) {
    throw new Error("sim-state.json has no studentIds — run seed students phase first");
  }

  const existing = loadCredentialsArtifact();
  const envPin = String(process.env.DEMO_STUDENT_PIN || "").trim();
  const assumeEnvPin = process.env.SCHOOL_SIM_ASSUME_SEED_PIN === "1";

  if (!existing?.students && !envPin) {
    throw new Error(
      "No local credential artifact and DEMO_STUDENT_PIN not set. " +
        "Either re-run seed-demo-school --phase=students (writes artifact) or set " +
        "DEMO_STUDENT_PIN with SCHOOL_SIM_ASSUME_SEED_PIN=1 only if that PIN was used at seed time."
    );
  }

  if (!existing?.students && envPin && !assumeEnvPin) {
    throw new Error(
      "Set SCHOOL_SIM_ASSUME_SEED_PIN=1 to confirm DEMO_STUDENT_PIN matches the original seed, " +
        "or re-run seed-demo-school --phase=students to regenerate artifact from seed."
    );
  }

  const serviceRole = createServiceRole();
  const BATCH = 80;
  const rows = [];
  for (let i = 0; i < studentIds.length; i += BATCH) {
    const chunk = studentIds.slice(i, i + BATCH);
    const { data, error } = await serviceRole
      .from("student_access_codes")
      .select("student_id, login_username")
      .in("student_id", chunk)
      .eq("is_active", true);
    if (error) throw error;
    rows.push(...(data || []));
  }
  const data = rows;

  const prior = existing?.students || {};
  const students = {};
  for (const row of data || []) {
    const prev = prior[row.student_id];
    students[row.student_id] = {
      username: row.login_username,
      pin: prev?.pin || (assumeEnvPin ? envPin : undefined),
    };
    if (!students[row.student_id].pin) {
      throw new Error(
        `No PIN for student ${row.student_id} (${row.login_username}). ` +
          "Cannot recover from pin_hash."
      );
    }
  }

  const out = writeCredentialsArtifact(students, {
    source: existing?.students ? "export-merge" : "export-assume-seed-pin",
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        path: out,
        count: Object.keys(students).length,
        note: "Gitignored — do not commit",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("export-demo-student-credentials: FAIL", e.message || e);
  process.exit(1);
});
