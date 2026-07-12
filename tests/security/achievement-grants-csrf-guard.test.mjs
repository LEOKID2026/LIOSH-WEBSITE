/**
 * Regression guard: POST /api/student/home-profile/achievement-grants performs a real DB
 * write (achievement/reward-card grant) and must call the same same-origin/CSRF guard used
 * by every other cookie-session mutating route in the codebase, before any DB work.
 * Run: node --test tests/security/achievement-grants-csrf-guard.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("achievement-grants same-origin/CSRF guard", () => {
  const src = readFileSync(
    join(ROOT, "pages/api/student/home-profile/achievement-grants.js"),
    "utf8",
  );

  test("imports guardCookieMutationOrigin", () => {
    assert.match(src, /import\s*\{\s*guardCookieMutationOrigin\s*\}\s*from\s*["'].*lib\/security\/api-guards\.js["']/);
  });

  test("calls the guard before the achievement-grants DB write", () => {
    const guardIdx = src.indexOf("guardCookieMutationOrigin(req, res)");
    const dbWriteIdx = src.indexOf("runStudentHomeAchievementGrants(");
    assert.ok(guardIdx > -1, "guard call not found");
    assert.ok(dbWriteIdx > -1, "DB write call not found");
    assert.ok(guardIdx < dbWriteIdx, "guard must run before the DB write");
  });
});
