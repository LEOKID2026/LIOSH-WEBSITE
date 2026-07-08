import { normalizeGradeLevelToKey } from "../learning-student-defaults.js";
import {
  effectivePracticeAnswerCountFromSources,
  effectivePracticeCorrectCount,
  effectivePracticeMetrics,
  effectivePracticeMetricsFromSources,
  effectivePracticeSummaryAnswerCount,
  effectivePracticeSummaryCorrectCount,
  effectivePracticeSummaryWrongCount,
  effectivePracticeWrongCount,
  hasDiagnosticEvidence,
} from "../learning/report-practice-counts.js";
import {
  sanitizeReportDurationSeconds,
} from "../parent-server/report-duration-sanity.js";
import { pickActivityTimestampFields } from "./parent-report-activity-time.js";
import { buildTopicBridgeFieldProvenanceFromAdapterTopic } from "./bridge-report-provenance.js";
import { dominantDisplayLevelFromCounts } from "../learning/session-evidence-levels.js";
import { activityDbEnumToDisplayLevel } from "../learning/display-level.js";

export const REPORT_TOPIC_GRADE_SEP = "::grade:";

const SUBJECTS = ["math", "geometry", "english", "hebrew", "science", "history", "moledet_geography"];
const RECENT_MISTAKES_LIMIT = 20;

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function dominantBucketFromCounts(counts, { excludeUnknownFirst = true } = {}) {
  if (!counts || typeof counts !== "object") return null;
  const tryPick = (skipUnknown) => {
    let bestKey = null;
    let best = -1;
    for (const [k, v] of Object.entries(counts)) {
      if (skipUnknown && k === "unknown") continue;
      const n = Math.max(0, Math.floor(safeNumber(v)));
      if (n > best) {
        best = n;
        bestKey = k;
      }
    }
    return best > 0 ? bestKey : null;
  };
  return tryPick(excludeUnknownFirst) || tryPick(false);
}

function safeString(value, maxLen = 1000) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function normalizeAccuracy(correct, total) {
  const c = Math.max(0, safeNumber(correct));
  const t = Math.max(0, safeNumber(total));
  if (t <= 0) return 0;
  return Number(((c / t) * 100).toFixed(2));
}

function createEmptyTopic() {
  return {
    total: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    durationSeconds: 0,
  };
}

function createEmptySubject() {
  return {
    total: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    durationSeconds: 0,
    topics: {},
    mistakes: [],
  };
}

function buildEmptySubjects() {
  const out = {};
  for (const subject of SUBJECTS) {
    out[subject] = createEmptySubject();
  }
  return out;
}

function sanitizeDailyActivity(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => ({
      date: safeString(item?.date, 10),
      sessions: Math.max(0, Math.floor(safeNumber(item?.sessions))),
      answers: Math.max(0, Math.floor(safeNumber(item?.answers))),
      correct: Math.max(0, Math.floor(safeNumber(item?.correct))),
      wrong: Math.max(0, Math.floor(safeNumber(item?.wrong))),
      durationSeconds: Math.max(0, Math.floor(safeNumber(item?.durationSeconds))),
    }))
    .filter(item => item.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function sanitizeRecentMistakes(items) {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, RECENT_MISTAKES_LIMIT)
    .map((item) => sanitizeDiagnosticMistakeRow(item))
    .filter((item) => item.subject && SUBJECTS.includes(item.subject));
}

/**
 * Full diagnostic mistake row for engine evidence (no field stripping beyond safety caps).
 * @param {Record<string, unknown>|null|undefined} item
 */
