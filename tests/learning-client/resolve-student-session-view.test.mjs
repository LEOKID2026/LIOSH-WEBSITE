import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  resolveStudentSessionView,
  isLegacyHardcodedInitialGrade,
} from "../../lib/learning-client/resolveStudentSessionView.js";
import {
  readStudentGradeLevelCache,
  writeStudentGradeLevelCache,
  clearStudentGradeLevelCache,
  studentGradeLevelStorageKey,
} from "../../lib/learning-student-grade-cache.js";

const LIOSH_ACTIVE_STUDENT_ID_KEY = "liosh_active_student_id";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

test("authoritative /me grade resolves without hardcoded fallback", () => {
  const view = resolveStudentSessionView({
    status: "ok",
    student: {
      id: "stu-1",
      full_name: "Noa",
      grade_level: "g2",
      coin_balance: 40,
    },
    activeStudentId: "stu-1",
    cachedGradeLevelRaw: "g3",
  });
  assert.equal(view.gradeKey, "g2");
  assert.equal(view.gradeNumber, 2);
  assert.equal(view.gradeResolved, true);
  assert.equal(view.authoritativeGradeKey, "g2");
  assert.equal(view.gradeSource, "authoritative");
});

test("loading uses same-student localStorage hint when context still loading", () => {
  const view = resolveStudentSessionView({
    status: "loading",
    student: null,
    activeStudentId: "stu-1",
    cachedGradeLevelRaw: "grade_5",
  });
  assert.equal(view.sessionLoading, true);
  assert.equal(view.gradeResolved, true);
  assert.equal(view.gradeKey, "g5");
  assert.equal(view.gradeNumber, 5);
  assert.equal(view.authoritativeGradeKey, null);
  assert.equal(view.gradeSource, "cache_hint");
});

test("no grade when loading without cache hint", () => {
  const view = resolveStudentSessionView({
    status: "loading",
    student: null,
    activeStudentId: "stu-1",
    cachedGradeLevelRaw: "",
  });
  assert.equal(view.gradeResolved, false);
  assert.equal(view.gradeKey, null);
});

test("authoritative grade updates stale cached hint", () => {
  const stale = resolveStudentSessionView({
    status: "loading",
    student: null,
    activeStudentId: "stu-1",
    cachedGradeLevelRaw: "g3",
  });
  assert.equal(stale.gradeKey, "g3");

  const fresh = resolveStudentSessionView({
    status: "ok",
    student: { id: "stu-1", grade_level: "g6" },
    activeStudentId: "stu-1",
    cachedGradeLevelRaw: "g3",
  });
  assert.equal(fresh.gradeKey, "g6");
  assert.equal(fresh.gradeNumber, 6);
});

test("grade cache is isolated per student id", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };

  writeStudentGradeLevelCache("student-a", "g2");
  writeStudentGradeLevelCache("student-b", "g5");
  assert.equal(readStudentGradeLevelCache("student-a"), "g2");
  assert.equal(readStudentGradeLevelCache("student-b"), "g5");
  assert.equal(studentGradeLevelStorageKey("student-a"), "liosh_student_grade_student-a");

  clearStudentGradeLevelCache("student-b");
  assert.equal(readStudentGradeLevelCache("student-b"), "");
  assert.equal(readStudentGradeLevelCache("student-a"), "g2");

  store.set(LIOSH_ACTIVE_STUDENT_ID_KEY, "student-b");
  writeStudentGradeLevelCache("student-b", "g4");
  assert.equal(readStudentGradeLevelCache("student-b"), "g4");
  assert.equal(readStudentGradeLevelCache("student-a"), "g2");
});

test("legacy hardcoded initial grades are flagged", () => {
  assert.equal(isLegacyHardcodedInitialGrade("math-master.js", "g3"), true);
  assert.equal(isLegacyHardcodedInitialGrade("geometry-master.js", "g5"), true);
  assert.equal(isLegacyHardcodedInitialGrade("science-master.js", "g1"), true);
  assert.equal(isLegacyHardcodedInitialGrade("math-master.js", "g2"), false);
});

test("subject master pages use shared session defaults hook", () => {
  const pages = [
    "pages/learning/math-master.js",
    "pages/learning/geometry-master.js",
    "pages/learning/hebrew-master.js",
    "pages/learning/english-master.js",
    "pages/learning/science-master.js",
    "pages/learning/moledet-geography-master.js",
  ];
  for (const rel of pages) {
    const src = readFileSync(join(root, rel), "utf8");
    assert.match(
      src,
      /useSubjectSessionDefaults/,
      `${rel} must use useSubjectSessionDefaults`
    );
    assert.doesNotMatch(
      src,
      /fetch\("\/api\/student\/me"/,
      `${rel} must not duplicate /api/student/me for session grade`
    );
    assert.doesNotMatch(
      src,
      /useState\("g3"\)/,
      `${rel} must not hardcode g3`
    );
    assert.doesNotMatch(
      src,
      /useState\("g5"\)/,
      `${rel} must not hardcode g5`
    );
    assert.doesNotMatch(
      src,
      /useState\(GRADE_ORDER\[0\]\)/,
      `${rel} must not default to GRADE_ORDER[0]`
    );
  }
});
