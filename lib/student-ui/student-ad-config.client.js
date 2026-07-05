/**
 * Client entry for student ad ENV config (inlined at build time via Next.js).
 */
export {
  STUDENT_AD_ENV,
  STUDENT_AD_POLICY,
  STUDENT_AD_FORBIDDEN_PROP_KEYS,
  resolveStudentAdRenderModeFromEnv,
} from "./student-ad-config.js";

import { resolveStudentAdRenderModeFromEnv } from "./student-ad-config.js";

/** @returns {import("./student-ad-config.js").StudentAdRenderMode} */
export function resolveStudentAdRenderMode() {
  return resolveStudentAdRenderModeFromEnv(process.env);
}
