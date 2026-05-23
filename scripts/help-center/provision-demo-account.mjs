#!/usr/bin/env node
/**
 * Dev/QA only: provision Help Center demo student ADMIN/1234 for ישראל ישראלי.
 * Uses LEARNING_SUPABASE_SERVICE_ROLE_KEY from .env.local — localhost QA project only.
 *
 *   node --env-file=.env.local scripts/help-center/provision-demo-account.mjs
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEMO_STUDENT_ID = "d119f721-05b3-4fe2-ac58-4174ac06f733";
const DEMO_FULL_NAME = "ישראל ישראלי";
const DEMO_USERNAME = "admin"; // normalized from ADMIN
const DEMO_PIN = "1234";
const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec"; // admin@admin.com

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
}

function hashStudentSecret(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
const key = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
const accessSecret = requireEnv("LEARNING_STUDENT_ACCESS_SECRET");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const codeHash = hashStudentSecret(DEMO_USERNAME, accessSecret);
const pinHash = hashStudentSecret(DEMO_PIN, accessSecret);
const nowIso = new Date().toISOString();

const { data: student, error: stErr } = await supabase
  .from("students")
  .select("id, full_name, parent_id, grade_level")
  .eq("id", DEMO_STUDENT_ID)
  .maybeSingle();

if (stErr || !student?.id) {
  console.error("Demo student row not found:", stErr?.message || DEMO_STUDENT_ID);
  process.exit(1);
}

if (student.full_name !== DEMO_FULL_NAME) {
  const { error: nameErr } = await supabase
    .from("students")
    .update({ full_name: DEMO_FULL_NAME })
    .eq("id", DEMO_STUDENT_ID);
  if (nameErr) {
    console.error("Could not set full_name:", nameErr.message);
    process.exit(1);
  }
  console.log("Updated full_name to", DEMO_FULL_NAME);
}

if (student.parent_id !== QA_PARENT_ID) {
  const { error: linkErr } = await supabase
    .from("students")
    .update({ parent_id: QA_PARENT_ID })
    .eq("id", DEMO_STUDENT_ID);
  if (linkErr) {
    console.error("Could not link parent:", linkErr.message);
    process.exit(1);
  }
  console.log("Linked student to QA parent account");
}

// Free login_username "admin" from any other active student.
const { data: conflicts, error: confErr } = await supabase
  .from("student_access_codes")
  .select("id, student_id, login_username")
  .eq("login_username", DEMO_USERNAME)
  .eq("is_active", true)
  .is("revoked_at", null);

if (confErr) {
  console.error(confErr.message);
  process.exit(1);
}

for (const row of conflicts || []) {
  if (row.student_id === DEMO_STUDENT_ID) continue;
  const { error: revErr } = await supabase
    .from("student_access_codes")
    .update({ is_active: false, revoked_at: nowIso })
    .eq("id", row.id);
  if (revErr) {
    console.error("Could not revoke conflicting code:", revErr.message);
    process.exit(1);
  }
  console.log(`Revoked login_username "${DEMO_USERNAME}" from other student ${row.student_id}`);
}

const { error: revokeAllErr } = await supabase
  .from("student_access_codes")
  .update({ is_active: false, revoked_at: nowIso })
  .eq("student_id", DEMO_STUDENT_ID)
  .is("revoked_at", null);

if (revokeAllErr) {
  console.error("Could not revoke prior codes for demo student:", revokeAllErr.message);
  process.exit(1);
}

const { error: insErr } = await supabase.from("student_access_codes").insert({
  student_id: DEMO_STUDENT_ID,
  code_hash: codeHash,
  pin_hash: pinHash,
  login_username: DEMO_USERNAME,
  is_active: true,
  expires_at: null,
  revoked_at: null,
});

if (insErr) {
  console.error("Could not insert access code:", insErr.message);
  process.exit(1);
}

console.log("OK: demo student provisioned");
console.log(`  studentId=${DEMO_STUDENT_ID}`);
console.log(`  login=ADMIN pin=1234 displayName=${DEMO_FULL_NAME}`);
console.log(`  parentId=${QA_PARENT_ID} (admin@admin.com)`);
