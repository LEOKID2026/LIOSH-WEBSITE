import {
  parseIsoDateParam,
  safeString,
} from "../../../../../../lib/parent-server/report-data-aggregate.server.js";
import { buildDemoParentReportPayload } from "../../../../../../lib/demo/parent-demo-data/report-payload-builder.server.js";
import { enforceDemoPayloadHebrewOnly } from "../../../../../../lib/demo/parent-demo-data/assert-hebrew-only.server.js";
import { DEMO_HISTORY_START } from "../../../../../../lib/demo/parent-demo-data/constants.js";
import { todayYmdIsrael } from "../../../../../../lib/demo/parent-demo-data/israel-date.server.js";
import {
  rejectDemoMethod,
  rejectNonDemoParentBearer,
  validateDemoParentStudentId,
} from "../../../../../../lib/demo/parent-demo-api.server.js";

function buildDefaultRange() {
  return { from: DEMO_HISTORY_START, to: todayYmdIsrael() };
}

export default async function handler(req, res) {
  if (rejectDemoMethod(res, req.method, ["GET"])) return undefined;
  if (rejectNonDemoParentBearer(req, res)) return undefined;

  const studentId = safeString(req.query?.studentId, 64);
  if (!studentId) {
    return res.status(400).json({ ok: false, error: "studentId is required" });
  }
  if (!validateDemoParentStudentId(res, studentId)) return undefined;

  const defaults = buildDefaultRange();
  const fromRaw = safeString(req.query?.from, 10);
  const toRaw = safeString(req.query?.to, 10);
  const fromDate = fromRaw ? parseIsoDateParam(fromRaw) : parseIsoDateParam(defaults.from);
  const toDate = toRaw ? parseIsoDateParam(toRaw) : parseIsoDateParam(defaults.to);
  if (!fromDate || !toDate) {
    return res.status(400).json({ ok: false, error: "Invalid date params, expected YYYY-MM-DD" });
  }
  if (fromDate.getTime() > toDate.getTime()) {
    return res.status(400).json({ ok: false, error: "from must be <= to" });
  }

  const fromYmd = fromDate.toISOString().slice(0, 10);
  const toYmd = toDate.toISOString().slice(0, 10);
  const built = buildDemoParentReportPayload(studentId, fromYmd, toYmd);
  if (!built.ok) {
    return res.status(built.status || 500).json({ ok: false, error: built.error || "internal_error" });
  }

  const payload = enforceDemoPayloadHebrewOnly(built.payload);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(payload);
}
