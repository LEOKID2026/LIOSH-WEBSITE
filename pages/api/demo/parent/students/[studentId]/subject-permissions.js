import { DEMO_PARENT_SUBJECTS } from "../../../../../../lib/demo/parent-demo-data/constants.js";
import { getSubjectPermissionLabelHe } from "../../../../../../lib/learning/subject-permissions/subject-permission-labels.he.js";
import { normalizeGradeLevelToKey } from "../../../../../../lib/learning-student-defaults.js";
import { getDemoParentChildById } from "../../../../../../lib/demo/parent-demo-data/children.js";
import {
  rejectDemoMethod,
  rejectNonDemoParentBearer,
  validateDemoParentStudentId,
} from "../../../../../../lib/demo/parent-demo-api.server.js";

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

  const child = getDemoParentChildById(studentId);
  const gradeKey = normalizeGradeLevelToKey(child?.grade_level) || "g2";

  const subjectPermissions = Object.fromEntries(
    DEMO_PARENT_SUBJECTS.map((subjectKey) => [
      subjectKey,
      {
        isEnabled: true,
        isGradeSuitable: true,
        effectiveGrade: gradeKey,
      },
    ]),
  );

  const subjects = DEMO_PARENT_SUBJECTS.map((subjectKey) => ({
    subjectKey,
    labelHe: getSubjectPermissionLabelHe(subjectKey),
    isEnabled: true,
    isGradeSuitable: true,
    effectiveGrade: gradeKey,
  }));

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    demo: true,
    allowStudentGradePicker: true,
    subjectPermissions,
    subjects,
  });
}
