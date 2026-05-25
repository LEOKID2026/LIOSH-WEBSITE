#!/usr/bin/env node
/**
 * One-time: migrate simulation access usernames to leo-sNN / leo-pNN format.
 * Owner must run manually — agent must NOT apply to DB.
 *
 *   node --env-file=.env.local scripts/teacher-portal/migrate-simulation-access-usernames.mjs
 */
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";
import {
  SIM_TEACHER_EMAIL,
  parentAccessUsername,
  studentUsername,
  parseConfig,
} from "./teacher-classroom-sim/config.mjs";
import { loadManifest } from "./teacher-classroom-sim/state.mjs";
import { hashStudentSecret, normalizeStudentUsername } from "../../lib/guardian-server/guardian-crypto.server.js";

const SIMULATION_TEACHER_PREFIX = "leo";
const DEFAULT_SIM_PIN = String(process.env.SIM_TEACHER_STUDENT_PIN || "1234").replace(/\D/g, "").slice(0, 4) || "1234";

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

async function revokeGuardianSessions(admin, accessId) {
  const now = new Date().toISOString();
  await admin
    .from("student_guardian_sessions")
    .update({ revoked_at: now })
    .eq("guardian_access_id", accessId)
    .is("revoked_at", null);
}

async function migrateStudentCodes(admin, teacherId, orderedStudentIds, pin) {
  const pinHash = hashStudentSecret(pin);
  const results = [];

  for (let i = 0; i < orderedStudentIds.length; i += 1) {
    const studentId = orderedStudentIds[i];
    const slot = i + 1;
    const username = studentUsername("g3", slot);
    const normalized = normalizeStudentUsername(username);
    const codeHash = hashStudentSecret(normalized);

    const { data: existing } = await admin
      .from("student_access_codes")
      .select("id, login_username")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("student_access_codes")
        .update({
          login_username: username,
          code_hash: codeHash,
          pin_hash: pinHash,
        })
        .eq("id", existing.id);
      if (error) throw new Error(`student code update ${studentId}: ${error.message}`);
    } else {
      const { error } = await admin.from("student_access_codes").insert({
        student_id: studentId,
        login_username: username,
        code_hash: codeHash,
        pin_hash: pinHash,
        is_active: true,
      });
      if (error) throw new Error(`student code insert ${studentId}: ${error.message}`);
    }

    results.push({ studentId, username, pin });
    console.log(`Student access: ${existing?.login_username || "(new)"} -> ${username}`);
  }

  return results;
}

async function migrateParentAccess(admin, teacherId, orderedStudentIds, pin) {
  const pinHash = hashStudentSecret(normalizeStudentPin(pin));
  const results = [];

  for (let i = 0; i < orderedStudentIds.length; i += 1) {
    const studentId = orderedStudentIds[i];
    const slot = i + 1;
    const username = parentAccessUsername("g3", slot);
    const normalized = normalizeStudentUsername(username);
    const codeHash = hashStudentSecret(normalized);

    const { data: rows } = await admin
      .from("student_guardian_access")
      .select("id, login_username, is_active, revoked_at")
      .eq("created_by_teacher_id", teacherId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });

    const active = (rows || []).find((r) => r.is_active && !r.revoked_at);

    if (active?.id) {
      const { error } = await admin
        .from("student_guardian_access")
        .update({
          login_username: username,
          login_username_normalized: normalized,
          code_hash: codeHash,
          pin_hash: pinHash,
        })
        .eq("id", active.id);
      if (error) throw new Error(`parent access update ${studentId}: ${error.message}`);
      await revokeGuardianSessions(admin, active.id);
      results.push({ studentId, username, accessId: active.id, action: "updated" });
      console.log(`Parent access: ${active.login_username} -> ${username}`);
      continue;
    }

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);

    const { data: inserted, error: insErr } = await admin
      .from("student_guardian_access")
      .insert({
        student_id: studentId,
        created_by_teacher_id: teacherId,
        login_username: username,
        login_username_normalized: normalized,
        code_hash: codeHash,
        pin_hash: pinHash,
        delivery_channel: "code",
        is_active: true,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (insErr) throw new Error(`parent access insert ${studentId}: ${insErr.message}`);
    results.push({ studentId, username, accessId: inserted.id, action: "created" });
    console.log(`Parent access: (new) -> ${username}`);
  }

  return results;
}

function normalizeStudentPin(raw) {
  return String(raw || "").replace(/\D/g, "").trim();
}

async function main() {
  const config = parseConfig([]);
  const manifest = loadManifest(config.stateDir);
  const admin = createAdminClient();

  const simTeacher = await findAuthUserByEmail(admin, SIM_TEACHER_EMAIL);
  if (!simTeacher?.id) throw new Error(`Simulation teacher not found: ${SIM_TEACHER_EMAIL}`);

  const { data: profile } = await admin
    .from("teacher_profiles")
    .select("access_prefix")
    .eq("id", simTeacher.id)
    .maybeSingle();

  if (profile?.access_prefix !== SIMULATION_TEACHER_PREFIX) {
    throw new Error(`Expected prefix ${SIMULATION_TEACHER_PREFIX}, got ${profile?.access_prefix}`);
  }

  const orderedStudentIds = (manifest.students || [])
    .slice()
    .sort((a, b) => (a.slot || 0) - (b.slot || 0))
    .map((s) => s.id)
    .filter(Boolean);

  if (!orderedStudentIds.length) {
    throw new Error("No students in simulation manifest");
  }

  console.log(`Migrating ${orderedStudentIds.length} simulation students…`);
  console.log(`Using stable PIN: ${DEFAULT_SIM_PIN}`);

  const studentResults = await migrateStudentCodes(admin, simTeacher.id, orderedStudentIds, DEFAULT_SIM_PIN);
  const parentResults = await migrateParentAccess(admin, simTeacher.id, orderedStudentIds, DEFAULT_SIM_PIN);

  console.log("\nDone.");
  console.log("Student usernames:", studentResults.map((r) => r.username).join(", "));
  console.log("Parent usernames:", parentResults.map((r) => r.username).join(", "));
  console.log("\nExample credentials:");
  console.log(`  Student: ${studentResults[0]?.username} / ${DEFAULT_SIM_PIN}`);
  console.log(`  Parent:  ${parentResults[0]?.username} / ${DEFAULT_SIM_PIN}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
