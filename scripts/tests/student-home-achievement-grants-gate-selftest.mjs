#!/usr/bin/env node
/**
 * Verify achievement-grants gate: cooldown + in-flight dedupe.
 * Run: npx tsx scripts/tests/student-home-achievement-grants-gate-selftest.mjs
 */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const gateUrl = pathToFileURL(
  join(ROOT, "lib/learning-supabase/student-home-achievement-grants-gate.server.js")
).href;

const { runStudentHomeAchievementGrantsGated, invalidateStudentHomeAchievementGrantsGate } =
  await import(gateUrl);

const studentId = "00000000-0000-0000-0000-000000000099";
let callCount = 0;

async function fakeRun(_supabase, _sid) {
  callCount += 1;
  await new Promise((r) => setTimeout(r, 50));
  return { ok: true, grantedCount: 0, granted: [] };
}

invalidateStudentHomeAchievementGrantsGate(studentId);
callCount = 0;

const r1 = await runStudentHomeAchievementGrantsGated(null, studentId, fakeRun);
assert.equal(r1.skipped, false);
assert.equal(callCount, 1);

const r2 = await runStudentHomeAchievementGrantsGated(null, studentId, fakeRun);
assert.equal(r2.skipped, true);
assert.equal(r2.skipReason, "cooldown");
assert.equal(callCount, 1, "cooldown should skip second full eval");

invalidateStudentHomeAchievementGrantsGate(studentId);
callCount = 0;

const p1 = runStudentHomeAchievementGrantsGated(null, studentId, fakeRun);
const p2 = runStudentHomeAchievementGrantsGated(null, studentId, fakeRun);
await Promise.all([p1, p2]);
assert.equal(callCount, 1, "parallel calls should share one in-flight eval");

console.log("student-home-achievement-grants-gate-selftest: OK");
