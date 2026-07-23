import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import { runParentCopilotTurnAsync } from "../../../../utils/parent-copilot/index.js";
import { stripParentCopilotResponseForClient } from "../../../../lib/parent-copilot/strip-copilot-client-response.server.js";
import { buildDemoParentCopilotPayload } from "../../../../lib/demo/parent-demo-data/report-payload-builder.server.js";
import { DEMO_HISTORY_START } from "../../../../lib/demo/parent-demo-data/constants.js";
import { todayYmdIsrael } from "../../../../lib/demo/parent-demo-data/israel-date.server.js";
import {
  rejectDemoMethod,
  rejectNonDemoParentBearer,
  validateDemoParentStudentId,
} from "../../../../lib/demo/parent-demo-api.server.js";
import {
  rejectIfCopilotIpRateLimited,
  rejectIfCopilotAuthRateLimited,
} from "../../../../lib/security/public-api-rate-limit.js";
import { MAX_COPILOT_UTTERANCE_LEN, clampTrimmedString } from "../../../../lib/security/api-input.server.js";

export default async function handler(req, res) {
  if (rejectDemoMethod(res, req.method, ["POST"])) return undefined;
  if (rejectNonDemoParentBearer(req, res)) return undefined;
  if (rejectIfCopilotIpRateLimited(req, res)) return undefined;
  if (rejectIfCopilotAuthRateLimited(req, res, "demo-parent")) return undefined;

  const body = readJsonBody(req) || {};
  const studentId = String(body.studentId || "").trim();
  if (!validateDemoParentStudentId(res, studentId)) return undefined;

  const utterance = clampTrimmedString(body.utterance, MAX_COPILOT_UTTERANCE_LEN);
  if (!utterance) {
    return res.status(400).json({ ok: false, error: "utterance is required" });
  }

  const from = String(body.from || body.range?.from || DEMO_HISTORY_START).slice(0, 10);
  const to = String(body.to || body.range?.to || todayYmdIsrael()).slice(0, 10);

  const built = buildDemoParentCopilotPayload(studentId, from, to);
  if (!built.ok || !built.payload) {
    return res.status(500).json({ ok: false, error: "Could not build demo report for copilot" });
  }

  try {
    const result = await runParentCopilotTurnAsync({
      utterance,
      payload: built.payload,
      studentId,
      sessionId: String(body.sessionId || `demo-parent-${studentId}`),
      forceDeterministic: true,
    });

    const clientResult = stripParentCopilotResponseForClient(result);
    return res.status(200).json({ ok: true, result: clientResult, demo: true });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: String(err?.message || "copilot_failed"),
    });
  }
}
