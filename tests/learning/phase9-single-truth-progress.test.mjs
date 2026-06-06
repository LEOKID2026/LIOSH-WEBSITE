/**
 * Phase 9 — Single truth for coins / time / monthly progress
 * Run: node --test tests/learning/phase9-single-truth-progress.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  addSessionProgress,
  loadMonthlyProgress,
  syncMonthlyProgressCacheFromServer,
  getCurrentYearMonth,
} from "../../utils/progress-storage.js";

import {
  buildStudentHomeView,
} from "../../lib/learning-client/studentHomeDashboardClient.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("Phase 9 — progress storage authority", () => {
  test("addSessionProgress does not persist monthly progress without window", () => {
    addSessionProgress(25, 10, { subject: "math", topic: "addition" }, { studentId: "stu-9" });
    assert.deepEqual(loadMonthlyProgress("stu-9"), {});
    assert.deepEqual(loadMonthlyProgress(), {});
  });

  test("syncMonthlyProgressCacheFromServer is no-op without window", () => {
    syncMonthlyProgressCacheFromServer("stu-9", {
      monthlyMinutesIsraelMonth: 42.5,
      yearMonthIsrael: "2026-06",
      monthlyAnswersCountIsraelMonth: 7,
    });
    assert.deepEqual(loadMonthlyProgress("stu-9"), {});
  });

  test("progress-storage module documents non-authoritative LEO keys", () => {
    const src = readFileSync(join(ROOT, "utils/progress-storage.js"), "utf8");
    assert.match(src, /NOT authoritative/i);
    assert.doesNotMatch(src, /LEO_REWARD_CHOICE/);
  });
});

describe("Phase 9 — coin formula unchanged", () => {
  test("learning-coin-award tiered formula and daily cap unchanged in source", () => {
    const src = readFileSync(
      join(ROOT, "lib/learning-supabase/learning-coin-award.server.js"),
      "utf8"
    );
    assert.match(src, /if \(acc >= 95\) return base \+ 10/);
    assert.match(src, /if \(acc >= 80\) return base \+ 5/);
    assert.match(src, /const base = 10/);
    assert.match(src, /SESSION_DAILY_CAP = 300/);
  });
});

describe("Phase 9 — monthly minutes from learning_sessions only", () => {
  test("monthly persistence and derived minutes exclude book/assigned sources", () => {
    const persistenceSrc = readFileSync(
      join(ROOT, "lib/learning-supabase/monthly-persistence-reward.server.js"),
      "utf8"
    );
    const derivedSrc = readFileSync(
      join(ROOT, "lib/learning-supabase/student-learning-profile.server.js"),
      "utf8"
    );
    assert.match(persistenceSrc, /\.from\("learning_sessions"\)/);
    assert.doesNotMatch(persistenceSrc, /book_reading_sessions/);
    assert.match(derivedSrc, /\.from\("learning_sessions"\)/);
    assert.doesNotMatch(derivedSrc, /book_reading/);
    assert.doesNotMatch(derivedSrc, /parent_activity_attempts/);
    assert.match(persistenceSrc, /minutes: 600, coins: 100_000/);
  });
});

describe("Phase 9 — student home uses server derived minutes", () => {
  test("buildStudentHomeView monthly minutes from derived not localStorage", () => {
    const view = buildStudentHomeView({
      student: {
        id: "stu-9",
        full_name: "Phase 9",
        grade_level: "grade_3",
        coin_balance: 100,
      },
      homePayload: {
        derived: {
          monthlyMinutesIsraelMonth: 123.45,
          yearMonthIsrael: "2026-06",
          answersTotalAll: 50,
          bySubject: {
            math: { answersTotal: 50, correctTotal: 40, wrongTotal: 10, accuracy: 80, sessionMinutesTotal: 200 },
          },
        },
        accountSnapshot: {
          summaryPlayerLevel: 2,
          summaryStars: 5,
          bySubject: {
            math: { playerLevel: 2, stars: 5, bestScore: 100, bestStreak: 3, accountAccuracyPct: 80 },
          },
        },
        monthly: {},
        profile: {},
        challenges: {},
        streaks: {},
        achievements: {},
        subjectsProgressOnly: {},
      },
    });

    assert.ok(view);
    assert.equal(view.accountStats.learningMinutesThisMonth, 123.45);
    assert.equal(view.monthlyJourney.minutesThisMonth, 123.45);
    assert.equal(view.monthlyPersistence.currentMinutes, 123.5);
  });
});

describe("Phase 9 — product path imports", () => {
  test("parent-report pages use parent-report-from-api-payload not bridge", () => {
    for (const rel of ["pages/learning/parent-report.js", "pages/learning/parent-report-detailed.js"]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.match(src, /parent-report-from-api-payload/);
      assert.doesNotMatch(src, /parent-dashboard-report-bridge/);
    }
  });

  test("parent-report-from-api-payload uses isolated storage shim", () => {
    const src = readFileSync(
      join(ROOT, "lib/learning-supabase/parent-report-from-api-payload.js"),
      "utf8"
    );
    assert.match(src, /runWithIsolatedReportStorage/);
    assert.doesNotMatch(src, /backupMleoReportKeys/);
    assert.doesNotMatch(src, /window\.localStorage\.setItem/);
  });

  test("masters no longer call addSessionProgress", () => {
    const masters = [
      "pages/learning/math-master.js",
      "pages/learning/geometry-master.js",
      "pages/learning/english-master.js",
      "pages/learning/hebrew-master.js",
      "pages/learning/science-master.js",
      "pages/learning/moledet-geography-master.js",
    ];
    for (const rel of masters) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.doesNotMatch(src, /addSessionProgress/);
    }
  });

  test("coin-history API exists read-only", () => {
    const src = readFileSync(
      join(ROOT, "pages/api/parent/students/[studentId]/coin-history.js"),
      "utf8"
    );
    assert.match(src, /coin_transactions/);
    assert.doesNotMatch(src, /\.insert\(/);
    assert.doesNotMatch(src, /\.update\(/);
  });
});

describe("Phase 9 — getCurrentYearMonth helper", () => {
  test("getCurrentYearMonth returns YYYY-MM", () => {
    const ym = getCurrentYearMonth();
    assert.match(ym, /^\d{4}-\d{2}$/);
  });
});
