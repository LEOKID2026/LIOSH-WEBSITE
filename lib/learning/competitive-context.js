/**
 * Phase 6 — competitive mode context (challenge / speed / marathon).
 * Pure helpers for aggregation, weakness exclusion, and structured signals.
 */

export const COMPETITIVE_MODES = Object.freeze(["challenge", "speed", "marathon"]);

export const COMPETITIVE_SIGNAL_IDS = Object.freeze({
  SPEED_FLUENCY: "speed_fluency_candidate",
  CHALLENGE_ATTEMPT: "challenge_attempt",
  CHALLENGE_RESILIENCE: "challenge_resilience_candidate",
  MARATHON_ENDURANCE: "marathon_endurance_candidate",
  MARATHON_CONSISTENCY: "marathon_consistency_candidate",
});

/**
 * @param {string|null|undefined} mode
 */
export function isCompetitiveGameMode(mode) {
  const m = String(mode || "").trim().toLowerCase();
  return COMPETITIVE_MODES.includes(m);
}

/**
 * @param {string|null|undefined} evidenceCategory
 */
export function isCompetitiveEvidenceCategory(evidenceCategory) {
  return String(evidenceCategory || "").trim().toLowerCase() === "diagnostic_competitive";
}

/**
 * Option A — competitive wrong answers must not enter recentMistakes.
 * @param {{ evidenceCategory?: string, resolvedMode?: string }} params
 */
export function shouldExcludeFromRecentMistakes({ evidenceCategory, resolvedMode }) {
  if (isCompetitiveEvidenceCategory(evidenceCategory)) return true;
  return isCompetitiveGameMode(resolvedMode);
}

export function createCompetitiveByModeAccumulator() {
  return {
    challenge: {
      answers: 0,
      correct: 0,
      timeMsSum: 0,
      timeMsCount: 0,
      wrongFastCount: 0,
      sessionCount: 0,
      outcomes: [],
    },
    speed: {
      answers: 0,
      correct: 0,
      timeMsSum: 0,
      timeMsCount: 0,
      wrongFastCount: 0,
      sessionCount: 0,
      outcomes: [],
    },
    marathon: {
      answers: 0,
      correct: 0,
      timeMsSum: 0,
      timeMsCount: 0,
      wrongFastCount: 0,
      sessionCount: 0,
      outcomes: [],
    },
  };
}

/**
 * @param {ReturnType<typeof createCompetitiveByModeAccumulator>} acc
 * @param {string} mode
 * @param {{ isCorrect: boolean, timeMs?: number|null, isFast?: boolean }} metrics
 */
export function accumulateCompetitiveByModeEntry(acc, mode, { isCorrect, timeMs, isFast }) {
  const m = String(mode || "").trim().toLowerCase();
  if (!COMPETITIVE_MODES.includes(m)) return;
  const bucket = acc[m];
  bucket.answers += 1;
  if (isCorrect) bucket.correct += 1;
  else if (m === "speed" && isFast) bucket.wrongFastCount += 1;
  if (timeMs != null && Number.isFinite(Number(timeMs))) {
    bucket.timeMsSum += Number(timeMs);
    bucket.timeMsCount += 1;
  }
  bucket.outcomes.push(isCorrect === true);
}

/**
 * @param {ReturnType<typeof createCompetitiveByModeAccumulator>} acc
 * @param {string|null|undefined} mode
 */
export function incrementCompetitiveSessionCount(acc, mode) {
  const m = String(mode || "").trim().toLowerCase();
  if (!COMPETITIVE_MODES.includes(m)) return;
  acc[m].sessionCount += 1;
}

/**
 * @param {ReturnType<typeof createCompetitiveByModeAccumulator>[string]} bucket
 */
function finalizeModeBucket(bucket) {
  const answers = bucket.answers;
  const correct = bucket.correct;
  const accuracy = answers > 0 ? Number(((correct / answers) * 100).toFixed(2)) : 0;
  const avgTimeMs =
    bucket.timeMsCount > 0 ? Math.round(bucket.timeMsSum / bucket.timeMsCount) : null;
  /** @type {Record<string, unknown>} */
  const out = { answers, correct, accuracy, avgTimeMs };
  if (bucket.wrongFastCount > 0) out.wrongFastCount = bucket.wrongFastCount;
  if (bucket.sessionCount > 0) out.sessionCount = bucket.sessionCount;
  return out;
}

