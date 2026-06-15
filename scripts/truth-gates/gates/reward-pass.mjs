#!/usr/bin/env node
/** REWARD_PASS — live parent activity completion reward/idempotency truth. */
import { passGate, failGate, skipGate } from "../lib/gate-result.mjs";
import {
  assertDashboardUpdated,
  buildLiveActivityScenario,
  getCoinTxCount,
} from "../lib/live-parent-activity-flow.mjs";

try {
  if (process.env.ENABLE_SESSION_COIN_AWARDS !== "true") {
    skipGate("REWARD_PASS", "CONFIG_BLOCKED: ENABLE_SESSION_COIN_AWARDS is not true", {
      layer: "live-reward",
      details: { live: true, configBlocked: true },
    });
  }

  const scenario = await buildLiveActivityScenario({
    title: `[Phase9 live reward] ${new Date().toISOString()}`,
    subject: "math",
    topic: "phase9-live-reward",
    questionCount: 3,
    answerCount: 2,
  });

  assertDashboardUpdated(scenario);
  const finalCoinTxCount = await getCoinTxCount(scenario.supabase, scenario.student.id, scenario.coinKey);
  if (scenario.beforeCoinTxCount !== 0) {
    failGate("REWARD_PASS", `unexpected existing reward tx for fresh activity: ${scenario.coinKey}`, {
      layer: "live-reward",
      details: { live: true, activityId: scenario.created.activityId },
    });
  }
  if (scenario.afterCoinTxCount !== 1 || finalCoinTxCount !== 1) {
    failGate("REWARD_PASS", `expected exactly one coin tx after submit/retry, got ${scenario.afterCoinTxCount}/${finalCoinTxCount}`, {
      layer: "live-reward",
      details: { live: true, activityId: scenario.created.activityId, coinKey: scenario.coinKey },
    });
  }
  if (scenario.afterCoins == null || scenario.baselineCoins == null) {
    failGate("REWARD_PASS", "coin balance table unavailable for live reward assertion", {
      layer: "live-reward",
      details: { live: true, activityId: scenario.created.activityId },
    });
  }
  if (Number(scenario.afterCoins) <= Number(scenario.baselineCoins)) {
    failGate("REWARD_PASS", `coin balance did not increase (${scenario.baselineCoins} → ${scenario.afterCoins})`, {
      layer: "live-reward",
      details: { live: true, activityId: scenario.created.activityId, coinKey: scenario.coinKey },
    });
  }

  passGate("REWARD_PASS", "live parent activity awarded coins once and updated server-derived progress/minutes", {
    layer: "live-reward",
    usesLiveDb: true,
    usesLiveApi: true,
    details: {
      live: true,
      baseUrl: scenario.origin,
      studentId: scenario.student.id,
      activityId: scenario.created.activityId,
      coinKey: scenario.coinKey,
      baselineCoins: scenario.baselineCoins,
      afterCoins: scenario.afterCoins,
      coinTxCount: finalCoinTxCount,
      answeredAttempts: scenario.activityRun.answerCount,
    },
  });
} catch (err) {
  const message = err?.message || String(err);
  if (/missing|could not resolve|auth failed|login failed/i.test(message)) {
    skipGate("REWARD_PASS", `live prerequisites missing: ${message}`, {
      layer: "live-reward",
      details: { live: true, configBlocked: true },
    });
  }
  failGate("REWARD_PASS", message, { layer: "live-reward", details: { live: true } });
}
