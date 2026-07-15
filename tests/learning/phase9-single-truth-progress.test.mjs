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

import {
  StudentDisplayTruthState,
  STUDENT_TRUTH_LABELS_HE,
  formatStudentPercentHe,
  subjectAccuracyFromDerivedSub,
} from "../../lib/learning-shared/student-display-truth.js";

import { buildStudentSubjectDashboardView } from "../../lib/learning-shared/student-subject-dashboard-view.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("Phase 9 - progress storage authority", () => {
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

describe("Phase 9 - coin formula from Admin/DB", () => {
  test("learning-coin-award uses economy-config session settings (not hardcoded 10/15/20)", () => {
    const src = readFileSync(
      join(ROOT, "lib/learning-supabase/learning-coin-award.server.js"),
      "utf8"
    );
    assert.match(src, /requireSessionCoinSettings/);
    assert.match(src, /calculateSessionCoinsFromSettings/);
    assert.doesNotMatch(src, /SESSION_DAILY_CAP\s*=\s*300/);
    assert.doesNotMatch(src, /const base = 10/);
    assert.doesNotMatch(src, /legacy-economy/);
  });
});

describe("Phase 9 - monthly minutes from unified learning-time aggregate", () => {
  test("monthly persistence and derived profile use single aggregate; tiers from Admin/DB", () => {
    const persistenceSrc = readFileSync(
      join(ROOT, "lib/learning-supabase/monthly-persistence-reward.server.js"),
      "utf8"
    );
    const aggregateSrc = readFileSync(
      join(ROOT, "lib/learning-supabase/learning-time-monthly-aggregate.server.js"),
      "utf8"
    );
    const derivedSrc = readFileSync(
      join(ROOT, "lib/learning-supabase/student-learning-profile.server.js"),
      "utf8"
    );
    assert.match(persistenceSrc, /sumStudentLearningCreditedMinutesInIsraelMonth/);
    assert.match(aggregateSrc, /\.from\("learning_sessions"\)/);
    // Unified aggregate folds parent attempts + visits into wall-clock union windows.
    assert.match(aggregateSrc, /collectParentAttemptTimeWindowsInRange/);
    assert.match(aggregateSrc, /collectParentVisitTimeWindowsInRange/);
    assert.match(aggregateSrc, /parent_activity_attempts/);
    assert.doesNotMatch(persistenceSrc, /book_reading_sessions/);
    assert.match(derivedSrc, /sumStudentLearningCreditedMinutesInIsraelMonth/);
    assert.match(derivedSrc, /sumParentActivityVisitMsBySubjectInRange/);
    assert.match(derivedSrc, /parent_activity_attempts/);
    assert.doesNotMatch(derivedSrc, /book_reading/);
    assert.match(persistenceSrc, /getMonthlyPersistenceTiersFromSettings/);
    assert.doesNotMatch(persistenceSrc, /legacy-economy/);
    assert.doesNotMatch(persistenceSrc, /minutes: 600, coins: 100_000/);
    const reportAggSrc = readFileSync(
      join(ROOT, "lib/parent-server/report-data-aggregate.server.js"),
      "utf8"
    );
    assert.match(reportAggSrc, /attachUnifiedCreditedLearningTimeToParentReportPayload/);
    const migration = readFileSync(
      join(ROOT, "supabase/migrations/058_card_rewards_system.sql"),
      "utf8"
    );
    assert.match(migration, /reward_economy_monthly_tiers/);
    assert.match(migration, /600/);
    assert.match(migration, /100000/);
  });
});

describe("Phase 9 - student home uses server derived minutes", () => {
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

  test("buildStudentHomeView with persistence status uses active persistence minutes as canonical", () => {
    const view = buildStudentHomeView({
      student: { id: "stu-9", full_name: "Phase 9", grade_level: "grade_3", coin_balance: 50 },
      homePayload: {
        derived: {
          monthlyMinutesIsraelMonth: 200,
          yearMonthIsrael: "2026-06",
          answersTotalAll: 0,
          bySubject: {},
        },
        accountSnapshot: { summaryPlayerLevel: 1, summaryStars: 0, bySubject: {} },
        monthlyPersistenceStatus: { activeMinutes: 150.5, yearMonthIsrael: "2026-06" },
        monthly: {},
        profile: {},
        challenges: {},
        streaks: {},
        achievements: {},
        subjectsProgressOnly: {},
      },
    });
    assert.ok(view);
    assert.equal(view.monthlyPersistence.currentMinutes, 150.5);
    assert.equal(view.meta.minutesFilterMismatch, false);
  });
});

