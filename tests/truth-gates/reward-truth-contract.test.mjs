/**
 * Reward / time truth contract — coins, inflated duration, dashboard source.
 * Run: node --test tests/truth-gates/reward-truth-contract.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fairnessTopicCreditSeconds,
  legacyTopicCreditSeconds,
  topicCreditSecondsFromQuestionClose,
  capSessionCreditedMs,
} from "../../utils/learning-time-credit/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

test("duration with zero answers - legacy path credits zero seconds at 300s+", () => {
  assert.equal(legacyTopicCreditSeconds(300), 0);
  assert.equal(legacyTopicCreditSeconds(600), 0);
});

test("inflated duration - fairness caps per question; session cap 3h", () => {
  assert.equal(fairnessTopicCreditSeconds(600_000), 600);
  assert.equal(capSessionCreditedMs(4 * 60 * 60 * 1000), 3 * 60 * 60 * 1000);
});

test("partial / unanswered - legacy credits zero at 300s+; fairness credits only positive ms", () => {
  assert.equal(topicCreditSecondsFromQuestionClose(0, true, 0), 0);
  assert.equal(topicCreditSecondsFromQuestionClose(120_000, true, 0), 120);
  assert.equal(topicCreditSecondsFromQuestionClose(120_000, false, 360), 0);
});

test("learning-coin-award skips zero-duration / zero-coin sessions", () => {
  const awardSrc = readFileSync(
    join(ROOT, "lib/learning-supabase/learning-coin-award.server.js"),
    "utf8"
  );
  const economySrc = readFileSync(
    join(ROOT, "lib/rewards/server/economy-config.server.js"),
    "utf8"
  );
  assert.match(economySrc, /durationSeconds <= 0\) return 0/);
  assert.match(awardSrc, /calculateSessionCoinsFromSettings/);
  assert.match(awardSrc, /requireSessionCoinSettings/);
  assert.match(awardSrc, /zero_coins_calculated/);
  assert.match(awardSrc, /Idempotency key|coin_session_/i);
});

test("session finish invokes coin award helper once per request path", () => {
  const finishSrc = readFileSync(
    join(ROOT, "pages/api/learning/session/finish.js"),
    "utf8"
  );
  assert.match(finishSrc, /awardLearningSessionCoins/);
  assert.match(finishSrc, /status: "completed"/);
});

test("dashboard minutes use server derived profile not raw localStorage keys", () => {
  const homeClient = readFileSync(
    join(ROOT, "lib/learning-client/studentHomeDashboardClient.js"),
    "utf8"
  );
  assert.match(homeClient, /derived\.monthlyMinutesIsraelMonth|homePayload\.derived/i);
  assert.doesNotMatch(homeClient, /localStorage\.getItem\("mleo_time_tracking"\)/);
});
