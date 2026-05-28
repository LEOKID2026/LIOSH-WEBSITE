/**
 * Fail-fast guards before school-sim phases that require full demo state.
 */
import { TEACHER_EMAILS } from "./school-sim-config.mjs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertValidStudentId(studentId, context) {
  const id = String(studentId ?? "").trim();
  if (!id || id === "undefined" || !UUID_RE.test(id)) {
    throw new Error(
      `${context}: invalid or missing studentId (got ${JSON.stringify(studentId)}). ` +
        "Refusing to call /students/undefined/report-data."
    );
  }
  return id;
}

/**
 * @param {object} state
 * @param {{ phase: string }} opts
 */
export function assertSchoolSimStateReady(state, { phase }) {
  const label = `school-sim ${phase}`;

  if (!state?.schoolId) {
    throw new Error(`${label}: state.schoolId is missing`);
  }
  if (!state?.demoParentId) {
    throw new Error(`${label}: state.demoParentId is missing`);
  }

  const studentIds = state.studentIds;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error(
      `${label}: state.studentIds is missing or empty. ` +
        "A partial local sim-state.json may have overridden the demo fixture — " +
        "remove scripts/school-portal/sim-state.json or fix mergeSimState."
    );
  }

  if (!state.teacherIds || typeof state.teacherIds !== "object") {
    throw new Error(`${label}: state.teacherIds is missing`);
  }
  if (!state.teacherEmails || typeof state.teacherEmails !== "object") {
    throw new Error(`${label}: state.teacherEmails is missing`);
  }
  if (!state.classIds || typeof state.classIds !== "object") {
    throw new Error(`${label}: state.classIds is missing`);
  }

  const teacherKeys = Object.keys(TEACHER_EMAILS).filter((k) => k !== "manager");
  const missingIds = teacherKeys.filter((k) => !state.teacherIds[k]);
  const missingEmails = teacherKeys.filter((k) => !state.teacherEmails[k]);
  if (missingIds.length) {
    throw new Error(`${label}: missing teacherIds for: ${missingIds.join(", ")}`);
  }
  if (missingEmails.length) {
    throw new Error(`${label}: missing teacherEmails for: ${missingEmails.join(", ")}`);
  }
}

/**
 * @param {string[]} studentIds
 * @param {string} context
 */
export function assertGradePickStudentIds(studentIds, context) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error(`${context}: cannot pick grade samples — studentIds empty`);
  }
  const indices = [0, 50, 100, 150, 200, 250];
  for (const i of indices) {
    const picked = studentIds[Math.min(i, studentIds.length - 1)];
    assertValidStudentId(picked, `${context} grade sample index ${i}`);
  }
}
