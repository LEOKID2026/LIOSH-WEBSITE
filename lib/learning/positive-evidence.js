/**
 * Phase 7 — positive evidence engine (structured signals only, no Hebrew copy).
 */

const REPORT_AGG_SUBJECTS = [
  "math",
  "geometry",
  "english",
  "hebrew",
  "science",
  "moledet_geography",
];

export const POSITIVE_EVIDENCE_VERSION = "phase-7-positive-evidence-v1";

export const POSITIVE_SIGNAL_IDS = Object.freeze({
  MASTERY_CANDIDATE: "mastery_candidate",
  STABLE_MASTERY: "stable_mastery",
  IMPROVEMENT_CANDIDATE: "improvement_candidate",
  PERSISTENCE_CANDIDATE: "persistence_candidate",
  SELF_DIRECTED_LEARNING: "self_directed_learning",
  POST_BOOK_PRACTICE: "post_book_practice",
  POST_BOOK_IMPROVEMENT: "post_book_improvement",
  STEP_BY_STEP_LEARNER: "step_by_step_learner",
  RETRY_SUCCESS: "retry_success",
  SPEED_FLUENCY_CANDIDATE: "speed_fluency_candidate",
  CHALLENGE_RESILIENCE_CANDIDATE: "challenge_resilience_candidate",
  MARATHON_ENDURANCE_CANDIDATE: "marathon_endurance_candidate",
  MARATHON_CONSISTENCY_CANDIDATE: "marathon_consistency_candidate",
  NOT_ENOUGH_DATA: "not_enough_data",
});

/** Approved competitive signal IDs — passthrough from competitiveContext only. */
export const COMPETITIVE_PASSTHROUGH_SIGNAL_IDS = Object.freeze([
  POSITIVE_SIGNAL_IDS.SPEED_FLUENCY_CANDIDATE,
  POSITIVE_SIGNAL_IDS.CHALLENGE_RESILIENCE_CANDIDATE,
  POSITIVE_SIGNAL_IDS.MARATHON_ENDURANCE_CANDIDATE,
  POSITIVE_SIGNAL_IDS.MARATHON_CONSISTENCY_CANDIDATE,
]);

export const POSITIVE_EVIDENCE_THRESHOLDS = Object.freeze({
  TOPIC_DIAGNOSTIC_MIN: 5,
  SUBJECT_DIAGNOSTIC_MIN: 8,
  STUDENT_DIAGNOSTIC_MIN: 5,
  MASTERY_TOPIC_ANSWERS: 8,
  MASTERY_TOPIC_ACCURACY: 80,
  MASTERY_SUBJECT_ANSWERS: 10,
  MASTERY_SUBJECT_ACCURACY: 80,
  IMPROVEMENT_MIN_DAYS: 4,
  IMPROVEMENT_DELTA: 8,
  STABLE_MASTERY_MIN_DAYS: 2,
  STABLE_MASTERY_DRIFT_MAX: 10,
  STABLE_MASTERY_HALF_MIN: 75,
  PERSISTENCE_MIN_ANSWERS: 5,
  PERSISTENCE_MIN_MANY_HINTS: 2,
  SELF_DIRECTED_LEARNING_ANSWERS: 15,
  SELF_DIRECTED_LEARNING_SESSIONS: 3,
  SELF_DIRECTED_DIAGNOSTIC_ANSWERS: 8,
  SELF_DIRECTED_DIAGNOSTIC_ACCURACY: 70,
  POST_BOOK_MINUTES: 5,
  POST_BOOK_PRACTICE_COUNT: 3,
  POST_BOOK_IMPROVEMENT_COUNT: 5,
  POST_BOOK_IMPROVEMENT_ACCURACY: 65,
  STEP_BY_STEP_MIN_COUNT: 3,
  STEP_BY_STEP_INDEPENDENT_ANSWERS: 5,
  STEP_BY_STEP_INDEPENDENT_ACCURACY: 65,
  RETRY_MIN_CORRECT: 3,
  RETRY_MIN_PRIOR_WRONG: 2,
  MANY_HINTS: 3,
});

