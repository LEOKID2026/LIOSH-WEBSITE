/**
 * School-portal demo/sim scripts — shared production guard bootstrap.
 */
import {
  createProductionScriptGuard,
  exitOnGuardError,
} from "../../lib/production-script-guard.mjs";

export const SCHOOL_SIM_TABLES = [
  "classroom_activities",
  "classroom_activity_attempts",
  "classroom_activity_student_status",
  "teacher_class_students",
  "school_accounts",
  "school_student_enrollments",
  "school_student_profiles",
  "students",
  "teacher_profiles",
  "parent_profiles",
];

export function bootstrapSchoolDbWriteGuard(
  scriptName,
  confirmOperation,
  argv = process.argv.slice(2),
  { defaultDryRun = true } = {}
) {
  const guard = createProductionScriptGuard({
    scriptName,
    confirmOperation,
    affectedTables: SCHOOL_SIM_TABLES,
    defaultDryRun,
    argv,
  });
  guard.printStartBanner();
  try {
    guard.assertWriteAllowed();
  } catch (err) {
    exitOnGuardError(err);
  }
  return guard;
}