/**
 * @param {Record<string, { answers?: number, correct?: number, accuracy?: number, sessionCount?: number }>} byMode
 * @param {boolean[]} [marathonOutcomes]
 */
export function deriveCompetitiveSignals(byMode, marathonOutcomes = []) {
  /** @type {Array<Record<string, unknown>>} */
  const signals = [];
  const challenge = byMode.challenge || {};
  const speed = byMode.speed || {};
  const marathon = byMode.marathon || {};

  const challengeAnswers = Number(challenge.answers) || 0;
  const challengeSessions = Number(challenge.sessionCount) || 0;
  const challengeAccuracy = Number(challenge.accuracy) || 0;
  const speedAnswers = Number(speed.answers) || 0;
  const speedAccuracy = Number(speed.accuracy) || 0;
  const marathonAnswers = Number(marathon.answers) || 0;

  if (challengeAnswers >= 5 || challengeSessions >= 1) {
    signals.push({
      id: COMPETITIVE_SIGNAL_IDS.CHALLENGE_ATTEMPT,
      mode: "challenge",
      answers: challengeAnswers,
      sessionCount: challengeSessions,
    });
  }
  if (challengeAnswers >= 10 && challengeAccuracy >= 55) {
    signals.push({
      id: COMPETITIVE_SIGNAL_IDS.CHALLENGE_RESILIENCE,
      mode: "challenge",
      answers: challengeAnswers,
      accuracy: challengeAccuracy,
    });
  }
  if (speedAnswers >= 15 && speedAccuracy >= 70) {
    signals.push({
      id: COMPETITIVE_SIGNAL_IDS.SPEED_FLUENCY,
      mode: "speed",
      answers: speedAnswers,
      accuracy: speedAccuracy,
    });
  }
  if (marathonAnswers >= 30) {
    signals.push({
      id: COMPETITIVE_SIGNAL_IDS.MARATHON_ENDURANCE,
      mode: "marathon",
      answers: marathonAnswers,
    });
  }

  if (marathonOutcomes.length >= 20) {
    const mid = Math.floor(marathonOutcomes.length / 2);
    const first = marathonOutcomes.slice(0, mid);
    const second = marathonOutcomes.slice(mid);
    if (first.length > 0 && second.length > 0) {
      const acc1 = (first.filter(Boolean).length / first.length) * 100;
      const acc2 = (second.filter(Boolean).length / second.length) * 100;
      if (Math.abs(acc1 - acc2) < 15) {
        signals.push({
          id: COMPETITIVE_SIGNAL_IDS.MARATHON_CONSISTENCY,
          mode: "marathon",
          answers: marathonOutcomes.length,
          firstHalfAccuracy: Number(acc1.toFixed(2)),
          secondHalfAccuracy: Number(acc2.toFixed(2)),
          accuracyDrift: Number(Math.abs(acc1 - acc2).toFixed(2)),
        });
      }
    }
  }

  return signals;
}

/**
 * @param {ReturnType<typeof createCompetitiveByModeAccumulator>} byModeAcc
 * @param {{ totalAnswers: number, totalCorrect: number, overallAccuracy: number }} totals
 */
export function buildCompetitiveContext(byModeAcc, totals) {
  const byMode = {
    challenge: finalizeModeBucket(byModeAcc.challenge),
    speed: finalizeModeBucket(byModeAcc.speed),
    marathon: finalizeModeBucket(byModeAcc.marathon),
  };
  const signals = deriveCompetitiveSignals(byMode, byModeAcc.marathon.outcomes || []);
  return {
    totalAnswers: totals.totalAnswers,
    totalCorrect: totals.totalCorrect,
    overallAccuracy: totals.overallAccuracy,
    byMode,
    signals,
  };
}
