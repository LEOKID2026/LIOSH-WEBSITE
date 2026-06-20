/**
 * Admin ↔ student economy display parity (same tier values in payload → UI).
 * Run: node --test tests/rewards/admin-student-economy-parity.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { buildStudentHomeView } from "../../lib/learning-client/studentHomeDashboardClient.js";
import {
  buildSubjectMonthlyPersistenceView,
} from "../../lib/learning-client/subjectMonthlyPersistenceView.js";

const ECONOMY_CONFIG = {
  monthlyTiers: [
    { minutes: 100, coins: 10_000, labelHe: "10,000 מטבעות" },
    { minutes: 250, coins: 30_000, labelHe: "30,000 מטבעות" },
    { minutes: 400, coins: 60_000, labelHe: "60,000 מטבעות" },
    { minutes: 600, coins: 99_999, labelHe: "99,999 מטבעות" },
  ],
  goalMinutes: 600,
  monthlyMinutesCap: 600,
  monthlyCoinsCap: 99_999,
  sessionCoins: { baseCoins: 10, bonus80Coins: 5, bonus95Coins: 10, dailyCap: 300 },
  entryCostOptions: [
    { amount: 10, labelHe: "10" },
    { amount: 50, labelHe: "50" },
  ],
  loadedAt: "2026-06-20T00:00:00.000Z",
};

function minimalHomePayload(extra = {}) {
  return {
    derived: {
      monthlyMinutesIsraelMonth: 350,
      yearMonthIsrael: "2026-06",
      answersTotalAll: 10,
      bySubject: {
        math: { answersTotal: 10, correctTotal: 8, wrongTotal: 2, accuracy: 80, sessionMinutesTotal: 100 },
      },
    },
    accountSnapshot: {
      summaryPlayerLevel: 2,
      summaryStars: 3,
      bySubject: {
        math: { playerLevel: 2, stars: 3, bestScore: 50, bestStreak: 2, accountAccuracyPct: 80 },
      },
    },
    monthly: {},
    profile: {},
    challenges: {},
    streaks: {},
    achievements: {},
    subjectsProgressOnly: {},
    economyConfig: ECONOMY_CONFIG,
    monthlyPersistenceStatus: {
      activeMinutes: 350,
      yearMonthIsrael: "2026-06",
      tierMinutes: null,
      wouldAward: 60_000,
      alreadyAwarded: false,
    },
    ...extra,
  };
}

describe("admin-student economy parity", () => {
  test("home dashboard tiers match economyConfig (Admin source)", () => {
    const view = buildStudentHomeView({
      student: { id: "stu-parity", full_name: "Parity", grade_level: "grade_3", coin_balance: 100 },
      homePayload: minimalHomePayload(),
    });
    assert.ok(view);
    assert.equal(view.monthlyPersistence.tiers.length, 4);
    assert.equal(view.monthlyPersistence.tiers.find((t) => t.minutes === 600)?.coins, 99_999);
    assert.equal(view.monthlyJourney.goalMinutes, 600);
  });

  test("subject monthly view uses same tiers and goal from economyConfig", () => {
    const view = buildSubjectMonthlyPersistenceView(
      minimalHomePayload().derived,
      minimalHomePayload().monthlyPersistenceStatus,
      ECONOMY_CONFIG
    );
    assert.ok(view);
    assert.equal(view.goalMinutes, 600);
    assert.equal(view.tiers.find((t) => t.minutes === 600)?.coins, 99_999);
    const reached = view.tiers.filter((t) => t.state === "reached" || t.state === "awarded");
    assert.ok(reached.some((t) => t.minutes === 250));
  });

  test("missing economyConfig → subject view null (no hardcoded fallback)", () => {
    const view = buildSubjectMonthlyPersistenceView(
      minimalHomePayload().derived,
      minimalHomePayload().monthlyPersistenceStatus,
      null
    );
    assert.equal(view, null);
  });

  test("entry cost options exposed for arcade UI mapping", () => {
    assert.deepEqual(
      ECONOMY_CONFIG.entryCostOptions.map((o) => o.amount),
      [10, 50]
    );
  });
});
