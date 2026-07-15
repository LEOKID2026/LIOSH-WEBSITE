/** Grade / physical-class drill-down helpers for school manager portal. */

import { normalizeGradeLevelToKey } from "../learning-student-defaults.js";
import { subjectLabelHe } from "../platform-ui/hebrew-display-labels.js";

/** @type {{ level: string, label: string }[]} */
/**
 * Map stored student/class grade codes to school portal drill-down keys (1–6).
 * @param {string|null|undefined} raw
 */
export function schoolPortalGradeLevel(raw) {
  const key = normalizeGradeLevelToKey(raw);
  if (!key || !/^g[1-6]$/.test(key)) return "";
  return key.slice(1);
}

export const SCHOOL_GRADE_OPTIONS = [
  { level: "1", label: "כיתה א׳" },
  { level: "2", label: "כיתה ב׳" },
  { level: "3", label: "כיתה ג׳" },
  { level: "4", label: "כיתה ד׳" },
  { level: "5", label: "כיתה ה׳" },
  { level: "6", label: "כיתה ו׳" },
];

/** Demo school subject-class order for consistent card layout. */
export const SCHOOL_SUBJECT_ORDER = [
  "math",
  "geometry",
  "english",
  "hebrew",
  "moledet_geography",
  "science",
  "history",
];

/**
 * @param {string|null|undefined} gradeLevel
 */
export function schoolGradeLabelHe(gradeLevel) {
  const level = String(gradeLevel ?? "").trim();
  return SCHOOL_GRADE_OPTIONS.find((g) => g.level === level)?.label || (level ? `כיתה ${level}` : "-");
}

/**
 * @param {string|null|undefined} name
 */
export function physicalClassKeyFromName(name) {
  return String(name || "").trim();
}

/**
 * @param {{ gradeLevel?: string|null, name?: string|null }} cls
 */
export function physicalClassGroupKey(cls) {
  return `${String(cls.gradeLevel || "").trim()}::${physicalClassKeyFromName(cls.name)}`;
}

/**
 * @param {Array<{ gradeLevel?: string|null, name?: string|null, classId?: string, subjectFocus?: string|null, teacherName?: string|null, memberCount?: number, activityCount?: number, teacherId?: string, isArchived?: boolean }>} classes
 * @param {string} gradeLevel
 */
export function groupPhysicalClassesForGrade(classes, gradeLevel) {
  const level = String(gradeLevel).trim();
  /** @type {Map<string, { name: string, gradeLevel: string, subjectClasses: typeof classes }>} */
  const map = new Map();

  for (const cls of classes) {
    if (String(cls.gradeLevel || "").trim() !== level) continue;
    if (cls.isArchived) continue;
    const name = physicalClassKeyFromName(cls.name);
    if (!name) continue;
    const key = physicalClassGroupKey(cls);
    if (!map.has(key)) {
      map.set(key, { name, gradeLevel: level, subjectClasses: [] });
    }
    map.get(key).subjectClasses.push(cls);
  }

  return [...map.values()].sort((a, b) => {
    const sectionA = parseInt(String(a.name).replace(/[^\d]/g, ""), 10) || 0;
    const sectionB = parseInt(String(b.name).replace(/[^\d]/g, ""), 10) || 0;
    return sectionA - sectionB || a.name.localeCompare(b.name, "he");
  });
}

/**
 * @param {Array<{ gradeLevel?: string|null, name?: string|null, subjectFocus?: string|null, memberCount?: number, activityCount?: number, teacherName?: string|null, classId?: string, isArchived?: boolean }>} subjectClasses
 */
export function sortSubjectClasses(subjectClasses) {
  const order = new Map(SCHOOL_SUBJECT_ORDER.map((s, i) => [s, i]));
  return [...subjectClasses].sort((a, b) => {
    const ai = order.get(String(a.subjectFocus || "").trim()) ?? 99;
    const bi = order.get(String(b.subjectFocus || "").trim()) ?? 99;
    return ai - bi;
  });
}