function sanitizeDiagnosticMistakeRow(item) {
  if (!item || typeof item !== "object") return null;
  const {
    _canonicalMeta: _stripCanonical,
    metadata: rawMetadata,
    ...rest
  } = item;
  /** @type {Record<string, unknown>} */
  const out = {
    subject: safeString(item.subject, 40),
    topic: safeString(item.topic, 120),
    topicBaseKey: safeString(item.topicBaseKey, 120),
    normalizedTopicKey: safeString(item.normalizedTopicKey, 140),
    questionId: safeString(item.questionId, 180),
    sessionId: safeString(item.sessionId, 180),
    answerId: safeString(item.answerId, 180),
    prompt: safeString(item.prompt, 500),
    expectedAnswer: safeString(item.expectedAnswer, 300),
    userAnswer: safeString(item.userAnswer, 300),
    answeredAt: safeString(item.answeredAt, 40),
    hintsUsed: item.hintsUsed != null ? Math.max(0, Math.floor(safeNumber(item.hintsUsed))) : null,
    timeSpentMs: item.timeSpentMs != null ? Math.max(0, Math.floor(safeNumber(item.timeSpentMs))) : null,
    mode: safeString(item.mode, 40),
    level: safeString(item.level, 40),
    registeredGradeLevel: safeString(item.registeredGradeLevel, 20),
    contentGradeLevel: safeString(item.contentGradeLevel, 20),
    gradeRelation: safeString(item.gradeRelation, 20),
    evidenceSource: safeString(item.evidenceSource, 40),
    evidenceCategory: safeString(item.evidenceCategory, 60),
    patternFamily: safeString(item.patternFamily, 120),
    distractorFamily: safeString(item.distractorFamily, 120),
    skillId: safeString(item.skillId, 160),
    subskillId: safeString(item.subskillId, 160),
    subSkill: safeString(item.subSkill, 160),
    questionType: safeString(item.questionType, 80),
    diagnosticSkillId: safeString(item.diagnosticSkillId, 160),
    metadataPresent: item.metadataPresent === true,
    reasonMissingMetadata: safeString(item.reasonMissingMetadata, 200),
  };
  if (Array.isArray(item.taxonomyCandidateIds)) {
    out.taxonomyCandidateIds = item.taxonomyCandidateIds
      .map((id) => safeString(id, 40))
      .filter(Boolean)
      .slice(0, 12);
  }
  if (Array.isArray(item.possibleErrorPatterns)) {
    out.possibleErrorPatterns = item.possibleErrorPatterns
      .map((t) => safeString(t, 120))
      .filter(Boolean)
      .slice(0, 12);
  }
  if (rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)) {
    out.metadata = rawMetadata;
  }
  if (item.diagnosticMetadata && typeof item.diagnosticMetadata === "object" && !Array.isArray(item.diagnosticMetadata)) {
    out.diagnosticMetadata = item.diagnosticMetadata;
  }
  for (const [k, v] of Object.entries(rest)) {
    if (out[k] !== undefined) continue;
    if (k.startsWith("_")) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v == null) {
      out[k] = v;
    }
  }
  return out;
}

function sanitizeDiagnosticMistakes(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => sanitizeDiagnosticMistakeRow(item)).filter(Boolean);
}

function sanitizeProbeEvidence(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => ({
      isDiagnosticProbeAttempt: item?.isDiagnosticProbeAttempt === true,
      probeId: safeString(item?.probeId, 180),
      subjectId: safeString(item?.subjectId, 40),
      topicId: safeString(item?.topicId, 120),
      diagnosticSkillId: safeString(item?.diagnosticSkillId, 160),
      dominantTag: safeString(item?.dominantTag, 120),
      expectedErrorTags: Array.isArray(item?.expectedErrorTags) ? item.expectedErrorTags.filter(t => typeof t === "string").slice(0, 8) : [],
      inferredTags: Array.isArray(item?.inferredTags) ? item.inferredTags.filter(t => typeof t === "string").slice(0, 8) : [],
      outcomeStatus: safeString(item?.outcomeStatus, 40),
      lastOutcome: safeString(item?.lastOutcome, 80),
      supportCount: Math.max(0, Math.floor(safeNumber(item?.supportCount))),
      weakenCount: Math.max(0, Math.floor(safeNumber(item?.weakenCount))),
      answeredAt: safeString(item?.answeredAt, 80),
      learningSessionId: safeString(item?.learningSessionId, 80),
      questionId: safeString(item?.questionId, 180),
    }))
    .filter(item => item.isDiagnosticProbeAttempt && item.probeId && item.subjectId && SUBJECTS.includes(item.subjectId));
}

