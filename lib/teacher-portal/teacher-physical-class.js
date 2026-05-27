/**
 * Physical-class grouping for teacher dashboard (client + server safe).
 * School demo teachers may own multiple subject-class rows per physical class.
 */

import { physicalClassKeyFromName } from "../school-portal/school-drilldown.js";
import { subjectLabelHe } from "./teacher-ui.he.js";

/** @type {string[]} */
export const TEACHER_SUBJECT_ORDER = [
  "math",
  "geometry",
  "english",
  "hebrew",
  "science",
  "moledet_geography",
];

/**
 * @param {string|null|undefined} gradeLevel
 */
export function normalizeTeacherGradeLevel(gradeLevel) {
  const s = String(gradeLevel || "").trim().toLowerCase();
  const m = s.match(/^g?([1-6])$/);
  if (m) return `g${m[1]}`;
  return s;
}

/**
 * @param {{ gradeLevel?: string|null, name?: string|null, schoolId?: string|null }} cls
 */
export function teacherPhysicalClassGroupKey(cls) {
  const grade = normalizeTeacherGradeLevel(cls.gradeLevel);
  const name = physicalClassKeyFromName(cls.name);
  const school = cls.schoolId ? String(cls.schoolId).trim() : "";
  return school ? `${school}::${grade}::${name}` : `${grade}::${name}`;
}

/**
 * @param {Array<{ subjectFocus?: string|null }>} subjectClasses
 */
export function sortTeacherSubjectClasses(subjectClasses) {
  const order = new Map(TEACHER_SUBJECT_ORDER.map((s, i) => [s, i]));
  return [...subjectClasses].sort((a, b) => {
    const ai = order.get(String(a.subjectFocus || "").trim()) ?? 99;
    const bi = order.get(String(b.subjectFocus || "").trim()) ?? 99;
    return ai - bi;
  });
}

/**
 * @param {string[]} subjectLabels
 */
export function formatSubjectsLabelHe(subjectLabels) {
  const unique = [...new Set((subjectLabels || []).filter(Boolean))];
  return unique.join(", ");
}

/**
 * Unique students across subject-class membership rows.
 *
 * @param {Array<{ student_id?: string, class_id?: string }>} membershipRows
 * @param {string[]} classIds
 */
export function uniqueStudentIdsForClassIds(membershipRows, classIds) {
  const idSet = new Set(classIds);
  const students = new Set();
  for (const row of membershipRows || []) {
    if (!idSet.has(row.class_id)) continue;
    if (row.student_id) students.add(row.student_id);
  }
  return students;
}

/**
 * Class cards may expose membership-based studentCount and rosterStudentCount from direct links.
 * Never let rosterStudentCount=0 override a positive membership count (school teachers).
 *
 * @param {{ studentCount?: number|null, rosterStudentCount?: number|null }|null|undefined} card
 */
export function effectivePhysicalClassStudentCount(card) {
  const membership = Number(card?.studentCount) || 0;
  const roster = Number(card?.rosterStudentCount) || 0;
  return Math.max(membership, roster);
}

/**
 * @param {Array<{ studentId: string, classIds?: string[] }>} students
 * @param {string[]} subjectClassIds
 */
export function countStudentsInPhysicalGroup(students, subjectClassIds) {
  const idSet = new Set(subjectClassIds);
  const seen = new Set();
  let count = 0;
  for (const s of students || []) {
    if (!(s.classIds || []).some((cid) => idSet.has(cid))) continue;
    if (seen.has(s.studentId)) continue;
    seen.add(s.studentId);
    count += 1;
  }
  return count;
}

/**
 * @param {Array<{ studentId: string, classIds?: string[] }>} students
 * @param {string[]} subjectClassIds
 */
export function filterStudentsByPhysicalGroup(students, subjectClassIds) {
  const idSet = new Set(subjectClassIds);
  const seen = new Set();
  /** @type {typeof students} */
  const out = [];
  for (const s of students || []) {
    if (!(s.classIds || []).some((cid) => idSet.has(cid))) continue;
    if (seen.has(s.studentId)) continue;
    seen.add(s.studentId);
    out.push(s);
  }
  return out;
}

/**
 * @param {Array<{
 *   classId: string,
 *   name: string,
 *   gradeLevel?: string|null,
 *   subjectFocus?: string|null,
 *   studentCount?: number,
 *   schoolId?: string|null,
 * }>} classes
 * @param {Array<{ student_id: string, class_id: string }>} [membershipRows]
 */
export function groupTeacherClassesForDashboard(classes, membershipRows = []) {
  /** @type {Map<string, { physicalGroupKey: string, name: string, gradeLevel: string|null, schoolId: string|null, records: typeof classes }>} */
  const map = new Map();

  for (const c of classes || []) {
    const key = teacherPhysicalClassGroupKey({
      gradeLevel: c.gradeLevel,
      name: c.name,
      schoolId: c.schoolId,
    });
    if (!map.has(key)) {
      map.set(key, {
        physicalGroupKey: key,
        name: physicalClassKeyFromName(c.name),
        gradeLevel: c.gradeLevel ?? null,
        schoolId: c.schoolId ?? null,
        records: [],
      });
    }
    map.get(key).records.push(c);
  }

  const groups = [...map.values()].map((g) => {
    const records = sortTeacherSubjectClasses(g.records);
    const subjectClassIds = records.map((r) => ({
      classId: r.classId,
      subjectFocus: r.subjectFocus ?? null,
      subjectLabel: subjectLabelHe(r.subjectFocus),
    }));
    const classIds = records.map((r) => r.classId);
    const uniqueStudents = uniqueStudentIdsForClassIds(membershipRows, classIds);
    const subjectLabels = subjectClassIds.map((s) => s.subjectLabel).filter(Boolean);
    const activityCount = records.reduce((sum, r) => sum + (Number(r.activityCount) || 0), 0);
    const primaryClassId = subjectClassIds[0]?.classId || records[0]?.classId;

    return {
      physicalGroupKey: g.physicalGroupKey,
      classId: primaryClassId,
      primaryClassId,
      name: g.name,
      gradeLevel: g.gradeLevel,
      subjectClassIds,
      subjectLabels,
      subjectsLabel: formatSubjectsLabelHe(subjectLabels),
      studentCount: uniqueStudents.size,
      activityCount,
      isGrouped: records.length > 1,
      /** @type {typeof records} */
      _records: records,
    };
  });

  return groups.sort((a, b) => {
    const ga = normalizeTeacherGradeLevel(a.gradeLevel);
    const gb = normalizeTeacherGradeLevel(b.gradeLevel);
    if (ga !== gb) return ga.localeCompare(gb);
    const sectionA = parseInt(String(a.name).replace(/[^\d]/g, ""), 10) || 0;
    const sectionB = parseInt(String(b.name).replace(/[^\d]/g, ""), 10) || 0;
    return sectionA - sectionB || String(a.name).localeCompare(String(b.name), "he");
  });
}
