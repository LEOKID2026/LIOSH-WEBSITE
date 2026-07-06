/**
 * Parent Q&A Question Classifier — first product gate.
 *
 * Replaces the regex-only first gate with a two-tier signal model that produces
 * exactly 4 product buckets:
 *   - off_topic               (not about the report / child / learning)
 *   - diagnostic_sensitive    (asks for a clinical label / diagnosis)
 *   - privacy_sensitive       (other children, passwords, DB, system internals)
 *   - ambiguous_or_unclear    (too short, contradictory, or pure topic-name without report intent)
 *   - report_related          (clearly asking about this report / child's learning)
 *
 * Architecture:
 *   - The deterministic step is the primary decider. It uses small CATEGORY lexicons
 *     plus compositional **semantic intent rules** (strength / weakness / explain-report
 *     inquiries), not per-sentence FAQ tables. Payload-derived subject/topic vocabulary
 *     layers on top.
 *   - WEAK report tokens (e.g. הוא, היא, הילד, השבוע, היום, בבית) cannot classify a
 *     question as report_related on their own; they must combine with at least one
 *     STRONG report token (תרגול, מתקשה, חזק, לתרגל, לפי הדוח, etc.) or a strong
 *     report intent phrase. This guards against "הוא אוהב פיצה?" being classified
 *     as report_related.
 *   - Generic-knowledge framing (מה זה, מי המציא, איך מכינים, מי כתב) clamps
 *     report_signal so that even a topic-name match cannot push the question into
 *     report_related. "מה זה פוטוסינתזה?" stays off_topic even when science is in
 *     the report. The parent must phrase it as "מה עם פוטוסינתזה בדוח?" or
 *     "הוא מתקשה בפוטוסינתזה?" to trigger report_related.
 *   - On low confidence, the deterministic step returns ambiguous_or_unclear and
 *     defers the upgrade to the optional LLM classifier (see question-classifier-llm.js).
 *
 * Hard gate guarantee for index.js: for any non-report_related bucket, no TruthPacket
 * is built, no answer-LLM is called, and no report data appears in the response.
 */

import { SUBJECT_ORDER, normalizeSubjectId } from "./contract-reader.js";
import { detectAggregateQuestionClass } from "./semantic-question-class.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";
import { looksLikeExternalPastedQuestion, matchLooseTopicFromUtterance } from "../parent-ai-topic-classifier/classifier.js";
import {
  buildTopicClarificationQuestionHe,
  hasAnchoredReportRows,
  isGeneralReportQuestion,
  isSubjectStatusInquiry,
  isTopicWeaknessInquiry,
  resolveReportRowFromUtterance,
  utteranceQualifiesAsReportQuestion,
} from "./report-row-resolver.js";

export { buildTopicClarificationQuestionHe };

/**
 * @typedef {(
 *   "report_related" |
 *   "off_topic" |
 *   "diagnostic_sensitive" |
 *   "health_sensitive" |
 *   "privacy_sensitive" |
 *   "peer_comparison" |
 *   "ambiguous_or_unclear"
 * )} ClassifierBucket
 */

/**
 * @typedef {{
 *   bucket: ClassifierBucket;
 *   confidence: number;
 *   source: "deterministic" | "llm" | "fallback";
 *   signals: {
 *     reportSignal: number;
 *     offTopicSignal: number;
 *     diagnosticSignal: number;
 *     ambiguitySignal: number;
 *     hasStrongReportToken: boolean;
 *     hasGenericKnowledgeFraming: boolean;
 *     subjectTopicNameMatched: boolean;
 *     pronounsMatched: boolean;
 *     meaningfulTokenCount: number;
 *   };
 * }} ClassifierResult
 */

/**
 * Public boundary copy. Imported by question-router.js / index.js.
 */
export const GENERAL_OFF_TOPIC_RESPONSE_HE =
  "אני יכול לעזור כאן רק עם הדוח, התרגול וההתקדמות של הילד באתר. אפשר לשאול למשל: מה חשוב לתרגל השבוע, מה כדאי לעשות בבית, או איזה נושא לפתוח כפעילות קצרה.";

/** @deprecated alias — use {@link GENERAL_OFF_TOPIC_RESPONSE_HE} */
export const OFF_TOPIC_RESPONSE_HE = GENERAL_OFF_TOPIC_RESPONSE_HE;

export const DIAGNOSTIC_BOUNDARY_RESPONSE_HE =
  "אני יכול להתייחס רק למה שמופיע בנתוני התרגול באתר. לפי הדוח אפשר לראות באילו מקצועות ונושאים כדאי לחזק את הלמידה, אבל אי אפשר להסיק מכאן מסקנה אישית על הילד. אם תרצו, אפשר להתמקד עכשיו במה שהדוח כן מראה: נושא חזק, נושא לחיזוק, או צעד קטן לבית.";

export const HEALTH_BOUNDARY_RESPONSE_HE =
  "אני יכול להתייחס רק לנתוני התרגול שמופיעים באתר. הדוח לא נועד לקבוע מסקנות אישיות על הילד, אלא לעזור להבין איזה נושא כדאי לחזק בלמידה. אפשר להמשיך מכאן לצעד לימודי קטן לפי הנתונים בדוח.";

export const PRIVACY_BOUNDARY_RESPONSE_HE =
  "אני יכול לעזור רק עם הדוח של הילד שמחובר לחשבון ההורה הזה. אין לי אפשרות להציג נתונים של ילדים אחרים, סיסמאות, רשימות משתמשים או מידע פנימי של המערכת.";

export const PEER_COMPARISON_RESPONSE_HE =
  "הדוח מתבסס על תרגול הילד בלבד ואינו משווה לילדים אחרים בכיתה. אפשר להתמקד במה שמופיע בדוח ולשאול על נושא ספציפי.";

export const AMBIGUOUS_RESPONSE_HE =
  "לא הצלחתי להבין בדיוק לאיזה חלק בדוח התכוונתם. אפשר לשאול בצורה פשוטה יותר, למשל: מה הכי חשוב לתרגל השבוע, מה כדאי לעשות בבית, או איזה נושא לפתוח כפעילות קצרה.";

export const NO_DATA_FOR_REQUEST_RESPONSE_HE =
  "בדוח הנוכחי אין מספיק מידע כדי לענות על זה בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם כבר מופיע כיוון ברור יותר בדוח.";

export const NO_DATA_SPECIFIC_FOR_REQUEST_RESPONSE_HE =
  "יש בדוח נתוני תרגול מהתקופה, אבל אין מספיק מידע כדי לענות דווקא על הנקודה הזו בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם מופיע כיוון ברור יותר בנושא הזה.";

/**
 * Decision thresholds. Exported so tests can assert behavior without re-deriving them.
 */
export const CLASSIFIER_THRESHOLDS = Object.freeze({
  diagnostic: 0.7,
  offTopic: 0.4,
  reportRelated: 0.5,
  reportRelatedOffTopicCeiling: 0.3,
  llmConfidenceFloor: 0.7,
  meaningfulTokenMinForReport: 2,
});

