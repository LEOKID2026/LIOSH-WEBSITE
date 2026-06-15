#!/usr/bin/env node
/** PARENT_ACTIVITY_PASS — live parent create → student submit → report API/UI/PDF truth. */
import { passGate, failGate, skipGate } from "../lib/gate-result.mjs";
import {
  assertActivityIncludedInReport,
  assertParentReportUiAndPdf,
  buildLiveActivityScenario,
} from "../lib/live-parent-activity-flow.mjs";

try {
  const scenario = await buildLiveActivityScenario({
    title: `[Phase9 live parent activity] ${new Date().toISOString()}`,
    subject: "math",
    topic: "phase9-live-parent-activity",
    questionCount: 3,
    answerCount: 2,
  });
  assertActivityIncludedInReport(scenario);
  const surface = await assertParentReportUiAndPdf(scenario);
  passGate(
    "PARENT_ACTIVITY_PASS",
    "live parent activity attempts reached report-data, parent report UI, and real PDF without separate parent-activity label",
    {
      layer: "live-e2e",
      usesLiveDb: true,
      usesLiveApi: true,
      usesLiveUi: true,
      usesRealPdfBytes: true,
      details: {
        live: true,
        baseUrl: scenario.origin,
        studentId: scenario.student.id,
        activityId: scenario.created.activityId,
        notStartedActivityId: scenario.notStarted.activityId,
        answeredAttempts: scenario.activityRun.answerCount,
        pdfBytes: surface.pdfBytes,
        pdfParseMethod: surface.pdfParseMethod,
      },
    }
  );
} catch (err) {
  const message = err?.message || String(err);
  if (/missing|could not resolve|auth failed|login failed/i.test(message)) {
    skipGate("PARENT_ACTIVITY_PASS", `live prerequisites missing: ${message}`, {
      layer: "live-e2e",
      details: { live: true, configBlocked: true },
    });
  }
  failGate("PARENT_ACTIVITY_PASS", message, {
    layer: "live-e2e",
    details: { live: true, stack: err?.stack ? String(err.stack).slice(0, 2000) : null },
  });
}
