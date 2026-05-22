/**
 * Phase D scenario suite — multi-student real UI QA.
 *
 * Phase D extends the per-student multi-subject runner from Phase C to
 * a multi-student loop covering all 12 real QA student accounts under
 * the QA parent (admin@admin.com).
 *
 * Plan shape:
 *   Each entry pairs a student account label (the same label loaded by
 *   loadAccounts() — typically the AAA1..AAA12 username, or whatever
 *   E2E_STUDENT_{N}_LABEL says) with a single short math scenario sized
 *   to that student's grade level.
 *
 * Why "math addition, profile=average, 6 questions" everywhere:
 *   - addition is supported in every grade (g1..g6) per utils/math-constants.js.
 *   - math is the most reliable profile-control surface in the product
 *     (numeric text input + computed answers via answer-profiles.mjs),
 *     so it is the strongest evidence that a student's session really
 *     persisted through the real /api/learning/* endpoints.
 *   - 6 questions per student keeps the full 12-student run under ~10
 *     minutes even on a cold dev server. A larger fan-out belongs in
 *     Phase E (qa:virtual-student:full) and not in this slice.
 *
 * Smoke vs Full:
 *   - PHASE_D_SMOKE_PLAN: AAA1 / AAA5 / AAA11 — one student per "bucket"
 *     of the grade range (1, 3, 6). Designed to surface multi-student
 *     wiring bugs quickly without tying up the dev server for 10 minutes.
 *   - PHASE_D_FULL_PLAN: all 12 AAA students.
 *
 * The plan is the contract; the orchestrator runs it. Plan entries do
 * NOT contain credentials — those still come from VIRTUAL_STUDENT_ACCOUNTS
 * (or E2E_STUDENT_{N}_*) and are looked up by `studentLabel`.
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

function makeMathScenarioForStudent({
  id,
  studentLabel,
  profile,
  operation,
  grade,
  questionCount,
  seed,
}) {
  const rng = makeRng(seed);
  return {
    id,
    studentLabel,
    subject: "math",
    profile,
    grade,
    operation,
    topic: operation,
    questionCount,
    weaknessTopics: [],
    rng: () => rng,
    pickAnswer: makeArithmeticPickFn(rng),
  };
}

function makeStudentEntry({ studentLabel, username, grade, seed }) {
  return {
    studentLabel,
    username,
    grade,
    scenario: makeMathScenarioForStudent({
      id: `phase-d-${studentLabel}-math`,
      studentLabel,
      profile: "average",
      operation: "addition",
      grade,
      questionCount: 6,
      seed,
    }),
  };
}

/** 3-student smoke: one student per grade-bucket (1, 3, 6). */
export const PHASE_D_SMOKE_PLAN = [
  makeStudentEntry({ studentLabel: "AAA1",  username: "AAA1",  grade: 1, seed: 0xa1d101 }),
  makeStudentEntry({ studentLabel: "AAA5",  username: "AAA5",  grade: 3, seed: 0xa1d105 }),
  makeStudentEntry({ studentLabel: "AAA11", username: "AAA11", grade: 6, seed: 0xa1d111 }),
];

/** 12-student full plan: every AAA student paired with their grade. */
export const PHASE_D_FULL_PLAN = [
  // Grade 1
  makeStudentEntry({ studentLabel: "AAA1",  username: "AAA1",  grade: 1, seed: 0xa1d101 }),
  makeStudentEntry({ studentLabel: "AAA2",  username: "AAA2",  grade: 1, seed: 0xa1d102 }),
  // Grade 2
  makeStudentEntry({ studentLabel: "AAA3",  username: "AAA3",  grade: 2, seed: 0xa1d103 }),
  makeStudentEntry({ studentLabel: "AAA4",  username: "AAA4",  grade: 2, seed: 0xa1d104 }),
  // Grade 3
  makeStudentEntry({ studentLabel: "AAA5",  username: "AAA5",  grade: 3, seed: 0xa1d105 }),
  makeStudentEntry({ studentLabel: "AAA6",  username: "AAA6",  grade: 3, seed: 0xa1d106 }),
  // Grade 4
  makeStudentEntry({ studentLabel: "AAA7",  username: "AAA7",  grade: 4, seed: 0xa1d107 }),
  makeStudentEntry({ studentLabel: "AAA8",  username: "AAA8",  grade: 4, seed: 0xa1d108 }),
  // Grade 5
  makeStudentEntry({ studentLabel: "AAA9",  username: "AAA9",  grade: 5, seed: 0xa1d109 }),
  makeStudentEntry({ studentLabel: "AAA10", username: "AAA10", grade: 5, seed: 0xa1d10a }),
  // Grade 6
  makeStudentEntry({ studentLabel: "AAA11", username: "AAA11", grade: 6, seed: 0xa1d10b }),
  makeStudentEntry({ studentLabel: "AAA12", username: "AAA12", grade: 6, seed: 0xa1d10c }),
];

export const PHASE_D_PLANS_BY_NAME = {
  smoke: PHASE_D_SMOKE_PLAN,
  full: PHASE_D_FULL_PLAN,
};

/**
 * Filter or select a plan by name and optionally narrow to specific
 * student labels. Used by run.mjs --phase d --plan smoke|full --students AAA1,AAA5
 */
export function selectPhaseDPlan({ planName, studentLabels }) {
  const base =
    PHASE_D_PLANS_BY_NAME[String(planName || "smoke").trim().toLowerCase()];
  if (!base) {
    throw new Error(
      `phase-d: unknown plan "${planName}". Valid: smoke | full.`
    );
  }
  const wanted = Array.isArray(studentLabels)
    ? studentLabels.map((s) => String(s).trim()).filter(Boolean)
    : [];
  if (wanted.length === 0) return base.slice();
  const byLabel = new Map(base.map((entry) => [entry.studentLabel, entry]));
  const picked = [];
  const missing = [];
  for (const label of wanted) {
    if (byLabel.has(label)) picked.push(byLabel.get(label));
    else missing.push(label);
  }
  if (missing.length > 0) {
    const known = base.map((e) => e.studentLabel).join(", ");
    throw new Error(
      `phase-d: unknown student label(s): ${missing.join(", ")}. ` +
        `Plan "${planName}" contains: ${known}`
    );
  }
  return picked;
}
