import {
  isTopicDifficultyMetadataLead,
  normalizeStudentQuestionDisplayFields,
} from "./student-question-display.js";
import { finalizeComparisonSignMcq } from "./comparison-sign-mcq.js";
import { ensureMcqFourOptions, shouldEnforceFourMcqOptions } from "./mcq-four-options.js";

/**
 * Strip UI-duplicated metadata from student-facing question stems (all subjects).
 * Grade/topic/level/mode already appear in the page header — not in the stem body.
 *
 * Hebrew-specific legacy cleanup also runs in finalizeHebrewMcq (hebrew-legacy-metadata)
 * before this sanitizer — avoid importing that module here (circular via generators).
 */

const GRADE_HEB = "[אבגדהו]['׳]?";
const META_SEP = "[·•|-]";
/** רמה / רמת (not `רמת?` which reads as רמ + optional ת) */
const LEVEL_WORD = "(?:רמה|רמת)";
/** Space (avoid \\s with /u — unreliable in some Node builds for Hebrew stems) */
const SP = "[ \\t\\u00A0\\u202F]+";

/** Patterns that must not appear in rendered stems (QA gate). */
export const STUDENT_STEM_METADATA_LEAK_CHECKS = [
  {
    id: "grade_paren",
    re: new RegExp(`\\(\\s*כיתה\\s+${GRADE_HEB}`, "u"),
    label: "grade in parentheses",
  },
  {
    id: "grade_label_prefix",
    re: new RegExp(`^(?:${META_SEP}\\s*)*כיתה\\s+${GRADE_HEB}`, "u"),
    label: "leading grade label",
  },
  {
    id: "grade_suffix",
    re: new RegExp(`[·•]\\s*כיתה\\s+${GRADE_HEB}`, "u"),
    label: "grade suffix after ·",
  },
  {
    id: "grade_level_composite_prefix",
    re: /^בכיתה\s+[אבגדהו]['׳]?\s*[–-]\s*רמה\s+(קלה|בינונית|קשה|מאתגרת)/u,
    label: "בכיתה grade - רמה level composite prefix",
  },
  {
    id: "level_he",
    re: /רמה\s+(קלה|בינונית|קשה|מאתגרת)/u,
    label: "Hebrew level prefix",
  },
  {
    id: "level_ramat",
    re: new RegExp(`${LEVEL_WORD}${SP}(easy|medium|hard|קלה|בינונית|קשה)`, "iu"),
    label: "רמת … level tag",
  },
  {
    id: "topic_nosach",
    re: /(?:^|[·•(-])\s*נושא\s+[a-z0-9_-]+/iu,
    label: "topic key prefix (נושא …)",
  },
  {
    id: "unique_mark",
    re: /סימון\s+ייחודי/u,
    label: "debug unique mark",
  },
  {
    id: "concepts_level_framing",
    re: /^מושגים\s*\((קל|בינוני|אתגר)\)\s*:/u,
    label: "geometry concepts level framing",
  },
  {
    id: "topic_difficulty_paren_lead",
    re: /^[^:\n]{1,72}\((קל|בינוני|אתגר|מאתגר)\)\s*:?\s*$/u,
    label: "topic + difficulty parenthetical lead",
  },
  {
    id: "grade_difficulty_paren_lead",
    re: /^כיתה\s+[אבגדהו]['׳]?\s*\((קל|בינוני|אתגר|מאתגר)\)\s*:?\s*$/u,
    label: "grade + difficulty parenthetical lead",
  },
  {
    id: "school_inquiry_frame",
    re: /(?:במסגרת\s+)?חקר\s+בית[\s -]?ספרי\s*:/u,
    label: "school inquiry framing prefix",
  },
  {
    id: "topic_question_frame",
    re: /^שאלה בנושא:\s*/u,
    label: "שאלה בנושא metadata prefix",
  },
  {
    id: "bkita_leading_prefix",
    re: /^בכיתה\s+[^:]+:\s*/u,
    label: "בכיתה leading metadata prefix",
  },
  {
    id: "level_en_token",
    re: /(?:^|[·•(-])\s*(easy|medium|hard)\s*(?:[):·•-]|$)/iu,
    label: "English level token as metadata",
  },
  {
    id: "mokad_focus_id",
    re: /מוקד\s+[a-z][a-z0-9]*(?:_[a-z0-9]+)+/iu,
    label: "מוקד + technical focus id",
  },
  {
    id: "topic_key_field",
    re: /(?:^|[·•(\s-])(?:topicKey|topic_key|skillId|skill_id|subskillId|subskill_id|sourceKey|source_key)\b/u,
    label: "internal key field name in stem",
  },
  {
    id: "grade_level_mokad_frame",
    re: new RegExp(
      `^כיתה\\s+${GRADE_HEB}\\s*[·•]\\s*${LEVEL_WORD}\\s+(?:קלה|בינונית|קשה|מאתגרת|רגילה|מתקדמת)`,
      "u"
    ),
    label: "כיתה · רמה framing prefix",
  },
];

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeStudentQuestionStem(text) {
  let t = String(text ?? "").trim();
  if (!t) return t;

  // Debug / bank batch markers
  t = t.replace(/סימון\s+ייחודי\s*[\u0590-\u05FFa-zA-Z0-9]*\s*/gu, "");
  t = t.replace(/(?:במסגרת\s+)?חקר\s+בית[\s -]?ספרי\s*:\s*/gu, "");
  t = t.replace(/^שאלה בנושא:\s*/u, "");

  const LEVEL_HE_OR_EN =
    "(?:קלה|בינונית|קשה|מאתגרת|רגילה|מתקדמת|easy|medium|hard|regular|advanced)";

  // Science volume framing (gen-science-needs-more-volume legacy):
  // "כיתה ה׳ · רמה קלה — CORE · מוקד slot"  OR  "כיתה ה׳ · רמה קלה · CORE · מוקד slot"
  t = t.replace(
    new RegExp(
      `^כיתה\\s+${GRADE_HEB}\\s*[·•]\\s*${LEVEL_WORD}\\s+${LEVEL_HE_OR_EN}\\s*[–-]\\s*`,
      "iu"
    ),
    ""
  );
  t = t.replace(
    new RegExp(
      `^כיתה\\s+${GRADE_HEB}\\s*[·•]\\s*${LEVEL_WORD}\\s+${LEVEL_HE_OR_EN}\\s*[·•]\\s*`,
      "iu"
    ),
    ""
  );

  // Trailing technical focus tags (never child-facing)
  t = t.replace(
    new RegExp(`\\s*[-–·•]\\s*מוקד\\s+[a-z][a-z0-9]*(?:_[a-z0-9]+)+\\s*$`, "iu"),
    ""
  );
  t = t.replace(
    new RegExp(`^מוקד\\s+[a-z][a-z0-9]*(?:_[a-z0-9]+)+\\s*$`, "iu"),
    ""
  );
  t = t.replace(
    /\s*[-–·•]\s*(?:topicKey|topic_key|skillId|skill_id|subskillId|subskill_id|sourceKey|source_key|generator)\s*[:=]?\s*[a-zA-Z0-9_.-]*\s*$/u,
    ""
  );

  // Geometry hard-band framing: "כיתה ג׳ | לפי השרטוט..."
  t = t.replace(
    new RegExp(`^כיתה\\s+${GRADE_HEB}\\s*[|｜]\\s*`, "u"),
    ""
  );
  // Geometry / volume openers: "כיתה ד׳: ..." / "כיתה ד׳ — ..."
  t = t.replace(
    new RegExp(`^כיתה\\s+${GRADE_HEB}\\s*(?:\\(מאתגר\\))?\\s*[:：]\\s*`, "u"),
    ""
  );
  t = t.replace(
    new RegExp(`^כיתה\\s+${GRADE_HEB}\\s*[–-]\\s*`, "u"),
    ""
  );

  // Science / batch opener: "בכיתה … : …" (grade/topic metadata — not in-question classroom context)
  t = t.replace(new RegExp(`^בכיתה\\s+${GRADE_HEB}\\s*:\\s*`, "u"), "");
  t = t.replace(/^בכיתה\s+[^:]+:\s*/u, "");

  // Science / batch opener: "בכיתה ה׳ — רמה בינונית: …" (metadata header only — not in-question grade mentions)
  t = t.replace(
    new RegExp(
      `^בכיתה\\s+${GRADE_HEB}\\s*[–-]\\s*${LEVEL_WORD}\\s*${LEVEL_HE_OR_EN}\\s*:\\s*`,
      "iu"
    ),
    ""
  );

  // Dot-separated metadata chains (science batch style) — avoid heavy backtracking regex
  if (/[·•]/.test(t)) {
    const parts = t.split(/\s*[·•]\s*/).map((p) => p.trim()).filter(Boolean);
    const gradeOnly = new RegExp(`^\\(?\\s*כיתה${SP}${GRADE_HEB}\\s*\\)?$`, "u");
    const levelOnly = new RegExp(
      `^\\(?\\s*${LEVEL_WORD}${SP}${LEVEL_HE_OR_EN}\\s*\\)?$`,
      "iu"
    );
    const topicOnly = new RegExp(`^\\(?\\s*(?:נושא|תחום)${SP}\\S+\\s*\\)?$`, "iu");
    const mokadOnly = new RegExp(
      `^מוקד${SP}[a-z][a-z0-9]*(?:_[a-z0-9]+)+$`,
      "iu"
    );
    const versionedIdOnly = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+_v\d+$/i;
    const isMetaPart = (p) => {
      const bare = String(p || "")
        .replace(/^\(+|\)+$/g, "")
        .trim();
      if (!bare) return true;
      // "רמה קלה — real question" is NOT pure metadata
      if (/[–-]/.test(bare) && bare.split(/[–-]/).length >= 2) {
        const after = bare.split(/[–-]/).slice(1).join("-").trim();
        if (after.length >= 8) return false;
      }
      return (
        gradeOnly.test(bare) ||
        levelOnly.test(bare) ||
        topicOnly.test(bare) ||
        mokadOnly.test(bare) ||
        versionedIdOnly.test(bare)
      );
    };
    if (parts.length >= 2 && isMetaPart(parts[0])) {
      let i = 0;
      while (i < parts.length && isMetaPart(parts[i])) i += 1;
      if (i > 0 && i < parts.length) {
        t = parts.slice(i).join(" · ");
      } else if (i === parts.length) {
        // All segments were metadata — drop rather than show focus ids
        t = "";
      }
    }
  }
  t = t.replace(new RegExp(`^(?:${SP}[·•]${SP})+`, "u"), "");
  // Re-strip focus suffix after chain cleanup
  t = t.replace(
    new RegExp(`\\s*[-–·•]\\s*מוקד\\s+[a-z][a-z0-9]*(?:_[a-z0-9]+)+\\s*$`, "iu"),
    ""
  );

  // Parenthesized metadata blocks: (כיתה ג׳ · נושא body · רמת easy)
  t = t.replace(
    new RegExp(
      `\\(${SP}(?:כיתה${SP}[^)·•-]+|נושא${SP}[^)·•-]+|${LEVEL_WORD}${SP}[^)·•-]+|תחום${SP}[^)·•-]+)(?:${SP}[·•-]${SP}(?:כיתה${SP}[^)·•-]+|נושא${SP}[^)·•-]+|${LEVEL_WORD}${SP}[^)·•-]+|תחום${SP}[^)·•-]+))*${SP}\\)${SP}`,
      "gu"
    ),
    ""
  );

  // Leading metadata segments (repeat until stable)
  let prev;
  const leadChunk = new RegExp(
    `^(?:${SP}(?:כיתה${SP}[אבגדהו]['׳]?|נושא${SP}\\S+|תחום${SP}\\S+|${LEVEL_WORD}${SP}(?:easy|medium|hard|קלה|בינונית|קשה|מאתגרת|רגילה|מתקדמת|regular|advanced)|מושגים${SP}\\([^)]+\\)))${SP}(?::|[·•|-]${SP}|${SP}[-]${SP})`,
    "iu"
  );
  do {
    prev = t;
    t = t.replace(leadChunk, "");
    t = t.replace(
      /^\s*רמה\s+(קלה|בינונית|קשה|מאתגרת|רגילה|מתקדמת)\s*[–-]\s*/iu,
      ""
    );
    t = t.replace(/^\s*מושגים\s*\((קל|בינוני|אתגר)\)\s*:\s*/iu, "");
    t = t.replace(/^\s*בהתאם\s+לכיתה\s+[אבגדהו]['׳]?\s*(?:\[[^\]]*\])?\s*:\s*/iu, "");
    t = t.replace(/^\s*\[רמה\s+(easy|medium|hard)\]\s*:\s*/iu, "");
  } while (t !== prev);

  // Trailing grade band suffixes
  t = t.replace(/\s*[·•]\s*כיתה\s+[אבגדהו]['׳]?\s*$/u, "");

  // Inline "כיתה X:" openers (not "בכיתה" classroom context)
  t = t.replace(
    /(?:^|[\s·•|-])(?:כיתה\s+[אבגדהו]['׳]?\s*[(（]?(?:קל|בינוני|מאתגר)?[)）]?\s*[-–:])\s*/gu,
    (m) => (m.startsWith(" ") || m.startsWith("·") ? " " : "")
  );
  t = t.replace(/^\(\s*כיתה\s+[^)]+\)\s*/u, "");

  // Level + topic combo prefixes: "רמה קלה — משוואה, מצאו…" → keep instruction after comma when present
  t = t.replace(
    /^רמה\s+(קלה|בינונית|קשה|מאתגרת)\s*[–-]\s*[^,:\n]+,\s*/iu,
    ""
  );
  t = t.replace(/^רמה\s+(קלה|בינונית|קשה|מאתגרת)\s*[–-]\s*/iu, "");
  t = t.replace(
    /^(?:משוואה|חיבור|חיסור|כפל|חילוק|שברים|השוואת\s+מספרים)\s*,\s*/iu,
    ""
  );

  t = t.replace(/\s*\(שאלה\s+\d+\)\s*$/u, "");
  t = t.replace(/\s*\(שאלה\s+\d+\)\s*/gu, " ");

  // Generator topic/difficulty framing — keep exercise body only
  t = t.replace(
    /^[^:\n]{1,72}\((קל|בינוני|אתגר|מאתגר)\)[^:\n]*:\s*/u,
    ""
  );
  t = t.replace(
    /^כיתה\s+[אבגדהו]['׳]?\s*\((קל|בינוני|אתגר|מאתגר)\)\s*:\s*/u,
    ""
  );

  // Redundant fluff openers only (keep real task wording like "מצאו את הנעלם")
  const fluffOpeners =
    /^(?:חישוב קל|מה התוצאה|פתרו|חיבור\/חיסור קצר|נסו לבד|חשבו לבד|מה יוצא|תרגיל|משחקון חשבון|אתגר קטן|בדקו|חידה חשבונית|כמה יוצא בסוף|חישוב|אתגר\s*[–-]\s*הערכו ואמתו|בדקו פעמיים לפני בחירה|שאלת אתגר|גרסה מאתגרת|יחס\s*\(קל\)|בעיית יחסים|אתגר יחסים)\s*:\s*/iu;
  t = t.replace(fluffOpeners, "");

  if (isTopicDifficultyMetadataLead(t)) {
    return "";
  }

  // Separator chains left at start
  t = t.replace(/^(?:\s*[·•|-]\s*)+/, "");
  t = t.replace(/^\s*:\s*/, "");
  t = t.replace(/^\s*מושגים\s*\((קל|בינוני|אתגר)\)\s*:\s*/iu, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

/**
 * @param {string} stem
 * @returns {{ leak: boolean, checks: { id: string, label: string }[] }}
 */
export function detectStudentStemMetadataLeaks(stem) {
  const s = String(stem ?? "");
  const hits = [];
  for (const c of STUDENT_STEM_METADATA_LEAK_CHECKS) {
    if (c.re.test(s)) hits.push({ id: c.id, label: c.label });
  }
  return { leak: hits.length > 0, checks: hits };
}

/**
 * Extract display stems from a question payload.
 * @param {Record<string, unknown>|null|undefined} q
 * @returns {string[]}
 */
export function collectStudentFacingStemsFromQuestion(q) {
  if (!q || typeof q !== "object") return [];
  const out = [];
  const keys = [
    "stem",
    "question",
    "exerciseText",
    "questionLabel",
    "prompt",
    "title",
    "subtitle",
    "instruction",
    "hint",
    "feedback",
    "explanation",
    "caption",
    "questionText",
    "text",
    "body",
  ];
  for (const key of keys) {
    const v = q[key];
    if (typeof v === "string" && v.trim()) out.push(v.trim());
  }
  for (const key of ["choices", "options", "answers"]) {
    if (!Array.isArray(q[key])) continue;
    for (const entry of q[key]) {
      if (typeof entry === "string" && entry.trim()) out.push(entry.trim());
      else if (entry && typeof entry === "object") {
        for (const nested of ["text", "label", "value", "answer", "content"]) {
          const v = entry[nested];
          if (typeof v === "string" && v.trim()) out.push(v.trim());
        }
      }
    }
  }
  return out;
}

/**
 * Strip generator-artifact suffixes from a single Hebrew MCQ answer option.
 * These patterns are never natural child-facing answer text.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeHebrewMcqAnswer(text) {
  let t = String(text ?? "").trim();
  if (!t) return t;
  // Trailing padding phrases injected by mcq-fail-content-repair LENGTH_PAD_HE
  t = t.replace(/\s+באופן שונה\s*$/u, "");
  t = t.replace(/\s+במקרה אחר\s*$/u, "");
  t = t.replace(/\s+באזור אחר\s*$/u, "");
  // Trailing parenthetical artifacts from repairFormatOutliers (Hebrew)
  t = t.replace(/\s+\(לא\)\s*$/u, "");
  t = t.replace(/\s+\(אחר\)\s*$/u, "");
  // (בלי ...) patterns — generator metadata in parentheses
  t = t.replace(/\s*\(בלי[^)]*\)\s*/gu, " ").trim();
  // Bare metadata tokens — \b doesn't work for Hebrew; use surrounding whitespace/anchors
  t = t.replace(/\s*בלי קריאה\s*/gu, " ").trim();
  t = t.replace(/\s*בלי בתיק\s*/gu, " ").trim();
  t = t.replace(/\s*בלי רשימת\s*/gu, " ").trim();
  t = t.replace(/\s*בלי מילים\s*/gu, " ").trim();
  return t.replace(/\s{2,}/g, " ").trim();
}

/**
 * Apply sanitizeHebrewMcqAnswer to all answer/option slots in a question object (in-place clone).
 * Only runs when the question contains Hebrew text.
 * @param {Record<string, unknown>} q
 * @returns {Record<string, unknown>}
 */
function sanitizeHebrewAnswers(q) {
  const isHebrewQ =
    /[\u0590-\u05FF]/.test(String(q.question ?? q.stem ?? q.exerciseText ?? ""));
  if (!isHebrewQ) return q;
  const next = { ...q };
  for (const key of ["answers", "options"]) {
    if (Array.isArray(next[key])) {
      next[key] = next[key].map((a) =>
        typeof a === "string" ? sanitizeHebrewMcqAnswer(a) : a
      );
    }
  }
  return next;
}

/**
 * @param {Record<string, unknown>|null|undefined} q
 * @returns {Record<string, unknown>|null|undefined}
 */
export function sanitizeQuestionForStudentDisplay(q) {
  if (!q || typeof q !== "object") return q;
  let next = { ...q };
  for (const key of [
    "stem",
    "question",
    "exerciseText",
    "questionLabel",
    "prompt",
    "title",
    "subtitle",
    "instruction",
    "hint",
    "feedback",
    "explanation",
    "caption",
    "questionText",
    "text",
    "body",
  ]) {
    if (typeof next[key] === "string") {
      const cleaned = sanitizeStudentQuestionStem(next[key]);
      next[key] = cleaned;
    }
  }
  next = sanitizeHebrewAnswers(next);
  if (
    typeof next.question === "string" &&
    typeof next.exerciseText === "string" &&
    !next.exerciseText.trim()
  ) {
    next.exerciseText = next.question;
  }
  if (
    typeof next.questionLabel === "string" &&
    !next.questionLabel.trim()
  ) {
    delete next.questionLabel;
  }
  const normalized = normalizeStudentQuestionDisplayFields(next);
  const cmpReady = finalizeComparisonSignMcq(normalized);
  if (cmpReady?.params?.answerMode === "binary") {
    return cmpReady;
  }
  if (shouldEnforceFourMcqOptions(cmpReady)) {
    const subject =
      cmpReady.subject ||
      cmpReady.params?.subject ||
      cmpReady.params?.canonicalMetadata?.subject;
    return ensureMcqFourOptions(cmpReady, { subject: subject != null ? String(subject) : undefined });
  }
  return cmpReady;
}
