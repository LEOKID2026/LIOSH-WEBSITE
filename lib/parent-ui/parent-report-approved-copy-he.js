/**
 * Approved parent-facing Hebrew copy for regular report (UI layer only).
 * Maps engine pattern labels → plain parent language.
 */

import { formatParentReportGradeHe } from "../../utils/parent-report-language/parent-report-display-labels.he.js";
import { normalizeParentFacingHe } from "../../utils/parent-report-language/parent-facing-normalize-he.js";
import { buildTopicOwnerCopySlots, resolveTopicExplainOwnerSectionsHe } from "../../utils/learning-pattern-decision/resolve-topic-owner-copy.js";
import { getLpdFromRow, rowIsPositiveFromLpd } from "../../utils/learning-pattern-decision/index.js";
import { resolveParentReportRowGradeRelation } from "../../utils/parent-report-core-grade-filter.js";
import {
  parentFacingErrorPatternLabelHe,
  parentFacingErrorPatternMeaningHe,
  resolveParentFacingPatternLabelHe,
  stripParentTopicSectionPrefixHe,
} from "../../utils/learning-pattern-decision/parent-facing-error-pattern-he.js";

/** @param {string} text */
function clean(text) {
  return normalizeParentFacingHe(String(text || "").replace(/\s+/g, " ").trim());
}

/**
 * Strip registered-grade suffix from any free-text line (insights, recommendations, etc.).
 * Other grades (ד׳, א׳, ו׳) are kept when explicitly written.
 * @param {string} text
 * @param {string|null|undefined} registeredGradeKey
 */
export function cleanRegisteredGradeFromFreeTextHe(text, registeredGradeKey) {
  let t = clean(text);
  if (!t || !registeredGradeKey) return t;
  const reg = formatParentReportGradeHe(registeredGradeKey);
  if (!reg || reg === "לא זמין") return t;
  const esc = reg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const suffix = `\\s*[–·-]\\s*כיתה\\s*${esc}`;
  const end = `(?=\\s|[,.:;»»\\)\\]]|$)`;
  t = t.replace(new RegExp(`«([^»]+?)${suffix}${end}»`, "gu"), "«$1»");
  t = t.replace(new RegExp(`${suffix}${end}`, "gu"), "");
  t = t.replace(new RegExp(`בנושא\\s+([^\\s,]+)${suffix}${end}`, "gu"), "בנושא $1");
  t = t.replace(new RegExp(`נושא\\s+([^\\s,]+)${suffix}${end}`, "gu"), "נושא $1");
  return clean(t);
}

/** @param {string} label @param {string|null|undefined} registeredGradeKey @param {Record<string, unknown>} row */
export function topicTitleForFreeTextHe(label, registeredGradeKey, row) {
  let t = clean(label);
  if (!t) return "";
  const rel = resolveParentReportRowGradeRelation(row, registeredGradeKey);
  if (rel === "lower" || rel === "higher") {
    const grade = formatParentReportGradeHe(
      row?.contentGradeKey ?? row?.gradeKey ?? row?.contentGradeLevel ?? row?.grade,
    );
    if (grade && grade !== "לא זמין") return `${t} - כיתה ${grade}`;
  }
  const reg = registeredGradeKey ? formatParentReportGradeHe(registeredGradeKey) : null;
  if (reg && reg !== "לא זמין") {
    const esc = reg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`\\s*[–·-]\\s*כיתה\\s*${esc}\\s*$`, "u"), "");
    t = t.replace(new RegExp(`\\s*כיתה\\s*${esc}\\s*$`, "u"), "");
  }
  return clean(t);
}

const REGULAR_REPORT_ENGINE_JARGON_RES = [
  /מצביע על דפוס[^.]*\.?\s*/gi,
  /נקודת מיקוד[^.]*\.?\s*/gi,
  /תצפית זהירה[^.]*\.?\s*/gi,
  /\bחלק כלל\b/gi,
  /\bהשלמה לעשר\b/gi,
  /דפוס הטעות:\s*[^.]+/gi,
  /מה זוהה:\s*/gi,
  /זוהה דפוס שחוזר בטעויות:\s*/gi,
];

