#!/usr/bin/env node
/**
 * Dry-run by default. Archives smoke-named classes and unlinks smoke-named students
 * for the verify teacher only. Requires --execute --confirm DELETE_SMOKE_ARTIFACTS to apply.
 *
 * See docs/teacher-portal/SMOKE_ARTIFACT_CLEANUP.md
 */
import { createClient } from "@supabase/supabase-js";
import { archiveTeacherClass } from "../../lib/teacher-server/teacher-classes.server.js";
import { unlinkTeacherStudent } from "../../lib/teacher-server/teacher-link.server.js";
import {
  isSmokeClassName,
  isSmokeStudentName,
} from "../../lib/teacher-portal/teacher-smoke-artifacts.js";

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
const verifyEmail =
  process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher-portal-live-verify@liosh-dev.invalid";
const verifyPassword =
  process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "TeacherPortalVerify!2026";

const execute = process.argv.includes("--execute");
const confirmed = process.argv.includes("--confirm") &&
  process.argv.includes("DELETE_SMOKE_ARTIFACTS");

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase URL/keys");
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: authData, error: authErr } = await anon.auth.signInWithPassword({
  email: verifyEmail,
  password: verifyPassword,
});
if (authErr || !authData?.user?.id) {
  console.error("Verify teacher login failed:", verifyEmail, authErr?.message || "");
  process.exit(1);
}

const teacherId = authData.user.id;
console.log(`Teacher: ${verifyEmail} (${teacherId})`);
console.log(execute && confirmed ? "MODE: execute" : "MODE: dry-run");

const { data: classes, error: classErr } = await admin
  .from("teacher_classes")
  .select("id, name, is_archived")
  .eq("teacher_id", teacherId)
  .eq("is_archived", false);

if (classErr) {
  console.error(classErr.message);
  process.exit(1);
}

const smokeClasses = (classes || []).filter((c) => isSmokeClassName(c.name));
console.log(`\nSmoke classes to archive: ${smokeClasses.length}`);
for (const c of smokeClasses) {
  console.log(`  - ${c.name} (${c.id})`);
}

const { data: links, error: linkErr } = await admin
  .from("teacher_students")
  .select("id, student_id, archived_at, students(full_name)")
  .eq("teacher_id", teacherId)
  .is("archived_at", null);

if (linkErr) {
  console.error(linkErr.message);
  process.exit(1);
}

const smokeLinks = (links || []).filter((row) => {
  const name = row.students?.full_name;
  return isSmokeStudentName(name);
});

console.log(`\nSmoke student links to archive: ${smokeLinks.length}`);
for (const row of smokeLinks) {
  console.log(`  - ${row.students?.full_name} link=${row.id} student=${row.student_id}`);
}

if (!execute || !confirmed) {
  console.log("\nDry-run complete. To apply:");
  console.log(
    "  node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/cleanup-smoke-artifacts.mjs --execute --confirm DELETE_SMOKE_ARTIFACTS"
  );
  process.exit(0);
}

let failures = 0;
for (const c of smokeClasses) {
  const res = await archiveTeacherClass(admin, c.id);
  if (!res.ok) {
    console.error(`FAIL archive class ${c.name}:`, res.code);
    failures += 1;
  } else {
    console.log(`OK archived class ${c.name}`);
  }
}

for (const row of smokeLinks) {
  const res = await unlinkTeacherStudent({
    serviceRole: admin,
    teacherId,
    linkId: row.id,
    reason: "smoke_cleanup",
  });
  if (!res.ok) {
    console.error(`FAIL unlink ${row.students?.full_name}:`, res.code);
    failures += 1;
  } else {
    console.log(`OK unlinked ${row.students?.full_name}`);
  }
}

console.log(failures ? `\nDone with ${failures} failure(s)` : "\nDone.");
process.exit(failures ? 1 : 0);
