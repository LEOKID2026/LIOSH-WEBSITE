/**
 * תוויות אבחון בעברית בלבד להורה — ללא מזהים טכניים באנגלית.
 */

import {
  getMathReportBucketDisplayName,
  getTopicName,
  getEnglishTopicName,
  getScienceTopicName,
  getHistoryTopicName,
  getHistorySubtopicName,
  getHebrewTopicName,
  getMoledetGeographyTopicName,
} from "./math-report-generator.js";

/**
 * כשאין מספיק מידע לתווית ספציפית — אותו ניסוח לכל המקצועות.
 * (באנגלית: `englishWeaknessFallbackHe` - בלי "באנגלית" בטקסט, כי בדוחות חוצהמקצועיים מוסיפים `(אנגלית)`.)
 */
export const GENERIC_WEAKNESS_HE = "יש טעויות שחוזרות כאן";
export const GENERIC_POINT_HE = "קושי שכדאי לשים אליו לב";
export const GENERIC_REINFORCE_HE = "כדאי לחזק את הנושא הזה עוד קצת";

/** מפתח נושא באנגלית (כמו ב localStorage) → תווית עברית להורה */
const ENGLISH_TOPIC_KEY_HE = {
  vocabulary: "אוצר מילים",
  grammar: "דקדוק וצורות",
  translation: "תרגום",
  sentences: "הרכבת משפטים",
  writing: "כתיבה",
  mixed: "תרגול משולב",
};

function englishTopicLabelHe(topicKey) {
  const k = String(topicKey || "")
    .trim()
    .toLowerCase();
  if (!k) return null;
  return ENGLISH_TOPIC_KEY_HE[k] || null;
}

/** טקסט כשאין פירוט טכני — בעברית; המקצוע (אנגלית) נוסף בשכבות אחרות כשצריך */
export function englishWeaknessFallbackHe(topicKey) {
  const t = englishTopicLabelHe(topicKey);
  if (t) return `בנושא ${t}`;
  return "בנושא תרגול";
}

/** מילון מקוצר: מקטעים באנגלית מתוך patternFamily/kind → עברית */
const EN_SNIPPET_HE = {
  word: "מילולי",
  problems: "בעיות",
  word_problems: "בעיות מילוליות",
  vocabulary: "אוצר מילים",
  grammar: "דקדוק",
  sentence: "משפטים",
  completion: "השלמה",
  translation: "תרגום",
  compare: "השוואה",
  comparison: "השוואה",
  remainder: "שארית",
  division: "חלוקה",
  fraction: "שברים",
  fractions: "שברים",
  decimal: "עשרוניים",
  percent: "אחוזים",
  discount: "הנחות",
  perimeter: "היקף",
  area: "שטח",
  volume: "נפח",
  prism: "מנסרה",
  angle: "זוויות",
  triangle: "משולשים",
  rectangle: "מלבן",
  mcq: "בחירה מרובה",
  cloze: "השלמת חסר",
  preposition: "מילות יחס",
  prepositions: "מילות יחס",
  listening: "האזנה",
  spelling: "איות",
  tense: "זמני פעולה",
  irregular: "שורשים לא רגילים",
  reading: "קריאה",
  writing: "כתיבה",
  recall: "הזכרה",
  vocab: "אוצר מילים",
  story: "סיפור",
  subtraction: "חיסור",
  addition: "חיבור",
  multiplication: "כפל",
  mixed: "ערבוב פעולות",
  vertical: "כתיבה אנכית",
  borrow: "השאלה",
  once: "פעם אחת",
  easy: "רמה בסיסית",
  medium: "רגיל",
  hard: "רמה מתקדמת",
  grade: "כיתה",
  context: "הקשר",
  logical: "רצף לוגי",
  sequence: "רצף",
  homeland: "מולדת",
  geography: "גאוגרפיה",
};

function hasHebrewLetters(s) {
  return /[\u0590-\u05FF]/.test(String(s || ""));
}

function isMostlyAsciiIdentifier(s) {
  const t = String(s || "")
    .trim()
    .replace(/[\s\d_./:?=-]/g, "");
  if (t.length < 2) return false;
  return !/[\u0590-\u05FF]/.test(t) && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(t);
}

/**
 * ניסיון להפוך slug טכני לתיאור עברי קצר; אם אין מספיק — null.
 * @param {string|null|undefined} slug
 */
