/** מפתחות נגד חזרות לשאלות עברית — מעבר לטקסט מלא */

export function hebrewStemNorm(text) {
  return String(text || "")
    .trim()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .slice(0, 96);
}

export function hebrewQuestionFingerprint(q) {
  if (!q) return "";
  const topic = q.topic || q.operation || "x";
  const pf = q.params?.patternFamily || q.params?.subtype || "";
  const stem = hebrewStemNorm(q.question || q.exerciseText || "");
  const mode = q.answerMode || "";
  const answers = Array.isArray(q.answers)
    ? q.answers
        .slice(0, 6)
        .map((a) =>
          String(a ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ")
            .slice(0, 40)
        )
        .join("|")
    : "";
  return `${topic}|${pf}|${mode}|${stem}|${answers}`;
}

/** מפתח לדימוי כפול — תחילת גזע + נושא (לא כל הטקסט) */
export function hebrewNearDuplicateKey(q) {
  if (!q) return "";
  const topic = q.topic || q.operation || "x";
  const stem = hebrewStemNorm(q.question || q.exerciseText || "");
  const head = stem.split(" ").slice(0, 10).join(" ");
  return `${topic}|${head}`;
}

/**
 * מאחד מילים מצוטטות/מודגשות — מפתח לחזרתיות תבניתית (״אותה משימה, מילה אחרת׳).
 */
export function hebrewCognitiveTemplateStem(text) {
  return String(text || "")
    .replace(/[“”"]/g, "'")
    .replace(/['׳][^'׳]{1,18}['׳]/g, "'@'")
    .replace(/׳[^׳]{1,18}׳/g, "׳@׳")
    .replace(/\s+/g, " ")
    .trim();
}

export function hebrewCognitiveTemplateKey(q) {
  if (!q) return "";
  const topic = q.topic || q.operation || "x";
  const raw = String(q.question || q.exerciseText || "").trim();
  return `${topic}|${hebrewCognitiveTemplateStem(raw)}`;
}

/**
 * מפתח לחסימת חזרות לפי "צורת משימה" (לא רק patternFamily ולא רק גזע מלא).
 * לכיתות א׳–ב׳ מוקדם: מפזר משפחות קוגניטיביות בסשן קצר.
 */
export function hebrewTaskShapeKey(q) {
  if (!q) return "";
  const topic = q.topic || q.operation || "x";
  const pf = String(q.params?.patternFamily || "").trim();
  const st = String(q.params?.subtype || "").trim();
  const sub = String(q.params?.subtopicId || "").trim();
  const head = hebrewStemNorm(q.question || q.exerciseText || "")
    .split(" ")
    .slice(0, 5)
    .join(" ");
  const bucket = pf || st || sub || head.slice(0, 36);
  return `${topic}|${bucket}`;
}
