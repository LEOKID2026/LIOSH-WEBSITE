/**
 * Re-export: opt-in with NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY=true
 * (see student-identity-debug-flag.js)
 */

import { isStudentIdentityDebugEnabled } from "./student-identity-debug-flag.js";

export function isStudentIdentityDiagnosticsEnabled() {
  return isStudentIdentityDebugEnabled();
}
