import { LEARNING_SUBJECT_ALLOWLIST } from "./learning-activity.js";
import {
  LEARNING_PROFILE_SUBJECT_KEYS,
  emptyLearningProfileRow,
  normalizeLearningProfileRow,
} from "../learning-shared/student-learning-profile-model.js";
import { getIsraelMonthBounds } from "./israel-calendar.server";

export { LEARNING_PROFILE_SUBJECT_KEYS, emptyLearningProfileRow, normalizeLearningProfileRow };

const MAX_PATCH_JSON_CHARS = 450_000;
const MAX_ANSWER_ROWS_AGG = 80_000;
const MAX_SESSION_ROWS_AGG = 40_000;

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Deep-merge patch into base. Arrays from patch replace wholesale.
 * @param {unknown} base
 * @param {unknown} patch
 * @param {number} depth
 * @returns {unknown}
 */
export function deepMergeLearningState(base, patch, depth = 0) {
  if (depth > 12) return patch;
  if (patch == null) return base;
  if (Array.isArray(patch)) return patch;
  if (!isPlainObject(patch)) return patch;
  const b = isPlainObject(base) ? base : {};
  /** @type {Record<string, unknown>} */
  const out = { ...b };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = out[key];
    if (Array.isArray(pv)) {
      out[key] = pv;
    } else if (isPlainObject(pv) && isPlainObject(bv)) {
      out[key] = deepMergeLearningState(bv, pv, depth + 1);
    } else {
      out[key] = pv;
    }
  }
  return out;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function ensureStudentLearningStateRow(supabase, studentId) {
  const { data: existing, error: selErr } = await supabase
    .from("student_learning_state")
    .select("id,student_id,subjects,monthly,challenges,streaks,achievements,profile,created_at,updated_at")
    .eq("student_id", studentId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing?.id) return existing;

  const insertRow = {
    student_id: studentId,
    subjects: {},
    monthly: {},
    challenges: {},
    streaks: {},
    achievements: {},
    profile: {},
  };
  const { data: created, error: insErr } = await supabase
    .from("student_learning_state")
    .insert(insertRow)
    .select("id,student_id,subjects,monthly,challenges,streaks,achievements,profile,created_at,updated_at")
    .limit(1)
    .maybeSingle();
  if (insErr) throw insErr;
  if (created?.id) return created;

  const { data: again, error: againErr } = await supabase
    .from("student_learning_state")
    .select("id,student_id,subjects,monthly,challenges,streaks,achievements,profile,created_at,updated_at")
    .eq("student_id", studentId)
    .maybeSingle();
  if (againErr) throw againErr;
  return again;
}

/**
 * @param {string} bodyJson
 */
export function assertPatchSizeOk(bodyJson) {
  if (bodyJson.length > MAX_PATCH_JSON_CHARS) {
    const err = new Error("Payload too large");
    err.code = "PAYLOAD_TOO_LARGE";
    throw err;
  }
}

/** Max length for `data:image/...;base64,...` stored in learning profile (jsonb). */
const MAX_AVATAR_DATA_URL_CHARS = 240_000;
/** Hard cap for entire profile JSON after sanitize (below global PATCH limit). */
const MAX_PROFILE_JSON_CHARS = 400_000;

/**
 * Strip dangerous / oversized profile fields before persistence.
 * @param {unknown} profile
 */
export function sanitizeProfileForStorage(profile) {
  if (!isPlainObject(profile)) return {};
  const out = { ...profile };
  delete out.avatarImageBase64;
  delete out.mleo_player_avatar_image;

  let emoji = null;
  if (Object.prototype.hasOwnProperty.call(profile, "avatarEmoji")) {
    if (out.avatarEmoji != null && String(out.avatarEmoji).trim() !== "") {
      emoji = String(out.avatarEmoji).trim().slice(0, 8);
      out.avatarEmoji = emoji;
    } else {
      delete out.avatarEmoji;
    }
  } else {
    delete out.avatarEmoji;
  }

  if (Object.prototype.hasOwnProperty.call(profile, "avatarCustomDataUrl")) {
    const v = profile.avatarCustomDataUrl;
    if (v === null) {
      out.avatarCustomDataUrl = null;
    } else if (typeof v === "string") {
      const c = v.trim();
      if (c === "") {
        delete out.avatarCustomDataUrl;
      } else if (c.startsWith("data:image/") && c.length <= MAX_AVATAR_DATA_URL_CHARS) {
        out.avatarCustomDataUrl = c;
      } else {
        delete out.avatarCustomDataUrl;
      }
    } else {
      delete out.avatarCustomDataUrl;
    }
  } else {
    delete out.avatarCustomDataUrl;
  }

  try {
    const s = JSON.stringify(out);
    if (s.length > MAX_PROFILE_JSON_CHARS) {
      if (emoji && out.avatarCustomDataUrl) {
        const slim = { avatarEmoji: emoji };
        return JSON.stringify(slim).length <= MAX_PROFILE_JSON_CHARS ? slim : { avatarEmoji: emoji };
      }
      return emoji ? { avatarEmoji: emoji } : {};
    }
    if (!out.avatarCustomDataUrl && s.length > 8000) {
      return emoji ? { avatarEmoji: emoji } : {};
    }
    return out;
  } catch {
    return emoji ? { avatarEmoji: emoji } : {};
  }
}