function topicKey(subject, topic) {
  return `${subject}::${topic}`;
}

function parseAnswerMs(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function makeSignal(id, scope, evidence, extra = {}) {
  return {
    id,
    scope,
    ...extra,
    evidence,
    source: extra.source || "aggregator",
  };
}

function makeNotEnoughData(scope, diagnosticAnswers, required, extra = {}) {
  return {
    id: POSITIVE_SIGNAL_IDS.NOT_ENOUGH_DATA,
    scope,
    diagnosticAnswers,
    required,
    reason: "below_diagnostic_minimum",
    ...extra,
  };
}

function diagnosticConfidenceForCount(count, minimum) {
  return count >= minimum ? "sufficient" : "insufficient";
}

function sortedDailyEntries(dailyMap) {
  return Object.entries(dailyMap || {})
    .map(([date, row]) => ({
      date,
      answers: Number(row?.answers) || 0,
      correct: Number(row?.correct) || 0,
    }))
    .filter((row) => row.answers > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function accuracyFromRows(rows) {
  let correct = 0;
  let total = 0;
  for (const row of rows) {
    correct += row.correct;
    total += row.answers;
  }
  return total > 0 ? Number(((correct / total) * 100).toFixed(2)) : null;
}

function detectImprovementFromDaily(dailyMap) {
  const rows = sortedDailyEntries(dailyMap);
  if (rows.length < POSITIVE_EVIDENCE_THRESHOLDS.IMPROVEMENT_MIN_DAYS) {
    return null;
  }
  const half = Math.floor(rows.length / 2);
  const first = rows.slice(0, half);
  const second = rows.slice(half);
  const a1 = accuracyFromRows(first);
  const a2 = accuracyFromRows(second);
  if (a1 == null || a2 == null) return null;
  if (a2 - a1 >= POSITIVE_EVIDENCE_THRESHOLDS.IMPROVEMENT_DELTA) {
    return { firstHalfAccuracy: a1, secondHalfAccuracy: a2, diagnosticDailyDays: rows.length };
  }
  return null;
}

function detectStableMasteryFromDaily(dailyMap, masteryMet) {
  if (!masteryMet) return null;
  const rows = sortedDailyEntries(dailyMap);
  const daysWithActivity = rows.length;
  if (daysWithActivity < POSITIVE_EVIDENCE_THRESHOLDS.STABLE_MASTERY_MIN_DAYS) return null;
  const half = Math.floor(rows.length / 2);
  const first = rows.slice(0, half);
  const second = rows.slice(half);
  const a1 = accuracyFromRows(first);
  const a2 = accuracyFromRows(second);
  if (a1 == null || a2 == null) return null;
  const drift = Math.abs(a1 - a2);
  const bothHigh =
    a1 >= POSITIVE_EVIDENCE_THRESHOLDS.STABLE_MASTERY_HALF_MIN &&
    a2 >= POSITIVE_EVIDENCE_THRESHOLDS.STABLE_MASTERY_HALF_MIN;
  if (drift <= POSITIVE_EVIDENCE_THRESHOLDS.STABLE_MASTERY_DRIFT_MAX || bothHigh) {
    return {
      diagnosticDailyDays: daysWithActivity,
      firstHalfAccuracy: a1,
      secondHalfAccuracy: a2,
      accuracyDrift: Number(drift.toFixed(2)),
    };
  }
  return null;
}

export function createPositiveEvidenceAccumulator() {
  return {
    diagnosticDailyStudent: {},
    diagnosticDailyByTopic: {},
    diagnosticDailyBySubject: {},
    postBook: { total: 0, correct: 0 },
    byTopic: {},
    bySubject: {},
    learningSessionCountBySubject: {},
  };
}

function ensureTopicAcc(acc, subject, topic) {
  const key = topicKey(subject, topic);
  if (!acc.byTopic[key]) {
    acc.byTopic[key] = {
      firstStepByStepMs: null,
      independentAfterStepByStep: { answers: 0, correct: 0 },
      practiceMistakesCorrect: 0,
    };
  }
  return acc.byTopic[key];
}

function ensureSubjectAcc(acc, subject) {
  if (!acc.bySubject[subject]) {
    acc.bySubject[subject] = {
      firstLearningMs: null,
      diagnosticAfterLearning: { answers: 0, correct: 0 },
    };
  }
  return acc.bySubject[subject];
}

function bumpDiagnosticDaily(map, dayKey, isCorrect) {
  if (!dayKey) return;
  if (!map[dayKey]) map[dayKey] = { answers: 0, correct: 0 };
  map[dayKey].answers += 1;
  if (isCorrect) map[dayKey].correct += 1;
}

/**
 * @param {ReturnType<typeof createPositiveEvidenceAccumulator>} acc
 */
export function incrementLearningSessionCount(acc, subject) {
  if (!subject) return;
  acc.learningSessionCountBySubject[subject] =
    (acc.learningSessionCountBySubject[subject] || 0) + 1;
}

/**
 * Record per-answer evidence used by Phase 7 signal derivation.
 * @param {ReturnType<typeof createPositiveEvidenceAccumulator>} acc
 */
export function accumulatePositiveEvidenceEntry(
  acc,
  {
    subject,
    topic,
    dayKey,
    answerIso,
    isCorrect,
    resolvedMode,
    isDiagnosticEligible,
    evidenceCategory,
    afterStepByStep,
    contextAfterBookReading,
    isManyHints,
  }
) {
  const isCompetitive = evidenceCategory === "diagnostic_competitive";
  const isIndependentDiagnostic =
    isDiagnosticEligible === true && !isCompetitive && afterStepByStep !== true;
  const isLearningEvidence = isDiagnosticEligible !== true && !isCompetitive;
  const answerMs = parseAnswerMs(answerIso);

  if (isIndependentDiagnostic && dayKey) {
    bumpDiagnosticDaily(acc.diagnosticDailyStudent, dayKey, isCorrect);
    bumpDiagnosticDaily(acc.diagnosticDailyBySubject[subject] || (acc.diagnosticDailyBySubject[subject] = {}), dayKey, isCorrect);
    const tDaily =
      acc.diagnosticDailyByTopic[topicKey(subject, topic)] ||
      (acc.diagnosticDailyByTopic[topicKey(subject, topic)] = {});
    bumpDiagnosticDaily(tDaily, dayKey, isCorrect);
  }

  if (contextAfterBookReading === true) {
    acc.postBook.total += 1;
    if (isCorrect) acc.postBook.correct += 1;
  }

  const topicAcc = ensureTopicAcc(acc, subject, topic);

  if (afterStepByStep === true && answerMs != null) {
    if (topicAcc.firstStepByStepMs == null || answerMs < topicAcc.firstStepByStepMs) {
      topicAcc.firstStepByStepMs = answerMs;
    }
  }

  if (isIndependentDiagnostic) {
    if (
      topicAcc.firstStepByStepMs != null &&
      answerMs != null &&
      answerMs > topicAcc.firstStepByStepMs
    ) {
      topicAcc.independentAfterStepByStep.answers += 1;
      if (isCorrect) topicAcc.independentAfterStepByStep.correct += 1;
    }

    const subjectAcc = ensureSubjectAcc(acc, subject);
    if (
      subjectAcc.firstLearningMs != null &&
      answerMs != null &&
      answerMs > subjectAcc.firstLearningMs
    ) {
      subjectAcc.diagnosticAfterLearning.answers += 1;
      if (isCorrect) subjectAcc.diagnosticAfterLearning.correct += 1;
    }
  }

  if (isLearningEvidence && answerMs != null) {
    const subjectAcc = ensureSubjectAcc(acc, subject);
    if (subjectAcc.firstLearningMs == null || answerMs < subjectAcc.firstLearningMs) {
      subjectAcc.firstLearningMs = answerMs;
    }
  }

  if (resolvedMode === "practice_mistakes" && isCorrect) {
    topicAcc.practiceMistakesCorrect += 1;
  }

  void isManyHints;
}

function passthroughCompetitiveSignals(competitiveContext) {
  const raw = Array.isArray(competitiveContext?.signals) ? competitiveContext.signals : [];
  return raw
    .filter((s) => s && COMPETITIVE_PASSTHROUGH_SIGNAL_IDS.includes(s.id))
    .map((s) =>
      makeSignal(
        s.id,
        "behavior",
        { ...s },
        { mode: s.mode, source: "competitive_context" }
      )
    );
}

function enrichBookBehaviorSignals(learningActivity, bookSignals) {
  const minutes = Number(learningActivity?.bookReadingMinutes) || 0;
  const postBookPracticeCount = Number(learningActivity?.postBookPracticeCount) || 0;

  if (
    minutes >= POSITIVE_EVIDENCE_THRESHOLDS.POST_BOOK_MINUTES &&
    postBookPracticeCount >= POSITIVE_EVIDENCE_THRESHOLDS.POST_BOOK_PRACTICE_COUNT
  ) {
    bookSignals.push(
      makeSignal(POSITIVE_SIGNAL_IDS.POST_BOOK_PRACTICE, "behavior", {
        bookReadingMinutes: minutes,
        postBookPracticeCount,
        bookPagesRead: Number(learningActivity?.bookPagesRead) || 0,
      })
    );
  }

  return bookSignals;
}

function enrichPostBookImprovementSignal(acc, bookSignals) {
  const total = acc.postBook.total;
  const correct = acc.postBook.correct;
  if (total < POSITIVE_EVIDENCE_THRESHOLDS.POST_BOOK_IMPROVEMENT_COUNT) return bookSignals;
  const accuracy = Number(((correct / total) * 100).toFixed(2));
  if (accuracy >= POSITIVE_EVIDENCE_THRESHOLDS.POST_BOOK_IMPROVEMENT_ACCURACY) {
    bookSignals.push(
      makeSignal(POSITIVE_SIGNAL_IDS.POST_BOOK_IMPROVEMENT, "behavior", {
        postBookAnswers: total,
        postBookCorrect: correct,
        postBookAccuracy: accuracy,
      })
    );
  }
  return bookSignals;
}

/**
 * @param {Record<string, unknown>} subjects
 * @param {Record<string, unknown>} summary
 * @param {ReturnType<typeof createPositiveEvidenceAccumulator>} acc
 * @param {Record<string, unknown>|null} competitiveContext
 * @param {Record<string, unknown>|null} [learningActivity]
 */
export function buildPositiveEvidence(subjects, summary, acc, competitiveContext, learningActivity = null) {
  const studentDiagnosticAnswers = Number(summary?.diagnosticAnswers) || 0;
  const studentDiagnosticAccuracy = Number(summary?.diagnosticAccuracy) || 0;

  const studentSignals = [];
  const studentNotEnough = [];
  if (studentDiagnosticAnswers < POSITIVE_EVIDENCE_THRESHOLDS.STUDENT_DIAGNOSTIC_MIN) {
    studentNotEnough.push(
      makeNotEnoughData("student", studentDiagnosticAnswers, POSITIVE_EVIDENCE_THRESHOLDS.STUDENT_DIAGNOSTIC_MIN)
    );
  }

  const studentImprovement = detectImprovementFromDaily(acc.diagnosticDailyStudent);
  if (studentImprovement) {
    studentSignals.push(
      makeSignal(POSITIVE_SIGNAL_IDS.IMPROVEMENT_CANDIDATE, "student", {
        diagnosticAnswers: studentDiagnosticAnswers,
        ...studentImprovement,
      })
    );
  }

  const bySubject = {};
  const byTopic = [];
  const learningSignals = [];
  const retrySignals = [];

  for (const subject of REPORT_AGG_SUBJECTS) {
    const subj = subjects?.[subject];
    if (!subj || typeof subj !== "object") continue;

    const diagnosticAnswers = Number(subj.diagnosticAnswers) || 0;
    const diagnosticAccuracy = Number(subj.diagnosticAccuracy) || 0;
    const correctManyHintsAnswers = Number(subj.correctManyHintsAnswers) || 0;
    const learningAnswers = Number(subj.learningAnswers) || 0;
    const learningSessions = Number(acc.learningSessionCountBySubject[subject]) || 0;

    const subjectSignals = [];
    const subjectNotEnough = [];
    const confidence = diagnosticConfidenceForCount(
      diagnosticAnswers,
      POSITIVE_EVIDENCE_THRESHOLDS.SUBJECT_DIAGNOSTIC_MIN
    );

    if (diagnosticAnswers < POSITIVE_EVIDENCE_THRESHOLDS.SUBJECT_DIAGNOSTIC_MIN) {
      subjectNotEnough.push(
        makeNotEnoughData("subject", diagnosticAnswers, POSITIVE_EVIDENCE_THRESHOLDS.SUBJECT_DIAGNOSTIC_MIN, {
          subject,
        })
      );
    }

    const subjectMasteryMet =
      diagnosticAnswers >= POSITIVE_EVIDENCE_THRESHOLDS.MASTERY_SUBJECT_ANSWERS &&
      diagnosticAccuracy >= POSITIVE_EVIDENCE_THRESHOLDS.MASTERY_SUBJECT_ACCURACY;

    if (subjectMasteryMet) {
      subjectSignals.push(
        makeSignal(
          POSITIVE_SIGNAL_IDS.MASTERY_CANDIDATE,
          "subject",
          { diagnosticAnswers, diagnosticAccuracy },
          { subject }
        )
      );
    }

    const subjectStable = detectStableMasteryFromDaily(
      acc.diagnosticDailyBySubject[subject],
      subjectMasteryMet
    );
    if (subjectStable) {
      subjectSignals.push(
        makeSignal(
          POSITIVE_SIGNAL_IDS.STABLE_MASTERY,
          "subject",
          { diagnosticAnswers, diagnosticAccuracy, ...subjectStable },
          { subject }
        )
      );
    }

    const subjectImprovement = detectImprovementFromDaily(acc.diagnosticDailyBySubject[subject]);
    if (subjectImprovement) {
      subjectSignals.push(
        makeSignal(
          POSITIVE_SIGNAL_IDS.IMPROVEMENT_CANDIDATE,
          "subject",
          { diagnosticAnswers, diagnosticAccuracy, ...subjectImprovement },
          { subject }
        )
      );
    }

    if (
      diagnosticAnswers >= POSITIVE_EVIDENCE_THRESHOLDS.PERSISTENCE_MIN_ANSWERS &&
      correctManyHintsAnswers >= POSITIVE_EVIDENCE_THRESHOLDS.PERSISTENCE_MIN_MANY_HINTS
    ) {
      const sig = makeSignal(
        POSITIVE_SIGNAL_IDS.PERSISTENCE_CANDIDATE,
        "subject",
        { diagnosticAnswers, diagnosticAccuracy, correctManyHintsAnswers },
        { subject }
      );
      subjectSignals.push(sig);
      learningSignals.push(sig);
    }

    const subjectAcc = acc.bySubject[subject];
    const afterLearning = subjectAcc?.diagnosticAfterLearning || { answers: 0, correct: 0 };
    const afterLearningAccuracy =
      afterLearning.answers > 0
        ? Number(((afterLearning.correct / afterLearning.answers) * 100).toFixed(2))
        : 0;
    const selfDirectedGate =
      learningAnswers >= POSITIVE_EVIDENCE_THRESHOLDS.SELF_DIRECTED_LEARNING_ANSWERS ||
      learningSessions >= POSITIVE_EVIDENCE_THRESHOLDS.SELF_DIRECTED_LEARNING_SESSIONS;
    if (
      selfDirectedGate &&
      afterLearning.answers >= POSITIVE_EVIDENCE_THRESHOLDS.SELF_DIRECTED_DIAGNOSTIC_ANSWERS &&
      afterLearningAccuracy >= POSITIVE_EVIDENCE_THRESHOLDS.SELF_DIRECTED_DIAGNOSTIC_ACCURACY
    ) {
      const sig = makeSignal(
        POSITIVE_SIGNAL_IDS.SELF_DIRECTED_LEARNING,
        "subject",
        {
          learningAnswers,
          learningSessions,
          subsequentDiagnosticAnswers: afterLearning.answers,
          subsequentDiagnosticAccuracy: afterLearningAccuracy,
        },
        { subject }
      );
      subjectSignals.push(sig);
      learningSignals.push(sig);
    }

    bySubject[subject] = {
      diagnosticAnswers,
      diagnosticAccuracy,
      confidence,
      signals: subjectSignals,
      notEnoughData: subjectNotEnough,
    };

    for (const [topicName, topicData] of Object.entries(subj.topics || {})) {
      if (!topicData || typeof topicData !== "object") continue;
      const tAnswers = Number(topicData.diagnosticAnswers) || 0;
      const tAccuracy = Number(topicData.diagnosticAccuracy) || 0;
      const tHints = Number(topicData.correctManyHintsAnswers) || 0;
      const tStepByStep = Number(topicData.stepByStepCount) || 0;
      const tWrong = Number(topicData.diagnosticWrong) || 0;
      const tKey = topicKey(subject, topicName);
      const tAcc = acc.byTopic[tKey] || {
        independentAfterStepByStep: { answers: 0, correct: 0 },
        practiceMistakesCorrect: 0,
      };

      const topicConfidence = diagnosticConfidenceForCount(
        tAnswers,
        POSITIVE_EVIDENCE_THRESHOLDS.TOPIC_DIAGNOSTIC_MIN
      );
      const topicSignals = [];
      const topicNotEnough = [];

      if (tAnswers < POSITIVE_EVIDENCE_THRESHOLDS.TOPIC_DIAGNOSTIC_MIN) {
        topicNotEnough.push(
          makeNotEnoughData("topic", tAnswers, POSITIVE_EVIDENCE_THRESHOLDS.TOPIC_DIAGNOSTIC_MIN, {
            subject,
            topic: topicName,
          })
        );
      }

      const topicMasteryMet =
        tAnswers >= POSITIVE_EVIDENCE_THRESHOLDS.MASTERY_TOPIC_ANSWERS &&
        tAccuracy >= POSITIVE_EVIDENCE_THRESHOLDS.MASTERY_TOPIC_ACCURACY;

      if (topicMasteryMet) {
        topicSignals.push(
          makeSignal(
            POSITIVE_SIGNAL_IDS.MASTERY_CANDIDATE,
            "topic",
            { diagnosticAnswers: tAnswers, diagnosticAccuracy: tAccuracy },
            { subject, topic: topicName }
          )
        );
      }

      const topicStable = detectStableMasteryFromDaily(
        acc.diagnosticDailyByTopic[tKey],
        topicMasteryMet
      );
      if (topicStable) {
        topicSignals.push(
          makeSignal(
            POSITIVE_SIGNAL_IDS.STABLE_MASTERY,
            "topic",
            { diagnosticAnswers: tAnswers, diagnosticAccuracy: tAccuracy, ...topicStable },
            { subject, topic: topicName }
          )
        );
      }

      if (
        tAnswers >= POSITIVE_EVIDENCE_THRESHOLDS.PERSISTENCE_MIN_ANSWERS &&
        tHints >= POSITIVE_EVIDENCE_THRESHOLDS.PERSISTENCE_MIN_MANY_HINTS
      ) {
        const sig = makeSignal(
          POSITIVE_SIGNAL_IDS.PERSISTENCE_CANDIDATE,
          "topic",
          {
            diagnosticAnswers: tAnswers,
            diagnosticAccuracy: tAccuracy,
            correctManyHintsAnswers: tHints,
          },
          { subject, topic: topicName }
        );
        topicSignals.push(sig);
        learningSignals.push(sig);
      }

      const indep = tAcc.independentAfterStepByStep;
      const indepAcc =
        indep.answers > 0 ? Number(((indep.correct / indep.answers) * 100).toFixed(2)) : 0;
      if (
        tStepByStep >= POSITIVE_EVIDENCE_THRESHOLDS.STEP_BY_STEP_MIN_COUNT &&
        indep.answers >= POSITIVE_EVIDENCE_THRESHOLDS.STEP_BY_STEP_INDEPENDENT_ANSWERS &&
        indepAcc >= POSITIVE_EVIDENCE_THRESHOLDS.STEP_BY_STEP_INDEPENDENT_ACCURACY
      ) {
        const sig = makeSignal(
          POSITIVE_SIGNAL_IDS.STEP_BY_STEP_LEARNER,
          "topic",
          {
            stepByStepCount: tStepByStep,
            independentDiagnosticAnswers: indep.answers,
            independentDiagnosticAccuracy: indepAcc,
          },
          { subject, topic: topicName }
        );
        topicSignals.push(sig);
        learningSignals.push(sig);
      }

      if (
        tWrong >= POSITIVE_EVIDENCE_THRESHOLDS.RETRY_MIN_PRIOR_WRONG &&
        tAcc.practiceMistakesCorrect >= POSITIVE_EVIDENCE_THRESHOLDS.RETRY_MIN_CORRECT
      ) {
        const sig = makeSignal(
          POSITIVE_SIGNAL_IDS.RETRY_SUCCESS,
          "topic",
          {
            diagnosticWrong: tWrong,
            practiceMistakesCorrect: tAcc.practiceMistakesCorrect,
          },
          { subject, topic: topicName }
        );
        topicSignals.push(sig);
        retrySignals.push(sig);
      }

      byTopic.push({
        subject,
        topic: topicName,
        diagnosticAnswers: tAnswers,
        diagnosticAccuracy: tAccuracy,
        diagnosticConfidence: topicConfidence,
        signals: topicSignals,
        notEnoughData: topicNotEnough,
      });
    }
  }

  let bookSignals = [];
  bookSignals = enrichBookBehaviorSignals(learningActivity, bookSignals);
  bookSignals = enrichPostBookImprovementSignal(acc, bookSignals);

  const competitiveSignals = passthroughCompetitiveSignals(competitiveContext);

  const diagnosticDailyDays = sortedDailyEntries(acc.diagnosticDailyStudent).length;

  return {
    version: POSITIVE_EVIDENCE_VERSION,
    student: {
      diagnosticAnswers: studentDiagnosticAnswers,
      diagnosticAccuracy: studentDiagnosticAccuracy,
      confidence: diagnosticConfidenceForCount(
        studentDiagnosticAnswers,
        POSITIVE_EVIDENCE_THRESHOLDS.STUDENT_DIAGNOSTIC_MIN
      ),
      signals: studentSignals,
      notEnoughData: studentNotEnough,
    },
    bySubject,
    byTopic,
    behaviors: {
      book: { signals: bookSignals },
      learning: { signals: learningSignals },
      competitive: { signals: competitiveSignals },
      retry: { signals: retrySignals },
    },
    meta: {
      diagnosticDailyDays,
      thresholdsVersion: "2026-06-phase7",
    },
  };
}