const STRONG_REPORT_TOKEN_WEIGHT = 0.35;
const STRONG_REPORT_INTENT_WEIGHT = 0.5;
const WEAK_REPORT_TOKEN_WEIGHT = 0.1;
const SUBJECT_TOPIC_VOCAB_WEIGHT = 0.2;
const OFF_TOPIC_CATEGORY_WEIGHT = 0.4;
const MIXED_INTENT_PENALTY = 0.3;

// ─── Lexicons (intentionally short and category-based) ──────────────────────

/** STRONG report tokens — each contributes 0.35 to reportSignal. */
const STRONG_REPORT_TOKENS = [
  // Verbs / actions about practice and learning
  "תרגול", "להתאמן", "מתאמן", "מתאמנת", "להתקדם", "מתקדם", "מתקדמת",
  "התקדמות", "להתמקד", "לתרגל", "לתרגול", "לחזור על", "תרגיל", "תרגילים",
  // Strengths / weaknesses / state about the child's performance
  "חוזקה", "חוזקות", "חזק", "חזקה", "חזקים",
  "קושי", "קשיים", "מתקשה", "מתקשים", "חלש", "חלשה", "חלשים",
  "ציון", "ציונים", "הצלחה", "הצלחות",
  "שיפור", "ירידה", "מגמה",
  // Help / report references
  "לעזור לו", "לעזור לה", "איך לעזור", "איך אעזור", "איך נעזור",
  "לפי הדוח", "על פי הדוח", "מהדוח", "בדוח", "הדוח אומר", "הדוח מראה",
];

/** STRONG report intent phrases — compact routing cues (after fold). */
const STRONG_REPORT_INTENTS = [
  /במה.{0,12}חזק/u, /במה.{0,12}מתקשה/u, /במה.{0,12}חלש/u,
  /במה.{0,12}טוב/u,
  /איפה.{0,16}מתקשה/u, /איפה.{0,12}(הוא|היא|הילד|הילדה).{0,12}מתקשה/u,
  /מה.{0,8}לתרגל/u, /מה.{0,8}לעשות.{0,8}בבית/u,
  // Home-practice / next-step framing (keep aligned with semantic-question-class recommendation_action)
  /מה\s+לעשות\s+היום/u,
  /מה\s+לעשות\s+מחר/u,
  /מה\s+לעשות\s+השבוע/u,
  /מה\s+לעשות\s+בשבוע/u,
  /מה\s+לעשות\s+בשבוע\s+הקרוב/u,
  /מה\s+לעשות\s+עכשיו/u,
  /מה\s+עושים\s+עכשיו/u,
  /איך.{0,8}לעזור/u,
  /מה.{0,8}הכי.{0,8}חשוב/u, /איפה.{0,8}להתמקד/u, /איפה.{0,8}להתחיל/u,
  /יש.{0,3}שיפור/u, /יש.{0,3}ירידה/u, /יש.{0,3}התקדמות/u,
  /סיבה.{0,3}לדאגה/u, /צריך.{0,3}לדאוג/u,
  /הצלחות/u,
  /בקצרה/u,
  // Strength / best-subject family (category signals — not FAQ sentences)
  /מה\s+המקצוע\s*(הכי\s*)?טוב/u,
  /המקצוע\s*(הכי\s*)?טוב/u,
  /איזה\s+מקצוע\s*(הכי\s*)?טוב/u,
  /באיזה\s+מקצוע\s*(הכי\s*)?טוב/u,
  /איפה\s+(הכי\s*)?טוב/u,
  /איפה\s+נראו.{0,28}תוצאות.{0,24}(הכי\s*)?טוב/u,
  /במה\s+(הוא|היא|הילד|הילדה)\s+הכי\s+טוב/u,
  /במה\s+(הוא|היא|הילד|הילדה)\s+(טוב|טובה)/u,
  /מה\s+הנושא\s*(הכי\s*)?(חזק|טוב)/u,
  /איזה\s+נושא\s*(הכי\s*)?(חזק|טוב)/u,
  // Main focus / priority family
  /^במה\s+(להתמקד|כדאי\s+להתמקד)/u,
  /^איפה\s+(להתמקד|כדאי\s+להתמקד)/u,
  /מה\s+הדגש/u,
  /מה\s+הכי\s+חשוב\s+עכשיו/u,
  /מה\s+חשוב\s+לתרגל/u,
  /על\s+מה\s+להתמקד/u,
  // Home-practice / dosage family
  /כמה\s+לתרגל/u,
  /כמה\s+זמן\s+לתרגל/u,
  /כמה\s+שאלות/u,
  /כמה\s+פעמים\s+בשבוע/u,
  /^איך\s+לתרגל/u,
  /איך\s+לעזור\s+בבית/u,
  /איך\s+להסביר\s+ל(?:ילד|ילדה|הילד|הילדה)/u,
  // Catalog-aligned report questions that must reach Stage A (avoid classifier ambiguous early-exit)
  /תסביר\s+לי\s+כמו\s+להורה/u,
  /מה\s+לומר.{0,48}דוח/u,
  /מה\s+לכתוב.{0,40}דוח/u,
  /ניסוח\s+לשאול.{0,24}מורה/u,
  /האם\s+אפשר\s+להסיק\s+מסקנות/u,
  /תן\s+לי\s+רק\s+3\s+נקודות/u,
  // Balanced strengths vs gaps (executive) without explicit "דוח" / חזק stems
  /סיכום\s+מאוזן.{0,48}מה\s+טוב.{0,24}פחות/u,
];

/**
 * Semantic **categories** for report-related questions: compositional rules (stems +
 * inquiry frames), not a FAQ list of exact sentences. Contributes at most one
 * STRONG_REPORT_INTENT_WEIGHT so a lone STRONG token (0.35) still clears 0.5.
 */
function matchesExplainReportInquiry(t) {
  const reportSurface = /דוח|מהדוח|בדוח|מתוך\s+הדוח/u.test(t);
  const inAppDeictic = /מדובר\s+פה|מה\s+שמופיע\s+למעלה|על\s+המסך\s+הזה/u.test(t);
  const conclusionReading =
    /מסקנות/u.test(t) && /להבין|להיתקע|פרטים|בלי\s+להיתקע/u.test(t);
  if (!reportSurface && !inAppDeictic && !conclusionReading) return false;
  return /תסביר|הסבר|איך\s+לקרוא|איך\s+להבין|להבין|אומר|משמעות|מה\s+אומר|מה\s+הדוח|פירוש|בקצרה|מבט\s+על|תוכן|מה\s+מופיע|עקרונית|חשוב\s+שאדע|חשוב\s+ל|מה\s+חשוב|כדאי\s+שאזכור|מה\s+לשים\s+לב|סדר\s+במספרים|תמונה\s+כללית|מסקנות|מה\s+הדוח\s+אומר|איך\s+לקרוא\s+את\s+הדוח|תעזר|לעזור\s+לי\s+לעשות\s+סדר|לא\s+הבנתי/u.test(
    t,
  );
}

/**
 * At least one topic row has parent-visible narrative observation (Copilot-safe anchor).
 * Used so recommendation/next-step shorthand can classify as report_related only when a real report is loaded.
 * @param {unknown} payload
 */
function hasAnchoredTopicObservation(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of recs) {
      const obs = String(tr?.contractsV1?.narrative?.textSlots?.observation || "").trim();
      if (obs.length >= 8) return true;
    }
  }
  return false;
}

