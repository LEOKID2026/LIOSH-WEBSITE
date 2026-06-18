/**
 * Phase D2 — Planner output → scenario shape adapter.
 *
 * The Phase D2 planner emits per-student per-session intent objects:
 *
 *   {
 *     subject: 'math'|'geometry'|'hebrew'|'english'|'science'|'moledet-geography',
 *     profile: 'strong'|'average'|'weak'|'targeted',
 *     topic:   string,    // e.g. 'addition' for math, 'shapes' for geometry
 *     grade:   1..6,      // forwarded to math/geometry drivers that grade-lock
 *     questionCount,      // integer
 *     intendedMinutes,    // integer (used by the pacer + the timeline)
 *     seed,               // unsigned 32-bit, derived from (date, label, subject)
 *     weaknessSubject,    // boolean: this subject is in the persona's weakness map
 *   }
 *
 * The existing Phase C / Phase D subject drivers expect a slightly
 * different shape — the Phase C "scenario" object — with:
 *
 *   { id, subject, profile, grade?, operation?, topic, questionCount,
 *     weaknessTopics: string[], rng: () => () => number,
 *     pickAnswer?: (...) => {value, intendedCorrect} }
 *
 * This module is the thin adapter between the two. We deliberately
 * REUSE the same factory pattern phase-c-suite.mjs uses, so the
 * subject drivers (math-master, geometry-master, hebrew-master,
 * english-master, science-master, moledet-geography-master) run
 * UNCHANGED inside Phase D2.
 *
 * No product UI, no Hebrew copy, no driver internals are touched.
 */

import { pickAnswerForArithmetic, makeRng } from "../lib/answer-profiles.mjs";

function makeArithmeticPickFn(rng) {
  return ({ profile, computedAnswer, topicKey, weaknessTopics }) =>
    pickAnswerForArithmetic({
      profile,
      computedAnswer,
      rng,
      topicKey,
      weaknessTopics,
    });
}

function makeMathScenarioFromSession({ studentLabel, sessionIndex, session }) {
  const rng = makeRng(session.seed >>> 0);
  return {
    id: `phase-d2-${studentLabel}-s${sessionIndex + 1}-math-${session.topic}`,
    studentLabel,
    subject: "math",
    profile: session.profile,
    grade: session.grade,
    operation: session.topic,
    topic: session.topic,
    questionCount: session.questionCount,
    intendedMinutes: session.intendedMinutes,
    weaknessTopics: session.weaknessSubject ? [session.topic] : [],
    rng: () => rng,
    pickAnswer: makeArithmeticPickFn(rng),
  };
}

function makeGeometryScenarioFromSession({
  studentLabel,
  sessionIndex,
  session,
}) {
  const rng = makeRng(session.seed >>> 0);
  return {
    id: `phase-d2-${studentLabel}-s${sessionIndex + 1}-geometry-${session.topic}`,
    studentLabel,
    subject: "geometry",
    profile: session.profile,
    // Geometry driver doesn't grade-lock the same way math does; pass
    // grade through so a future driver tweak can read it without
    // breaking this adapter's contract.
    grade: session.grade,
    topic: session.topic || "area",
    questionCount: session.questionCount,
    intendedMinutes: session.intendedMinutes,
    weaknessTopics: session.weaknessSubject ? [session.topic] : [],
    rng: () => rng,
    pickAnswer: makeArithmeticPickFn(rng),
  };
}

function makeMcqScenarioFromSession({
  subject,
  studentLabel,
  sessionIndex,
  session,
}) {
  const rng = makeRng(session.seed >>> 0);
  return {
    id: `phase-d2-${studentLabel}-s${sessionIndex + 1}-${subject}-${session.topic || "default"}`,
    studentLabel,
    subject,
    profile: session.profile,
    grade: session.grade,
    // Pass topic through but allow null; the MCQ drivers fall back to
    // currentQuestion.topic when scenario.topic is null/undefined.
    topic: session.topic || null,
    questionCount: session.questionCount,
    intendedMinutes: session.intendedMinutes,
    weaknessTopics: session.weaknessSubject ? [session.topic] : [],
    rng: () => rng,
  };
}

