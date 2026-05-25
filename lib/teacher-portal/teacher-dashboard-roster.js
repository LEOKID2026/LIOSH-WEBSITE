/** Shared roster filter helpers (client + server). */

export const ROSTER_FILTER_ALL = "all";
export const ROSTER_FILTER_DIRECT = "direct";

/**
 * @param {Array<{ student_id: string, class_id: string }>} rows
 * @returns {Map<string, string[]>}
 */
export function buildStudentClassIdsMap(rows) {
  /** @type {Map<string, string[]>} */
  const map = new Map();
  for (const row of rows || []) {
    const sid = row.student_id;
    const cid = row.class_id;
    if (!sid || !cid) continue;
    const list = map.get(sid) || [];
    if (!list.includes(cid)) list.push(cid);
    map.set(sid, list);
  }
  return map;
}

/**
 * @param {Array<{ studentId: string, isInAnyClass?: boolean, classIds?: string[] }>} students
 * @param {string} rosterKey
 */
export function filterStudentsByRosterKey(students, rosterKey) {
  const key = String(rosterKey || ROSTER_FILTER_ALL);
  if (key === ROSTER_FILTER_ALL) {
    return students;
  }
  if (key === ROSTER_FILTER_DIRECT) {
    return students.filter((s) => s.isInAnyClass === false);
  }
  return students.filter((s) => (s.classIds || []).includes(key));
}

/**
 * @param {{
 *   students: Array<{ studentId: string, isInAnyClass?: boolean, classIds?: string[] }>,
 *   classes: Array<{ classId: string, name: string }>,
 * }} input
 */
export function buildRosterFilterOptions(input) {
  const students = input.students || [];
  const classes = input.classes || [];
  const directCount = students.filter((s) => s.isInAnyClass === false).length;

  /** @type {Array<Record<string, unknown>>} */
  const options = [
    {
      key: ROSTER_FILTER_ALL,
      type: "all",
      labelKey: "teacher.roster.filter.allStudents",
      labelPlaceholder: "All students",
      studentCount: students.length,
    },
  ];

  for (const c of classes) {
    const count = students.filter((s) => (s.classIds || []).includes(c.classId)).length;
    options.push({
      key: c.classId,
      type: "class",
      labelKey: "teacher.roster.filter.class",
      labelPlaceholder: `Class: ${c.name}`,
      classId: c.classId,
      className: c.name,
      studentCount: count,
    });
  }

  options.push({
    key: ROSTER_FILTER_DIRECT,
    type: "direct",
    labelKey: "teacher.roster.filter.directStudents",
    labelPlaceholder: "Direct students (no class)",
    studentCount: directCount,
  });

  return options;
}