function hasWeaknessStem(t) {
  return (
    /חלש|מתקשה|מתקשים|קושי|חולשות|דורש\s+חיזוק|לא\s+הולך|לא\s*יושב/u.test(t) ||
    (/קשה|מאתגר/u.test(t) && /מקצוע|נושא/u.test(t))
  );
}

function hasLearningInquiryFrame(t) {
  return /מקצוע|נושא|מה|איזה|איפה|במה|באיזה|הוא|היא|הילד|הילדה|דוח|נראו|תוצאות/u.test(t);
}

function matchesWeaknessInquiryCategory(t) {
  return hasWeaknessStem(t) && hasLearningInquiryFrame(t);
}

function hasStrengthStem(t) {
  if (/במה\s+(הוא|היא|הילד|הילדה)\s+טוב/u.test(t)) return true;
  if (/חזק|חוזקות|חוזק/u.test(t)) return true;
  if (t.includes("נקודות") && /חוזק|חוזקות/u.test(t)) return true;
  if (t.includes("תוצאות") && /טוב|הכי|נראו/u.test(t)) return true;
  if (/מצליח|הצלח/u.test(t)) {
    return /מקצוע|נושא|בדוח|למידה|תרגול|הילד|הוא|היא|איפה|נראו|תוצאות/u.test(t);
  }
  return false;
}

function matchesStrengthInquiryCategory(t) {
  return hasStrengthStem(t) && hasLearningInquiryFrame(t);
}

/** @returns {number} 0 or STRONG_REPORT_INTENT_WEIGHT */
function computeSemanticReportIntentBonus(t) {
  if (matchesExplainReportInquiry(t)) return STRONG_REPORT_INTENT_WEIGHT;
  if (matchesWeaknessInquiryCategory(t)) return STRONG_REPORT_INTENT_WEIGHT;
  if (matchesStrengthInquiryCategory(t)) return STRONG_REPORT_INTENT_WEIGHT;
  return 0;
}

/** WEAK tokens — only count when paired with a STRONG token or strong intent. */
const WEAK_REPORT_TOKENS = [
  // Pronouns referring to the child
  "הוא", "היא", "הילד", "הילדה", "הבן", "הבת", "בני", "בתי",
  // Time / context
  "השבוע", "היום", "השנה", "החודש", "בבית",
];

/** Off-topic category lexicons. Short, category-based. */
const OFF_TOPIC_CATEGORIES = {
  weather: ["מזג", "אוויר", "אויר", "ממטרים", "גשם", "שלג", "טמפרטורה"],
  time: ["מה השעה", "השעון", "כמה השעה"],
  jokes_chat: ["בדיחה", "תספר בדיחה", "ספר בדיחה", "תספר לי משהו"],
  politics: ["ראש הממשלה", "ראש ממשלה", "כנסת", "בחירות", "מפלגה", "בנימין"],
  sports: ["כדורגל", "כדורסל", "מי ניצח", "המכבייה", "אולימפיאדה", "משחק אתמול"],
  food: ["מתכון", "עוגה", "פיצה", "המבורגר", "מאכל", "ארוחה", "מה לאכול", "איך מכינים"],
  code: ["javascript", "java script", "פייתון", "קוד תקין", "תכנות"],
  shopping: ["איפה לקנות", "כמה עולה", "מחיר של", "נעליים", "ביטקוין", "מטבע", "דולר"],
  songs: ["תכתוב לי שיר", "שיר על", "כתוב שיר"],
  news: ["מה החדשות", "חדשות היום", "מה קרה בעולם"],
  investments: ["השקעות", "השקעה", "בורסה", "מניות", "קריפטו", "ביטקוין"],
  generic_knowledge_qa: [
    "מה זה ", "מהו ", "מהי ", "מי המציא", "מי גילה", "מי כתב", "מתי קרה",
    "באיזו שנה", "באיזה תאריך", "איפה נמצאת", "איפה נמצא",
  ],
  trivia: ["הארי פוטר", "נארניה", "פוטוסינתזה", "פירמידות", "פרל הארבור"],
  // Note: phrases like "מה אתה חושב", "מה דעתך", "תסביר" are intentionally
  //       NOT in smalltalk because we want them to surface as ambiguous_or_unclear,
  //       so the LLM upgrade can decide based on context. Smalltalk targets only
  //       phrases that are clearly about the bot itself.
  smalltalk: ["מי אתה", "מה השם שלך", "אתה בוט", "אתה אדם"],
  computation: ["כמה זה ", "תחשב לי", "תפתור לי "],
  hobbies_general: ["שחמט", "מוזיקה", "אמנות", "מחול"],
};

/**
 * Generic-knowledge framing — clamps reportSignal even on subject/topic match.
 * IMPORTANT: JavaScript's `\b` matches ASCII word boundaries only (`[A-Za-z0-9_]`).
 * Hebrew letters are NOT word characters, so `\b` after a Hebrew character does
 * not match. We use `(?:\s|$)` explicitly instead.
 */
const GENERIC_KNOWLEDGE_FRAMING = [
  /^מה\s+זה(?:\s|$)/u,
  /^(מהו|מהי)(?:\s|$)/u,
  /^מי\s+המציא(?:\s|$)/u,
  /^מי\s+גילה(?:\s|$)/u,
  /^מי\s+כתב(?:\s|$)/u,
  /^איך\s+מכינים(?:\s|$)/u,
  /^כמה\s+עולה(?:\s|$)/u,
  /^כמה\s+זה(?:\s|$)/u,
  /^באיזו?\s+(שנה|תאריך)(?:\s|$)/u,
  /^הסבר\s+לי\s+מה\s+זה(?:\s|$)/u,
  /תסביר\s+לי\s+על\s+(?!הדוח)/u,
];

/** Privacy / system-internals — must refuse before report routing. */
const PRIVACY_SENSITIVE_PATTERNS = [
  /(?:נתונים|דוח|מידע)\s+של\s+ילד\s+אחר/u,
  /(?:מה|תראה|הראה|תן).{0,32}ילד\s+אחר/u,
  /(?:כל\s+)(?:ה)?ילדים(?:\s+באתר|\s+ש(?:ל|ב)|\s*$|\?)/u,
  /רשימ(?:ה|ת)\s+ילדים/u,
  /סיסמ(?:ה|א)|password/u,
  /דאטה\s*בייס|database|\bdb\b|מה\s+יש\s+ב(?:ד)?אטה/u,
  /(?:כל\s+)?(?:ה)?משתמשים|רשימ(?:ה|ת)\s+משתמשים/u,
  /חשבון\s+אחר|נתונים\s+של\s+מישהו\s+אחר/u,
  /ת(?:ן|ני)\s+(?:לי\s+)?(?:את\s+)?(?:כל\s+)?(?:ה)?(?:משתמשים|ילדים)/u,
  /תרא(?:ה|י)\s+(?:לי\s+)?(?:את\s+)?(?:כל\s+)?(?:ה)?ילדים/u,
];

