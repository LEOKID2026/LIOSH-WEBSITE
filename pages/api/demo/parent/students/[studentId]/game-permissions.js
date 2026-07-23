import { getDemoParentChildById } from "../../../../../lib/demo/parent-demo-data/children.js";
import {
  rejectDemoMethod,
  rejectNonDemoParentBearer,
  validateDemoParentStudentId,
} from "../../../../../lib/demo/parent-demo-api.server.js";

const DEMO_GAME_PERMISSIONS = Object.freeze({
  onlineEnabled: true,
  offlineEnabled: true,
  soloEnabled: true,
  educationalEnabled: true,
});

export default async function handler(req, res) {
  if (rejectDemoMethod(res, req.method, ["GET", "PUT"])) return undefined;
  if (rejectNonDemoParentBearer(req, res)) return undefined;

  if (req.method === "PUT") {
    return res.status(403).json({
      ok: false,
      demo: true,
      error: "מצב הדגמה - צפייה בלבד.",
    });
  }

  const studentId = String(req.query?.studentId || "").trim();
  if (!validateDemoParentStudentId(res, studentId)) return undefined;
  if (!getDemoParentChildById(studentId)) {
    return res.status(404).json({ ok: false, error: "Student not found for demo" });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    demo: true,
    permissions: DEMO_GAME_PERMISSIONS,
  });
}