/**
 * Sanitize any regular-report free-text line: registered-grade cleanup + parent-safe wording.
 * @param {string} text
 * @param {string|null|undefined} registeredGradeKey
 * @param {string} [topicHint]
 */
export function sanitizeRegularReportFreeTextHe(text, registeredGradeKey, topicHint = "") {
  let t = cleanRegisteredGradeFromFreeTextHe(text, registeredGradeKey);
  if (!t) return "";

  t = t.replace(/,?\s*וזוהה דפוס שחוזר בטעויות:\s*([^.;]+)/gi, (_match, rawPattern) => {
    const approved = resolveApprovedCopy(String(rawPattern || ""), topicHint);
    return approved?.meaning ? `. ${approved.meaning}` : ". רואים טעויות שחוזרות באותו סוג שאלות.";
  });

  for (const re of REGULAR_REPORT_ENGINE_JARGON_RES) {
    t = t.replace(re, "");
  }

  t = t.replace(/\s{2,}/g, " ").replace(/\.\s*\./g, ".").trim();
  return clean(t);
}

function genericLowVolumeTopicCopyHe(title, q) {
  const topic = clean(title) || "הנושא";
  return {
    title,
    whatWeSee: q > 0 ? `נפתרו ${q} שאלות.` : "",
    whatItMeans: "יש מעט שאלות בנושא, ולכן עדיין מוקדם להסיק מסקנה חזקה.",
    homeAction: "להמשיך לתרגל עוד כמה שאלות קצרות ולעקוב אם חוזרת אותה טעות.",
    prominent: `ב${topic} יש מעט שאלות, ולכן עדיין לא כדאי להסיק מסקנה חזקה.`,
    strength: null,
    focusLine: "יש מעט שאלות בנושא, ולכן עדיין מוקדם להסיק מסקנה חזקה.",
  };
}

function genericStableTopicCopyHe(title, q, acc) {
  return {
    title,
    whatWeSee: `נפתרו ${q} שאלות, והדיוק עומד על ${acc}%.`,
    whatItMeans: "רוב התשובות נכונות, והנושא נראה יציב יחסית.",
    homeAction: "לשמר את ההצלחה עם תרגול קצר מדי פעם.",
    prominent: null,
    strength: `${title}: התרגול נראה יציב - ${q} שאלות, דיוק ${acc}%.`,
    focusLine: null,
  };
}

/**
 * @param {string} topicTitle
 */
function genericParentCopyForPattern(topicTitle) {
  const topic = clean(topicTitle) || "הנושא";
  return {
    prominent: `ב${topic} רואים טעויות שחוזרות באותו סוג שאלות.`,
    focusLine: "רואים טעויות שחוזרות באותו סוג שאלות.",
    meaning:
      "רואים טעויות שחוזרות באותו סוג שאלות - כדאי לעקוב אחרי דרך הפתרון.",
    home: "לעצור אחרי טעות ולבקש מהילד להסביר איך הגיע לתשובה.",
  };
}

/**
 * @param {string} patternRaw
 * @param {string} topicTitle
 */
