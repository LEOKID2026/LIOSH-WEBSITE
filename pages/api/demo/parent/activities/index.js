import { DEMO_DASHBOARD_RECENT_ACTIVITIES_LIMIT } from "../../../../../lib/demo/parent-demo-data/constants.js";
import { listDemoActivitiesForChild } from "../../../../../lib/demo/parent-demo-data/activities-generator.js";
import { todayYmdIsrael } from "../../../../../lib/demo/parent-demo-data/israel-date.server.js";
import {
  rejectDemoMethod,
  rejectNonDemoParentBearer,
  validateDemoParentStudentId,
} from "../../../../../lib/demo/parent-demo-api.server.js";

export default async function handler(req, res) {
  if (rejectDemoMethod(res, req.method, ["GET"])) return undefined;
  if (rejectNonDemoParentBearer(req, res)) return undefined;

  const studentId = String(req.query?.studentId || "").trim();
  if (!studentId) {
    return res.status(400).json({ ok: false, error: "studentId is required" });
  }
  if (!validateDemoParentStudentId(res, studentId)) return undefined;

  const fromYmd = typeof req.query?.from === "string" ? req.query.from.slice(0, 10) : undefined;
  const toYmd = typeof req.query?.to === "string" ? req.query.to.slice(0, 10) : undefined;
  const recentOnly = req.query?.recent === "1" || req.query?.recent === "true";
  const limit = recentOnly ? DEMO_DASHBOARD_RECENT_ACTIVITIES_LIMIT : null;

  const activities = listDemoActivitiesForChild(studentId, {
    fromYmd,
    toYmd,
    asOfYmd: todayYmdIsrael(),
    limit,
  }).map((row) => ({ ...row, studentId }));

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true, activities, demo: true });
}
