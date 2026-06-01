/**
 * Lightweight browse status for school manager class/student grids (30-day rollups).
 * No guidance engine — cohort accuracy only.
 */

import {
  classOrCohortLearningStatusLabelHe,
  deriveStudentLearningStatusLabelHe,
} from "../teacher-portal/student-learning-status.js";
import { getCachedLightweightStudentActivityMap } from "./school-browse-activity-cache.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { listSchoolClasses } from "./school-classes.server.js";

const BROWSE_ACTIVITY_DAYS = 30;
/** Minimum cohort answers before showing a class/grade status (aligned with report hub thin-data guard). */
const MIN_COHORT_ANSWERS_FOR_STATUS = 10;

function chunkIds(ids, size = 80) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} classIds
 * @returns {Promise<Map<string, Set<string>>>}
 */
async function loadStudentIdsByClassIds(serviceRole, classIds) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map();
  for (const id of classIds) {
    map.set(id, new Set());
  }
  if (!classIds.length) return map;

  for (const chunk of chunkIds(classIds, 40)) {
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await serviceRole
        .from("teacher_class_students")
        .select("class_id, student_id")
        .in("class_id", chunk)
        .is("removed_at", null)
        .range(from, from + pageSize - 1);

      if (error) {
        if (isDbSchemaNotReadyError(error)) {
          throw Object.assign(new Error("db_schema_not_ready"), { code: "db_schema_not_ready" });
        }
        throw error;
      }

      const rows = data || [];
      for (const row of rows) {
        if (!row.class_id || !row.student_id) continue;
        if (!map.has(row.class_id)) map.set(row.class_id, new Set());
        map.get(row.class_id).add(row.student_id);
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }
  }

  return map;
}

/**
 * @param {Map<string, { totalAnswers: number, correctAnswers: number, accuracy: number|null }>} byStudentId
 * @param {Set<string>} studentIds
 */
function cohortAccuracyFromStudentSet(byStudentId, studentIds) {
  let totalAnswers = 0;
  let totalCorrect = 0;
  for (const sid of studentIds) {
    const row = byStudentId.get(sid);
    if (!row) continue;
    totalAnswers += Number(row.totalAnswers) || 0;
    totalCorrect += Number(row.correctAnswers) || 0;
  }
  if (totalAnswers < MIN_COHORT_ANSWERS_FOR_STATUS) return null;
  return Number(((totalCorrect / totalAnswers) * 100).toFixed(2));
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ gradeLevel?: string }} [opts]
 */
export async function buildSchoolBrowseStatusMaps(serviceRole, schoolId, opts = {}) {
  const gradeFilter = opts.gradeLevel ? String(opts.gradeLevel).trim() : "";

  const listed = await listSchoolClasses(serviceRole, schoolId, {
    gradeLevel: gradeFilter || undefined,
    isArchived: false,
  });
  if (!listed.ok) return listed;

  const classes = listed.classes || [];
  if (!classes.length) {
    return {
      ok: true,
      gradeStatusByLevel: {},
      physicalByKey: {},
      gradeStatus: null,
    };
  }

  const classIds = classes.map((c) => c.classId);
  let studentsByClass;
  try {
    studentsByClass = await loadStudentIdsByClassIds(serviceRole, classIds);
  } catch (e) {
    if (e?.code === "db_schema_not_ready") {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  /** @type {Map<string, { gradeLevel: string, name: string, classIds: string[], studentIds: Set<string> }>} */
  const physicalGroups = new Map();
  /** @type {Map<string, Set<string>>} */
  const studentsByGrade = new Map();

  for (const cls of classes) {
    const gl = String(cls.gradeLevel || "").trim();
    const name = String(cls.name || "").trim();
    if (!gl || !name) continue;

    const pKey = `${gl}::${name}`;
    if (!physicalGroups.has(pKey)) {
      physicalGroups.set(pKey, {
        gradeLevel: gl,
        name,
        classIds: [],
        studentIds: new Set(),
      });
    }
    const group = physicalGroups.get(pKey);
    group.classIds.push(cls.classId);

    const memberSet = studentsByClass.get(cls.classId);
    if (memberSet) {
      for (const sid of memberSet) {
        group.studentIds.add(sid);
        if (!studentsByGrade.has(gl)) studentsByGrade.set(gl, new Set());
        studentsByGrade.get(gl).add(sid);
      }
    }
  }

  const allStudentIds = [
    ...new Set([...physicalGroups.values()].flatMap((g) => [...g.studentIds])),
  ];
  if (!allStudentIds.length) {
    return {
      ok: true,
      gradeStatusByLevel: {},
      physicalByKey: {},
      gradeStatus: gradeFilter ? null : null,
    };
  }

  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - BROWSE_ACTIVITY_DAYS * 86_400_000);
  const activity = await getCachedLightweightStudentActivityMap({
    serviceRole,
    teacherId: null,
    studentIds: allStudentIds,
    fromDate,
    toDate,
  });

  if (!activity.ok) {
    return activity;
  }

  const byStudentId = activity.byStudentId;

  /** @type {Record<string, string>} */
  const physicalByKey = {};
  for (const [pKey, group] of physicalGroups) {
    const accuracy = cohortAccuracyFromStudentSet(byStudentId, group.studentIds);
    if (accuracy == null) continue;
    const label = classOrCohortLearningStatusLabelHe(null, accuracy);
    if (label) physicalByKey[pKey] = label;
  }

  /** @type {Record<string, string>} */
  const gradeStatusByLevel = {};
  for (const [gl, studentSet] of studentsByGrade) {
    const accuracy = cohortAccuracyFromStudentSet(byStudentId, studentSet);
    if (accuracy == null) continue;
    const label = classOrCohortLearningStatusLabelHe(null, accuracy);
    if (label) gradeStatusByLevel[gl] = label;
  }

  const gradeStatus = gradeFilter ? gradeStatusByLevel[gradeFilter] || null : null;

  /** @type {Record<string, string|null>} */
  const studentLearningStatusBadges = {};
  for (const sid of allStudentIds) {
    const rollup = byStudentId.get(sid);
    const summary = {
      totalAnswers: rollup?.totalAnswers ?? 0,
      totalSessions: rollup?.totalSessions ?? 0,
      accuracy: rollup?.accuracy ?? null,
    };
    const badge = deriveStudentLearningStatusLabelHe(summary);
    studentLearningStatusBadges[sid] = badge === "אין מספיק נתונים" ? null : badge;
  }

  return {
    ok: true,
    physicalByKey,
    gradeStatusByLevel,
    gradeStatus,
    studentLearningStatusBadges,
  };
}