function resolveApprovedCopy(patternRaw, topicTitle) {
  const mapped = resolveParentFacingPatternLabelHe(patternRaw);
  const p = clean(mapped || patternRaw);
  const topic = clean(topicTitle) || "הנושא";
  if (!p) return null;
  const pl = p.toLowerCase();
  const meaningFromEngine = parentFacingErrorPatternMeaningHe(patternRaw);
  if (meaningFromEngine) {
    const short = parentFacingErrorPatternLabelHe(patternRaw) || p;
    return {
      prominent: `ב${topic} רואים טעות שחוזרת: ${short}.`,
      focusLine: short,
      meaning: meaningFromEngine,
      home: "לעצור אחרי טעות ולבקש מהילד להסביר איך הגיע לתשובה, צעד אחר צעד.",
    };
  }

  if (/השוואה לפי מונה|מונה בלבד/i.test(pl)) {
    return {
      prominent: `ב${topic} רואים טעות שחוזרת: הילד נוטה להשוות לפי המספר העליון בלבד, ולא בודק מספיק את גודל השבר כולו.`,
      focusLine:
        "הילד נוטה להשוות לפי המספר העליון בלבד, ולא בודק מספיק את גודל השבר כולו.",
      meaning:
        "הטעות שחוזרת היא השוואה לפי המספר העליון בלבד. כלומר הילד לא תמיד בודק את גודל השבר כולו.",
      home:
        "לבקש ממנו להסביר למה שבר אחד גדול מהשני, ולא להסתפק בהסתכלות על המספר העליון.",
    };
  }

  if (/אותם זוגות|זוגות שגויים/i.test(pl)) {
    return {
      prominent: `ב${topic} רואים שאותם תרגילים חוזרים כשגויים. זה אומר שלא כל לוח הכפל בעייתי, אלא יש כמה זוגות שכדאי לחזק במיוחד.`,
      focusLine:
        "אותם זוגות תרגילים חוזרים כשגויים - כדאי לחזק דווקא את הזוגות האלה.",
      meaning:
        "אותם זוגות כפל חוזרים כשגויים. לכן כדאי לחזק דווקא את הזוגות האלה, ולא לתרגל הכול מחדש.",
      home: "לתרגל כמה זוגות כפל שחוזרים כטעות, בקול ובמשחק קצר.",
    };
  }

  if (/עיגול|כיוון העיגול/i.test(pl)) {
    return {
      prominent: `ב${topic} רואים בלבול בעיגול מספרים: מתי לעגל למעלה ומתי להשאיר או לעגל למטה.`,
      focusLine: "יש בלבול בעיגול מספרים - מתי לעגל למעלה ומתי למטה.",
      meaning: "יש בלבול בעיגול מספרים - מתי לעגל למעלה ומתי למטה.",
      home: "לבקש מהילד להסביר לפי איזו ספרה הוא מעגל ולבדוק אם התוצאה הגיונית.",
    };
  }

  if (/כיוון הפוך|הוספה במקום חיסור|השלמה לעשר/i.test(pl)) {
    return {
      prominent: `ב${topic} רואים שלפעמים הילד פועל בכיוון הפוך - במקום להקטין את המספר הוא מוסיף או מתקדם קדימה.`,
      focusLine:
        "לפעמים הילד פועל בכיוון הפוך - במקום להקטין את המספר הוא מוסיף או מתקדם קדימה.",
      meaning:
        "לפעמים הילד פועל בכיוון הפוך - במקום להקטין את המספר הוא מוסיף או מתקדם קדימה.",
      home: "לעצור לפני הפתרון ולשאול: האם התוצאה צריכה להיות גדולה יותר או קטנה יותר?",
    };
  }

  if (/השוואה חלקית/i.test(pl)) {
    return {
      prominent: `ב${topic} רואים שהילד כנראה משתמש רק בחלק מהמידע בטקסט, ולא משווה בין כל הפרטים הדרושים.`,
      focusLine:
        "הילד כנראה משתמש רק בחלק מהמידע בטקסט, ולא משווה בין כל הפרטים הדרושים.",
      meaning:
        "נראה שהילד משתמש רק בחלק מהמידע בטקסט, ולא משווה בין כל הפרטים הדרושים.",
      home: "לקרוא קטע קצר ולעצור לשאלה: איפה בטקסט מצאת את התשובה?",
    };
  }

  return genericParentCopyForPattern(topicTitle);
}

/**
 * @param {Record<string, unknown>} row
 */
function patternFromRow(row) {
  const slots = buildTopicOwnerCopySlots(row);
  const lpd = getLpdFromRow(row);
  const contract =
    lpd?.engineDecisionContract && typeof lpd.engineDecisionContract === "object"
      ? lpd.engineDecisionContract
      : null;
  const raw =
    slots?.detectedPattern ||
    contract?.detectedPattern ||
    lpd?.repeatedMistakePatterns?.[0]?.label ||
    "";
  return clean(resolveParentFacingPatternLabelHe(raw) || "");
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} title
 * @param {string} pattern
 */
