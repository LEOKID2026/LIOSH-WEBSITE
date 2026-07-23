import { DEMO_PARENT_BEARER_TOKEN } from "./parent-demo-data/constants.js";
import { isDemoParentChildId } from "./parent-demo-data/demo-child-allowlist.server.js";

/**
 * @param {string} authHeader
 */
export function isDemoParentBearerRequest(authHeader) {
  const token = String(authHeader || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  return token === DEMO_PARENT_BEARER_TOKEN;
}

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export function rejectNonDemoParentBearer(req, res) {
  const authHeader = req.headers.authorization || "";
  if (!isDemoParentBearerRequest(authHeader)) {
    res.status(401).json({ ok: false, error: "Demo authorization required" });
    return true;
  }
  return false;
}

/**
 * @param {import('next').NextApiResponse} res
 * @param {string} studentId
 */
export function validateDemoParentStudentId(res, studentId) {
  if (!isDemoParentChildId(studentId)) {
    res.status(404).json({ ok: false, error: "Student not found for demo" });
    return false;
  }
  return true;
}

/**
 * @param {import('next').NextApiResponse} res
 * @param {string} method
 * @param {string[]} allowed
 */
export function rejectDemoMethod(res, method, allowed) {
  if (!allowed.includes(method)) {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return true;
  }
  return false;
}
