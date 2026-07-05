/**
 * Parent-report duration sanity — caps implausible session/topic durations before aggregation/display.
 */

export const REPORT_DURATION_SANITY = Object.freeze({
  maxSessionMinutes: 180,
  maxMinutesPerQuestion: 10,
  maxTopicMinutesShortWindow: 300,
  shortWindowDays: 14,
  defaultSecondsPerAnswer: 90,
  minSessionSeconds: 60,
});

/**
 * @param {number} rawSeconds
 * @param {{ answerCount?: number, windowDays?: number }} [opts]
 * @returns {{ seconds: number, capped: boolean, reason: string|null }}
 */
export function sanitizeReportDurationSeconds(rawSeconds, opts = {}) {
  const raw = Math.max(0, Math.floor(Number(rawSeconds) || 0));
  const answerCount = Math.max(0, Math.floor(Number(opts.answerCount) || 0));
  const windowDays = Math.max(1, Math.floor(Number(opts.windowDays) || REPORT_DURATION_SANITY.shortWindowDays));

  let seconds = raw;
  let capped = false;
  let reason = null;

  const sessionCap = REPORT_DURATION_SANITY.maxSessionMinutes * 60;
  if (seconds > sessionCap) {
    seconds = sessionCap;
    capped = true;
    reason = "session_cap_180m";
  }

  if (answerCount > 0) {
    const perQuestionCap = answerCount * REPORT_DURATION_SANITY.maxMinutesPerQuestion * 60;
    if (seconds > perQuestionCap) {
      seconds = perQuestionCap;
      capped = true;
      reason = reason || "minutes_per_question_cap";
    }
  }

  const topicCap = REPORT_DURATION_SANITY.maxTopicMinutesShortWindow * 60;
  if (windowDays <= REPORT_DURATION_SANITY.shortWindowDays && seconds > topicCap) {
    seconds = topicCap;
    capped = true;
    reason = reason || "topic_short_window_cap";
  }

  return { seconds, capped, reason };
}

/**
 * Estimate plausible practice duration from answer count (seeds / fallback).
 * @param {number} answerCount
 */
export function estimatePracticeDurationSeconds(answerCount) {
  const n = Math.max(0, Math.floor(Number(answerCount) || 0));
  if (n <= 0) return 0;
  const estimated = Math.max(
    REPORT_DURATION_SANITY.minSessionSeconds,
    n * REPORT_DURATION_SANITY.defaultSecondsPerAnswer
  );
  return sanitizeReportDurationSeconds(estimated, { answerCount: n }).seconds;
}

/**
 * Second-pass caps on rolled-up subject/topic durations (after summing sanitized sessions).
 * @param {Record<string, object>} subjects
 * @param {{ windowDays?: number }} [opts]
 * @returns {number} total duration seconds across subjects
 */
export function applyReportDurationSanityToAggregateSubjects(subjects, opts = {}) {
  const windowDays = Math.max(
    1,
    Math.floor(Number(opts.windowDays) || REPORT_DURATION_SANITY.shortWindowDays)
  );
  let totalDurationSeconds = 0;
  if (!subjects || typeof subjects !== "object") return 0;

  for (const subjectKey of Object.keys(subjects)) {
    const s = subjects[subjectKey];
    if (!s || typeof s !== "object") continue;

    for (const topicKey of Object.keys(s.topics || {})) {
      const topic = s.topics[topicKey];
      if (!topic || typeof topic !== "object") continue;
      const topicAnswers = Math.max(
        0,
        Math.floor(Number(topic.answers ?? topic.diagnosticAnswers) || 0)
      );
      topic.durationSeconds = sanitizeReportDurationSeconds(
        Math.max(0, Math.floor(Number(topic.durationSeconds) || 0)),
        { answerCount: topicAnswers, windowDays }
      ).seconds;

      for (const gradeKey of Object.keys(topic.byContentGrade || {})) {
        const slice = topic.byContentGrade[gradeKey];
        if (!slice || typeof slice !== "object") continue;
        const sliceAnswers = Math.max(
          0,
          Math.floor(Number(slice.answers ?? slice.diagnosticAnswers) || 0)
        );
        slice.durationSeconds = sanitizeReportDurationSeconds(
          Math.max(0, Math.floor(Number(slice.durationSeconds) || 0)),
          { answerCount: sliceAnswers, windowDays }
        ).seconds;
      }
    }

    const subjectAnswers = Math.max(
      0,
      Math.floor(Number(s.answers ?? s.diagnosticAnswers) || 0)
    );
    s.durationSeconds = sanitizeReportDurationSeconds(
      Math.max(0, Math.floor(Number(s.durationSeconds) || 0)),
      { answerCount: subjectAnswers, windowDays }
    ).seconds;
    totalDurationSeconds += s.durationSeconds;
  }

  return totalDurationSeconds;
}