describe("Phase 9 - product path imports", () => {
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

describe("Phase 3 - student dashboard display truth", () => {
  test("missing accuracy → noData label, not 0%", () => {
    assert.equal(formatStudentPercentHe(null, { gradedCount: 0 }), STUDENT_TRUTH_LABELS_HE.noData);
    const sub = subjectAccuracyFromDerivedSub({ correctTotal: 0, wrongTotal: 0, accuracy: null });
    assert.equal(sub.pct, null);
    assert.equal(sub.state, StudentDisplayTruthState.noData);
  });

  test("real 0 accuracy with graded answers → 0%", () => {
    const sub = subjectAccuracyFromDerivedSub({ correctTotal: 0, wrongTotal: 5, accuracy: 0 });
    assert.equal(sub.pct, 0);
    assert.equal(sub.state, StudentDisplayTruthState.realZero);
    assert.equal(formatStudentPercentHe(0, { gradedCount: 5 }), "0%");
  });

  test("buildStudentHomeView missing monthly minutes does not fabricate zero progress", () => {
    const view = buildStudentHomeView({
      student: { id: "stu-p3", full_name: "P3", coin_balance: null },
      homePayload: {
        derived: {
          monthlyMinutesIsraelMonth: null,
          yearMonthIsrael: "2026-06",
          answersTotalAll: 0,
          bySubject: { math: { answersTotal: 0, correctTotal: 0, wrongTotal: 0, accuracy: null, sessionMinutesTotal: 0 } },
        },
        accountSnapshot: {
          summaryPlayerLevel: 1,
          summaryStars: 0,
          bySubject: { math: { playerLevel: 1, stars: 0, bestScore: 0, bestStreak: 0, accountAccuracyPct: null } },
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
    assert.equal(view.accountStats.overallAccuracyPct, null);
    assert.equal(view.accountStats.overallAccuracyDisplayHe, STUDENT_TRUTH_LABELS_HE.noData);
    assert.equal(view.subjects[0].progressIndicatorPct, null);
    assert.equal(view.identity.coinBalanceState, StudentDisplayTruthState.unavailable);
    assert.ok(!view.recommendations[0].hintHe);
  });

  test("buildStudentSubjectDashboardView null accuracy uses displayHe not 0%", () => {
    const view = buildStudentSubjectDashboardView({
      subject: "math",
      studentId: "stu-p3",
      profile: { row: { subjects: { math: {} }, challenges: {} }, derived: {} },
      derived: { bySubject: { math: { correctTotal: 0, wrongTotal: 0, accuracy: null } } },
      hydrationComplete: true,
    });
    assert.equal(view.middleTiles.accuracy, null);
    assert.equal(view.middleTiles.accuracyDisplayHe, STUDENT_TRUTH_LABELS_HE.noData);
    assert.equal(view.middleTiles.challenges.dailyProgressState, StudentDisplayTruthState.noData);
  });

  test("reconciled daily progress marked estimated", () => {
    const view = buildStudentSubjectDashboardView({
      subject: "math",
      studentId: "stu-p3",
      profile: {
        row: {
          subjects: { math: {} },
          challenges: { mathDaily: { questions: 10, correct: 0, date: "2026-06-15" } },
        },
        derived: {},
      },
      derived: { bySubject: { math: { correctTotal: 10, wrongTotal: 0, accuracy: 100 } } },
      hydrationComplete: true,
    });
    assert.equal(view.dailyChallenge.reconciled, true);
    assert.equal(view.middleTiles.challenges.dailyProgressState, StudentDisplayTruthState.estimated);
  });

  test("monthly persistence load error surfaces unavailable", () => {
    const view = buildStudentHomeView({
      student: { id: "stu-p3", full_name: "P3", coin_balance: 10 },
      homePayload: {
        derived: { monthlyMinutesIsraelMonth: 5, yearMonthIsrael: "2026-06", bySubject: {}, answersTotalAll: 0 },
        accountSnapshot: { summaryPlayerLevel: 1, summaryStars: 0, bySubject: {} },
        monthlyPersistenceLoadError: true,
        monthly: {},
        profile: {},
        challenges: {},
        streaks: {},
        achievements: {},
        subjectsProgressOnly: {},
      },
    });
    assert.ok(view);
    assert.equal(view.monthlyPersistence.loadError, true);
    assert.equal(view.monthlyPersistence.currentMinutesState, StudentDisplayTruthState.unavailable);
  });

  test("localStorage progress keys documented non-authoritative in client sync", () => {
    const syncSrc = readFileSync(join(ROOT, "lib/learning-client/studentLearningProfileClient.js"), "utf8");
    assert.match(syncSrc, /syncMonthlyProgressCacheFromServer/);
    const homeSrc = readFileSync(join(ROOT, "pages/student/home.js"), "utf8");
    assert.doesNotMatch(homeSrc, /loadMonthlyProgress/);
    assert.doesNotMatch(homeSrc, /LEO_MONTHLY_PROGRESS/);
  });
});

describe("Phase 9 - getCurrentYearMonth helper", () => {
  test("getCurrentYearMonth returns YYYY-MM", () => {
    const ym = getCurrentYearMonth();
    assert.match(ym, /^\d{4}-\d{2}$/);
  });
});
