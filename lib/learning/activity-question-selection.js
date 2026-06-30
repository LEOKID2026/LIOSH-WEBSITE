/**
 * Activity / classroom question selection — uses display-level SSOT (Phase 1).
 * No duplicate level mapping here.
 */
import {
  activityDbEnumToDisplayLevel,
  isScienceSubjectId,
  normalizeSubjectIdForDisplayLevel,
  resolveActivitySourceDifficulties,
  sourceDifficultyToDisplayLevel,
} from "./display-level.js";

/** @typedef {"easy"|"medium"|"hard"} SourceDifficulty */

/**
 * Resolves allowed source difficulties for activity question generation.
 * Science: never advanced; hard legacy → hard pool only with displayLevel regular.
 *
 * @param {string|null|undefined} activityDifficultyRaw DB enum or legacy key
 * @param {string|null|undefined} subjectId
 * @returns {{ displayLevel: "regular"|"advanced", sourceDifficulties: SourceDifficulty[], rejectAdvanced: boolean }}
 */
export function resolveActivityGenerationPlan(activityDifficultyRaw, subjectId) {
  const subject = normalizeSubjectIdForDisplayLevel(subjectId);
  const key = String(activityDifficultyRaw || "mixed").trim().toLowerCase();

  if (isScienceSubjectId(subject)) {
    if (key === "hard" || key === "advanced") {
      return {
        displayLevel: "regular",
        sourceDifficulties: ["hard"],
        rejectAdvanced: false,
      };
    }
    return {
      displayLevel: "regular",
      sourceDifficulties: ["easy", "medium", "hard"],
      rejectAdvanced: true,
    };
  }

  const displayLevel = activityDbEnumToDisplayLevel(key) || "regular";
  if (displayLevel === "advanced") {
    return {
      displayLevel: "advanced",
      sourceDifficulties: ["hard"],
      rejectAdvanced: false,
    };
  }

  return {
    displayLevel: "regular",
    sourceDifficulties: resolveActivitySourceDifficulties(key, subjectId),
    rejectAdvanced: false,
  };
}

/**
 * @param {SourceDifficulty[]} sourceDifficulties
 * @param {number} attemptIndex
 * @returns {SourceDifficulty}
 */
export function pickSourceDifficultyForAttempt(sourceDifficulties, attemptIndex) {
  if (!Array.isArray(sourceDifficulties) || !sourceDifficulties.length) {
    return "medium";
  }
  return sourceDifficulties[attemptIndex % sourceDifficulties.length];
}

/**
 * @param {Record<string, unknown>} item
 * @param {SourceDifficulty} sourceDifficulty
 * @param {"regular"|"advanced"} displayLevel
 */
export function tagActivityQuestionLevelFields(item, sourceDifficulty, displayLevel) {
  return {
    ...item,
    difficulty: sourceDifficulty,
    sourceDifficulty,
    displayLevel,
  };
}

/**
 * @param {Record<string, unknown>} question
 * @param {SourceDifficulty[]} sourceDifficulties
 * @param {(q: Record<string, unknown>, sd: SourceDifficulty) => boolean} matcher
 */
export function bankQuestionMatchesSourceDifficulties(question, sourceDifficulties, matcher) {
  return sourceDifficulties.some((sd) => matcher(question, sd));
}

/**
 * @param {Record<string, unknown>} question
 * @param {SourceDifficulty} levelKey
 */
export function historyQuestionMatchesSourceDifficulty(question, levelKey) {
  const lvl = String(question.minLevel || question.assignedLevel || "easy")
    .trim()
    .toLowerCase();
  return lvl === levelKey;
}

/**
 * Merge moledet/geography bank rows for multiple source difficulties.
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {SourceDifficulty[]} sourceDifficulties
 * @param {(gradeKey: string, levelKey: string, topicKey: string) => unknown[]} listTopicQuestionsForGradeLevel
 * @returns {Array<{ row: Record<string, unknown>, sourceDifficulty: SourceDifficulty }>}
 */
export function mergeMoledetPoolsBySourceDifficulties(
  gradeKey,
  topicKey,
  sourceDifficulties,
  listTopicQuestionsForGradeLevel
) {
  const out = [];
  const seen = new Set();
  for (const sd of sourceDifficulties) {
    const batch = listTopicQuestionsForGradeLevel(gradeKey, sd, topicKey);
    if (!Array.isArray(batch)) continue;
    for (const row of batch) {
      if (!row || typeof row !== "object") continue;
      const stem = String(row.question || "").trim().slice(0, 48);
      const fp = `${topicKey}:${stem}`;
      if (seen.has(fp)) continue;
      seen.add(fp);
      out.push({ row, sourceDifficulty: sd });
    }
  }
  return out;
}

/**
 * Validates generated set uses only allowed source difficulties (probe helper).
 * @param {Array<{ sourceDifficulty?: string, difficulty?: string }>} questions
 * @param {SourceDifficulty[]} allowed
 */
export function assertQuestionsUseSourceDifficulties(questions, allowed) {
  const allowedSet = new Set(allowed);
  for (const q of questions) {
    const sd = String(q.sourceDifficulty || q.difficulty || "").toLowerCase();
    if (!allowedSet.has(sd)) {
      return { ok: false, reason: `unexpected sourceDifficulty "${sd}"`, allowed };
    }
  }
  return { ok: true, used: [...new Set(questions.map((q) => q.sourceDifficulty || q.difficulty))] };
}

/**
 * mixed must not collapse to medium-only.
 * @param {string|null|undefined} activityDifficultyRaw
 * @param {string|null|undefined} subjectId
 */
export function mixedMapsToMultipleSourceDifficulties(activityDifficultyRaw, subjectId) {
  const plan = resolveActivityGenerationPlan(activityDifficultyRaw, subjectId);
  return plan.sourceDifficulties.length > 1;
}

export { resolveActivitySourceDifficulties, sourceDifficultyToDisplayLevel };
