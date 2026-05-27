/** Shared roster filter helpers (client + server). */

import { countStudentsInPhysicalGroup, filterStudentsByPhysicalGroup } from "./teacher-physical-class.js";

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
 * @param {Array<{ key?: string, type?: string, subjectClassIds?: string[] }>} [rosterOptions]
 */
export function filterStudentsByRosterKey(students, rosterKey, rosterOptions) {
  const key = String(rosterKey || ROSTER_FILTER_ALL);
  if (key === ROSTER_FILTER_ALL) {
    return students;
  }
  if (key === ROSTER_FILTER_DIRECT) {
    return students.filter((s) => s.isInAnyClass === false);
  }

  const opt = (rosterOptions || []).find((o) => o.key === key);
  if (opt?.type === "physical_class" && opt.subjectClassIds?.length) {
    return filterStudentsByPhysicalGroup(students, opt.subjectClassIds);
  }

  return students.filter((s) => (s.classIds || []).includes(key));
}

/**
 * @param {{
 *   students: Array<{ studentId: string, isInAnyClass?: boolean, classIds?: string[] }>,
 *   classes: Array<{
 *     physicalGroupKey?: string,
 *     classId?: string,
 *     name: string,
 *     subjectClassIds?: Array<{ classId: string }>,
 *   }>,
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
      studentCount: students.length,
    },
  ];

  for (const c of classes) {
    const subjectClassIds = (c.subjectClassIds || []).map((s) => s.classId).filter(Boolean);
    const rosterKey = c.physicalGroupKey || c.classId;
    const count =
      subjectClassIds.length > 0
        ? countStudentsInPhysicalGroup(students, subjectClassIds)
        : students.filter((s) => (s.classIds || []).includes(c.classId)).length;

    options.push({
      key: rosterKey,
      type: subjectClassIds.length > 0 ? "physical_class" : "class",
      labelKey: "teacher.roster.filter.class",
      classId: c.classId,
      className: c.name,
      subjectClassIds,
      studentCount: count,
    });
  }

  options.push({
    key: ROSTER_FILTER_DIRECT,
    type: "direct",
    labelKey: "teacher.roster.filter.directStudents",
    studentCount: directCount,
  });

  return options;
}
