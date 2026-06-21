#!/usr/bin/env node
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const homeViewUrl = pathToFileURL(join(ROOT, "lib/learning-client/studentHomeDashboardClient.js")).href;
const { buildStudentHomeView } = await import(homeViewUrl);

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
  challenges: {
    daily: {
      date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date()),
      missions: [
        { id: "m1", textHe: "ש", type: "questions", target: 10, progress: 2, completed: false, rewardCoins: 20 },
      ],
    },
  },
  subjectsProgressOnly: {},
  analyticsPending: true,
};

const shell = buildStudentHomeView({ student, homePayload: summaryPayload });
assert.ok(shell, "shell view should build without derived/accountSnapshot");
assert.equal(shell.meta.analyticsPending, true);
assert.equal(shell.identity.coinBalance, 42);
assert.ok(shell.dailyMissions?.missions?.length === 1);

const fullPayload = {
  ...summaryPayload,
  analyticsPending: false,
  derived: {
    bySubject: {},
    answersTotalAll: 0,
    monthlyMinutesIsraelMonth: 0,
    yearMonthIsrael: "2026-06",
  },
  accountSnapshot: {
    summaryPlayerLevel: 2,
    summaryStars: 5,
    bySubject: {},
  },
};

const full = buildStudentHomeView({ student, homePayload: fullPayload });
assert.ok(full, "full view should build with derived + snapshot");
assert.equal(full.meta.analyticsPending, false);

console.log("student-home-split-selftest: OK");
