import { getAllTopicLaunchRows, listVisibleTopicsForSelfPractice } from "../launch-readiness/topic-launch-policy.js";
import { GUEST_DEFAULT_GRADE_LEVEL } from "./constants.js";
import { isGuestStudent } from "./guest-display.js";
import {
  loadGuestLearningAccessRows,
  loadGuestRuntimeConfig,
  resolveDefaultGuestPlayableTopics,
} from "./guest-access-policy.server.js";

/**
 * @param {string} subject
 * @param {string} grade
 */
function defaultCurriculumTopics(subject, grade) {
  const topics = getAllTopicLaunchRows()
    .filter((row) => row.subject === subject && row.grade === grade)
    .map((row) => row.topic)
    .filter(Boolean);
  return [...new Set(topics)];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ account_kind?: string, accountKind?: string }} student
 * @param {string} subject
 * @param {string} topic
 */
export async function assertGuestTopicPlayable(supabase, student, subject, topic) {
  if (!isGuestStudent(student)) return { ok: true, guest: false };

  const grade = GUEST_DEFAULT_GRADE_LEVEL;
  const visible = listVisibleTopicsForSelfPractice(
    subject,
    grade,
    defaultCurriculumTopics(subject, grade)
  );
  const config = await loadGuestRuntimeConfig(supabase);
  const rows = await loadGuestLearningAccessRows(supabase);
  const playableMap = resolveDefaultGuestPlayableTopics(
    rows,
    subject,
    visible,
    config.defaults.topicsPerSubject
  );
  const key = String(topic || "").trim();
  if (playableMap.get(key) === true) {
    return { ok: true, guest: true };
  }

  return {
    ok: false,
    guest: true,
    status: 403,
    code: "guest_topic_locked",
    message: "נושא זה נעול במצב אורח",
  };
}

/**
 * Guest-aware topic list for learning master pages.
 */
export async function listGuestAwareTopicsForSelfPractice(supabase, student, subject, grade, curriculumTopics) {
  const visible = listVisibleTopicsForSelfPractice(subject, grade, curriculumTopics);
  if (!isGuestStudent(student)) {
    return visible.map((topic) => ({ topic, guestLocked: false, guestPlayable: true }));
  }

  const config = await loadGuestRuntimeConfig(supabase);
  const rows = await loadGuestLearningAccessRows(supabase);
  const playableMap = resolveDefaultGuestPlayableTopics(
    rows,
    subject,
    visible,
    config.defaults.topicsPerSubject
  );

  return visible.map((topic) => {
    const playable = playableMap.get(String(topic || "").trim()) === true;
    return {
      topic,
      guestLocked: !playable,
      guestPlayable: playable,
    };
  });
}

/**
 * @param {{ account_kind?: string, accountKind?: string, grade_level?: string|null }} student
 */
export function resolveGuestPracticeGrade(student) {
  if (isGuestStudent(student)) return GUEST_DEFAULT_GRADE_LEVEL;
  return student?.grade_level || GUEST_DEFAULT_GRADE_LEVEL;
}