/** Health / clinical / diagnosis — route to HEALTH_BOUNDARY (not sensitive_education). */
const HEALTH_SENSITIVE_PATTERNS = [
  /(?:רופא|רפואי|נוירולוג|פסיכולוג)/u,
  /בעיה\s+בראש/u,
  /בעיה\s+פסיכולוגית/u,
  /(?:האם\s+)?(?:צריך|כדאי)\s+אבחון/u,
  /המלצה\s+לאבחון|תכתוב\s+לי\s+המלצה\s+לאבחון/u,
  /(?:האם\s+)?(?:ל|אל)\s*פנ(?:ות|ות)\s*(?:ל)?(?:נוירולוג|פסיכולוג|רופא)/u,
  /סימן\s+ל(?:לקות|וקות)/u,
  /(?:זה\s+)?(?:אומר|מעיד)\s+.*(?:דיסלקצ|דיסלקס|הפרעת\s+קשב|לקות)/u,
  /(?:האם\s+)?(?:יש\s+ל(?:ו|ה)|ל(?:ילד|ילדה)\s+יש)\s+הפרעת\s+קשב/u,
  /חשד\s+ל(?:דיסלקצ|הפרעת|לקות|אבחון)/u,
  /(?:האם\s+)?(?:צריך|כדאי)\s+(?:טיפול|תרופה)/u,
  /(?:אבחון|אבחנה)\s*(?:מומלץ|נדרש|כדאי)/u,
  /טיפול\s+(?:פסיכ|נוירו|רפוא)/u,
  /האם\s+ז(?:ה|ו)\s+אומר\s+ש(?:יש|יהי)/u,
  /זה\s+אומר\s+ש(?:יש|יהי)\s+בעיה/u,
  /האם\s+יש\s+כאן\s+בעיה/u,
  /האם\s+ז(?:ה|ו)\s+משהו\s+רציני/u,
  /יש\s+סיבה\s+לדאוג/u,
  /^(?:ז(?:ה|ו)\s+)?חמור\s*\??$/u,
];

/** Diagnostic / clinical lexicon — independent of report context. */
const DIAGNOSTIC_PATTERNS = [
  /דיסלקצי[הא]|דיסלקסי[הא]?|דיסלקסי[ת]?\b|דיסקלקולי[הא]/u,
  /לקות\s*למידה/u,
  /הפרעת\s*קשב|בעיית\s*קשב|הפרעות\s*קשב/u,
  /\badhd\b/i,
  /אוטיסט|על\s*הספקטרום|אוטיזם/u,
  /חרד[הת]\s*(חברתית|מתמדת|של|אצל)?|חרדות\s*(של|אצל)?/u,
  /\bocd\b/i,
  /(הוא|היא|הילד|הילדה).{0,16}(בסדר\s*רגשית|רגשית\s*בסדר)/u,
  /רגשית\s*בסדר|רגשי\s*בסדר/u,
  /יש\s*לו\s*אבחון|יש\s*לה\s*אבחון|מה\s*ה?אבחון|מה\s*ה?אבחנה/u,
  /(?:יש\s*לילד|לילד\s*יש|יש\s*לילדה|לילדה\s*יש|יש\s*לו|יש\s*לה).{0,40}(?:דיסלקצי|דיסלקסי|דיסקלקולי|לקות|הפרעת|adhd|אוטיז|אוטיסט)/iu,
  /ת(?:אבח|ן|ני)\s*(?:ן|ני)?(?:\s+א(?:ת|תי))?(?:\s*(?:ה)?(?:ילד|ילדה|בן|בת))?/u,
  /אבח(?:ן|ני)\s+א(?:ת|תי)\s*(?:ה)?(?:ילד|ילדה|בן|בת)?/u,
  /(?:תן|תני|תני\s+לי)\s+אבח(?:ון|נה)/u,
  /אבח(?:ון|נה)\s+ל(?:ילד|ילדה)/u,
  // Emotional / mental-health wording (boundary — not diagnosis from report data)
  /בעיה\s+רגשית|קושי\s+רגשי|מצב\s+רגשי/u,
  /דיכאון|בדיכאון/u,
  /עצוב\s+מאוד/u,
  /(?:^|\s)(הוא|היא)\s+חרד(?:\s|$)/u,
];

/** Off-topic patterns beyond category lexicon. */
const OFF_TOPIC_EXTRA_PATTERNS = [
  /תעזור\s+לי\s+ב(?:ה)?שקעות/u,
  /שיעורי\s+בית\s+ש(?:לא|אינ(?:ם|ן))\s+קשורים\s+לדוח/u,
  /ת(?:ן|ני)\s+(?:לי\s+)?שיעורי\s+בית\s+ש(?:לא|אינ(?:ם|ן))/u,
];

/** Legitimate parent report questions — must never land in ambiguous_or_unclear. */
const LEGITIMATE_PARENT_PATTERNS = [
  /איפה\s+(?:הוא|היא|הילד|הילדה)\s+צריך\s+עזרה/u,
  /מה\s+לעשות\s+(?:איתו|איתה|עמו|עמה)(?:\s+בבית)?\s+היום/u,
  /למה\s+כ(?:תוב|תב)\s+ש(?:יש|יהי)\s+פער/u,
  /האם\s+הבעיה\s+היא\s+נשיאה/u,
  /מה\s+השתנה\s+מ(?:ה)?שבוע(?:\s+ה)?קודם/u,
  /האם\s+הפעילות\s+.*השפיע/u,
  /(?:מה\s+)?(?:שלוש(?:ת)?|3)\s*(?:ה)?דברים(?:\s+הכי\s+חשוב(?:ים)?)?/u,
  /מה\s+לעשות\s+בבית/u,
  /איפה\s+רואים(?:\s+(?:ש(?:יפור|התקדמות)|(?:ש(?:ה)?)?מצב\s+טוב\s+יותר))?/u,
  /מה\s+השתפר/u,
  /מה\s+ה(?:כי\s+)?חשוב(?:\s+(?:כרגע|לי(?:\s+ל)?דעת(?:\s+השבוע)?|עכשיו))?/u,
  /במה\s+להתמקד\s+(?:עכשיו|השבוע)?/u,
  /מה\s+העיקר/u,
  /מה\s+חשוב\s+עכשיו/u,
  /מה\s+כדאי\s+להימנע(?:\s+ממנ(?:ו|ה))?(?:\s+עכשיו)?/u,
  /ממה\s+להימנע/u,
  /מה\s+לא\s+(?:כדאי\s+)?(?:ל)?עשות/u,
  /מה\s+לא\s+כדאי\s+(?:לי\s+)?להסיק/u,
  /ת(?:ן|ני)\s+(?:לי\s+)?תוכנית(?:\s+עבודה)?\s+(?:ל)?שבוע/u,
  /מה\s+לשאול\s+(?:אותו|אותה)\s+בבית/u,
  /על\s+איזה\s+נושא\s+ל(?:פתוח|התחיל)/u,
  /האם\s+(?:הוא|היא)\s+מתקדם/u,
  /האם\s+ז(?:ה|ו)\s+בגלל\s+לחץ\s+זמן/u,
  /ת(?:ן|ני)\s+(?:לי\s+)?תרגול/u,
  /^תסביר\s+לי(?:\s|$)/u,
  /תקצר\s+לי/u,
  /(?:פשוט|קל)\s+יותר/u,
  /תעש(?:ה|י)\s+.*\s+פשוט\s+יותר/u,
  /^(?:אז\s+)?מה\s+עושים/u,
  /^איך\s+לשמר/u,
  /^ו?מה\s+אם\s+(?:ה(?:וא|יא)|(?:הילד|הילדה))\s+טוע/u,
  /^למה\s*\??$/u,
];

