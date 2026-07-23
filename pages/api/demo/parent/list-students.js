import {
  DEFAULT_PARENT_DEMO_STUDENT_LIMIT,
} from "../../../../lib/demo/parent-demo-data/constants.js";
import { buildDemoParentListStudentsResponse } from "../../../../lib/demo/parent-demo-data/children.js";
import {
  rejectDemoMethod,
  rejectNonDemoParentBearer,
} from "../../../../lib/demo/parent-demo-api.server.js";

export default async function handler(req, res) {
  if (rejectDemoMethod(res, req.method, ["GET"])) return undefined;
  if (rejectNonDemoParentBearer(req, res)) return undefined;

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    students: buildDemoParentListStudentsResponse(),
    studentLimit: DEFAULT_PARENT_DEMO_STUDENT_LIMIT,
    defaultStudentLimit: DEFAULT_PARENT_DEMO_STUDENT_LIMIT,
    demo: true,
  });
}
