import { GRADES as MATH_GRADES } from "../../../utils/math-constants.js";
import { GRADES as GEOMETRY_GRADES } from "../../../utils/geometry-constants.js";
import { HEBREW_GRADE_ORDER } from "../../../data/hebrew-curriculum.js";
import { GRADES as HEBREW_CONSTANTS_GRADES } from "../../../utils/hebrew-constants.js";
import { ENGLISH_GRADE_ORDER } from "../../../data/english-curriculum.js";
import { SCIENCE_GRADE_ORDER } from "../../../data/science-curriculum.js";
import { HISTORY_GRADE_ORDER } from "../../../data/history-curriculum.js";
import { HISTORY_TEACH_GRADE_KEY } from "../../../utils/history-curriculum-gates.js";
import { MOLEDET_TEACHABLE_GRADE_ORDER } from "../../../data/moledet-curriculum.js";
import { GEOGRAPHY_SUBJECT_TEACHABLE_GRADE_ORDER } from "../../../data/geography-subject-curriculum.js";
import {
  MOLEDET_CATALOG_GRADE_KEYS,
  GEOGRAPHY_CATALOG_GRADE_KEYS,
} from "../../../lib/learning-shared/moledet-geography-display.js";
import { LEARNING_BOOK_META_LIST } from "../../../lib/learning-book/learning-book-catalog-meta.js";
import {
  REGISTERED_GRADE_KEYS,
  SUBJECT_GRADE_SOURCE_MANIFEST,
} from "./subject-grade-sources.manifest.js";

/**
 * @typedef {{ type: string, message: string, subjectKey?: string, primary?: string[], secondary?: string[] }} ConflictReport
 */

const SOURCE_RESOLVERS = {
  GRADES: (value) => Object.keys(value || {}).filter((k) => /^g[1-6]$/.test(k)),
  HEBREW_GRADE_ORDER: (value) => [...(value || [])],
  ENGLISH_GRADE_ORDER: (value) => [...(value || [])],
  SCIENCE_GRADE_ORDER: (value) => [...(value || [])],
  HISTORY_GRADE_ORDER: (value) => [...(value || [])],
  HISTORY_TEACH_GRADE_KEY: (value) => (value ? [String(value)] : []),
  MOLEDET_TEACHABLE_GRADE_ORDER: (value) => [...(value || [])],
  GEOGRAPHY_SUBJECT_TEACHABLE_GRADE_ORDER: (value) => [...(value || [])],
  MOLEDET_CATALOG_GRADE_KEYS: (value) => [...(value || [])],
  GEOGRAPHY_CATALOG_GRADE_KEYS: (value) => [...(value || [])],
  LEARNING_BOOK_META_LIST: (list, subjectKey) =>
    (list || [])
      .filter((book) => book.subject === subjectKey && book.status === "authored")
      .map((book) => book.grade)
      .filter((g) => /^g[1-6]$/.test(g)),
};

const LIVE_SOURCE_VALUES = {
  "utils/math-constants.js": { GRADES: MATH_GRADES },
  "utils/geometry-constants.js": { GRADES: GEOMETRY_GRADES },
  "data/hebrew-curriculum.js": { HEBREW_GRADE_ORDER },
  "utils/hebrew-constants.js": { GRADES: HEBREW_CONSTANTS_GRADES },
  "data/english-curriculum.js": { ENGLISH_GRADE_ORDER },
  "data/science-curriculum.js": { SCIENCE_GRADE_ORDER },
  "data/history-curriculum.js": { HISTORY_GRADE_ORDER },
  "utils/history-curriculum-gates.js": { HISTORY_TEACH_GRADE_KEY },
  "data/moledet-curriculum.js": { MOLEDET_TEACHABLE_GRADE_ORDER },
  "data/geography-subject-curriculum.js": { GEOGRAPHY_SUBJECT_TEACHABLE_GRADE_ORDER },
  "lib/learning-shared/moledet-geography-display.js": {
    MOLEDET_CATALOG_GRADE_KEYS,
    GEOGRAPHY_CATALOG_GRADE_KEYS,
  },
  "lib/learning-book/learning-book-catalog-meta.js": { LEARNING_BOOK_META_LIST },
};

/**
 * @param {string[]} grades
 */
function normalizeGradeSet(grades) {
  return [...new Set(grades.filter((g) => REGISTERED_GRADE_KEYS.includes(g)))].sort();
}

/**
 * @param {Array<{ exportName: string, module: string }>} sources
 * @param {string} subjectKey
 */
function collectGradesFromSources(sources, subjectKey) {
  const grades = [];
  const sourceNames = [];
  for (const source of sources) {
    const moduleExports = LIVE_SOURCE_VALUES[source.module];
    const raw = moduleExports?.[source.exportName];
    const resolver = SOURCE_RESOLVERS[source.exportName];
    if (!resolver) {
      return { grades: [], sourceNames, error: `Unknown export ${source.exportName}` };
    }
    const resolved =
      source.exportName === "LEARNING_BOOK_META_LIST"
        ? resolver(raw, subjectKey)
        : resolver(raw);
    if (!resolved.length) {
      return {
        grades: [],
        sourceNames,
        error: `Empty grades from ${source.module}#${source.exportName}`,
      };
    }
    grades.push(...resolved);
    sourceNames.push(`${source.module}#${source.exportName}`);
  }
  return { grades: normalizeGradeSet(grades), sourceNames, error: null };
}