/**
 * @param {string} utterance
 */
export function matchesLegitimateParentQuestion(utterance) {
  const t = normalizeForClassifier(utterance);
  if (!t) return false;
  return LEGITIMATE_PARENT_PATTERNS.some((re) => re.test(t));
}

/**
 * @param {string} t — normalized utterance
 */
function matchesPrivacySensitive(t) {
  if (scorePeerComparisonSignal(t) >= 0.9) return false;
  return PRIVACY_SENSITIVE_PATTERNS.some((re) => re.test(t));
}

/**
 * @param {string} t — normalized utterance
 */
function matchesHealthSensitive(t) {
  if (HEALTH_SENSITIVE_PATTERNS.some((re) => re.test(t))) return true;
  for (const re of DIAGNOSTIC_PATTERNS) {
    if (re.test(t)) return true;
  }
  return false;
}

/**
 * @param {string} t — normalized utterance
 */
function matchesOffTopicExtra(t) {
  return OFF_TOPIC_EXTRA_PATTERNS.some((re) => re.test(t));
}

/** Peer / class norm comparison — not clinical diagnosis; separate early-exit copy. */
const PEER_COMPARISON_PATTERNS = [
  /ילדים\s+אחרים|מילדים\s+אחרים/u,
  /לעומת\s+ילדים|מול\s+ילדים\s+אחרים/u,
  /חלש\s+יותר\s+מילדים|יותר\s+חלש\s+מילדים|טוב\s+יותר\s+מילדים|חזק\s+יותר\s+מילדים/u,
  /ביחס\s+לילדים\s+אחרים|לעומת\s+שאר\s+הכיתה|לעומת\s+הכיתה/u,
  /האם\s+הוא\s+יותר\s+חלש\s+מילדים|האם\s+היא\s+יותר\s+חלשה\s+מילדים/u,
  /האם\s+הוא\s+חלש\s+יותר\s+מילדים/u,
];

// ─── Normalization ──────────────────────────────────────────────────────────

/**
 * Strip niqqud, quotes, punctuation; lowercase; collapse whitespace.
 * @param {string} raw
 */
