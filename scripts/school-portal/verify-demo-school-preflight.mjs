#!/usr/bin/env node
/**
 * Pre-flight before demo school seed (027 schema + Phase 0 audit gate).
 */
import { createServiceRole, checkPhase0AuditGate } from "./demo-school-lib.mjs";
import { DEMO_SCHOOL_CITY, DEMO_SCHOOL_NAME } from "./demo-school-data.mjs";

async function main() {
  const serviceRole = createServiceRole();

  const tables = [
    "school_accounts",
    "school_teacher_memberships",
    "school_teacher_subjects",
    "school_student_enrollments",
  ];
  for (const table of tables) {
    const { error } = await serviceRole.from(table).select("id").limit(1);
    if (error) {
      throw new Error(`Table ${table} not ready (apply migration 027): ${error.message}`);
    }
  }

  const gate = await checkPhase0AuditGate(serviceRole);
  if (!gate.ok) {
    throw new Error(gate.message);
  }

  const { data: existing } = await serviceRole
    .from("school_accounts")
    .select("id, name, city")
    .eq("name", DEMO_SCHOOL_NAME)
    .eq("city", DEMO_SCHOOL_CITY)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        ok: true,
        migration027: true,
        phase0AuditGate: true,
        existingDemoSchool: existing?.id || null,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("verify-demo-school-preflight: FAIL", e.message || e);
  process.exit(1);
});
