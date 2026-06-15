/**
 * Teacher-portal simulation/seed scripts — shared production guard bootstrap.
 */
import {
  createProductionScriptGuard,
  exitOnGuardError,
} from "../../lib/production-script-guard.mjs";

export const TEACHER_SIM_TABLES = [
  "classroom_activities",
  "classroom_activity_attempts",
  "teacher_parent_messages",
  "teacher_classes",
  "teacher_class_students",
  "students",
];

export function bootstrapTeacherDbWriteGuard(
  scriptName,
  confirmOperation,
  argv = process.argv.slice(2),
  { defaultDryRun = true } = {}
) {
  const guard = createProductionScriptGuard({
    scriptName,
    confirmOperation,
    affectedTables: TEACHER_SIM_TABLES,
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
