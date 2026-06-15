/**
 * QA seed/simulation scripts — shared production guard bootstrap.
 */
import {
  createProductionScriptGuard,
  exitOnGuardError,
} from "../../lib/production-script-guard.mjs";

export const QA_PARENT_REPORT_TABLES = [
  "answers",
  "answer_payload",
  "learning_sessions",
  "parent_activity_attempts",
  "parent_activity_status",
  "parent_assigned_activities",
  "book_page_visits",
  "book_reading_sessions",
  "student_learning_state",
];

export function bootstrapQaDbWriteGuard(scriptName, confirmOperation, argv = process.argv.slice(2)) {
  const guard = createProductionScriptGuard({
    scriptName,
    confirmOperation,
    affectedTables: QA_PARENT_REPORT_TABLES,
    defaultDryRun: true,
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
