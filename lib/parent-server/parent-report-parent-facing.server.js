/**
 * Parent-facing Hebrew insights and home recommendations from aggregated report data.
 * Deterministic — no LLM, no English in output.
 */
import {
  effectivePracticeAccuracy,
  effectivePracticeAnswerCount,
  effectivePracticeSummaryAccuracy,
  effectivePracticeSummaryAnswerCount,
} from "../learning/report-practice-counts.js";
import { REPORT_AGG_SUBJECTS } from "./report-data-aggregate.server.js";
import { subjectLabelHe, topicLabelHe } from "../teacher-portal/teacher-ui.he.js";
import { listVisibleParentMessagesForReport } from "../teacher-server/teacher-parent-messages.server.js";
import {
  collectTopicEngineRowsFromReport,
  topicWrongRatioPct,
} from "../../utils/parent-report-engine-insights-he.js";
import {
  buildLpdSafeTopicInsightFromWeakTopic,
  guardParentFacingText,
} from "../../utils/learning-pattern-decision/lpd-parent-facing-copy.js";
import {
  dailyImprovementInsightHe,
  homeBySubjectHe,
  homeFallbackHe,
  homeWithEngineActionHe,
  insufficientDataInsightHe,
  recentInactivityInsightHe,
  noUrgentTopicInsightHe,
  rawMetricStrengthMixedSubjectHe,
  rawMetricStrengthPositiveHe,
} from "../../utils/parent-report-language/parent-report-hebrew-copy-spec.js";
import {
  attachParentContextEvidenceQuality,
  allowsStrongParentDiagnosisAtStudent,
  allowsHedgedParentInsightAtStudent,
  allowsHedgedParentTopicInsightForCopy,
} from "../learning/evidence-quality.js";
import {
  shouldShowStudentThinDataInsight,
} from "../learning/evidence-quality-insight-copy.js";
import {
  PARENT_EVIDENCE_VOLUME,
} from "../../utils/parent-report-language/parent-evidence-matrix.js";
import {
  buildParentFacingDiagnosticFlags,
  buildPracticeFocusInsightLines,
  computeParentVisiblePracticeFocus,
  shouldSoftenStudentLevelParentInsights,
} from "./parent-report-diagnostic-visible.server.js";
import {
  SUBJECT_LABEL_BY_ID,
  filterInsightLinesForUnpracticedSubjects,
  filterRecentMistakesForVisibleSubjects,
  subjectQuestionCountsFromPayload,
} from "../../utils/parent-report-language/subject-evidence-policy.js";

const LOW_ACCURACY = 60;
const STRONG_ACCURACY = 80;
const MIN_SUBJECT_ANSWERS = PARENT_EVIDENCE_VOLUME.INSIGHT_MIN;
const MIN_TOPIC_ANSWERS = PARENT_EVIDENCE_VOLUME.INSIGHT_MIN;
const INACTIVITY_DAYS = 7;

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function lastActivityDate(daily) {
  if (!Array.isArray(daily) || !daily.length) return null;
  return [...daily].sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null;
}

function reportPeriodEndMs(payload) {
  const to = payload?.range?.to;
  const iso = typeof to === "string" ? to.slice(0, 10) : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return Date.parse(`${iso}T23:59:59.999Z`);
  }
  return Date.now();
}

function daysSince(isoDate, referenceMs = Date.now()) {
  if (!isoDate) return null;
  const diff = referenceMs - new Date(isoDate).getTime();
  return Number.isFinite(diff) ? Math.floor(diff / 86_400_000) : null;
}

function canonicalSubjectId(raw) {
  const s = String(raw || "").trim();
  if (s === "moledet_geography") return "moledet-geography";
  return s;
}

function subjectVisibleQuestions(subjectQuestionCounts, subjectId) {
  return Number(subjectQuestionCounts[canonicalSubjectId(subjectId)]) || 0;
}

function rankSubjectsByAccuracy(subjects, minAnswers = MIN_SUBJECT_ANSWERS) {
  const rows = [];
  for (const key of REPORT_AGG_SUBJECTS) {
    const subj = subjects?.[key];
    if (!subj || typeof subj !== "object") continue;
    const answers = effectivePracticeAnswerCount(subj);
    if (answers < minAnswers) continue;
    rows.push({
      subject: key,
      label: subjectLabelHe(key),
      accuracy: effectivePracticeAccuracy(subj),
      answers,
    });
  }
  return rows.sort((a, b) => a.accuracy - b.accuracy);
}

function rankWeakTopics(subjects) {
  const weak = [];
  for (const subject of REPORT_AGG_SUBJECTS) {
    const subj = subjects?.[subject];
    if (!subj?.topics) continue;
    for (const [topicKey, topicData] of Object.entries(subj.topics)) {
      const answers = effectivePracticeAnswerCount(topicData);
      const accuracy = effectivePracticeAccuracy(topicData);
      if (answers >= MIN_TOPIC_ANSWERS && accuracy < LOW_ACCURACY) {
        weak.push({
          subject,
          topicKey,
          accuracy,
          answers,
        });
      }
    }
  }
  return weak.sort((a, b) => a.accuracy - b.accuracy || b.answers - a.answers);
}