/**
 * Convert a single planner-session into the Phase C scenario shape.
 * Throws on unknown subject (the planner should never emit that).
 */
export function buildScenarioFromSession({
  studentLabel,
  sessionIndex,
  session,
}) {
  switch (session.subject) {
    case "math":
      return makeMathScenarioFromSession({
        studentLabel,
        sessionIndex,
        session,
      });
    case "geometry":
      return makeGeometryScenarioFromSession({
        studentLabel,
        sessionIndex,
        session,
      });
    case "hebrew":
    case "english":
    case "science":
    case "moledet-geography":
      return makeMcqScenarioFromSession({
        subject: session.subject,
        studentLabel,
        sessionIndex,
        session,
      });
    default:
      throw new Error(
        `phase-d2-suite: unknown subject "${session.subject}" emitted ` +
          `by the planner for student=${studentLabel} session=${sessionIndex + 1}`
      );
  }
}

/**
 * Convert the full daily plan into the per-student record list the
 * orchestrator consumes. Splits planner students into:
 *   - studied: array of records that will drive sessions today
 *   - skipped: array of {label, reason, persona kind, grade} for the
 *     daily run-summary's "skipped" section
 *
 * `studentLabels` (optional): operator-supplied filter from the CLI's
 * --students flag. Filters are applied AFTER planner output, so a
 * student whose attendance roll said "no" still appears in `skipped`
 * with the original skipReason — the filter is purely a "run a smoke
 * subset" tool, not a way to override the planner.
 */
export function buildPhaseD2StudentRecords({
  plan,
  accountsByLabel,
  studentLabels = null,
}) {
  if (!plan || !plan.students || typeof plan.students !== "object") {
    throw new Error("phase-d2-suite: plan.students is required");
  }
  if (!accountsByLabel || typeof accountsByLabel.get !== "function") {
    throw new Error("phase-d2-suite: accountsByLabel must be a Map");
  }
  const filter = Array.isArray(studentLabels) && studentLabels.length > 0
    ? new Set(studentLabels.map((s) => String(s).trim()).filter(Boolean))
    : null;

  const studied = [];
  const skipped = [];
  const filteredOut = [];
  for (const [label, planStudent] of Object.entries(plan.students)) {
    if (filter && !filter.has(label)) {
      filteredOut.push({
        label,
        reason: `cli-filter: --students excluded ${label}`,
        grade: planStudent.grade,
        personaKind: planStudent.personaKind,
      });
      continue;
    }
    if (!planStudent.studied) {
      skipped.push({
        label,
        reason: planStudent.skipReason || "planner-skipped",
        grade: planStudent.grade,
        personaKind: planStudent.personaKind,
      });
      continue;
    }
    const account = accountsByLabel.get(label) || null;
    if (!account) {
      // Surface as a SKIP with a config reason; the orchestrator will
      // promote this to a BLOCKED student with no UI work attempted.
      skipped.push({
        label,
        reason:
          `no-credentials: no account loaded for label=${label}; ` +
          `add it to VIRTUAL_STUDENT_ACCOUNTS or E2E_STUDENT_{N}_*`,
        grade: planStudent.grade,
        personaKind: planStudent.personaKind,
        configBlocker: true,
      });
      continue;
    }
    const scenarios = (planStudent.sessions || []).map((session, idx) =>
      buildScenarioFromSession({
        studentLabel: label,
        sessionIndex: idx,
        session,
      })
    );
    studied.push({
      label,
      account,
      grade: planStudent.grade,
      personaKind: planStudent.personaKind,
      defaultProfile: planStudent.defaultProfile,
      intendedMinutes: planStudent.intendedMinutes,
      sessions: scenarios,
      // Cache the raw planner sessions so the orchestrator can
      // surface them in the per-student artifact without recomputing.
      plannerSessions: planStudent.sessions,
    });
  }

  return {
    studied,
    skipped,
    filteredOut,
    summary: {
      studiedCount: studied.length,
      skippedCount: skipped.length,
      filteredOutCount: filteredOut.length,
      totalSessions: studied.reduce((acc, s) => acc + s.sessions.length, 0),
    },
  };
}
