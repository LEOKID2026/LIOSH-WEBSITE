/**
 * Parent-facing Hebrew insights and home recommendations from aggregated report data.
 * Deterministic — no LLM, no English in output.
 */
import { REPORT_AGG_SUBJECTS } from "./report-data-aggregate.server.js";
import { subjectLabelHe, topicLabelHe } from "../teacher-portal/teacher-ui.he.js";
import { listVisibleParentMessagesForReport } from "../teacher-server/teacher-parent-messages.server.js";
import {
  attachParentContextEvidenceQuality,
  allowsStrongParentDiagnosisAtStudent,
  allowsStrongParentDiagnosisAtTopic,
} from "../learning/evidence-quality.js";

const LOW_ACCURACY = 60;
const STRONG_ACCURACY = 80;
const MIN_SUBJECT_ANSWERS = 5;
const MIN_TOPIC_ANSWERS = 3;
const INACTIVITY_DAYS = 7;

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function lastActivityDate(daily) {
  if (!Array.isArray(daily) || !daily.length) return null;
  return [...daily].sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null;
}

function daysSince(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Number.isFinite(diff) ? Math.floor(diff / 86_400_000) : null;
}

function rankSubjectsByAccuracy(subjects, minAnswers = MIN_SUBJECT_ANSWERS) {
  const rows = [];
  for (const key of REPORT_AGG_SUBJECTS) {
    const subj = subjects?.[key];
    if (!subj || typeof subj !== "object") continue;
    const answers = safeNum(subj.diagnosticAnswers ?? subj.answers);
    if (answers < minAnswers) continue;
    rows.push({
      subject: key,
      label: subjectLabelHe(key),
      accuracy: safeNum(subj.diagnosticAccuracy ?? subj.accuracy),
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
      const answers = safeNum(topicData?.diagnosticAnswers ?? topicData?.answers);
      const accuracy = safeNum(topicData?.diagnosticAccuracy ?? topicData?.accuracy);
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

  const totalAnswers = safeNum(summary.diagnosticAnswers ?? summary.totalAnswers);
  const totalSessions = safeNum(summary.totalSessions);
  const overallAccuracy = totalAnswers > 0 ? safeNum(summary.diagnosticAccuracy ?? summary.accuracy) : null;
  const lastDate = lastActivityDate(daily);
  const inactiveDays = daysSince(lastDate);

  const insights = [];
  const subjectRows = rankSubjectsByAccuracy(subjects);
  const weakTopics = rankWeakTopics(subjects);
  const mistakeSubjects = topMistakeSubjects(recentMistakes);
  const allowStrongStudent = allowsStrongParentDiagnosisAtStudent(payload);

  if (totalAnswers === 0 && totalSessions === 0) {
    insights.push("לא הייתה פעילות תרגול בתקופה האחרונה — כדאי לעודד התחלה קצרה ונעימה.");
  } else if (inactiveDays != null && inactiveDays >= INACTIVITY_DAYS) {
    insights.push("לא הייתה פעילות לאחרונה — מומלץ לחזור לתרגול קצר כדי לשמור על רצף למידה.");
  } else if (totalAnswers > 0 && totalAnswers < 15) {
    insights.push("יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע.");
  }

  if (allowStrongStudent) {
    const weakest = subjectRows[0];
    if (weakest?.label && weakest.accuracy < LOW_ACCURACY) {
      insights.push(`נראה שיש קושי ב${weakest.label}, בעיקר לפי התרגולים האחרונים.`);
    }

    const weakTopic = weakTopics[0];
    if (
      weakTopic &&
      allowsStrongParentDiagnosisAtTopic(payload, weakTopic.subject, weakTopic.topicKey)
    ) {
      const topicLine = topicLabelHe(weakTopic.subject, weakTopic.topicKey);
      if (topicLine) {
        insights.push(`כדאי לשים לב ל${topicLine} — זה נושא שחוזר בתרגולים.`);
      }
    }

    if (mistakeSubjects.length) {
      const lab = subjectLabelHe(mistakeSubjects[0].subject);
      if (lab && !insights.some((t) => t.includes(lab))) {
        insights.push(`יש טעויות חוזרות ב${lab} — שווה לחזור עליהן בקצב איטי.`);
      }
    }

    if (
      overallAccuracy != null &&
      overallAccuracy < LOW_ACCURACY &&
      totalAnswers >= MIN_SUBJECT_ANSWERS
    ) {
      insights.push("הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף.");
    }

    const strongest = [...subjectRows].sort((a, b) => b.accuracy - a.accuracy)[0];
    if (strongest?.label && strongest.accuracy >= STRONG_ACCURACY) {
      insights.push(`יש התקדמות יחסית ב${strongest.label} — כדאי לשמר את הרצף.`);
    }

    if (detectImprovement(daily)) {
      insights.push("נראה שיש שיפור ביחס לתרגולים קודמים — המשיכו בקצב הנוכחי.");
    }
  }

  if (!insights.length) {
    insights.push("מומלץ לשמור על תרגול קצר וקבוע כדי ליצור רצף למידה.");
  }

  const unique = [];
  for (const line of insights) {
    if (!unique.includes(line)) unique.push(line);
  }
  return unique.slice(0, 4);
}

/**
 * @param {Record<string, unknown>} payload
 * @param {string[]} [insights]
 * @returns {string[]}
 */
export function buildHomeRecommendationsHe(payload, insights = []) {
  const subjects = payload?.subjects || {};
  const summary = payload?.summary || {};
  const totalAnswers = safeNum(summary.totalAnswers);
  const subjectRows = rankSubjectsByAccuracy(subjects);
  const weakTopics = rankWeakTopics(subjects);
  const recs = [];

  const allowStrongStudent = allowsStrongParentDiagnosisAtStudent(payload);

  const weakest = subjectRows[0];
  if (allowStrongStudent && weakest?.label && weakest.accuracy < LOW_ACCURACY) {
    if (weakest.subject === "math" || weakest.subject === "geometry") {
      recs.push("להקדיש 10 דקות ביום לתרגול קצר במתמטיקה, במקום תרגול ארוך פעם בשבוע.");
      recs.push("לפתור כמה שאלות קלות לפני מעבר לשאלות קשות יותר.");
    } else if (weakest.subject === "hebrew") {
      recs.push("לקרוא טקסט קצר ולבקש מהילד להסביר במילים שלו מה הבין.");
    } else if (weakest.subject === "english") {
      recs.push("לתרגל 5–10 דקות ביום אוצר מילים או משפט קצר — עדיף קצר וקבוע.");
    } else {
      recs.push(`לחזור יחד על נושא אחד ב${weakest.label} בקצב איטי, בלי לחץ.`);
    }
  }

  const weakTopic = weakTopics[0];
  if (
    weakTopic &&
    allowStrongStudent &&
    allowsStrongParentDiagnosisAtTopic(payload, weakTopic.subject, weakTopic.topicKey)
  ) {
    const topicLine = topicLabelHe(weakTopic.subject, weakTopic.topicKey);
    if (topicLine?.includes("בעיות מילוליות") || weakTopic.topicKey?.includes("word")) {
      recs.push("יש לשים לב לבעיות מילוליות — מומלץ לתרגל יחד לאט ולבדוק דרך פתרון.");
    }
  }

  if (totalAnswers > 0) {
    recs.push("לחזור יחד על טעויות אחרונות ולשאול את הילד איך חשב או למה בחר בתשובה.");
  }

  if (totalAnswers === 0) {
    recs.push("להתחיל מתרגול קצר של 5–10 דקות, פעם ביום, כדי לבנות הרגל נעים.");
  } else {
    recs.push("מומלץ לשמור על תרגול קצר וקבוע — עדיף על תרגול ארוך ונדיר.");
  }

  if (insights.some((t) => t.includes("עברית"))) {
    recs.push("לחזק קריאה והבנת הנקרא בעזרת טקסט קצר מדי יום.");
  }

  const unique = [];
  for (const line of recs) {
    if (!unique.includes(line)) unique.push(line);
  }
  return unique.slice(0, 4);
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
  const insights = buildParentInsightsHe(withQuality);
  const homeRecommendations = buildHomeRecommendationsHe(withQuality, insights);
  return { insights, homeRecommendations };
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
  const { insights, homeRecommendations } = buildParentFacingBlocks(withQuality);
  let teacherMessages = [];
  const listed = await listVisibleParentMessagesForReport(serviceRole, studentId, 10);
  if (listed.ok) teacherMessages = listed.messages;
  return attachParentFacingToPayload(withQuality, { insights, homeRecommendations, teacherMessages });
}