export function buildReportInputFromDbData(reportData, options = {}) {
  const source = reportData && typeof reportData === "object" ? reportData : {};
  const summary = source.summary && typeof source.summary === "object" ? source.summary : {};
  const student = source.student && typeof source.student === "object" ? source.student : {};
  const range = source.range && typeof source.range === "object" ? source.range : {};
  const inputSubjects =
    source.subjects && typeof source.subjects === "object" && !Array.isArray(source.subjects)
      ? source.subjects
      : {};

  const subjects = buildEmptySubjects();
  for (const subject of SUBJECTS) {
    const subjectIn =
      inputSubjects[subject] && typeof inputSubjects[subject] === "object"
        ? inputSubjects[subject]
        : {};
    const total = effectivePracticeAnswerCountFromSources(subjectIn);
    const correct = effectivePracticeCorrectCount(subjectIn);
    const wrong = effectivePracticeWrongCount(subjectIn);
    const durationSeconds = sanitizeReportDurationSeconds(
      Math.max(0, Math.floor(safeNumber(subjectIn.durationSeconds))),
      { answerCount: total }
    ).seconds;

    const topicsIn =
      subjectIn.topics && typeof subjectIn.topics === "object" && !Array.isArray(subjectIn.topics)
        ? subjectIn.topics
        : {};
    const topics = {};
    const registeredGradeLevel =
      normalizeGradeLevelToKey(student.grade_level) ||
      (typeof source.summary?.registeredGradeLevel === "string"
        ? normalizeGradeLevelToKey(source.summary.registeredGradeLevel)
        : "") ||
      null;

    for (const topicKey of Object.keys(topicsIn)) {
      const topicIn = topicsIn[topicKey] && typeof topicsIn[topicKey] === "object" ? topicsIn[topicKey] : {};
      const byContentGrade =
        topicIn.byContentGrade && typeof topicIn.byContentGrade === "object" && !Array.isArray(topicIn.byContentGrade)
          ? topicIn.byContentGrade
          : null;
      const gradeEntries =
        byContentGrade && Object.keys(byContentGrade).length > 0
          ? Object.entries(byContentGrade)
          : [["unknown", topicIn]];

      for (const [gradeBucket, gradeInRaw] of gradeEntries) {
        const gradeIn = gradeInRaw && typeof gradeInRaw === "object" ? gradeInRaw : topicIn;
        const gradeMetrics = effectivePracticeMetrics(gradeIn);
        const { answers: topicTotal, correct: topicCorrect, wrong: topicWrong } =
          byContentGrade && Object.keys(byContentGrade).length > 0
            ? gradeMetrics
            : effectivePracticeMetricsFromSources(gradeIn, topicIn);
        if (topicTotal <= 0) continue;
        const modeCounts =
          gradeIn.modeCounts && typeof gradeIn.modeCounts === "object" && !Array.isArray(gradeIn.modeCounts)
            ? gradeIn.modeCounts
            : topicIn.modeCounts && typeof topicIn.modeCounts === "object" && !Array.isArray(topicIn.modeCounts)
            ? topicIn.modeCounts
            : null;
        const levelCounts =
          gradeIn.levelCounts && typeof gradeIn.levelCounts === "object" && !Array.isArray(gradeIn.levelCounts)
            ? gradeIn.levelCounts
            : topicIn.levelCounts && typeof topicIn.levelCounts === "object" && !Array.isArray(topicIn.levelCounts)
            ? topicIn.levelCounts
            : null;
        const contentGradeLevel =
          normalizeGradeLevelToKey(gradeIn.contentGradeLevel) ||
          (gradeBucket !== "unknown" ? normalizeGradeLevelToKey(gradeBucket) : null);
        const rowRegistered =
          normalizeGradeLevelToKey(gradeIn.registeredGradeLevel) || registeredGradeLevel;
        const gradeRelation =
          typeof gradeIn.gradeRelation === "string" ? gradeIn.gradeRelation.trim() : "unknown";
        const adapterTopicKey =
          contentGradeLevel && contentGradeLevel !== "unknown"
            ? `${safeString(topicKey, 120) || "general"}${REPORT_TOPIC_GRADE_SEP}${contentGradeLevel}`
            : safeString(topicKey, 120) || "general";
        const gradeDurRaw = Math.max(0, Math.floor(safeNumber(gradeIn.durationSeconds)));
        const durationSeconds = sanitizeReportDurationSeconds(gradeDurRaw, {
          answerCount: topicTotal,
        }).seconds;
        const timeMsSum = Math.max(0, Math.floor(safeNumber(gradeIn.timeMsSum)));
        const timeMsCount = Math.max(0, Math.floor(safeNumber(gradeIn.timeMsCount)));
        const legacyDominantLevel = dominantBucketFromCounts(levelCounts);
        const displayFromAggregate =
          gradeIn.dominantDisplayLevel != null
            ? String(gradeIn.dominantDisplayLevel)
            : topicIn.dominantDisplayLevel != null
              ? String(topicIn.dominantDisplayLevel)
              : null;
        const dominantDisplayLevel =
          displayFromAggregate ||
          activityDbEnumToDisplayLevel(legacyDominantLevel) ||
          dominantDisplayLevelFromCounts(
            gradeIn.displayLevelCounts || topicIn.displayLevelCounts || null
          ) ||
          "regular";
        const sourceBreakdown =
          gradeIn._sourceDifficultyBreakdown && typeof gradeIn._sourceDifficultyBreakdown === "object"
            ? gradeIn._sourceDifficultyBreakdown
            : topicIn._sourceDifficultyBreakdown && typeof topicIn._sourceDifficultyBreakdown === "object"
              ? topicIn._sourceDifficultyBreakdown
              : null;
        const topicRecord = {
          topicBaseKey: safeString(topicKey, 120) || "general",
          total: topicTotal,
          correct: topicCorrect,
          wrong: topicWrong,
          accuracy: normalizeAccuracy(topicCorrect, topicTotal),
          durationSeconds,
          timeMsSum,
          timeMsCount,
          dominantMode: dominantBucketFromCounts(modeCounts),
          dominantLevel: legacyDominantLevel,
          dominantDisplayLevel,
          _sourceDifficultyBreakdown: sourceBreakdown ? { ...sourceBreakdown } : null,
          modeCounts: modeCounts ? { ...modeCounts } : null,
          registeredGradeLevel: rowRegistered,
          contentGradeLevel,
          gradeRelation,
          gradeDelta: gradeIn.gradeDelta ?? null,
          evidenceSourceCounts:
            gradeIn.evidenceSourceCounts && typeof gradeIn.evidenceSourceCounts === "object"
              ? gradeIn.evidenceSourceCounts
              : null,
          evidenceSources: Array.isArray(gradeIn.evidenceSources) ? gradeIn.evidenceSources : null,
          primaryEvidenceSource:
            typeof gradeIn.primaryEvidenceSource === "string" ? gradeIn.primaryEvidenceSource : null,
          parentActivityTitle:
            typeof gradeIn.parentActivityTitle === "string" && gradeIn.parentActivityTitle.trim()
              ? gradeIn.parentActivityTitle.trim()
              : null,
          ...pickActivityTimestampFields(gradeIn),
        };
        topicRecord._bridgeFieldProvenance = buildTopicBridgeFieldProvenanceFromAdapterTopic(topicRecord);
        topics[adapterTopicKey] = topicRecord;
      }
    }

    subjects[subject] = {
      total,
      correct,
      wrong,
      accuracy: normalizeAccuracy(correct, total),
      diagnosticAccuracy: hasDiagnosticEvidence(subjectIn)
        ? normalizeAccuracy(correct, total)
        : 0,
      durationSeconds,
      topics,
      mistakes: [],
    };
  }

  const recentMistakes = sanitizeRecentMistakes(source.recentMistakes);
  const diagnosticMistakes = sanitizeDiagnosticMistakes(
    Array.isArray(source.diagnosticMistakes) && source.diagnosticMistakes.length
      ? source.diagnosticMistakes
      : source.recentMistakes,
  );
  for (const mistake of diagnosticMistakes) {
    const list = subjects[mistake.subject]?.mistakes;
    if (Array.isArray(list)) {
      list.push({ ...mistake });
    }
  }

  const answers = effectivePracticeSummaryAnswerCount(summary);
  const correct = effectivePracticeSummaryCorrectCount(summary);
  const wrong = effectivePracticeSummaryWrongCount(summary);

  const output = {
    source: "supabase",
    version: "phase-2d-c3",
    student: {
      id: safeString(student.id, 64),
      name: safeString(student.full_name, 160),
      gradeLevel: safeString(student.grade_level, 40),
      gradeLevelKey: normalizeGradeLevelToKey(student.grade_level) || null,
      registeredGradeLevel:
        normalizeGradeLevelToKey(student.grade_level) ||
        normalizeGradeLevelToKey(source.summary?.registeredGradeLevel) ||
        null,
      isActive: student.is_active === true,
    },
    range: {
      from: safeString(range.from, 10),
      to: safeString(range.to, 10),
    },
    totals: {
      sessions: Math.max(0, Math.floor(safeNumber(summary.totalSessions ?? summary.sessions))),
      completedSessions: Math.max(
        0,
        Math.floor(safeNumber(summary.completedSessions ?? summary.completed))
      ),
      answers,
      correct,
      wrong,
      accuracy: normalizeAccuracy(correct, answers),
      durationSeconds: Math.max(
        0,
        Math.floor(safeNumber(summary.totalDurationSeconds ?? summary.durationSeconds))
      ),
    },
    subjects,
    dailyActivity: sanitizeDailyActivity(source.dailyActivity),
    recentMistakes,
    diagnosticMistakes,
    competitiveContext:
      source.competitiveContext && typeof source.competitiveContext === "object"
        ? JSON.parse(JSON.stringify(source.competitiveContext))
        : null,
    positiveEvidence:
      source.positiveEvidence && typeof source.positiveEvidence === "object"
        ? JSON.parse(JSON.stringify(source.positiveEvidence))
        : null,
    probeEvidence: sanitizeProbeEvidence(source.probeEvidence),
    _internalTopicAnswerEvents:
      source._internalTopicAnswerEvents &&
      typeof source._internalTopicAnswerEvents === "object" &&
      !Array.isArray(source._internalTopicAnswerEvents)
        ? JSON.parse(JSON.stringify(source._internalTopicAnswerEvents))
        : null,
    parentAssignedActivitiesInPeriod: Array.isArray(source.parentAssignedActivitiesInPeriod)
      ? source.parentAssignedActivitiesInPeriod.map((row) =>
          row && typeof row === "object" ? { ...row } : row
        )
      : [],
    gaps: {
      starsXpBadges: "not_available_from_db_yet",
      streak: "derive_later_or_fallback",
      challengeState: "localStorage_fallback",
      learningIntel: "derive_later_or_fallback",
    },
    evidenceQuality:
      source.meta && typeof source.meta === "object" && source.meta.evidenceQuality
        ? JSON.parse(JSON.stringify(source.meta.evidenceQuality))
        : null,
  };

  if (options.includeDebug) {
    output.debug = {
      period: safeString(options.period, 40),
      timezone: safeString(options.timezone, 80),
      sourceMeta:
        source.meta && typeof source.meta === "object" && !Array.isArray(source.meta)
          ? JSON.parse(JSON.stringify(source.meta))
          : null,
    };
  }

  return output;
}