function normalizeForClassifier(raw) {
  return String(raw || "")
    .replace(/[\u05b0-\u05c7]/g, "")
    .replace(/['"״׳`]/g, "")
    .replace(/[?!.,:;]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Count meaningful tokens (after dropping fillers). */
function countMeaningfulTokens(normalized) {
  if (!normalized) return 0;
  const drops = new Set([
    "אבל", "כן", "לא", "טוב", "אוקיי", "אוקי", "תודה", "סליחה",
    "אז", "אה", "הא", "אהה", "אממ", "אם", "ש", "אש", "ב", "ל", "מ",
  ]);
  const tokens = normalized.split(/\s+/).filter((t) => t.length >= 2 && !drops.has(t));
  return tokens.length;
}

// ─── Payload-derived vocabulary ─────────────────────────────────────────────

/**
 * Extract subject + topic display name vocabulary from the report payload.
 * @param {unknown} payload
 * @returns {{ subjectsHe: string[]; topicsHe: string[] }}
 */
function extractReportVocabulary(payload) {
  /** @type {string[]} */
  const subjectsHe = [];
  /** @type {string[]} */
  const topicsHe = [];
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
    const sid = normalizeSubjectId(sp?.subject);
    if (!sid) continue;
    const subjectLabel = subjectLabelLocalHe(sid);
    if (subjectLabel) subjectsHe.push(subjectLabel.toLowerCase());
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of recs) {
      const dn = String(tr?.displayName || "").trim().toLowerCase();
      if (dn.length >= 3) topicsHe.push(dn);
    }
  }
  return { subjectsHe, topicsHe };
}

/**
 * Local Hebrew subject label map. Mirrors contract-reader's SUBJECT_ORDER.
 * Avoids importing display dictionaries that are tied to UI layers.
 * @param {string} subjectId
 */
function subjectLabelLocalHe(subjectId) {
  const sid = normalizeSubjectId(subjectId);
  switch (sid) {
    case "math": return "מתמטיקה";
    case "geometry": return "גאומטריה";
    case "english": return "אנגלית";
    case "science": return "מדעים";
    case "history": return "היסטוריה";
    case "hebrew": return "עברית";
    case "moledet-geography": return "מולדת";
    default: return "";
  }
}

// ─── Signal scorers ─────────────────────────────────────────────────────────

/**
 * @param {string} t — normalized utterance
 * @param {{ subjectsHe: string[]; topicsHe: string[] }} vocab
 * @param {unknown} payload
 * @param {string} rawUtterance
 */
function scoreReportSignal(t, vocab, payload, rawUtterance) {
  let score = 0;
  let hasStrong = false;
  let pronounsMatched = false;
  let subjectTopicNameMatched = false;
  let hasGenericKnowledgeFraming = false;

  for (const tok of STRONG_REPORT_TOKENS) {
    if (t.includes(tok.toLowerCase())) {
      score += STRONG_REPORT_TOKEN_WEIGHT;
      hasStrong = true;
    }
  }
  const semanticBonus = computeSemanticReportIntentBonus(t);
  if (semanticBonus > 0) {
    score += semanticBonus;
    hasStrong = true;
  }
  for (const re of STRONG_REPORT_INTENTS) {
    if (re.test(t)) {
      score += STRONG_REPORT_INTENT_WEIGHT;
      hasStrong = true;
    }
  }
  for (const tok of WEAK_REPORT_TOKENS) {
    if (new RegExp(`(^|\\s)${tok}(\\s|$)`, "u").test(t)) {
      if (tok === "הוא" || tok === "היא" || tok === "הילד" || tok === "הילדה" ||
          tok === "הבן" || tok === "הבת" || tok === "בני" || tok === "בתי") {
        pronounsMatched = true;
      }
    }
  }
  if (hasStrong) {
    for (const tok of WEAK_REPORT_TOKENS) {
      if (new RegExp(`(^|\\s)${tok}(\\s|$)`, "u").test(t)) {
        score += WEAK_REPORT_TOKEN_WEIGHT;
      }
    }
  }

  for (const lbl of vocab.subjectsHe) {
    if (lbl && t.includes(lbl)) {
      subjectTopicNameMatched = true;
      score += SUBJECT_TOPIC_VOCAB_WEIGHT;
      break;
    }
  }
  for (const lbl of vocab.topicsHe) {
    if (lbl && t.includes(lbl)) {
      subjectTopicNameMatched = true;
      score += SUBJECT_TOPIC_VOCAB_WEIGHT;
      break;
    }
  }

  if (payload && utteranceQualifiesAsReportQuestion(rawUtterance, payload)) {
    const rowRes = resolveReportRowFromUtterance(rawUtterance, payload);
    if (rowRes.best || rowRes.subjectId) {
      subjectTopicNameMatched = true;
      score += STRONG_REPORT_INTENT_WEIGHT;
      hasStrong = true;
    }
  }

  for (const re of GENERIC_KNOWLEDGE_FRAMING) {
    if (re.test(t)) {
      hasGenericKnowledgeFraming = true;
      break;
    }
  }
  if (hasGenericKnowledgeFraming && subjectTopicNameMatched && utteranceQualifiesAsReportQuestion(rawUtterance, payload)) {
    hasGenericKnowledgeFraming = false;
    score = Math.max(score, STRONG_REPORT_INTENT_WEIGHT);
    hasStrong = true;
  } else if (hasGenericKnowledgeFraming && score > 0.3) {
    score = 0.3;
  }

  return {
    score: Math.min(1, score),
    hasStrong,
    pronounsMatched,
    subjectTopicNameMatched,
    hasGenericKnowledgeFraming,
  };
}

/**
 * @param {string} t — normalized utterance
 * @param {boolean} hasStrongReportToken
 */
function scoreOffTopicSignal(t, hasStrongReportToken) {
  let score = 0;
  if (matchesOffTopicExtra(t)) score += 0.8;
  for (const cat of Object.values(OFF_TOPIC_CATEGORIES)) {
    for (const phrase of cat) {
      if (t.includes(phrase.toLowerCase())) {
        score += OFF_TOPIC_CATEGORY_WEIGHT;
      }
    }
  }
  // Cap and reduce when a STRONG report token is also present (mixed intent).
  score = Math.min(1, score);
  if (hasStrongReportToken && score > 0) {
    score = Math.max(0, score - MIXED_INTENT_PENALTY);
  }
  return score;
}

/**
 * @param {string} t — normalized utterance
 */
function scoreDiagnosticSignal(t) {
  for (const re of DIAGNOSTIC_PATTERNS) {
    if (re.test(t)) return 0.95;
  }
  return 0;
}

/**
 * @param {string} t — normalized utterance
 */
function scorePeerComparisonSignal(t) {
  for (const re of PEER_COMPARISON_PATTERNS) {
    if (re.test(t)) return 0.92;
  }
  return 0;
}

/**
 * "מה עם …?" where the remainder names a subject/topic label present in the payload.
 * Category-level shorthand (not per-sentence FAQ).
 * @param {string} t
 * @param {{ subjectsHe: string[]; topicsHe: string[] }} vocab
 */
function maImReferencesPayloadVocab(t, vocab) {
  if (!/^מה\s+עם\s+/u.test(t)) return false;
  const tail = t.replace(/^מה\s+עם\s+/u, "").trim();
  if (tail.length < 2) return false;
  const labels = [...new Set([...vocab.subjectsHe, ...vocab.topicsHe])];
  for (const lbl of labels) {
    if (lbl && tail.includes(lbl)) return true;
  }
  return false;
}

/**
 * True for "מה עם …?" when no subject/topic label from the payload appears in the tail.
 * QA harness / callers use this to distinguish expected ambiguity from routing bugs.
 */
export function maImSubjectAbsentFromPayload({ utterance, payload }) {
  const t = normalizeForClassifier(utterance);
  if (!/^מה\s+עם\s+/u.test(t)) return false;
  const vocab = extractReportVocabulary(payload);
  return !maImReferencesPayloadVocab(t, vocab);
}

// ─── Main entry ─────────────────────────────────────────────────────────────

/**
 * Run the deterministic classifier. Pure / sync / no I/O.
 *
 * @param {{ utterance: string; payload?: unknown }} args
 * @returns {ClassifierResult}
 */
export function classifyParentQuestionDeterministic({ utterance, payload }) {
  const t = normalizeForClassifier(utterance);
  const vocab = extractReportVocabulary(payload);
  const meaningfulTokenCount = countMeaningfulTokens(t);

  const reportRes = scoreReportSignal(t, vocab, payload, String(utterance || ""));
  const offTopicSignal = scoreOffTopicSignal(t, reportRes.hasStrong);
  const diagnosticSignal = scoreDiagnosticSignal(t);
  const ambiguitySignal = computeAmbiguity({
    meaningfulTokenCount,
    reportSignal: reportRes.score,
    offTopicSignal,
    hasStrong: reportRes.hasStrong,
    subjectTopicNameMatched: reportRes.subjectTopicNameMatched,
    pronounsMatched: reportRes.pronounsMatched,
  });

  const signals = {
    reportSignal: reportRes.score,
    offTopicSignal,
    diagnosticSignal,
    ambiguitySignal,
    hasStrongReportToken: reportRes.hasStrong,
    hasGenericKnowledgeFraming: reportRes.hasGenericKnowledgeFraming,
    subjectTopicNameMatched: reportRes.subjectTopicNameMatched,
    pronounsMatched: reportRes.pronounsMatched,
    meaningfulTokenCount,
  };

  // Decision rules in strict order.
  // 0. Privacy / system internals — refuse before any report access.
  if (matchesPrivacySensitive(t)) {
    return {
      bucket: "privacy_sensitive",
      confidence: 0.96,
      source: "deterministic",
      signals,
    };
  }

  // 1. Health / clinical takes precedence over everything else (clinical safety).
  if (matchesHealthSensitive(t)) {
    return {
      bucket: "health_sensitive",
      confidence: 0.95,
      source: "deterministic",
      signals,
    };
  }

  const peerComparisonSignal = scorePeerComparisonSignal(t);
  if (peerComparisonSignal >= 0.9) {
    return {
      bucket: "peer_comparison",
      confidence: peerComparisonSignal,
      source: "deterministic",
      signals: { ...signals, peerComparisonSignal },
    };
  }

  const aggregateQuestionClass = detectAggregateQuestionClass(String(utterance || ""));
  if (
    aggregateQuestionClass !== "none" &&
    aggregateQuestionClass !== "vague_summary_question" &&
    aggregateQuestionClass !== "recommendation_action"
  ) {
    return {
      bucket: "report_related",
      confidence: 0.82,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.78),
        hasStrongReportToken: true,
        ambiguitySignal: Math.min(ambiguitySignal, 0.2),
        aggregateQuestionClass,
      },
    };
  }

  // 1a. Report-row-first: anchored report + row/subject/general question (before off-topic / ambiguous).
  if (hasAnchoredReportRows(payload) && utteranceQualifiesAsReportQuestion(String(utterance || ""), payload)) {
    const rowRes = resolveReportRowFromUtterance(String(utterance || ""), payload);
    return {
      bucket: "report_related",
      confidence: 0.84,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.78),
        hasStrongReportToken: true,
        subjectTopicNameMatched: !!(rowRes.best || rowRes.subjectId),
        ambiguitySignal: Math.min(ambiguitySignal, 0.2),
      },
    };
  }

  // 1b. Catalog topic named in the utterance but row not anchored — Phase E / bank path must run before
  //     off-topic hits on mid-sentence fragments like "מה זה …" (generic_knowledge_qa category).
  const looseUnanchoredEarly = matchLooseTopicFromUtterance(String(utterance || ""), payload);
  if (looseUnanchoredEarly && !looseUnanchoredEarly.anchored) {
    return {
      bucket: "report_related",
      confidence: 0.77,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.7),
        hasStrongReportToken: true,
        subjectTopicNameMatched: true,
      },
    };
  }

  // 2. Subject/status inquiry framed as child + report scope ("מה מצב הילד … בנושא X") —
  // must beat hobbies/off-topic lexicon hits (e.g. שחמט/מוזיקה in OFF_TOPIC_CATEGORIES).
  if (/מה\s*מצב\s*הילד\s*שלי\s*ב/u.test(t) || /^מה\s*מצב.*ב(?:מדעים|עברית|חשבון|אנגלית|גאומטריה|גיאומטריה|מולדת|שחמט|מוזיקה)/u.test(t)) {
    return {
      bucket: "report_related",
      confidence: 0.86,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.75),
        hasStrongReportToken: true,
      },
    };
  }

  // 3. Off-topic: clear category match AND no strong report token.
  if (offTopicSignal >= CLASSIFIER_THRESHOLDS.offTopic && !reportRes.hasStrong) {
    return {
      bucket: "off_topic",
      confidence: offTopicSignal,
      source: "deterministic",
      signals,
    };
  }

  // 4. "מה עם <payload subject/topic>?" — beats ambiguous when the named row exists.
  if (
    maImReferencesPayloadVocab(t, vocab) &&
    offTopicSignal <= CLASSIFIER_THRESHOLDS.reportRelatedOffTopicCeiling &&
    meaningfulTokenCount >= CLASSIFIER_THRESHOLDS.meaningfulTokenMinForReport
  ) {
    return {
      bucket: "report_related",
      confidence: 0.78,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.78),
        hasStrongReportToken: true,
        subjectTopicNameMatched: true,
      },
    };
  }

  // 2c. Policy / integrity violations — must reach Stage A (`parent_policy_refusal`) with payload contracts.
  if (
    /תמציא\s*נתונים|תסתיר\s*מההורה|תכתוב\s+ש(?:ה)?(?:ילד|ילדה)\s+מצוין|בלי\s+להתחשב\s+בנתונים|תעצור\s+להראות\s+חולשות|לא\s*מותר\s*להמציא/u.test(
      t,
    )
  ) {
    return {
      bucket: "report_related",
      confidence: 0.88,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.78),
        hasStrongReportToken: true,
      },
    };
  }

  // 2d. Prompt-style overrides — must reach Stage A grounded refusal (not ambiguous clarification exit).
  if (/תתעלם\s*מהדוח|מעכשיו\s*אל\s*תשתמש|תחשוף\s*לי\s*הוראות|debug|system\s*prompt/u.test(t)) {
    return {
      bucket: "report_related",
      confidence: 0.86,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.78),
        hasStrongReportToken: true,
      },
    };
  }

  // 2e. Education-adjacent sensitive decisions — Stage A `sensitive_education_choice` (not ambiguous early-exit).
  if (
    /האם\s*כדאי\s*להעביר\s*בית\s*ספר|מעבר\s*בית\s*ספר|להעביר\s*בית\s*ספר|האם\s*לעבור\s*בית\s*ספר|מורה\s*פרטי|שיעורים\s*פרטיים|האם\s*הוא\s*מחונן/u.test(
      t,
    )
  ) {
    return {
      bucket: "report_related",
      confidence: 0.87,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.75),
        hasStrongReportToken: true,
      },
    };
  }

  // 2f. Trajectory / trend questions — keep on-report (mass catalog dg_03/dg_04 style). Avoid ambiguous early-exit.
  if (
    /(?:^|\s)(?:האם\s+(?:הוא|היא)\s+(?:משתפר(?:ת)?|בירידה|עולה|יורד(?:ת)?|מוכן(?:ת)?|בשיפור))|האם\s+יש\s+(?:שיפור|התקדמות|ירידה)|האם\s+עדיין\s+משתפר|יש\s+שיפור\s+ב(?:מתמטיקה|חשבון|עברית|אנגלית)|מוכן\s+לעלות\s+רמה/u.test(
      t,
    )
  ) {
    return {
      bucket: "report_related",
      confidence: 0.84,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.72),
        hasStrongReportToken: true,
      },
    };
  }

  // 2g. Prioritization / planning / comparison stems from Parent AI catalog — must reach Stage A (not ambiguous router exit).
  if (
    /באיזה\s+מקצוע\s+(?:להתחיל|עדיף)|מה\s+הנושא\s+הכי\s+דחוף|האם\s+הבעיה\s+היא\s+קריאה\s+או\s+חשבון|כמה\s+זמן\s+כדאי\s+לתרגל\s+ביום|תן\s+לי\s+תוכנית\s+תרגול|תסכם\s+לי\s+את\s+המצב|למה\s+הדוח\s+אומר|איזה\s+שאלות\s+הוא\s+פספס|האם\s+הוא\s+מנחש|האם\s+הוא\s+עונה\s+מהר/u.test(
      t,
    )
  ) {
    return {
      bucket: "report_related",
      confidence: 0.83,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.72),
        hasStrongReportToken: true,
      },
    };
  }

  // 2h. Next-step / recommendation shorthand with a loaded anchored report — stay on-report (not ambiguous early-exit).
  if (
    hasAnchoredTopicObservation(payload) &&
    detectAggregateQuestionClass(utterance) === "recommendation_action"
  ) {
    return {
      bucket: "report_related",
      confidence: 0.82,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.75),
        hasStrongReportToken: true,
      },
    };
  }

  // 2m. Anchored report + explicit subject/topic label + "I want to understand …" — on-report (not ambiguous).
  if (hasAnchoredTopicObservation(payload) && reportRes.subjectTopicNameMatched && /אני\s+רוצה\s+להבין/u.test(t)) {
    return {
      bucket: "report_related",
      confidence: 0.79,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.73),
        hasStrongReportToken: true,
      },
    };
  }

  // 2n. "במקצוע …" + clarity/uncertainty on a payload subject label — on-report (not ambiguous).
  if (
    hasAnchoredTopicObservation(payload) &&
    reportRes.subjectTopicNameMatched &&
    /(^|\s)במקצוע\s+/u.test(t) &&
    /לא\s+ברור|לא\s+מבין|מבלבל|לא\s+ברורה/u.test(t)
  ) {
    return {
      bucket: "report_related",
      confidence: 0.78,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.72),
        hasStrongReportToken: true,
      },
    };
  }

  // 2o. Topic display matched + short status ask ("נושא — מה המצב?") — on-report without "מה קורה" prefix.
  const looseForStatus = matchLooseTopicFromUtterance(String(utterance || ""), payload);
  if (
    looseForStatus &&
    looseForStatus.anchored &&
    hasAnchoredTopicObservation(payload) &&
    /מה\s+המצב|איך\s+המצב/u.test(t)
  ) {
    return {
      bucket: "report_related",
      confidence: 0.76,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.72),
        hasStrongReportToken: true,
        subjectTopicNameMatched: true,
      },
    };
  }

  // 2p. Topic-only shorthand with light punctuation ("שברים???") — anchored display match, very short utterance.
  const looseBare = matchLooseTopicFromUtterance(String(utterance || ""), payload);
  if (looseBare && looseBare.anchored && hasAnchoredTopicObservation(payload) && meaningfulTokenCount <= 2) {
    const uFold = foldUtteranceForHeMatch(String(utterance || ""))
      .replace(/[?!.,:;״׳]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const dn = foldUtteranceForHeMatch(String(looseBare.displayName || ""))
      .replace(/\s+/g, " ")
      .trim();
    if (dn.length >= 2 && (uFold === dn || uFold === `ה${dn}`)) {
      return {
        bucket: "report_related",
        confidence: 0.74,
        source: "deterministic",
        signals: {
          ...signals,
          reportSignal: Math.max(reportRes.score, 0.7),
          hasStrongReportToken: true,
          subjectTopicNameMatched: true,
        },
      };
    }
  }

  // 2q. Severity / worry about the report (no explicit "דוח" token) — needs anchored rows so off-topic stays gated.
  if (
    hasAnchoredTopicObservation(payload) &&
    (/לא\s+ברור\s+לי\s+אם\s+זה\s+חמור(?:\s+או\s+לא)?|חמור\s+או\s+לא|יש\s+פה\s+משהו\s+מדאיג|האם\s+צריך\s+לדאוג\s+מהדוח/u.test(t) ||
      (/מדאיג|לדאוג/u.test(t) && /דוח/u.test(t)))
  ) {
    return {
      bucket: "report_related",
      confidence: 0.81,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.72),
        hasStrongReportToken: true,
      },
    };
  }

  // 2r. Anchored report + recommendation rationale / “what to avoid now” — sync path has no LLM classifier upgrade; keep on-report (not ambiguous).
  if (
    hasAnchoredTopicObservation(payload) &&
    (/למה\s+ה?המלצה/u.test(t) || /מה\s+לא\s+כדאי\s+לעשות\s+עכשיו/u.test(t))
  ) {
    return {
      bucket: "report_related",
      confidence: 0.84,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.76),
        hasStrongReportToken: true,
      },
    };
  }

  // 2i. Pasted homework / external exercise — Stage A + Phase E shortcut requires report_related before scope + truth packet.
  if (looksLikeExternalPastedQuestion(String(utterance || ""))) {
    return {
      bucket: "report_related",
      confidence: 0.81,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.72),
        hasStrongReportToken: true,
      },
    };
  }

  // 2j. Topic-scoped "מה קורה …" when payload vocabulary matches — on-report (not ambiguous).
  if (hasAnchoredTopicObservation(payload) && /^מה\s+קורה\s+/u.test(t) && reportRes.subjectTopicNameMatched) {
    return {
      bucket: "report_related",
      confidence: 0.8,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.74),
        hasStrongReportToken: true,
      },
    };
  }

  // 9. Report-related: needs strong signal AND low off-topic AND meaningful length.
  if (
    reportRes.score >= CLASSIFIER_THRESHOLDS.reportRelated &&
    offTopicSignal <= CLASSIFIER_THRESHOLDS.reportRelatedOffTopicCeiling &&
    reportRes.hasStrong &&
    meaningfulTokenCount >= CLASSIFIER_THRESHOLDS.meaningfulTokenMinForReport
  ) {
    return {
      bucket: "report_related",
      confidence: reportRes.score,
      source: "deterministic",
      signals,
    };
  }

  // 4. Subject/topic match without strong intent => ambiguous (NOT report_related).
  //    "תסביר לי שברים" or "מה עם גאומטריה?" without strong report verb.
  //    Note: "מה עם X?" is a common parent shorthand for "what about X in the report".
  //    We treat it as ambiguous so the LLM upgrade can decide; the deterministic
  //    fallback for "מה עם גאומטריה" will be report_related via the dedicated
  //    "מה עם" rule below.
  if (
    reportRes.subjectTopicNameMatched &&
    !reportRes.hasStrong &&
    /^מה\s+עם(?:\s|$)/u.test(t)
  ) {
    // "מה עם <topic>?" is a clear report-related shorthand even without explicit verb.
    return {
      bucket: "report_related",
      confidence: 0.65,
      source: "deterministic",
      signals: { ...signals, hasStrongReportToken: true },
    };
  }

  // 5b. Subject-scoped status / weakness when report vocabulary matches the subject label.
  if (
    reportRes.subjectTopicNameMatched &&
    (isSubjectStatusInquiry(t) || isTopicWeaknessInquiry(t))
  ) {
    return {
      bucket: "report_related",
      confidence: 0.86,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.76),
        hasStrongReportToken: true,
        ambiguitySignal: Math.min(ambiguitySignal, 0.15),
      },
    };
  }

  // 5. Legitimate parent report questions — must not fall to ambiguous.
  if (matchesLegitimateParentQuestion(String(utterance || ""))) {
    return {
      bucket: "report_related",
      confidence: 0.88,
      source: "deterministic",
      signals: {
        ...signals,
        reportSignal: Math.max(reportRes.score, 0.78),
        hasStrongReportToken: true,
        ambiguitySignal: Math.min(ambiguitySignal, 0.15),
      },
    };
  }

  // 6. Everything else => ambiguous_or_unclear (the LLM may upgrade in async path).
  return {
    bucket: "ambiguous_or_unclear",
    confidence: ambiguitySignal,
    source: "deterministic",
    signals,
  };
}