export function hebrewFromEnglishSlug(slug) {
  if (!slug || typeof slug !== "string") return null;
  const raw = slug.trim().toLowerCase();
  if (!raw) return null;
  if (EN_SNIPPET_HE[raw]) return EN_SNIPPET_HE[raw];
  const parts = raw.split(/[_/:+]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const mapped = parts.map((p) => EN_SNIPPET_HE[p]).filter(Boolean);
  if (mapped.length === 0) return null;
  if (mapped.length >= Math.min(2, parts.length)) return [...new Set(mapped)].join(" · ");
  if (mapped.length === 1 && parts.length <= 4) return mapped[0];
  return null;
}

/**
 * תווית נושא לפי מקצוע ומפתח דלי (operation/topic).
 * @param {string} subjectId
 * @param {string|null|undefined} bucketKey
 */
/** Placeholder strings returned by topic-name functions when a key is missing from their map. */
const TOPIC_NAME_PLACEHOLDER_LABELS = new Set(["נושא", "נושא זה", "general", "unknown"]);

/**
 * QA-only log — collects every case where topicBucketLabelHe suppressed a placeholder label.
 * Never shown to parents. Import getBlockedTopicLabelLog() from QA scripts to inspect.
 * @type {Array<{subject: string, topicKey: string, blockedLabel: string}>}
 */
const _blockedTopicLabelLog = [];

/** Returns a snapshot of all placeholder-blocked entries since last clear. QA use only. */
export function getBlockedTopicLabelLog() {
  return [..._blockedTopicLabelLog];
}

/** Resets the blocked-label log. Call between test runs. */
export function clearBlockedTopicLabelLog() {
  _blockedTopicLabelLog.length = 0;
}

export function topicBucketLabelHe(subjectId, bucketKey) {
  const k = bucketKey != null ? String(bucketKey) : "";
  if (!k) return null;
  try {
    let result = null;
    if (subjectId === "math") result = getMathReportBucketDisplayName(k);
    else if (subjectId === "geometry") result = getTopicName(k);
    else if (subjectId === "english") result = getEnglishTopicName(k);
    else if (subjectId === "science") result = getScienceTopicName(k);
    else if (subjectId === "history") {
      result = String(k).startsWith("hist_sub_") ? getHistorySubtopicName(k) : getHistoryTopicName(k);
    }
    else if (subjectId === "hebrew") result = getHebrewTopicName(k);
    else if (subjectId === "moledet-geography") result = getMoledetGeographyTopicName(k);
    if (result != null) {
      if (TOPIC_NAME_PLACEHOLDER_LABELS.has(String(result).trim())) {
        _blockedTopicLabelLog.push({ subject: String(subjectId), topicKey: k, blockedLabel: String(result).trim() });
        return null;
      }
      return result;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * תווית חולשה בעברית בלבד — ללא kind/patternFamily גולמיים באנגלית.
 * @param {string} subjectId
 * @param {Record<string, unknown>|null|undefined} sampleEv — normalizeMistakeEvent shape
 */
export function weaknessLabelHe(subjectId, sampleEv) {
  const ev = sampleEv && typeof sampleEv === "object" ? sampleEv : {};
  const pf = String(ev.patternFamily || "").trim();
  const k = String(ev.kind || "").trim();
  const st = String(ev.subtype || "").trim();
  const ct = String(ev.conceptTag || "").trim();
  const topic = ev.topicOrOperation;

  if (subjectId === "geometry") {
    const hay = `${pf} ${k} ${st} ${ct}`.toLowerCase();
    if (hay.includes("perimeter") && hay.includes("area"))
      return "בלבול חוזר בין היקף לשטח";
    if (hay.includes("perimeter")) return "קושי בהבחנה ובחישוב היקף";
    if (hay.includes("area")) return "בנושא שטחים ויחידות שטח";
    if (hay.includes("volume") || hay.includes("prism"))
      return "קושי בנפח ובתבניות תלת ממד";
    if (hay.includes("angle")) return "קושי בנושא זוויות וביחסים בין זוויות";
  }

  if (subjectId === "hebrew") {
    const h = `${pf} ${k} ${st} ${ct}`.toLowerCase();
    if (h.includes("preposition") || h.includes("יחס"))
      return "קושי במילות יחס ובמבנה משפט";
    if (h.includes("verb") || h.includes("tense"))
      return "קושי בפעלים וזמני פעולה";
    if (h.includes("syntax") || h.includes("sequence") || h.includes("רצף"))
      return "קושי ברצף לוגי ובניסוח";
    if (h.includes("clarity") || h.includes("rewrite") || h.includes("היר"))
      return "קושי להבין בדיוק מה נדרש ולנסח תשובה ברורה";
  }

  if (subjectId === "math") {
    const h = `${pf} ${k} ${st}`.toLowerCase();
    if (h.includes("remainder") || h.includes("שארית"))
      return "קושי בשארית ובחלוקה עם שארית";
    if (h.includes("compare") || h.includes("השוואה"))
      return "קושי בהשוואת כמויות או מספרים";
    if (h.includes("percent") || h.includes("אחוז") || h.includes("discount"))
      return "קושי באחוזים ובהנחות";
    if (h.includes("fraction")) return "קושי בשברים";
    if (h.includes("decimal")) return "קושי בעשרוניים";
  }

  if (subjectId === "english") {
    const h = `${pf} ${k} ${st} ${ct}`.toLowerCase();
    if (h.includes("vocab")) return "קושי באוצר מילים ובהבנת מילים";
    if (h.includes("grammar")) return "קושי בדקדוק ובצורות מילים";
    if (h.includes("sentence") || h.includes("completion"))
      return "קושי בהשלמת משפטים ובמבנה משפט";
    if (h.includes("listening")) return "קושי בהאזנה והבנת הנשמע";
    if (h.includes("spelling")) return "קושי באיות ובכתיב";
    if (h.includes("writing")) return "קושי בכתיבה ובניסוח באנגלית";
    if (h.includes("reading")) return "קושי בקריאה והבנת הנקרא";
  }

  if (subjectId === "history") {
    const h = `${pf} ${k} ${st} ${ct}`.toLowerCase();
    if (h.includes("source") || h.includes("מקור")) {
      return "קושי בהבחנה בין מקור ראשוני למשני";
    }
    if (h.includes("timeline") || h.includes("sequence") || h.includes("ציר")) {
      return "קושי בסדר אירועים וציר זמן";
    }
    if (h.includes("cause") || h.includes("effect") || h.includes("סיבה")) {
      return "קושי בקשר סיבה ותוצאה";
    }
    if (h.includes("compare") || h.includes("comparison") || h.includes("השוואה")) {
      return "קושי בהשוואה בין תקופות או מוסדות";
    }
    if (h.includes("figure") || h.includes("role") || h.includes("דמות")) {
      return "קושי בהבחנה בין דמויות ותפקידיהן";
    }
    if (st.startsWith("hist_sub_")) {
      const nice = getHistorySubtopicName(st);
      if (nice && !isMostlyAsciiIdentifier(nice)) return `בנושא ${nice}`;
    }
  }

  const fromPf = hebrewFromEnglishSlug(pf);
  if (fromPf && hasHebrewLetters(fromPf)) {
    const rw = rewriteEngineTaxonomySnippetForParentHe(fromPf);
    return rw || fromPf;
  }
  const fromK = hebrewFromEnglishSlug(k);
  if (fromK && hasHebrewLetters(fromK)) {
    const rw = rewriteEngineTaxonomySnippetForParentHe(fromK);
    return rw || fromK;
  }
  const fromSt = hebrewFromEnglishSlug(st);
  if (fromSt && hasHebrewLetters(fromSt)) {
    const rw = rewriteEngineTaxonomySnippetForParentHe(fromSt);
    return rw || fromSt;
  }

  if (topic && !isMostlyAsciiIdentifier(topic)) {
    const t = String(topic).trim();
    if (hasHebrewLetters(t)) return `בנושא ${t}`;
  }
  if (topic && isMostlyAsciiIdentifier(topic)) {
    const nice = topicBucketLabelHe(subjectId, topic);
    if (nice && !isMostlyAsciiIdentifier(nice)) return `בנושא ${nice}`;
  }

  if (pf && !isMostlyAsciiIdentifier(pf) && hasHebrewLetters(pf)) {
    const rawPf = pf.trim();
    const rw = rewriteEngineTaxonomySnippetForParentHe(rawPf);
    return rw === PARENT_TOPIC_FALLBACK_HE ? GENERIC_WEAKNESS_HE : rw || rawPf;
  }

  if (subjectId === "english") {
    return englishWeaknessFallbackHe(topic);
  }

  return GENERIC_WEAKNESS_HE;
}

/**
 * תווית שורת סשן (חוזקה / תחזוקה / שיפור) — מעדיף displayName בעברית.
 * @param {string} subjectId
 * @param {Record<string, unknown>} row — שורת דוח V2
 */
export function sessionRowLabelHe(subjectId, row) {
  if (!row || typeof row !== "object") return "בנושא תרגול";
  const dn = row.displayName != null ? String(row.displayName).trim() : "";
  if (dn && hasHebrewLetters(dn)) return dn;
  const bk = row.bucketKey != null ? String(row.bucketKey) : "";
  if (bk) {
    const mapped = topicBucketLabelHe(subjectId, bk);
    if (mapped && hasHebrewLetters(mapped)) return mapped;
  }
  return "בנושא תרגול";
}

/** כשלא מצליחים לנקות תווית מנוע — מחרוזת בטוחה להורה */
export const PARENT_TOPIC_FALLBACK_HE = "נושא שכדאי לבדוק שוב";

/** Last-resort scrub if M-10 engine label appears in a free-text snippet (no unit context). */
const ENGINE_M10_PATTERN_LEAK_HE = "בחירת כפל לא מתאים לחילוק";
const PARENT_M10_PATTERN_SAFETY_HE = "קושי בקישור בין כפל לחילוק";

const TAXONOMY_PARENT_SNIPPET_PAIRS = [
  [/טעות\s+כשעובדה\s+לא\s+בסדר\s+קריאה/giu, "קריאת השאלה לא הייתה מסודרת"],
  [/עובדה\s+לא\s+בסדר\s+קריאה/giu, "קריאת השאלה לא הייתה מסודרת"],
  [/טעות\s+כיוון\s+עיגול/giu, "בלבול בכיוון העיגול"],
  [/שגיאה\s+בעמודות\s+עשרות/giu, "שגיאה בחיבור בעמודות עשרות"],
  [/לא\s+בסדר\s+קריאה/giu, "קריאה לא מסודרת של השאלה"],
  /* blocked taxonomy patternHe labels — must not reach parent */
  [/past\/present/gi, "עבר והווה"],
  [/טעות\s+בתקופה\s+שנבחרה\s+זווית/giu, "קושי בזיהוי או בהבנה של זוויות"],
  [/טעות\s+בדועמודי/giu, "קושי בהתאמת התרגום למשמעות המשפט"],
  [/לשנות\s+הכול/giu, "קושי להבין מה משתנה ומה נשאר קבוע בניסוי"],
  [/נעלם\s+בלי\s+שימור/giu, "קושי להבין שחומר יכול להשתנות בצורה אבל לא להיעלם"],
  [/רמה\s+שגויה\s+חוזרת/giu, "קושי בהתאמת התשובה לרמת ההסבר הנדרשת"],
  [/אותה\s+משפחה\s+שגויה/giu, "בחירה במילה קרובה, אבל לא מדויקת"],
  [/כינוי\/שם\s+עצם\s+שגוי/giu, "בלבול בין כינוי לבין שם עצם"],
];

/**
 * החלפת מקטעי טקסונומיה בתוך משפט — בלי החלפת משפט שלם לטקסט גנרי.
 * @param {string|null|undefined} raw
 * @returns {string}
 */
export function rewriteTaxonomySubstringsOnlyHe(raw) {
  let t = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  for (const [re, rep] of TAXONOMY_PARENT_SNIPPET_PAIRS) {
    t = t.replace(re, rep);
  }
  if (t.includes(ENGINE_M10_PATTERN_LEAK_HE)) {
    t = t.split(ENGINE_M10_PATTERN_LEAK_HE).join(PARENT_M10_PATTERN_SAFETY_HE);
  }
  return t.trim();
}

/**
 * תרגום תוויות/מקטעי pattern גולמיים מהמנוע לניסוח הורה קריא.
 * לא משנה מזהים טכניים — רק תצוגה.
 * @param {string|null|undefined} raw
 * @returns {string}
 */
export function rewriteEngineTaxonomySnippetForParentHe(raw) {
  let t = rewriteTaxonomySubstringsOnlyHe(raw);
  if (!t) return "";
  if (/טעות\s+כש/u.test(t) && t.length <= 48) return PARENT_TOPIC_FALLBACK_HE;
  return t.trim();
}

/**
 * משפט תרגול ממוקד לפי תווית חולשה (ללא «כדאי לחזק סביב בנושא של…»).
 * @param {string|null|undefined} labelHe
 * @returns {string} ריק כשמספיק המשפט הכללי בלי נושא
 */
export function parentFacingWeaknessPracticePhraseHe(labelHe) {
  const core = String(labelHe || "")
    .trim()
    .replace(/^דפוס\s+שגיאות:\s*/iu, "")
    .replace(/^בנושא\s+/u, "")
    .replace(/^הנושא\s+/u, "");
  if (!core) return "";
  const rw = rewriteEngineTaxonomySnippetForParentHe(core);
  if (!rw || rw === PARENT_TOPIC_FALLBACK_HE) return "";
  if (/^בנושא\b/u.test(rw)) return rw;
  return `בנושא ${rw}`;
}