export function compareDbReportInputToLocalSnapshot(dbInput, localSnapshot) {
  const db = dbInput && typeof dbInput === "object" ? dbInput : {};
  const local = localSnapshot && typeof localSnapshot === "object" ? localSnapshot : {};
  const dbTotals = db.totals && typeof db.totals === "object" ? db.totals : {};
  const localTotals = local.totals && typeof local.totals === "object" ? local.totals : {};

  return {
    totals: {
      answersDelta:
        Math.max(0, Math.floor(safeNumber(dbTotals.answers))) -
        Math.max(0, Math.floor(safeNumber(localTotals.answers))),
      correctDelta:
        Math.max(0, Math.floor(safeNumber(dbTotals.correct))) -
        Math.max(0, Math.floor(safeNumber(localTotals.correct))),
      wrongDelta:
        Math.max(0, Math.floor(safeNumber(dbTotals.wrong))) -
        Math.max(0, Math.floor(safeNumber(localTotals.wrong))),
      accuracyDelta:
        Number((safeNumber(dbTotals.accuracy) - safeNumber(localTotals.accuracy)).toFixed(2)),
      durationSecondsDelta:
        Math.max(0, Math.floor(safeNumber(dbTotals.durationSeconds))) -
        Math.max(0, Math.floor(safeNumber(localTotals.durationSeconds))),
    },
    subjectCoverage: {
      db: SUBJECTS.filter(s => db.subjects && db.subjects[s] && safeNumber(db.subjects[s].total) > 0),
      local: SUBJECTS.filter(
        s => local.subjects && local.subjects[s] && safeNumber(local.subjects[s].total) > 0
      ),
    },
  };
}

export const REPORT_DB_SUBJECTS = SUBJECTS.slice();
