/**
 * Batch learning_sessions + answers fetch for roster class/physical reports.
 * Reuses aggregateReportPayloadFromActivityRows — parent single-student path unchanged.
 */

import {
  aggregateReportPayloadFromActivityRows,
  isoDateOnly,
  REPORT_AGG_SUBJECTS,
} from "./report-data-aggregate.server.js";
import { isMissingColumnError } from "../learning-supabase/learning-activity.js";

const BATCH_PAGE = 1000;

const SESSION_SELECT_COLS =
  "id,student_id,subject,topic,started_at,created_at,ended_at,updated_at,duration_seconds,status,metadata";
const ANSWER_SELECT_COLS =
  "id,student_id,learning_session_id,question_id,is_correct,answer_payload,answered_at,created_at";

function chunkIds(ids, size = 80) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceClient
 * @param {string[]} studentIds
 * @param {string} fromIso
 * @param {string} toIsoExclusive
 * @param {{ sessionSubjectFilter?: string|null }} [opts]
 */
async function fetchSessionsBatchForRoster(serviceClient, studentIds, fromIso, toIsoExclusive, opts = {}) {
  if (!studentIds.length) {
    return { rows: [], filterField: "started_at" };
  }

  const subjectFilter = opts.sessionSubjectFilter
    ? String(opts.sessionSubjectFilter).trim().toLowerCase()
    : null;
  const useSubjectFilter =
    subjectFilter && REPORT_AGG_SUBJECTS.includes(subjectFilter) ? subjectFilter : null;

  const all = [];
  let filterField = "started_at";

  for (const idChunk of chunkIds(studentIds, 40)) {
    for (let offset = 0; ; offset += BATCH_PAGE) {
      let q = serviceClient
        .from("learning_sessions")
        .select(SESSION_SELECT_COLS)
        .in("student_id", idChunk)
        .gte("started_at", fromIso)
        .lt("started_at", toIsoExclusive)
        .order("started_at", { ascending: false })
        .range(offset, offset + BATCH_PAGE - 1);

      if (useSubjectFilter) {
        q = q.eq("subject", useSubjectFilter);
      }

      const res = await q;

      if (res.error) {
        if (isMissingColumnError(res.error)) {
          filterField = "created_at";
          let fallback = serviceClient
            .from("learning_sessions")
            .select(SESSION_SELECT_COLS)
            .in("student_id", idChunk)
            .gte("created_at", fromIso)
            .lt("created_at", toIsoExclusive)
            .order("created_at", { ascending: false })
            .range(offset, offset + BATCH_PAGE - 1);
          if (useSubjectFilter) {
            fallback = fallback.eq("subject", useSubjectFilter);
          }
          const fb = await fallback;
          if (fb.error) throw fb.error;
          const rows = fb.data || [];
          all.push(...rows);
          if (rows.length < BATCH_PAGE) break;
          continue;
        }
        throw res.error;
      }

      const rows = res.data || [];
      all.push(...rows);
      if (rows.length < BATCH_PAGE) break;
    }
  }

  return { rows: all, filterField };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceClient
 * @param {string[]} studentIds
 * @param {string} fromIso
 * @param {string} toIsoExclusive
 */
async function fetchAnswersBatchForRoster(serviceClient, studentIds, fromIso, toIsoExclusive) {
  if (!studentIds.length) {
    return { rows: [], filterField: "answered_at" };
  }

  const all = [];
  let filterField = "answered_at";

  for (const idChunk of chunkIds(studentIds, 40)) {
    for (let offset = 0; ; offset += BATCH_PAGE) {
      const res = await serviceClient
        .from("answers")
        .select(ANSWER_SELECT_COLS)
        .in("student_id", idChunk)
        .gte("answered_at", fromIso)
        .lt("answered_at", toIsoExclusive)
        .order("answered_at", { ascending: false })
        .range(offset, offset + BATCH_PAGE - 1);

      if (res.error) {
        if (isMissingColumnError(res.error)) {
          filterField = "created_at";
          const fb = await serviceClient
            .from("answers")
            .select(ANSWER_SELECT_COLS)
            .in("student_id", idChunk)
            .gte("created_at", fromIso)
            .lt("created_at", toIsoExclusive)
            .order("created_at", { ascending: false })
            .range(offset, offset + BATCH_PAGE - 1);
          if (fb.error) throw fb.error;
          const rows = fb.data || [];
          all.push(...rows);
          if (rows.length < BATCH_PAGE) break;
          continue;
        }
        throw res.error;
      }

      const rows = res.data || [];
      all.push(...rows);
      if (rows.length < BATCH_PAGE) break;
    }
  }

  return { rows: all, filterField };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} studentIdField
 */
function groupRowsByStudentId(rows, studentIdField = "student_id") {
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const map = new Map();
  for (const row of rows) {
    const sid = row[studentIdField];
    if (!sid) continue;
    const key = String(sid);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceClient
 * @param {Array<{ id: string, full_name?: string|null, grade_level?: string|null, is_active?: boolean }>} students
 * @param {Date} fromDate
 * @param {Date} toDate
 * @param {{ sessionSubjectFilter?: string|null }} [opts]
 * @returns {Promise<Map<string, object>>}
 */
export async function batchAggregateParentReportPayloadsForRoster(
  serviceClient,
  students,
  fromDate,
  toDate,
  opts = {}
) {
  const out = new Map();
  if (!students.length) return out;

  const fromIso = `${isoDateOnly(fromDate)}T00:00:00.000Z`;
  const toDateExclusive = new Date(toDate);
  toDateExclusive.setUTCDate(toDateExclusive.getUTCDate() + 1);
  const toIsoExclusive = `${isoDateOnly(toDateExclusive)}T00:00:00.000Z`;

  const studentIds = students.map((s) => s.id).filter(Boolean);

  const [sessionsResult, answersResult] = await Promise.all([
    fetchSessionsBatchForRoster(serviceClient, studentIds, fromIso, toIsoExclusive, opts),
    fetchAnswersBatchForRoster(serviceClient, studentIds, fromIso, toIsoExclusive),
  ]);

  let answerRows = answersResult.rows;
  const subjectFilter = opts.sessionSubjectFilter
    ? String(opts.sessionSubjectFilter).trim().toLowerCase()
    : null;
  if (subjectFilter && REPORT_AGG_SUBJECTS.includes(subjectFilter)) {
    const sessionIds = new Set(
      sessionsResult.rows.map((row) => row.id).filter(Boolean)
    );
    answerRows = answerRows.filter(
      (row) =>
        row.learning_session_id && sessionIds.has(row.learning_session_id)
    );
  }

  const sessionsByStudent = groupRowsByStudentId(sessionsResult.rows);
  const answersByStudent = groupRowsByStudentId(answerRows);

  const fetchMeta = {
    sessionsFilterField: sessionsResult.filterField,
    answersFilterField: answersResult.filterField,
  };

  for (const student of students) {
    if (!student?.id) continue;
    const sid = String(student.id);
    const payload = aggregateReportPayloadFromActivityRows(
      student,
      sessionsByStudent.get(sid) || [],
      answersByStudent.get(sid) || [],
      fromDate,
      toDate,
      fetchMeta
    );
    out.set(sid, payload);
  }

  return out;
}
