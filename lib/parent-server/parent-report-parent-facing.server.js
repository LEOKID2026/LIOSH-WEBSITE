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
  buildHomeRecommendationsFromTopicEngineHe,
} from "../../utils/parent-report-engine-insights-he.js";
import {
  buildLpdSafeTopicInsightFromWeakTopic,
  buildTopicParentReportBundleHe,
  guardParentFacingText,
  rawMistakesForTopicFromPayload,
  resolveTopicParentFindingHe,
  getLpdFromRow,
} from "../../utils/learning-pattern-decision/lpd-parent-facing-copy.js";
import { isUsableParentPatternLabel } from "../../utils/learning-pattern-decision/parent-pattern-label.js";
import {
  dailyImprovementInsightHe,
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

/**
 * Read structured detectedPattern from a topic engine row (never Hebrew regex).
 * @param {Record<string, unknown>|null|undefined} row
 */
function structuredDetectedPatternFromRow(row) {
  if (!row || typeof row !== "object") return null;
  const lpd = getLpdFromRow(row);
  const contract =
    (lpd?.engineDecisionContract && typeof lpd.engineDecisionContract === "object"
      ? lpd.engineDecisionContract
      : null) ||
    (row.engineDecisionContract && typeof row.engineDecisionContract === "object"
      ? row.engineDecisionContract
      : null);
  const pattern = String(contract?.detectedPattern || "").trim();
  if (!pattern || !isUsableParentPatternLabel(pattern)) return null;
  if (contract?.blockPatternClaim === true) return null;
  return {
    pattern,
    parentSafeFinding: String(contract?.parentSafeFinding || "").trim() || null,
    contract,
    lpd,
    row,
  };
}

/**
 * Topics with a structured detectedPattern, strongest first.
 * @param {Record<string, unknown>} payload
 */
function rankTopicsWithStructuredDetectedPattern(payload) {
  const reportLike =
    payload?.mathOperations || payload?.geometryTopics || payload?.hebrewTopics
      ? payload
      : null;
  if (!reportLike) return [];
  return collectTopicEngineRowsFromReport(reportLike)
    .map((row) => {
      const structured = structuredDetectedPatternFromRow(row);
      if (!structured) return null;
      const q = Number(row.questions) || 0;
      const wrong = Number(row.wrong) || 0;
      const acc = Number(row.accuracy) || 0;
      return { ...structured, questions: q, wrong, accuracy: acc };
    })
    .filter(Boolean)
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy);
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

  // Prefer structured detectedPattern over accuracy/volume weak-topic fallback
  const patternedTopics = rankTopicsWithStructuredDetectedPattern(payload);
  const topPatterned = patternedTopics[0];
  if (topPatterned) {
    const finding =
      guardParentFacingText(topPatterned.parentSafeFinding) ||
      guardParentFacingText(resolveTopicParentFindingHe(topPatterned.row));
    if (finding) insights.push(finding);
  }

  const weakTopic = weakTopics[0];
  if (
    !topPatterned &&
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
  void insights; // retained for API compat; do not parse Hebrew action lines from insights
  const subjectQuestionCounts = subjectQuestionCountsFromPayload(payload);
  const recs = [];

  // 1) Structured detectedPattern drives home copy directly (no Hebrew regex)
  const patternedTopics = rankTopicsWithStructuredDetectedPattern(payload);
  for (const patterned of patternedTopics.slice(0, 3)) {
    const bundle = buildTopicParentReportBundleHe(patterned.row);
    if (bundle.homeRecommendation) {
      recs.push(bundle.homeRecommendation);
    } else {
      const topicName =
        String(patterned.row?.label || patterned.row?.displayName || "").trim() || "הנושא";
      const pattern = patterned.pattern;
      recs.push(
        homeWithEngineActionHe(
          `לחזק את הדפוס «${pattern}» ב${topicName} עם כמה שאלות קצרות, ולבקש מהילד להסביר את הדרך בקול`,
        ),
      );
    }
    if (recs.length >= 3) break;
  }
  if (recs.length) {
    const uniquePatterned = [];
    for (const line of recs) {
      if (!uniquePatterned.includes(line)) uniquePatterned.push(line);
    }
    return filterInsightLinesForUnpracticedSubjects(
      uniquePatterned.slice(0, 4),
      subjectQuestionCounts,
      SUBJECT_LABEL_BY_ID,
    );
  }

  // 2) Topic-engine rows (may still surface pattern-backed bundles)
  const reportLike =
    payload?.mathOperations || payload?.geometryTopics || payload?.hebrewTopics
      ? payload
      : null;
  if (reportLike) {
    const fromEngine = buildHomeRecommendationsFromTopicEngineHe(reportLike);
    if (fromEngine.length && fromEngine[0] !== homeFallbackHe()) {
      return filterInsightLinesForUnpracticedSubjects(
        fromEngine.slice(0, 4),
        subjectQuestionCounts,
        SUBJECT_LABEL_BY_ID,
      );
    }
  }

  // 3) Last resort: accuracy-ranked weak topics (volume language only when no pattern)
  const weakTopics = rankWeakTopics(payload?.subjects || {});
  for (const weakTopic of weakTopics.slice(0, 2)) {
    if (subjectVisibleQuestions(subjectQuestionCounts, weakTopic.subject) <= 0) continue;
    const topicName = topicLabelHe(weakTopic.subject, weakTopic.topicKey);
    const bundle = buildTopicParentReportBundleHe({
      subjectId: canonicalSubjectId(weakTopic.subject),
      topicKey: weakTopic.topicKey,
      label: topicName,
      displayName: topicName,
      questions: weakTopic.answers,
      correct: Math.round((weakTopic.answers * weakTopic.accuracy) / 100),
      wrong: Math.max(
        0,
        weakTopic.answers - Math.round((weakTopic.answers * weakTopic.accuracy) / 100),
      ),
      accuracy: Math.round(weakTopic.accuracy),
    }, rawMistakesForTopicFromPayload(payload, weakTopic.subject, weakTopic.topicKey));
    if (bundle.homeRecommendation) {
      recs.push(bundle.homeRecommendation);
    } else if (bundle.finding && topicName) {
      recs.push(
        `מה כדאי לעשות ביחד: לתרגל כמה שאלות קצרות ב${topicName}, ולבקש מהילד להסביר את הדרך בקול.`,
      );
    }
    if (recs.length >= 3) break;
  }

  if (!recs.length) {
    recs.push(homeFallbackHe());
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
