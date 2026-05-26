/**
 * Detect teacher-portal smoke / E2E artifacts so they can be hidden from dashboards
 * or removed by an explicit cleanup script (owner-approved execute only).
 *
 * Rules are intentionally strict: only explicit smoke naming from portal scripts,
 * never generic substrings that could match normal Hebrew/English class names.
 */

/** Canonical QA class for teacher@leo.com dashboard (automation keeps duplicates in DB). */
export const CANONICAL_LEO_QA_CLASS_ID = "f4962b3c-ff1e-4705-ad87-4493ebf50352";

/** Display name of the real QA class — duplicates with this name but another id are hidden. */
export const LEO_QA_CLASS_DISPLAY_NAME = "כיתה ג׳ - LEO";

/** Class names created by teacher-portal smoke scripts (exact). */
export const SMOKE_CLASS_NAME_EXACT = new Set([
  "Phase5A Smoke Class",
  "Phase5A Renamed",
  "Phase7B Smoke Class",
  "Phase7 Smoke Class",
]);

/** @param {string|null|undefined} name */
export function isSmokeClassName(name) {
  const n = String(name || "").trim();
  if (!n) return false;
  if (SMOKE_CLASS_NAME_EXACT.has(n)) return true;
  if (/^Indiv Smoke Class\b/i.test(n)) return true;
  if (/^quota-smoke-/i.test(n)) return true;
  if (/^Phase5A Extra \d+$/i.test(n)) return true;
  if (/^Extra \d+$/i.test(n)) return true;
  if (/^Phase\d/i.test(n) && /\bSmoke\b/i.test(n)) return true;
  if (/\bIDOR\b/i.test(n) && /\bClass\b/i.test(n)) return true;
  return false;
}

/** Playwright / teacher-classroom-sim bootstrap class (not a product classroom). */
export function isSimulationBootstrapClassName(name) {
  const n = String(name || "").trim();
  if (!n) return false;
  return /^כיתת סימולציה\s*-/u.test(n);
}

/**
 * Classes kept in DB for QA/automation but hidden from the normal teacher dashboard.
 * @param {{ classId?: string, name?: string|null }} row
 */
export function isTeacherDashboardHiddenClass(row) {
  const name = row?.name;
  const classId = row?.classId;
  if (isSmokeClassName(name)) return true;
  if (isSimulationBootstrapClassName(name)) return true;
  const trimmed = String(name || "").trim();
  if (trimmed === LEO_QA_CLASS_DISPLAY_NAME && classId && classId !== CANONICAL_LEO_QA_CLASS_ID) {
    return true;
  }
  return false;
}

/** @param {string|null|undefined} name */
export function isSmokeStudentName(name) {
  const n = String(name || "").trim();
  if (!n) return false;
  if (/^Quota Smoke\b/i.test(n)) return true;
  if (/^Individual Smoke\b/i.test(n)) return true;
  if (/^Individual IDOR\b/i.test(n)) return true;
  if (/\bIDOR\b/i.test(n)) return true;
  if (/^Phase\d/i.test(n) && /\bSmoke\b/i.test(n)) return true;
  return false;
}

/**
 * @param {{ classId: string, name?: string|null }[]} classes
 * @param {Array<Record<string, unknown>>} students
 */
export function partitionSmokeDashboardRows(classes, students) {
  const hiddenClassIds = new Set();
  const visibleClasses = [];
  for (const c of classes || []) {
    if (isTeacherDashboardHiddenClass(c)) {
      hiddenClassIds.add(c.classId);
    } else {
      visibleClasses.push(c);
    }
  }
  const visibleStudents = (students || [])
    .filter((s) => !isSmokeStudentName(s.studentFullName))
    .map((s) => {
      const classIds = (s.classIds || []).filter((id) => !hiddenClassIds.has(id));
      return {
        ...s,
        classIds,
        isInAnyClass: classIds.length > 0,
      };
    });
  return { visibleClasses, visibleStudents, smokeClassIds: hiddenClassIds };
}
