/**
 * Mass-sim subject keys — aligned with product catalog / report aggregate.
 *
 * Product uses ONE launch subject for moledet + geography:
 *   - cohort / CLI / diagnostics: moledet-geography (hyphen)
 *   - learning_sessions / activities DB: moledet_geography (underscore)
 *
 * CLI aliases `moledet`, `geography`, `moledet_geography` → moledet-geography (deduped).
 */
import { REPORT_AGG_SUBJECTS } from "../../../../lib/parent-server/report-data-aggregate.server.js";
import {
  MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID,
  MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
  normalizeMoledetGeographyActivitySubjectId,
  resolveMoledetGeographySpineSubjectForGrade,
} from "../../../../lib/learning-shared/moledet-geography-subject-id.js";
import { normalizeDiagnosticSubjectId } from "../../../../utils/diagnostic-evidence.js";
import { isMoledetGeographyGradeAllowed } from "../../../../utils/moledet-geography-curriculum-gates.js";
import { isHistoryGradeAllowed } from "../../../../utils/history-curriculum-gates.js";
import { LAUNCH_SUBJECTS } from "./constants.mjs";

export const MOLEDET_GEOGRAPHY_SUBJECT = MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID;

/** Final launch roster: LAUNCH_SUBJECTS (incl. history) + moledet-geography. */
export const ALL_LAUNCH_SUBJECTS = [...LAUNCH_SUBJECTS, MOLEDET_GEOGRAPHY_SUBJECT];

/** CLI order for final MASS 1000 launch (matches START-MASS-1000-FINAL-LAUNCH-SUBJECTS.bat). */
export const FINAL_LAUNCH_SUBJECTS_CLI =
  "math,geometry,hebrew,english,science,moledet-geography,history";

const CLI_SUBJECT_ALIASES = Object.freeze({
  moledet: MOLEDET_GEOGRAPHY_SUBJECT,
  geography: MOLEDET_GEOGRAPHY_SUBJECT,
  moledet_geography: MOLEDET_GEOGRAPHY_SUBJECT,
  "moledet-geography": MOLEDET_GEOGRAPHY_SUBJECT,
});

/**
 * @param {string[]} rawList
 * @returns {string[]}
 */
export function normalizeMassSimSubjects(rawList) {
  const out = [];
  const seen = new Set();
  for (const raw of rawList) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) continue;
    const key = CLI_SUBJECT_ALIASES[trimmed] || trimmed;
    if (!ALL_LAUNCH_SUBJECTS.includes(key)) {
      throw new Error(
        `Unknown subject "${raw}". Launch subjects: ${ALL_LAUNCH_SUBJECTS.join(", ")}. ` +
          `Aliases: moledet, geography, moledet_geography → ${MOLEDET_GEOGRAPHY_SUBJECT}`,
      );
    }
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  if (!out.length) throw new Error("At least one --subjects value is required");
  return out;
}

/** DB column value for learning_sessions.subject / parent_assigned_activities.subject */
export function resolveSessionSubject(logicalSubject) {
  if (normalizeMoledetGeographyActivitySubjectId(logicalSubject)) {
    return MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID;
  }
  return String(logicalSubject || "").trim();
}

/** V2 / taxonomy subject id (hyphen moledet-geography). */
export function resolveReportSubjectId(logicalSubject) {
  return normalizeDiagnosticSubjectId(logicalSubject);
}

/** Whether cohort may assign this subject as primary for the grade. */
export function isMassSimSubjectGradeAllowed(subject, grade) {
  const g = Number(grade) || 0;
  if (subject === MOLEDET_GEOGRAPHY_SUBJECT) {
    return isMoledetGeographyGradeAllowed(`g${g}`);
  }
  if (subject === "history") {
    return isHistoryGradeAllowed(`g${g}`);
  }
  return g >= 1 && g <= 6;
}

/** REPORT_AGG_SUBJECTS key used after session normalization. */
export function reportAggregateSubjectKey(logicalSubject) {
  return resolveSessionSubject(logicalSubject);
}

export function isSubjectInReportAggregate(logicalSubject) {
  return REPORT_AGG_SUBJECTS.includes(reportAggregateSubjectKey(logicalSubject));
}

/** Oracle spine subject for moledet-geography book catalog (g2–4 moledet, g5–6 geography). */
export function moledetGeographyCatalogSubjectForGrade(grade) {
  return resolveMoledetGeographySpineSubjectForGrade(grade);
}