function subjectFromAnswerPayload(payload) {
  if (!isPlainObject(payload)) return null;
  const s = String(payload.subject || "").trim().toLowerCase();
  return LEARNING_SUBJECT_ALLOWLIST.has(s) ? s : null;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function computeStudentLearningDerived(supabase, studentId) {
  /** @type {Record<string, { answersTotal: number; correctTotal: number; wrongTotal: number; accuracy: number; sessionMinutesTotal: number }>} */
  const bySubject = {};
  for (const s of LEARNING_PROFILE_SUBJECT_KEYS) {
    bySubject[s] = {
      answersTotal: 0,
      correctTotal: 0,
      wrongTotal: 0,
      accuracy: 0,
      sessionMinutesTotal: 0,
    };
  }

  const { startIso, endIso, ym } = getIsraelMonthBounds();

  const { data: answers, error: aErr } = await supabase
    .from("answers")
    .select("is_correct,answer_payload,answered_at")
    .eq("student_id", studentId)
    .limit(MAX_ANSWER_ROWS_AGG);
  if (aErr) throw aErr;

  let monthlyAnswersCountIsraelMonth = 0;
  for (const row of answers || []) {
    const answeredAt = row.answered_at ? String(row.answered_at) : "";
    if (answeredAt >= startIso && answeredAt < endIso) {
      monthlyAnswersCountIsraelMonth += 1;
    }
    const sub = subjectFromAnswerPayload(row.answer_payload);
    if (!sub || !bySubject[sub]) continue;
    bySubject[sub].answersTotal += 1;
    if (row.is_correct === true) bySubject[sub].correctTotal += 1;
    else if (row.is_correct === false) bySubject[sub].wrongTotal += 1;
  }
  for (const s of LEARNING_PROFILE_SUBJECT_KEYS) {
    const b = bySubject[s];
    const denom = b.correctTotal + b.wrongTotal;
    b.accuracy = denom > 0 ? Math.round((b.correctTotal / denom) * 1000) / 10 : 0;
  }

  const { data: sessions, error: sErr } = await supabase
    .from("learning_sessions")
    .select("subject,duration_seconds,started_at,status")
    .eq("student_id", studentId)
    .limit(MAX_SESSION_ROWS_AGG);
  if (sErr) throw sErr;

  let monthlyMinutesIsraelMonth = 0;
  for (const row of sessions || []) {
    const sub = String(row.subject || "").trim().toLowerCase();
    const ds = Number(row.duration_seconds);
    const sec = Number.isFinite(ds) && ds > 0 ? ds : 0;
    const minutes = sec / 60;
    if (sub && bySubject[sub]) {
      bySubject[sub].sessionMinutesTotal += minutes;
    }
    const started = row.started_at ? String(row.started_at) : "";
    if (started >= startIso && started < endIso) {
      monthlyMinutesIsraelMonth += minutes;
    }
  }

  let answersTotalAll = 0;
  for (const s of LEARNING_PROFILE_SUBJECT_KEYS) {
    answersTotalAll += bySubject[s].answersTotal;
  }

  const roundedMinutes = Math.round(monthlyMinutesIsraelMonth * 100) / 100;

  return {
    bySubject,
    answersTotalAll,
    // Canonical — Asia/Jerusalem calendar month (owner decision 2026-05-22)
    monthlyMinutesIsraelMonth: roundedMinutes,
    monthlyAnswersCountIsraelMonth,
    yearMonthIsrael: ym,
    // Legacy aliases — same values, misnamed; kept for backwards compatibility.
    // TODO: remove *UtcMonth / yearMonthUtc once all consumers migrate to *IsraelMonth.
    monthlyMinutesUtcMonth: roundedMinutes,
    monthlyAnswersCountUtcMonth: monthlyAnswersCountIsraelMonth,
    yearMonthUtc: ym,
  };
}

/**
 * @param {unknown} body
 */
export function extractLearningProfilePatch(body) {
  if (!isPlainObject(body)) return {};
  const patch = {};
  if (body.subjects !== undefined) patch.subjects = body.subjects;
  if (body.monthly !== undefined) patch.monthly = body.monthly;
  if (body.challenges !== undefined) patch.challenges = body.challenges;
  if (body.streaks !== undefined) patch.streaks = body.streaks;
  if (body.achievements !== undefined) patch.achievements = body.achievements;
  if (body.profile !== undefined) patch.profile = body.profile;
  return patch;
}
