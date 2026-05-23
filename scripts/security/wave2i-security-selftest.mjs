#!/usr/bin/env node
/**
 * Wave 2I — XSS / input validation / PII logging selftest.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  clampTrimmedString,
  MAX_COPILOT_UTTERANCE_LEN,
  MAX_HEBREW_NAKDAN_ENTRY_ID_LEN,
  MAX_PARENT_STUDENT_NAME_LEN,
  parseBoundedTrimmedString,
  safeUuid,
  trimString,
} from "../../lib/security/api-input.server.js";
import { isSensitiveLogKey, safeLogObject } from "../../lib/security/safe-log.js";
import {
  resolveParentStudentLimit,
  QA_SIMULATION_PARENT_STUDENT_LIMIT,
  DEFAULT_PARENT_STUDENT_LIMIT,
} from "../../lib/parent-server/parent-student-limit.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function testApiInputHelpers() {
  assert.equal(safeUuid("not-a-uuid"), null);
  assert.ok(safeUuid("11111111-1111-4111-8111-111111111111"));
  assert.equal(trimString("  hello  "), "hello");
  assert.equal(clampTrimmedString("  hello  ", 3), "hel");

  const ok = parseBoundedTrimmedString("  Ada  ", MAX_PARENT_STUDENT_NAME_LEN);
  assert.equal(ok.ok, true);
  assert.equal(ok.value, "Ada");

  const over = parseBoundedTrimmedString("x".repeat(MAX_PARENT_STUDENT_NAME_LEN + 1), MAX_PARENT_STUDENT_NAME_LEN);
  assert.equal(over.ok, false);
  assert.equal(over.reason, "too_long");

  const nakdanOver = parseBoundedTrimmedString("y".repeat(MAX_HEBREW_NAKDAN_ENTRY_ID_LEN + 1), MAX_HEBREW_NAKDAN_ENTRY_ID_LEN);
  assert.equal(nakdanOver.ok, false);

  assert.equal(MAX_PARENT_STUDENT_NAME_LEN, 80);
  assert.equal(MAX_COPILOT_UTTERANCE_LEN, 4000);
}

function testSafeLogRedaction() {
  assert.equal(isSensitiveLogKey("pin_hash"), true);
  assert.equal(isSensitiveLogKey("code_hash"), true);
  assert.equal(isSensitiveLogKey("session_token_hash"), true);
  assert.equal(isSensitiveLogKey("login_username"), true);
  const redacted = safeLogObject({ pin_hash: "x", studentId: "abc" });
  assert.equal(redacted.pin_hash, "[redacted]");
  assert.equal(redacted.studentId, "abc");
}

function testPatchedRoutesRejectNotSlice() {
  const createStudent = read("pages/api/parent/create-student.js");
  assert.match(createStudent, /parseBoundedTrimmedString/);
  assert.match(createStudent, /fullName too long/);
  assert.doesNotMatch(createStudent, /clampTrimmedString/);

  const updateStudent = read("pages/api/parent/update-student.js");
  assert.match(updateStudent, /parseBoundedTrimmedString/);
  assert.match(updateStudent, /fullName too long/);
  assert.doesNotMatch(updateStudent, /clampTrimmedString/);
  assert.match(updateStudent, /safeUuid/);

  const accessCode = read("pages/api/parent/create-student-access-code.js");
  assert.match(accessCode, /safeUuid/);

  const copilot = read("pages/api/parent/copilot-turn.js");
  assert.match(copilot, /MAX_COPILOT_UTTERANCE_LEN/);
  assert.match(copilot, /Utterance too long/);
  assert.match(copilot, /Unexpected server error/);
  assert.doesNotMatch(copilot, /error: msg/);

  const nakdan = read("pages/api/hebrew-nakdan.js");
  assert.match(nakdan, /Entry id too long/);
  assert.doesNotMatch(nakdan, /\.slice\(0, MAX_HEBREW_NAKDAN_ENTRY_ID_LEN\)/);
}

function testXssSurfaceInventory() {
  const hits = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".next") continue;
        walk(p);
        continue;
      }
      if (!/\.(js|jsx|ts|tsx)$/.test(ent.name)) continue;
      const src = fs.readFileSync(p, "utf8");
      if (src.includes("dangerouslySetInnerHTML")) {
        hits.push(path.relative(ROOT, p));
      }
    }
  }
  walk(ROOT);
  assert.equal(hits.length, 1);
  assert.ok(hits[0].replace(/\\/g, "/").endsWith("pages/learning/dev/engine-review.js"));
}

function testCapRulesIntact() {
  assert.equal(resolveParentStudentLimit("admin@admin.com"), QA_SIMULATION_PARENT_STUDENT_LIMIT);
  assert.equal(resolveParentStudentLimit("x@y.com"), DEFAULT_PARENT_STUDENT_LIMIT);
}

function main() {
  testApiInputHelpers();
  testSafeLogRedaction();
  testPatchedRoutesRejectNotSlice();
  testXssSurfaceInventory();
  testCapRulesIntact();
  console.log("wave2i-security-selftest: PASS");
}

main();