/**
 * @param {string[]} a
 * @param {string[]} b
 */
function setsEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * @param {string} registeredGradeKey
 */
export function resolveSubjectGradeDefaults(registeredGradeKey) {
  /** @type {ConflictReport[]} */
  const globalConflicts = [];
  /** @type {Record<string, { isEnabledByDefault: boolean, isGradeSuitable: boolean, sources: string[], conflicts: ConflictReport[] }>} */
  const subjects = {};

  for (const entry of SUBJECT_GRADE_SOURCE_MANIFEST) {
    const primary = collectGradesFromSources(entry.primarySources, entry.subjectKey);
    const secondary = collectGradesFromSources(entry.secondarySources, entry.subjectKey);
    /** @type {ConflictReport[]} */
    const subjectConflicts = [];

    if (primary.error) {
      subjectConflicts.push({
        type: "primary_empty",
        message: primary.error,
        subjectKey: entry.subjectKey,
      });
    }
    if (!secondary.error && primary.grades.length && secondary.grades.length) {
      if (!setsEqual(primary.grades, secondary.grades)) {
        const primarySubset = primary.grades.every((g) => secondary.grades.includes(g));
        const secondarySubset = secondary.grades.every((g) => primary.grades.includes(g));
        if (!primarySubset && !secondarySubset) {
          subjectConflicts.push({
            type: "primary_secondary_mismatch",
            message: `PRIMARY and SECONDARY grade sets differ for ${entry.subjectKey}`,
            subjectKey: entry.subjectKey,
            primary: primary.grades,
            secondary: secondary.grades,
          });
        }
      }
    }

    const suitable = primary.grades.includes(registeredGradeKey);
    subjects[entry.subjectKey] = {
      isEnabledByDefault: suitable,
      isGradeSuitable: suitable,
      sources: primary.sourceNames,
      conflicts: subjectConflicts,
    };
    globalConflicts.push(...subjectConflicts);
  }

  return {
    subjects,
    hasUnresolvedConflicts: globalConflicts.length > 0,
    conflicts: globalConflicts,
  };
}

/**
 * Build full artifact: subjects catalog + g1–g6 matrix.
 */
export function buildSubjectGradeDefaultsArtifact() {
  /** @type {ConflictReport[]} */
  const allConflicts = [];
  /** @type {Record<string, Record<string, { is_grade_suitable: boolean, is_enabled_by_default: boolean }>>} */
  const matrix = {};

  for (const gradeKey of REGISTERED_GRADE_KEYS) {
    const resolved = resolveSubjectGradeDefaults(gradeKey);
    allConflicts.push(...resolved.conflicts);
    matrix[gradeKey] = {};
    for (const [subjectKey, subject] of Object.entries(resolved.subjects)) {
      matrix[gradeKey][subjectKey] = {
        is_grade_suitable: subject.isGradeSuitable,
        is_enabled_by_default: subject.isEnabledByDefault,
      };
    }
  }

  const subjects = SUBJECT_GRADE_SOURCE_MANIFEST.map((entry) => ({
    subject_key: entry.subjectKey,
    display_name_he: entry.displayNameHe,
    sort_order: entry.sortOrder,
    is_active: true,
  }));

  const uniqueConflicts = allConflicts.filter(
    (c, idx, arr) =>
      arr.findIndex(
        (x) => x.type === c.type && x.subjectKey === c.subjectKey && x.message === c.message
      ) === idx
  );

  return {
    generatedAt: new Date().toISOString(),
    subjects,
    matrix,
    hasUnresolvedConflicts: uniqueConflicts.length > 0,
    conflicts: uniqueConflicts,
  };
}

/**
 * Pure nearest-grade algorithm (mirrors §4.2.1 server logic for tests).
 * @param {string} registeredGradeKey
 * @param {string[]} availableGrades
 */
export function resolveEffectiveContentGradePure(registeredGradeKey, availableGrades) {
  const sorted = normalizeGradeSet(availableGrades);
  if (!sorted.length) {
    throw new Error("SUBJECT_CONTENT_CATALOG_INCOMPLETE");
  }
  if (sorted.includes(registeredGradeKey)) return registeredGradeKey;

  const registeredNum = Number(String(registeredGradeKey).replace("g", ""));
  let best = sorted[0];
  let bestDist = Math.abs(Number(best.replace("g", "")) - registeredNum);
  for (const grade of sorted) {
    const dist = Math.abs(Number(grade.replace("g", "")) - registeredNum);
    if (dist < bestDist || (dist === bestDist && grade < best)) {
      best = grade;
      bestDist = dist;
    }
  }
  return best;
}
