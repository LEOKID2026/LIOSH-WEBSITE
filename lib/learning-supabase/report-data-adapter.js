import { normalizeGradeLevelToKey } from "../learning-student-defaults.js";
import { pickActivityTimestampFields } from "./parent-report-activity-time.js";

export const REPORT_TOPIC_GRADE_SEP = "::grade:";

const SUBJECTS = ["math", "geometry", "english", "hebrew", "science", "moledet_geography"];
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
    .map(item => ({
      subject: safeString(item?.subject, 40),
      topic: safeString(item?.topic, 120),
      questionId: safeString(item?.questionId, 180),
      prompt: safeString(item?.prompt, 500),
      expectedAnswer: safeString(item?.expectedAnswer, 300),
      userAnswer: safeString(item?.userAnswer, 300),
      answeredAt: safeString(item?.answeredAt, 40),
    }))
    .filter(item => item.subject && SUBJECTS.includes(item.subject));
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
    const total = Math.max(0, Math.floor(safeNumber(subjectIn.answers ?? subjectIn.total)));
    const correct = Math.max(0, Math.floor(safeNumber(subjectIn.correct)));
    const wrong = Math.max(0, Math.floor(safeNumber(subjectIn.wrong)));
    const durationSeconds = Math.max(0, Math.floor(safeNumber(subjectIn.durationSeconds)));

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
        const topicTotal = Math.max(0, Math.floor(safeNumber(gradeIn.answers ?? gradeIn.total ?? topicIn.answers)));
        if (topicTotal <= 0) continue;
        const topicCorrect = Math.max(0, Math.floor(safeNumber(gradeIn.correct)));
        const topicWrong = Math.max(0, Math.floor(safeNumber(gradeIn.wrong)));
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
        topics[adapterTopicKey] = {
          topicBaseKey: safeString(topicKey, 120) || "general",
          total: topicTotal,
          correct: topicCorrect,
          wrong: topicWrong,
          accuracy: normalizeAccuracy(topicCorrect, topicTotal),
          durationSeconds: Math.max(0, Math.floor(safeNumber(gradeIn.durationSeconds ?? topicIn.durationSeconds))),
          dominantMode: dominantBucketFromCounts(modeCounts),
          dominantLevel: dominantBucketFromCounts(levelCounts),
          registeredGradeLevel: rowRegistered,
          contentGradeLevel,
          gradeRelation,
          gradeDelta: gradeIn.gradeDelta ?? null,
          ...pickActivityTimestampFields(gradeIn),
        };
      }
    }

    subjects[subject] = {
      total,
      correct,
      wrong,
      accuracy: normalizeAccuracy(correct, total),
      durationSeconds,
      topics,
      mistakes: [],
    };
  }

  const recentMistakes = sanitizeRecentMistakes(source.recentMistakes);
  for (const mistake of recentMistakes) {
    const list = subjects[mistake.subject]?.mistakes;
    if (Array.isArray(list) && list.length < RECENT_MISTAKES_LIMIT) {
      list.push({ ...mistake });
    }
  }

  const answers = Math.max(0, Math.floor(safeNumber(summary.totalAnswers ?? summary.answers)));
  const correct = Math.max(0, Math.floor(safeNumber(summary.correctAnswers ?? summary.correct)));
  const wrong = Math.max(0, Math.floor(safeNumber(summary.wrongAnswers ?? summary.wrong)));

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
    gaps: {
      starsXpBadges: "not_available_from_db_yet",
      streak: "derive_later_or_fallback",
      challengeState: "localStorage_fallback",
      learningIntel: "derive_later_or_fallback",
    },
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
