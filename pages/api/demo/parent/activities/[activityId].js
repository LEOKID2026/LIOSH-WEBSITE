import {
  buildAllDemoAssignedActivities,
  mapDemoActivityToApiRow,
} from "../../../../../lib/demo/parent-demo-data/activities-generator.js";
import { resolveDemoActivityDetailBundle } from "../../../../../lib/demo/parent-demo-data/activity-results-generator.js";
import { DEMO_PARENT_CHILDREN } from "../../../../../lib/demo/parent-demo-data/children.js";
import { todayYmdIsrael } from "../../../../../lib/demo/parent-demo-data/israel-date.server.js";
import {
  rejectDemoMethod,
  rejectNonDemoParentBearer,
} from "../../../../../lib/demo/parent-demo-api.server.js";

export default async function handler(req, res) {
  if (rejectDemoMethod(res, req.method, ["GET", "PATCH", "DELETE"])) return undefined;
  if (rejectNonDemoParentBearer(req, res)) return undefined;

  if (req.method !== "GET") {
    return res.status(403).json({
      ok: false,
      demo: true,
      error: "מצב הדגמה - צפייה בלבד.",
    });
  }

  const activityId = String(req.query?.activityId || "").trim();
  const asOf = todayYmdIsrael();

  for (const child of DEMO_PARENT_CHILDREN) {
    const def = buildAllDemoAssignedActivities(child.id).find((a) => a.activityId === activityId);
    if (!def) continue;

    const row = mapDemoActivityToApiRow(def, asOf);
    if (!row) continue;

    const bundle = await resolveDemoActivityDetailBundle(child.id, activityId, asOf);
    if (!bundle) continue;

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      activity: {
        ...row,
        studentId: child.id,
        studentStatus: bundle.studentStatus,
        answersCount: bundle.progress.answersCount,
        correctCount: bundle.progress.correctCount,
        scorePct: bundle.progress.scorePct,
      },
      attempts: bundle.attempts,
      questions: bundle.questions,
      demo: true,
    });
  }

  return res.status(404).json({ ok: false, error: "activity_not_found" });
}