/**
 * @param {{
 *   meaningfulTokenCount: number;
 *   reportSignal: number;
 *   offTopicSignal: number;
 *   hasStrong: boolean;
 *   subjectTopicNameMatched: boolean;
 *   pronounsMatched: boolean;
 * }} args
 */
function computeAmbiguity(args) {
  let amb = 0;
  if (args.meaningfulTokenCount < 2) amb += 0.6;
  if (args.reportSignal >= 0.4 && args.offTopicSignal >= 0.4) amb += 0.4;
  if (args.subjectTopicNameMatched && !args.hasStrong) amb += 0.3;
  if (!args.hasStrong && args.pronounsMatched && args.offTopicSignal < 0.4) amb += 0.2;
  return Math.min(1, amb);
}

/**
 * Map classifier bucket to the existing CanonicalParentIntent used downstream.
 * @param {ClassifierBucket} bucket
 */
export function bucketToCanonicalIntent(bucket) {
  switch (bucket) {
    case "off_topic": return "off_topic_redirect";
    case "health_sensitive":
    case "diagnostic_sensitive": return "clinical_boundary";
    case "privacy_sensitive": return "parent_policy_refusal";
    case "peer_comparison": return "unclear";
    case "ambiguous_or_unclear": return "unclear";
    case "report_related":
    default:
      return null;
  }
}

export default {
  classifyParentQuestionDeterministic,
  bucketToCanonicalIntent,
  maImSubjectAbsentFromPayload,
  matchesLegitimateParentQuestion,
  OFF_TOPIC_RESPONSE_HE,
  GENERAL_OFF_TOPIC_RESPONSE_HE,
  DIAGNOSTIC_BOUNDARY_RESPONSE_HE,
  HEALTH_BOUNDARY_RESPONSE_HE,
  PRIVACY_BOUNDARY_RESPONSE_HE,
  NO_DATA_FOR_REQUEST_RESPONSE_HE,
  PEER_COMPARISON_RESPONSE_HE,
  AMBIGUOUS_RESPONSE_HE,
  CLASSIFIER_THRESHOLDS,
};