/**
 * Physical class roster size — all subject-class records for the same physical class share one roster.
 *
 * @param {Array<{ memberCount?: number }>} subjectClasses
 */
export function physicalClassStudentCount(subjectClasses) {
  if (!subjectClasses?.length) return 0;
  return Math.max(...subjectClasses.map((c) => c.memberCount ?? 0));
}

/**
 * @param {Array<{ gradeLevel?: string|null, physicalClassName?: string|null, displayName?: string|null, studentId?: string }>} students
 * @param {string} gradeLevel
 * @param {string|null|undefined} physicalClassName
 */
export function filterStudentsByPhysicalClass(students, gradeLevel, physicalClassName) {
  const level = String(gradeLevel).trim();
  const name = physicalClassKeyFromName(physicalClassName);
  return students.filter((s) => {
    if (String(s.gradeLevel || "").trim() !== level) return false;
    if (!name) return true;
    return physicalClassKeyFromName(s.physicalClassName) === name;
  });
}

/**
 * @param {Array<{ gradeLevel?: string|null, physicalClassName?: string|null }>} students
 * @param {string} gradeLevel
 */
/**
 * All physical class groups for one teacher's subject-class records (across grades).
 *
 * @param {Array<{ gradeLevel?: string|null, name?: string|null, classId?: string, subjectFocus?: string|null, memberCount?: number, activityCount?: number, isArchived?: boolean }>} classes
 */
export function groupPhysicalClassesForTeacher(classes) {
  /** @type {Map<string, { name: string, gradeLevel: string, subjectClasses: typeof classes }>} */
  const map = new Map();

  for (const cls of classes || []) {
    if (cls.isArchived) continue;
    const name = physicalClassKeyFromName(cls.name);
    const gradeLevel = String(cls.gradeLevel || "").trim();
    if (!name || !gradeLevel) continue;
    const key = physicalClassGroupKey(cls);
    if (!map.has(key)) {
      map.set(key, { name, gradeLevel, subjectClasses: [] });
    }
    map.get(key).subjectClasses.push(cls);
  }

  return [...map.values()].sort((a, b) => {
    const gradeA = Number(a.gradeLevel) || 0;
    const gradeB = Number(b.gradeLevel) || 0;
    if (gradeA !== gradeB) return gradeA - gradeB;
    const sectionA = parseInt(String(a.name).replace(/[^\d]/g, ""), 10) || 0;
    const sectionB = parseInt(String(b.name).replace(/[^\d]/g, ""), 10) || 0;
    return sectionA - sectionB || a.name.localeCompare(b.name, "he");
  });
}

/**
 * Hebrew subject labels for a physical class group (teacher's subjects only).
 *
 * @param {Array<{ subjectFocus?: string|null }>} subjectClasses
 */
export function physicalClassSubjectLabelsHe(subjectClasses) {
  return sortSubjectClasses(subjectClasses || [])
    .map((cls) => subjectLabelHe(String(cls.subjectFocus || "").trim()))
    .filter(Boolean);
}

export function groupPhysicalClassesForStudents(students, gradeLevel) {
  const level = String(gradeLevel).trim();
  /** @type {Map<string, { name: string, gradeLevel: string, studentCount: number }>} */
  const map = new Map();

  for (const s of students) {
    if (String(s.gradeLevel || "").trim() !== level) continue;
    const name = physicalClassKeyFromName(s.physicalClassName);
    if (!name) continue;
    const key = `${level}::${name}`;
    if (!map.has(key)) {
      map.set(key, { name, gradeLevel: level, studentCount: 0 });
    }
    map.get(key).studentCount += 1;
  }

  return [...map.values()].sort((a, b) => {
    const sectionA = parseInt(String(a.name).replace(/[^\d]/g, ""), 10) || 0;
    const sectionB = parseInt(String(b.name).replace(/[^\d]/g, ""), 10) || 0;
    return sectionA - sectionB || a.name.localeCompare(b.name, "he");
  });
}