function buildRegularReportTopicMeaningHe(row, title, pattern) {
  const ownerSections = resolveTopicExplainOwnerSectionsHe(row);
  const ownerMeaning = stripParentTopicSectionPrefixHe(ownerSections?.meaning || "");
  if (ownerMeaning) return ownerMeaning;

  if (pattern) {
    const approved = resolveApprovedCopy(pattern, title);
    if (approved?.meaning) return approved.meaning;
  }

  const lpd = getLpdFromRow(row);
  const finding = stripParentTopicSectionPrefixHe(lpd?.parentVisibleFinding || "");
  if (finding) return finding;

  const q = Number(row.questions) || 0;
  const acc = Math.round(Number(row.accuracy) || 0);
  if (q > 0 && acc < 72) {
    return "יש טעויות שחוזרות בתרגול - כדאי לעקוב יחד אחרי דרך הפתרון.";
  }

  return "עדיין אין דפוס טעות אחד ברור, אבל כדאי לעבור יחד על דרך הפתרון ולא רק על התשובה הסופית.";
}

/**
 * @param {Record<string, unknown>} row
 * @param {string|null|undefined} registeredGradeKey
 */
export function buildApprovedTopicCopyHe(row, registeredGradeKey) {
  const title = topicTitleForFreeTextHe(
    String(row.label || row.displayName || ""),
    registeredGradeKey,
    row,
  );
  const q = Number(row.questions) || 0;
  const acc = Math.round(Number(row.accuracy) || 0);
  const pattern = patternFromRow(row);

  if (rowIsPositiveFromLpd(row) && q >= 5 && acc >= 80) {
    return genericStableTopicCopyHe(title, q, acc);
  }

  if (q > 0 && q <= 3) {
    return genericLowVolumeTopicCopyHe(title, q);
  }

  if (pattern) {
    const approved = resolveApprovedCopy(pattern, title);
    return {
      title,
      whatWeSee: q > 0 ? `נפתרו ${q} שאלות, והדיוק עומד על ${acc}%.` : "",
      whatItMeans: approved?.meaning || buildRegularReportTopicMeaningHe(row, title, pattern),
      homeAction: approved?.home || "לתרגל כמה שאלות קצרות ולבקש מהילד להסביר את הדרך.",
      prominent: approved?.prominent || null,
      strength: null,
      focusLine: approved?.focusLine || approved?.meaning || null,
    };
  }

  if (q > 0 && acc < 72) {
    return {
      title,
      whatWeSee: `נפתרו ${q} שאלות, והדיוק עומד על ${acc}%.`,
      whatItMeans: buildRegularReportTopicMeaningHe(row, title, ""),
      homeAction: "לתרגל כמה שאלות קצרות ולבקש מהילד להסביר את הדרך.",
      prominent: title ? `ב${title} יש טעויות שחוזרות בתרגול - כדאי לשים לב.` : null,
      strength: null,
      focusLine: title ? `${title}: יש טעויות שחוזרות בתרגול - כדאי לשים לב.` : null,
    };
  }

  return {
    title,
    whatWeSee: q > 0 ? `נפתרו ${q} שאלות, והדיוק עומד על ${acc}%.` : "",
    whatItMeans: "",
    homeAction: "",
    prominent: null,
    strength: null,
    focusLine: null,
  };
}

/**
 * @param {Record<string, unknown>} row
 * @param {string|null|undefined} registeredGradeKey
 */
export function buildRegularReportTopicExplainCardHe(row, registeredGradeKey) {
  const copy = buildApprovedTopicCopyHe(row, registeredGradeKey);
  if (!copy.whatWeSee && !copy.whatItMeans) return null;
  return {
    title: copy.title,
    whatWeSee: copy.whatWeSee,
    whatItMeans: copy.whatItMeans,
    homeAction: copy.homeAction,
  };
}
