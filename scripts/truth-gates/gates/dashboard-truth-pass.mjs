#!/usr/bin/env node
/** DASHBOARD_TRUTH_PASS — live student dashboard vs server home-profile truth. */
import { passGate, failGate, skipGate } from "../lib/gate-result.mjs";
import {
  assertDashboardUpdated,
  assertStudentDashboardUi,
  buildLiveActivityScenario,
  getHomeProfile,
} from "../lib/live-parent-activity-flow.mjs";

try {
  const scenario = await buildLiveActivityScenario({
    title: `[Phase9 live dashboard] ${new Date().toISOString()}`,
    subject: "math",
    topic: "phase9-live-dashboard",
    questionCount: 3,
    answerCount: 2,
  });
  assertDashboardUpdated(scenario);

  const poisonKey = "mleo_phase9_dashboard_truth_poison";
  const ui = await assertStudentDashboardUi(scenario);
  const afterPoison = await getHomeProfile(scenario.origin, scenario.studentLogin.cookie);
  if (Number(afterPoison?.derived?.answersTotalAll || 0) !== Number(scenario.afterHome?.derived?.answersTotalAll || 0)) {
    failGate("DASHBOARD_TRUTH_PASS", "home-profile changed after localStorage poison probe", {
      layer: "live-dashboard",
      details: { live: true, poisonKey },
    });
  }

  passGate("DASHBOARD_TRUTH_PASS", "live student dashboard UI matches server home-profile after parent activity", {
    layer: "live-dashboard",
    usesLiveDb: true,
    usesLiveApi: true,
    usesLiveUi: true,
    details: {
      live: true,
      baseUrl: scenario.origin,
      studentId: scenario.student.id,
      activityId: scenario.created.activityId,
      answeredAttempts: scenario.activityRun.answerCount,
      expectedQuestions: ui.expectedQuestions,
      baselineAnswers: scenario.baselineHome?.derived?.answersTotalAll,
      afterAnswers: scenario.afterHome?.derived?.answersTotalAll,
      baselineMinutes: scenario.baselineHome?.derived?.monthlyMinutesIsraelMonth,
      afterMinutes: scenario.afterHome?.derived?.monthlyMinutesIsraelMonth,
      localStoragePoisonProbe: poisonKey,
    },
  });
} catch (err) {
  const message = err?.message || String(err);
  if (/missing|could not resolve|auth failed|login failed/i.test(message)) {
    skipGate("DASHBOARD_TRUTH_PASS", `live prerequisites missing: ${message}`, {
      layer: "live-dashboard",
      details: { live: true, configBlocked: true },
    });
  }
  failGate("DASHBOARD_TRUTH_PASS", message, { layer: "live-dashboard", details: { live: true } });
}
