#!/usr/bin/env node
/**
 * One-time: assign teacher access_prefix values and migrate simulation parent-access usernames
 * to {prefix}-{sequence} (e.g. leo-01 .. leo-20 for teacher@leo.com).
 *
 *   node --env-file=.env.local scripts/teacher-portal/migrate-simulation-parent-access-usernames.mjs
 */
import crypto from "node:crypto";
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";
import { SIM_TEACHER_EMAIL } from "./teacher-classroom-sim/config.mjs";
import {
  formatPrefixedParentAccessUsername,
  parsePrefixedParentAccessUsername,
} from "../../lib/teacher-server/teacher-access-prefix.server.js";
import { hashStudentSecret, normalizeStudentUsername } from "../../lib/guardian-server/guardian-crypto.server.js";

const SIMULATION_TEACHER_PREFIX = "leo";
const PREFIX_LETTERS = "abcdefghijklmnopqrstuvwxyz";

function randomAccessPrefix() {
  let out = "";
  for (let i = 0; i < 3; i += 1) {
    out += PREFIX_LETTERS[crypto.randomInt(0, PREFIX_LETTERS.length)];
  }
  return out;
}

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

async function assignMissingTeacherPrefixes(admin) {
  const { data: teachers, error } = await admin
    .from("teacher_profiles")
    .select("id, access_prefix")
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42703" || error.message?.includes("access_prefix")) {
      throw new Error("Migration 022_teacher_access_prefix not applied yet (missing access_prefix column)");
    }
    throw new Error(`teacher_profiles select failed: ${error.message}`);
  }

  const simTeacher = await findAuthUserByEmail(admin, SIM_TEACHER_EMAIL);
  const used = new Set(
    (teachers || [])
      .map((row) => row.access_prefix)
      .filter(Boolean)
      .map((p) => String(p).toLowerCase())
  );

  let assigned = 0;
  for (const row of teachers || []) {
    if (row.access_prefix) continue;

    let prefix = null;
    if (simTeacher?.id && row.id === simTeacher.id) {
      prefix = SIMULATION_TEACHER_PREFIX;
    } else {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const candidate = randomAccessPrefix();
        if (candidate === SIMULATION_TEACHER_PREFIX) continue;
        if (!used.has(candidate)) {
          prefix = candidate;
          break;
        }
      }
    }

    if (!prefix) {
      throw new Error(`Could not assign prefix for teacher ${row.id}`);
    }

    const { error: updErr } = await admin
      .from("teacher_profiles")
      .update({ access_prefix: prefix })
      .eq("id", row.id);

    if (updErr) {
      throw new Error(`Failed to assign prefix ${prefix} to ${row.id}: ${updErr.message}`);
    }

    used.add(prefix);
    assigned += 1;
    console.log(`Assigned prefix ${prefix} to teacher ${row.id}`);
  }

  return assigned;
}

async function revokeSessionsForAccess(admin, accessId) {
  const now = new Date().toISOString();
  await admin
    .from("student_guardian_sessions")
    .update({ revoked_at: now })
    .eq("guardian_access_id", accessId)
    .is("revoked_at", null);
}

async function migrateSimulationGuardianUsernames(admin, teacherId) {
  const { data: rows, error } = await admin
    .from("student_guardian_access")
    .select("id, login_username, login_username_normalized, student_id, is_active, revoked_at, created_at")
    .eq("created_by_teacher_id", teacherId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`student_guardian_access select failed: ${error.message}`);
  }

  const list = rows || [];
  if (!list.length) {
    console.log("No guardian access rows for simulation teacher — nothing to migrate.");
    return { migrated: 0, usernames: [] };
  }

  const usernames = [];
  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    const username = formatPrefixedParentAccessUsername(SIMULATION_TEACHER_PREFIX, i + 1);
    const normalized = normalizeStudentUsername(username);
    const codeHash = hashStudentSecret(normalized);

    const { error: updErr } = await admin
      .from("student_guardian_access")
      .update({
        login_username: username,
        login_username_normalized: normalized,
        code_hash: codeHash,
      })
      .eq("id", row.id);

    if (updErr) {
      throw new Error(`Failed to migrate access ${row.id} -> ${username}: ${updErr.message}`);
    }

    await revokeSessionsForAccess(admin, row.id);
    usernames.push(username);
    console.log(`Migrated access ${row.id} (student ${row.student_id}): ${row.login_username} -> ${username}`);
  }

  return { migrated: usernames.length, usernames };
}

async function main() {
  const admin = createAdminClient();
  console.log("Assigning missing teacher access_prefix values...");
  const assigned = await assignMissingTeacherPrefixes(admin);
  console.log(`Prefixes assigned: ${assigned}`);

  const simTeacher = await findAuthUserByEmail(admin, SIM_TEACHER_EMAIL);
  if (!simTeacher?.id) {
    throw new Error(`Simulation teacher not found: ${SIM_TEACHER_EMAIL}`);
  }

  const { data: profile, error: profileErr } = await admin
    .from("teacher_profiles")
    .select("access_prefix")
    .eq("id", simTeacher.id)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);
  if (profile?.access_prefix !== SIMULATION_TEACHER_PREFIX) {
    throw new Error(`Expected simulation teacher prefix ${SIMULATION_TEACHER_PREFIX}, got ${profile?.access_prefix}`);
  }

  console.log(`Simulation teacher ${SIM_TEACHER_EMAIL} prefix: ${profile.access_prefix}`);
  const result = await migrateSimulationGuardianUsernames(admin, simTeacher.id);

  console.log("\nMigration complete.");
  console.log(`Migrated ${result.migrated} parent-access username(s).`);
  if (result.usernames.length) {
    console.log("Usernames:", result.usernames.join(", "));
  }

  const alreadyFormatted = (rows) =>
    rows.every((u) => parsePrefixedParentAccessUsername(u)?.prefix === SIMULATION_TEACHER_PREFIX);
  if (result.usernames.length && !alreadyFormatted(result.usernames)) {
    throw new Error("Post-migration username format check failed");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