function topMistakeSubjects(recentMistakes) {
  if (!Array.isArray(recentMistakes)) return [];
  const counts = new Map();
  for (const m of recentMistakes) {
    const s = m?.subject;
    if (typeof s === "string" && s) counts.set(s, (counts.get(s) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([subject, count]) => ({ subject, count }));
}

function detectImprovement(dailyActivity) {
  if (!Array.isArray(dailyActivity) || dailyActivity.length < 4) return false;
  const sorted = [...dailyActivity].sort((a, b) => a.date.localeCompare(b.date));
  const half = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, half);
  const second = sorted.slice(half);
  const acc = (rows) => {
    let c = 0;
    let t = 0;
    for (const r of rows) {
      c += safeNum(r.correct);
      t += safeNum(r.answers);
    }
    return t > 0 ? (c / t) * 100 : null;
  };
  const a1 = acc(first);
  const a2 = acc(second);
  return a1 != null && a2 != null && a2 - a1 >= 8;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {string[]}
 */
export function buildParentInsightsHe(payload) {
  const summary = payload?.summary || {};
  const subjects = payload?.subjects || {};
  const daily = payload?.dailyActivity;
  const recentMistakes = payload?.recentMistakes;
  const subjectQuestionCounts = subjectQuestionCountsFromPayload(payload);
  const visibleRecentMistakes = filterRecentMistakesForVisibleSubjects(
    recentMistakes,
    subjectQuestionCounts,
  );

  const totalAnswers = effectivePracticeSummaryAnswerCount(summary);
  const totalSessions = safeNum(summary.totalSessions);
  const overallAccuracy =
    totalAnswers > 0 ? effectivePracticeSummaryAccuracy(summary) : null;
  const lastDate = lastActivityDate(daily);
  const inactiveDays = daysSince(lastDate, reportPeriodEndMs(payload));

  const insights = [];
  const subjectRows = rankSubjectsByAccuracy(subjects);
  const weakTopics = rankWeakTopics(subjects);
  const mistakeSubjects = topMistakeSubjects(visibleRecentMistakes);
  const allowStrongStudent = allowsStrongParentDiagnosisAtStudent(payload);
  const softenStudentInsights = shouldSoftenStudentLevelParentInsights(payload, weakTopics);

  if (totalAnswers === 0 && totalSessions === 0) {
    insights.push("אין עדיין מספיק נתוני תרגול בתקופה הזו כדי להציג תמונה לימודית ברורה.");
  } else if (inactiveDays != null && inactiveDays >= INACTIVITY_DAYS) {
    insights.push(recentInactivityInsightHe());
  } else if (shouldShowStudentThinDataInsight(payload)) {
    insights.push(insufficientDataInsightHe());
  }

  if (allowStrongStudent && !softenStudentInsights) {
    if (detectImprovement(daily)) {
      insights.push(dailyImprovementInsightHe());
    }

    const strongest = [...subjectRows].sort((a, b) => b.accuracy - a.accuracy)[0];
    const weakest = subjectRows[0];
    const hasWeakInStrongestSubject =
      weakest?.subject === strongest?.subject &&
      weakest?.accuracy < LOW_ACCURACY &&
      subjectVisibleQuestions(subjectQuestionCounts, weakest.subject) > 0;
    if (
      strongest?.label &&
      strongest.accuracy >= STRONG_ACCURACY &&
      subjectVisibleQuestions(subjectQuestionCounts, strongest.subject) > 0 &&
      !hasWeakInStrongestSubject
    ) {
      insights.push(
        rawMetricStrengthPositiveHe(strongest.label, strongest.answers, Math.round(strongest.accuracy)),
      );
    } else if (
      strongest?.label &&
      strongest.accuracy >= STRONG_ACCURACY &&
      hasWeakInStrongestSubject
    ) {
      insights.push(rawMetricStrengthMixedSubjectHe(strongest.label));
    }
  } else if (allowsHedgedParentInsightAtStudent(payload) && !softenStudentInsights) {
    if (shouldShowStudentThinDataInsight(payload)) {
      insights.push(insufficientDataInsightHe());
    }
  } else if (softenStudentInsights && shouldShowStudentThinDataInsight(payload)) {
    insights.push(insufficientDataInsightHe());
  }

  const weakTopic = weakTopics[0];
  if (
    weakTopic &&
    subjectVisibleQuestions(subjectQuestionCounts, weakTopic.subject) > 0 &&
    allowsHedgedParentTopicInsightForCopy(payload, weakTopic.subject, weakTopic.topicKey)
  ) {
    const line = guardParentFacingText(
      buildLpdSafeTopicInsightFromWeakTopic(
        payload,
        weakTopic,
        topicLabelHe,
        subjectLabelHe,
      ),
    );
    if (line) insights.push(line);
  }

  const guarded = [];
  for (const line of insights) {
    const safe = guardParentFacingText(line);
    if (safe) guarded.push(safe);
  }

  if (!guarded.length) {
    guarded.push(noUrgentTopicInsightHe());
  }

  const unique = [];
  for (const line of guarded) {
    if (!unique.includes(line)) unique.push(line);
  }
  return filterInsightLinesForUnpracticedSubjects(
    unique.slice(0, 4),
    subjectQuestionCounts,
    SUBJECT_LABEL_BY_ID,
  );
}

/**
 * @param {Record<string, unknown>} payload
 * @param {string[]} [insights]
 * @returns {string[]}
 */
export function buildHomeRecommendationsHe(payload, insights = []) {
  const subjects = payload?.subjects || {};
  const summary = payload?.summary || {};
  const subjectQuestionCounts = subjectQuestionCountsFromPayload(payload);
  const subjectRows = rankSubjectsByAccuracy(subjects);
  const weakTopics = rankWeakTopics(subjects);
  const recs = [];

  const actionFromInsights = insights
    .map((line) => {
      const m = String(line || "").match(/מה לתרגל:\s*(.+)$/);
      return m ? m[1].trim() : "";
    })
    .find(Boolean);

  if (actionFromInsights) {
    recs.push(homeWithEngineActionHe(actionFromInsights));
    const unique = [recs[0]];
    return filterInsightLinesForUnpracticedSubjects(unique, subjectQuestionCounts, SUBJECT_LABEL_BY_ID);
  }

  const weakest = subjectRows[0];
  if (
    weakest?.subject &&
    subjectVisibleQuestions(subjectQuestionCounts, weakest.subject) > 0
  ) {
    recs.push(homeBySubjectHe(weakest.subject));
  } else {
    const weakTopic = weakTopics[0];
    if (weakTopic?.subject) {
      recs.push(homeBySubjectHe(weakTopic.subject));
    } else {
      recs.push(homeFallbackHe());
    }
  }

  const unique = [];
  for (const line of recs) {
    if (!unique.includes(line)) unique.push(line);
  }
  return filterInsightLinesForUnpracticedSubjects(
    unique.slice(0, 4),
    subjectQuestionCounts,
    SUBJECT_LABEL_BY_ID,
  );
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {{ insights: string[], homeRecommendations: string[] }}
 */
export function buildParentFacingBlocks(payload) {
  const withQuality =
    payload?.meta?.evidenceQuality != null
      ? payload
      : attachParentContextEvidenceQuality(payload);
  const subjectQuestionCounts = subjectQuestionCountsFromPayload(withQuality);
  const practiceFocus = computeParentVisiblePracticeFocus(withQuality);
  const focusLines = buildPracticeFocusInsightLines(practiceFocus);
  let insights = buildParentInsightsHe(withQuality);
  if (focusLines.length) {
    insights = filterInsightLinesForUnpracticedSubjects(
      [...insights, ...focusLines],
      subjectQuestionCounts,
      SUBJECT_LABEL_BY_ID,
    );
    const unique = [];
    for (const line of insights) {
      if (!unique.includes(line)) unique.push(line);
    }
    insights = unique.slice(0, 6);
  }
  const homeRecommendations = buildHomeRecommendationsHe(withQuality, insights);
  const diagnosticFlags = buildParentFacingDiagnosticFlags(withQuality, practiceFocus);
  return { insights, homeRecommendations, ...diagnosticFlags };
}

/**
 * @param {Record<string, unknown>} payload
 * @param {{ insights?: string[], homeRecommendations?: string[], teacherMessages?: object[] }} extras
 */
export function attachParentFacingToPayload(payload, extras) {
  return {
    ...payload,
    parentFacing: {
      insights: extras.insights || [],
      homeRecommendations: extras.homeRecommendations || [],
      teacherMessages: extras.teacherMessages || [],
      practiceFocus: extras.practiceFocus || [],
      diagnosisSuppressed: extras.diagnosisSuppressed === true,
      gatingApplied: extras.gatingApplied === true,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {Record<string, unknown>} payload
 * @param {string} studentId
 */
export async function enrichPayloadWithParentFacing(serviceRole, payload, studentId) {
  const withQuality = attachParentContextEvidenceQuality(payload);
  const blocks = buildParentFacingBlocks(withQuality);
  const subjectQuestionCounts = subjectQuestionCountsFromPayload(withQuality);
  const recentMistakes = filterRecentMistakesForVisibleSubjects(
    withQuality.recentMistakes,
    subjectQuestionCounts,
  );
  let teacherMessages = [];
  const listed = await listVisibleParentMessagesForReport(serviceRole, studentId, 10);
  if (listed.ok) teacherMessages = listed.messages;
  return attachParentFacingToPayload(
    { ...withQuality, recentMistakes },
    { ...blocks, teacherMessages },
  );
}
