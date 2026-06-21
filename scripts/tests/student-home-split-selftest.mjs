#!/usr/bin/env node
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const homeViewUrl = pathToFileURL(join(ROOT, "lib/learning-client/studentHomeDashboardClient.js")).href;
const cacheUrl = pathToFileURL(join(ROOT, "lib/learning-client/studentHomeProfileClient.js")).href;
const { buildStudentHomeView } = await import(homeViewUrl);
const { mergeStudentHomePayloads } = await import(cacheUrl);

const student = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Test",
  grade_level: "grade_3",
  coin_balance: 42,
};

const summaryPayload = {
  ok: true,
  phase: "summary",
  studentId: student.id,
  profile: { avatarEmoji: "🦁" },
  accountSnapshot: {
    summaryPlayerLevel: 3,
    summaryStars: 12,
    achievementsNames: ["Strong Start"],
    bySubject: {
      math: { playerLevel: 3, stars: 12, xp: 0, bestScore: 100, bestStreak: 5, accountAccuracyPct: null },
    },
  },
  challenges: {
    daily: {
      date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date()),
      missions: [
        { id: "m1", textHe: "ש", type: "questions", target: 10, progress: 2, completed: false, rewardCoins: 20 },
      ],
    },
  },
  subjectsProgressOnly: {},
  derivedPending: true,
  analyticsPending: false,
};

const shell = buildStudentHomeView({ student, homePayload: summaryPayload });
assert.ok(shell, "summary view should build with accountSnapshot only");
assert.equal(shell.meta.derivedPending, true);
assert.equal(shell.meta.analyticsPending, true);
assert.equal(shell.identity.coinBalance, 42);
assert.equal(shell.accountStats.summaryLevel, 3);
assert.ok(shell.dailyMissions?.missions?.length === 1);
assert.equal(shell.badges.length, 1);

const analyticsPayload = {
  ok: true,
  derived: {
    bySubject: { math: { answersTotal: 10, correctTotal: 8, wrongTotal: 2, sessionMinutesTotal: 5 } },
    answersTotalAll: 10,
    monthlyMinutesIsraelMonth: 15,
    yearMonthIsrael: "2026-06",
  },
  accountSnapshot: summaryPayload.accountSnapshot,
  derivedPending: false,
};

const merged = mergeStudentHomePayloads(summaryPayload, analyticsPayload);
const full = buildStudentHomeView({ student, homePayload: merged });
assert.ok(full, "merged view should build");
assert.equal(full.meta.derivedPending, false);
assert.equal(full.accountStats.questionsAnswered, 10);

console.log("student-home-split-selftest: OK");
