#!/usr/bin/env node
/**
 * Diagnose parent student delete blockers against live Supabase.
 * Usage: node --env-file=.env.local scripts/diagnose-delete-student.mjs [studentId]
 */
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const serviceKey =
  process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const studentIdArg = process.argv[2] || null;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function queryFkRules() {
  const sql = `
    select
      c.conrelid::regclass as table_name,
      a.attname as column_name,
      c.confrelid::regclass as references_table,
      case c.confdeltype
        when 'a' then 'NO ACTION'
        when 'r' then 'RESTRICT'
        when 'c' then 'CASCADE'
        when 'n' then 'SET NULL'
        when 'd' then 'SET DEFAULT'
      end as on_delete
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.contype = 'f'
      and c.confrelid = 'public.students'::regclass
    order by 1, 2;
  `;

  const { data, error } = await admin.rpc("exec_sql", { query: sql }).catch(() => ({ data: null, error: { message: "no exec_sql rpc" } }));

  if (error?.message === "no exec_sql rpc") {
    const arcadeTables = ["arcade_rooms", "arcade_room_players", "arcade_results"];
    console.log("\n=== Arcade row counts (if studentId provided) ===");
    if (studentIdArg) {
      for (const table of arcadeTables) {
        const col = table === "arcade_rooms" ? "host_student_id" : "student_id";
        const { count, error: cErr } = await admin
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq(col, studentIdArg);
        console.log(`${table}.${col}: ${cErr ? cErr.message : count ?? 0}`);
      }
    }
    console.log("\nNote: exec_sql RPC unavailable — run FK query manually in Supabase SQL editor:");
    console.log(sql);
    return null;
  }

  if (error) {
    console.error("FK query failed:", error);
    return null;
  }
  return data;
}

async function listStudentFksViaInformationSchema() {
  console.log("\n=== FK rules referencing public.students (via REST) ===");
  console.log("Checking arcade tables individually...\n");

  const checks = [
    { table: "arcade_rooms", column: "host_student_id" },
    { table: "arcade_room_players", column: "student_id" },
    { table: "arcade_results", column: "student_id" },
    { table: "arcade_quick_match_queue", column: "student_id" },
  ];

  for (const { table, column } of checks) {
    const probe = await admin.from(table).select(column).limit(1);
    console.log(`${table}: accessible=${!probe.error}${probe.error ? ` (${probe.error.message})` : ""}`);
  }
}

async function probeStudent(studentId) {
  console.log(`\n=== Student probe: ${studentId} ===`);
  const { data: student, error } = await admin
    .from("students")
    .select("id, full_name, parent_id, is_active, created_at")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    console.error("students lookup error:", error);
    return null;
  }
  if (!student) {
    console.error("Student not found");
    return null;
  }
  console.log(student);

  const dependencyTables = [
    ["arcade_results", "student_id"],
    ["arcade_room_players", "student_id"],
    ["arcade_rooms", "host_student_id"],
    ["arcade_quick_match_queue", "student_id"],
    ["classroom_activity_attempts", "student_id"],
    ["classroom_activity_student_status", "student_id"],
    ["solo_game_sessions", "student_id"],
    ["educational_game_sessions", "student_id"],
    ["student_game_category_permissions", "student_id"],
    ["student_diamond_balances", "student_id"],
    ["student_reward_cards", "student_id"],
    ["parent_assigned_activities", "student_id"],
    ["school_student_enrollments", "student_id"],
    ["teacher_students", "student_id"],
    ["learning_sessions", "student_id"],
    ["answers", "student_id"],
  ];

  console.log("\n=== Dependency row counts ===");
  for (const [table, column] of dependencyTables) {
    const { count, error: cErr } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, studentId);
    if (cErr) {
      if (cErr.code === "42P01" || cErr.code === "PGRST205") continue;
      console.log(`${table}: ERROR ${cErr.code} ${cErr.message}`);
    } else if ((count ?? 0) > 0) {
      console.log(`${table}: ${count}`);
    }
  }

  return student;
}

async function attemptDeleteDryRun(studentId, parentId) {
  console.log("\n=== Simulated delete steps (live delete unless DRY_RUN=1) ===");
  if (process.env.DRY_RUN === "1") {
    console.log("DRY_RUN=1 — skipping actual deletes");
    return;
  }

  const steps = [
    () => admin.from("arcade_results").delete().eq("student_id", studentId),
    () => admin.from("arcade_quick_match_queue").delete().eq("student_id", studentId),
    () => admin.from("arcade_rooms").delete().eq("host_student_id", studentId),
    () => admin.from("arcade_room_players").delete().eq("student_id", studentId),
    () => admin.from("arcade_results").delete().eq("student_id", studentId),
    () => admin.from("classroom_activity_attempts").delete().eq("student_id", studentId),
    () => admin.from("classroom_activity_student_status").delete().eq("student_id", studentId),
  ];

  for (let i = 0; i < steps.length; i++) {
    const { error } = await steps[i]();
    if (error) {
      console.error(`Step ${i + 1} FAILED:`, JSON.stringify(error, null, 2));
      return;
    }
    console.log(`Step ${i + 1} OK`);
  }

  const { data, error: delErr, count } = await admin
    .from("students")
    .delete({ count: "exact" })
    .eq("id", studentId)
    .eq("parent_id", parentId)
    .select("id");

  console.log("\nstudents DELETE result:");
  console.log("  error:", delErr ? JSON.stringify(delErr, null, 2) : null);
  console.log("  count:", count);
  console.log("  data:", data);
}

async function findRecentStudents(limit = 5) {
  const { data } = await admin
    .from("students")
    .select("id, full_name, parent_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  console.log("\n=== Recent students (for manual test id) ===");
  for (const s of data || []) {
    console.log(`${s.id} | ${s.full_name} | parent=${s.parent_id}`);
  }
}

async function main() {
  console.log("Supabase URL:", url);
  await listStudentFksViaInformationSchema();
  await findRecentStudents();

  if (!studentIdArg) {
    console.log("\nPass a student UUID to probe: node --env-file=.env.local scripts/diagnose-delete-student.mjs <uuid>");
    console.log("Set DRY_RUN=1 to skip actual delete.");
    return;
  }

  const student = await probeStudent(studentIdArg);
  if (student && process.env.CONFIRM_DELETE === "1") {
    await attemptDeleteDryRun(studentIdArg, student.parent_id);
  } else if (student) {
    console.log("\nSet CONFIRM_DELETE=1 to run live delete test (destructive).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
