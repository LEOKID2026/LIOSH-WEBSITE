/**
 * Split and format student-facing question text for readable display
 * (instruction line vs equation/formula body, LTR isolation).
 */

import { COMPARISON_SIGN_LRM } from "./comparison-sign-mcq.js";

const BLANK = /_{2,}|\?\?|…/;

const KNOWN_INSTRUCTION_LEADS = [
  /^מצאו(?:\s+את)?\s+הנעלם$/u,
  /^מצאו\s+x$/iu,
  /^השלימו(?:\s+את)?(?:\s+החסר)?(?:\s+במשוואה)?$/u,
  /^חידת\s+משוואה\s+קצרה$/u,
  /^חשבו$/u,
  /^פתרו$/u,
  /^השלם(?:\s+את)?(?:\s+הסימן)?$/u,
  /^השלם(?:\s+את)?(?:\s+הסדרה)?$/u,
  /^מה\s+התוצאה$/u,
  /^קראו(?:\s+את)?(?:\s+הטקסט)?$/u,
  /^קרא את המשפט$/u,
  /^קרא את המילה(?: המנוקדת)?$/u,
  /^בחרו(?:\s+תשובה)?$/u,
  /^מה\s+המשפט/u,
  /^מה\s+המילה/u,
  /^Choose\b/iu,
];

/** @param {string} s */
export function isEquationLikeText(s) {
  const t = String(s ?? "").trim();
  if (!t) return false;
  if (
    /^['"«׳][\u0590-\u05FF][^'"»׳]*['"»׳](?:\s*(?:\(\s*\d+\s*\)|·\s*משפט\s*\d+))?\s*$/u.test(
      t
    )
  ) {
    return false;
  }
  const hebrewChars = (t.match(/[\u0590-\u05FF]/g) || []).length;
  if (hebrewChars >= 10 && hebrewChars / Math.max(t.length, 1) > 0.3) {
    return false;
  }
  if (BLANK.test(t)) return true;
  if (/=\s*[\d(]|[\d)]\s*=/.test(t)) return true;
  if (/[0-9]/.test(t) && /[+\-×÷*/()]/.test(t)) return true;
  if (/^[\d\s+\-×÷*/()._=?:…]+$/.test(t.replace(BLANK, ""))) return true;
  return false;
}

/** @param {string} s */
export function isFormulaLikeText(s) {
  const t = String(s ?? "").trim();
  if (!t) return false;
  if (/שטח\s*=|היקף\s*=|נפח\s*=|אורך\s*=/u.test(t)) return true;
  if (/[×÷]/.test(t) && /[0-9א-ת]/.test(t)) return true;
  return isEquationLikeText(t);
}

/**
 * Collapse whitespace and normalize operator spacing for compact exercise lines.
 * @param {string} text
 */
export function formatCompactExpression(text) {
  let t = String(text ?? "")
    .replace(/\u2066|\u2067|\u2068|\u2069/gu, "")
    .trim();
  if (!t) return t;
  t = t.replace(/\s+/g, " ");
  t = t.replace(/\s*([+\-×÷*/=(),])\s*/g, " $1 ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

const DIFFICULTY_IN_PAREN = /\((קל|בינוני|אתגר|מאתגר)\)/u;

/**
 * Generator topic/difficulty framing (not child-facing instruction).
 * @param {string} lead
 */
export function isTopicDifficultyMetadataLead(lead) {
  const raw = String(lead ?? "").trim();
  if (!raw) return false;
  const t = raw.replace(/:\s*$/, "").trim();
  if (!t) return false;

  if (isKnownInstructionLead(t)) return false;
  if (/^Choose\b|^What\b|^Read\b|^Select\b|^Complete\b|^Fill\b|^Which\b/i.test(t)) {
    return false;
  }

  if (
    /^כיתה\s+[אבגדהו]['׳]?\s*\((קל|בינוני|אתגר|מאתגר)\)\s*$/u.test(t)
  ) {
    return true;
  }

  if (DIFFICULTY_IN_PAREN.test(t) && t.length <= 72) {
    return true;
  }

  return false;
}

/** @param {string} lead @param {string} body */
export function shouldOmitInstructionLead(lead, body) {
  const leadT = String(lead ?? "")
    .trim()
    .replace(/:$/, "");
  const bodyT = formatCompactExpression(body);
  if (!leadT || !bodyT) return true;
  if (isTopicDifficultyMetadataLead(leadT)) return true;
  if (/^Choose\b|^What\b|^Read\b|^Select\b|^Complete\b|^Fill in\b|^Which\b/i.test(leadT)) {
    return false;
  }
  if (!isKnownInstructionLead(leadT)) return false;
  if (isEquationLikeText(bodyT) && bodyT.length <= 56) return true;
  if (
    isFormulaLikeText(bodyT) &&
    /^(שטח|היקף)\s*=/.test(bodyT) &&
    bodyT.length <= 40
  ) {
    return true;
  }
  return false;
}

/** Child-friendly geometry question wording (display + generator post-process). */
/**
 * Strip trailing geometry formula-help parentheticals from child-facing stems.
 * Matches the same formula phrases that formatFormulaSpacing / child-friendly
 * rewrites already treat as presentation (not part of the question task).
 * Does not strip arbitrary parentheses.
 * @param {string} text
 * @returns {string}
 */
export function stripGeometryFormulaHelpParenthetical(text) {
  let t = String(text ?? "");
  if (!t.trim()) return t;
  const mul = "[×xX]";
  const formulas = [
    `ממוצע\\s+הבסיסים\\s*${mul}\\s*גובה`,
    `חצי\\s*${mul}\\s*בסיס\\s*${mul}\\s*גובה`,
    `אורך\\s*${mul}\\s*רוחב`,
    `בסיס\\s*${mul}\\s*גובה`,
    `צלע\\s*${mul}\\s*צלע`,
  ].join("|");
  t = t.replace(new RegExp(`\\s*\\(\\s*(?:${formulas})\\s*\\)\\s*$`, "u"), "");
  return t;
}

export function formatGeometryChildFriendlyQuestion(text) {
  let t = String(text ?? "");
  if (!t.trim()) return t;

  t = t.replace(/מה\s+שטח\s+הפנים/gu, "מה שטח המלבן");
  t = t.replace(/מה\s+היקף\s+הפנים/gu, "מה היקף המלבן");
  t = t.replace(
    /מלבן\s+במישור:\s*(\d+(?:[.,]\d+)?)\s+על\s+(\d+(?:[.,]\d+)?)/gu,
    "מלבן שאורכו $1 יחידות ורוחבו $2 יחידות"
  );
  t = t.replace(
    /שטח\s+מלבן\s+ללא\s+ציור:\s*(\d+(?:[.,]\d+)?)\s+על\s+(\d+(?:[.,]\d+)?)/gu,
    "מלבן שאורכו $1 יחידות ורוחבו $2 יחידות. מה שטח המלבן?"
  );
  t = t.replace(
    /מלבן\s+(\d+(?:[.,]\d+)?)\s+על\s+(\d+(?:[.,]\d+)?)\s*-/gu,
    "מלבן שאורכו $1 יחידות ורוחבו $2 יחידות -"
  );
  t = t.replace(
    /מלבן\s+אורך\s+(\d+(?:[.,]\d+)?),\s*רוחב\s+(\d+(?:[.,]\d+)?):\s*שטח\s*=\s*אורך\s*×\s*רוחב\.\s*מה\s+התוצאה\?/gu,
    "מלבן שאורכו $1 יחידות ורוחבו $2 יחידות. מה שטח המלבן?"
  );
  t = stripGeometryFormulaHelpParenthetical(t);
  return t.replace(/\s{2,}/g, " ").trim();
}

/** @param {string} lead */
function isKnownInstructionLead(lead) {
  const t = String(lead ?? "").trim().replace(/:$/, "");
  if (!t) return false;
  if (KNOWN_INSTRUCTION_LEADS.some((re) => re.test(t))) return true;
  if (t.length <= 42 && /^(מצאו|השלימו|חשבו|פתרו|השלם|קראו|בחרו|מה|איזה|בחר)/u.test(t)) {
    return !isEquationLikeText(t) && !isFormulaLikeText(t);
  }
  return false;
}

/** Reading / instruction prefix for verbal question hierarchy (with or without trailing colon). */
export function isLikelyVerbalInstruction(lead) {
  const t = String(lead ?? "")
    .trim()
    .replace(/:$/, "");
  if (!t) return false;
  if (isKnownInstructionLead(t)) return true;
  if (
    /^(?:קרא|קראו|קראי)(?:\s+את)?(?:\s+ה(?:טקסט|קטע|משפט|מילה(?:\s+המנוקדת)?))?$/u.test(
      t
    )
  ) {
    return true;
  }
  if (
    /^(?:האזינ|התבונ|עיינ|הסתכל)(?:ו|י|וּ)?(?:\s+(?:ו|ב))?/u.test(t) ||
    /^(?:Look|Read|Listen|Watch|Choose|Select|Complete|Fill)\b/iu.test(t)
  ) {
    return !isEquationLikeText(t) && !isFormulaLikeText(t);
  }
  if (
    t.length <= 56 &&
    /^(קרא|קראו|קראי|האזינ|התבונ|עיינ|הסתכל|Look|Read|Listen|Watch|Choose|Select|Complete|Fill)\b/iu.test(
      t
    )
  ) {
    return !isEquationLikeText(t) && !isFormulaLikeText(t);
  }
  return false;
}

/**
 * Add readable spaces around × ÷ in Hebrew formula strings.
 * @param {string} text
 * @returns {string}
 */
export function formatFormulaSpacing(text) {
  let t = formatGeometryChildFriendlyQuestion(String(text ?? ""));
  if (!t) return t;

  t = t.replace(/חצי\s*×\s*בסיס\s*×\s*גובה/gu, "חצי × בסיס × גובה");
  t = t.replace(/חציבסיסגובה/gu, "חצי × בסיס × גובה");
  t = t.replace(/חצי×בסיס×גובה/gu, "חצי × בסיס × גובה");
  t = t.replace(/חצי×בסיס/gu, "חצי × בסיס");
  t = t.replace(/בסיס×גובה/gu, "בסיס × גובה");
  t = t.replace(/אורך×רוחב/gu, "אורך × רוחב");
  t = t.replace(/בסיס×גובה/gu, "בסיס × גובה");

  t = t.replace(/([א-ת׳'])([×÷])([א-ת׳'0-9])/gu, "$1 $2 $3");
  t = t.replace(/([0-9])([×÷])([א-ת׳'0-9])/gu, "$1 $2 $3");
  t = t.replace(/([א-ת׳'0-9])([×÷])([0-9])/gu, "$1 $2 $3");

  t = t.replace(/(שטח|היקף|נפח|אורך)(\s*=\s*)/gu, "$1$2");
  t = t.replace(/=\s*(?=[א-ת])/gu, "= ");
  t = t.replace(
    /(\d+(?:[.,]\d+)?)\s*([<>=])\s*(\d+(?:[.,]\d+)?)/g,
    (_, left, sign, right) =>
      `${left} ${COMPARISON_SIGN_LRM}${sign}${COMPARISON_SIGN_LRM} ${right}`
  );
  t = t.replace(/\s{2,}/g, " ");
  return t.trim();
}

/**
 * Normalize percent / mixed stems that start with LTR junk before Hebrew text.
 * @param {string} raw
 */
function splitHebrewQuestionWithEquationTail(raw) {
  const t = String(raw ?? "").trim();
  if (!t || !/[\u0590-\u05FF]/.test(t)) return null;

  const leadingJunk = t.match(/^[\s_=?=]+\s*(.+[\u0590-\u05FF][\s\S]*)$/u);
  const normalized = leadingJunk?.[1]?.trim() || t;

  const trailingBlank = normalized.match(/^(.+[\u0590-\u05FF][^=]*?)\s*\??\s*(=\s*[_\s?]+)$/u);
  if (trailingBlank?.[1] && trailingBlank?.[2]) {
    return {
      leadText: trailingBlank[1].replace(/\?\s*$/, "").trim(),
      bodyText: formatCompactExpression(trailingBlank[2].trim()),
      bodyKind: "equation",
    };
  }

  if (leadingJunk?.[1]) {
    return {
      leadText: normalized.replace(/\?\s*$/, "").trim(),
      bodyText: "",
      bodyKind: "text",
    };
  }

  return null;
}

/**
 * Split context + instruction sentences for long Hebrew geometry prompts.
 * @param {string} raw
 */
function splitInstructionAfterContextSentence(raw) {
  const t = String(raw ?? "").trim();
  const match = t.match(/^(.+?[.!?])\s+([\u0590-\u05FF][\s\S]+)$/u);
  if (!match?.[2]) return null;
  const instruction = match[2].trim().replace(/\.$/, "");
  if (!isKnownInstructionLead(instruction)) return null;
  return {
    leadText: match[2].trim().endsWith(".") ? match[2].trim() : `${match[2].trim()}.`,
    bodyText: formatCompactExpression(formatFormulaSpacing(match[1].trim())),
    bodyKind: "text",
  };
}

/**
 * @param {string} text
 * @returns {{ leadText: string, bodyText: string, bodyKind: "text" | "equation" | "mixed" }}
 */
export function splitStudentQuestionForDisplay(text) {
  const raw = String(text ?? "").trim();
  if (!raw) {
    return { leadText: "", bodyText: "", bodyKind: "text" };
  }

  const hebrewEq = splitHebrewQuestionWithEquationTail(raw);
  if (hebrewEq) return hebrewEq;

  const instructionSplit = splitInstructionAfterContextSentence(raw);
  if (instructionSplit) return instructionSplit;

  const colonIdx = raw.indexOf(":");
  if (colonIdx > 0 && colonIdx < 72) {
    const lead = raw.slice(0, colonIdx).trim();
    const body = raw.slice(colonIdx + 1).trim();
    if (
      body &&
      (isKnownInstructionLead(lead) ||
        (lead.length <= 56 && (isEquationLikeText(body) || isFormulaLikeText(body))))
    ) {
      const bodyText = formatCompactExpression(formatFormulaSpacing(body));
      const leadText = `${lead}:`;
      const bodyKind =
        isEquationLikeText(bodyText) ? "equation" : isFormulaLikeText(bodyText) ? "mixed" : "text";
      if (shouldOmitInstructionLead(leadText, bodyText)) {
        return { leadText: "", bodyText, bodyKind };
      }
      return { leadText, bodyText, bodyKind };
    }
  }

  const formulaInSentence = raw.match(/^(.+?)\s+(שטח\s*=\s*.+)$/u);
  if (formulaInSentence) {
    const lead = formulaInSentence[1].trim();
    const body = formulaInSentence[2].trim();
    if (isFormulaLikeText(body) && lead.length <= 80) {
      return {
        leadText: lead.endsWith(":") ? lead : `${lead}:`,
        bodyText: formatFormulaSpacing(body),
        bodyKind: "mixed",
      };
    }
  }

  const formatted = formatCompactExpression(formatFormulaSpacing(raw));
  const bodyKind = isEquationLikeText(formatted)
    ? "equation"
    : isFormulaLikeText(formatted)
      ? "mixed"
      : "text";

  return { leadText: "", bodyText: formatted, bodyKind };
}

/**
 * Resolve lead/body from question payload fields.
 * @param {{ question?: string, questionLabel?: string, exerciseText?: string } | null | undefined}
 */
export function resolveStudentQuestionDisplayParts(q) {
  if (!q || typeof q !== "object") {
    return { leadText: "", bodyText: "", bodyKind: "text" };
  }

  const label = typeof q.questionLabel === "string" ? q.questionLabel.trim() : "";
  const exercise = typeof q.exerciseText === "string" ? q.exerciseText.trim() : "";
  const question = typeof q.question === "string" ? q.question.trim() : "";

  if (label && exercise) {
    const bodyText = formatCompactExpression(formatFormulaSpacing(exercise));
    const leadText = label.endsWith(":") ? label : `${label}:`;
    if (shouldOmitInstructionLead(leadText, bodyText)) {
      return {
        leadText: "",
        bodyText,
        bodyKind: isEquationLikeText(bodyText)
          ? "equation"
          : isFormulaLikeText(bodyText)
            ? "mixed"
            : "text",
      };
    }
    return {
      leadText,
      bodyText,
      bodyKind: isEquationLikeText(bodyText)
        ? "equation"
        : isFormulaLikeText(bodyText)
          ? "mixed"
          : "text",
    };
  }

  if (label && !exercise && question) {
    const split = splitStudentQuestionForDisplay(question);
    if (split.bodyText) {
      const leadText = label.endsWith(":") ? label : `${label}:`;
      if (shouldOmitInstructionLead(leadText, split.bodyText)) {
        return { leadText: "", bodyText: split.bodyText, bodyKind: split.bodyKind };
      }
      return {
        leadText,
        bodyText: split.bodyText,
        bodyKind: split.bodyKind,
      };
    }
  }

  const combined = exercise || question;
  if (!label && combined) {
    const split = splitStudentQuestionForDisplay(combined);
    if (split.leadText) return split;
    return {
      leadText: "",
      bodyText: split.bodyText || formatFormulaSpacing(combined),
      bodyKind: split.bodyKind,
    };
  }

  if (label && !exercise && !question) {
    return { leadText: label, bodyText: "", bodyKind: "text" };
  }

  return { leadText: "", bodyText: formatFormulaSpacing(question), bodyKind: "text" };
}

/**
 * Split combined stems into questionLabel + exerciseText for generators/sanitizer.
 * @param {Record<string, unknown>|null|undefined} q
 */
const MATH_EQUATION_LABELS = {
  g1: "חידת משוואה קצרה:",
  g2: "השלימו את החסר במשוואה:",
  g3: "מצאו את הנעלם:",
  g4: "מצאו את הנעלם:",
  g5: "מצאו את הנעלם:",
  g6: "מצאו x:",
};

/**
 * @param {Record<string, unknown>} q
 * @param {string} gradeKey
 */
export function attachMathEquationInstructionLabel(q, gradeKey) {
  if (!q || typeof q !== "object") return q;
  const op = String(q.operation || q.params?.kind || "");
  const kind = String(q.params?.kind || "");
  const isEq =
    op === "equations" ||
    /^eq_/.test(kind) ||
    /^order_/.test(kind) ||
    op === "order_of_operations";
  if (!isEq) return q;

  const exercise =
    (typeof q.exerciseText === "string" && q.exerciseText.trim()) ||
    (typeof q.params?.exerciseText === "string" && q.params.exerciseText.trim()) ||
    "";
  const question = typeof q.question === "string" ? q.question.trim() : "";
  const body = exercise || question;
  if (!body || !isEquationLikeText(body)) return q;
  if (typeof q.questionLabel === "string" && q.questionLabel.trim()) {
    const existing = q.questionLabel.trim();
    if (shouldOmitInstructionLead(existing, body)) {
      const next = { ...q };
      delete next.questionLabel;
      return next;
    }
    return q;
  }

  const proposed = MATH_EQUATION_LABELS[gradeKey] || "השלימו את המשוואה:";
  if (shouldOmitInstructionLead(proposed, body)) return q;

  return {
    ...q,
    questionLabel: proposed,
  };
}

export function normalizeStudentQuestionDisplayFields(q) {
  if (!q || typeof q !== "object") return q;
  const next = { ...q };

  if (
    typeof next.stem === "string" &&
    next.stem.trim() &&
    !(typeof next.question === "string" && next.question.trim())
  ) {
    next.question = next.stem.trim();
  }

  const label =
    typeof next.questionLabel === "string" ? next.questionLabel.trim() : "";
  let exercise =
    typeof next.exerciseText === "string" ? next.exerciseText.trim() : "";
  const question =
    typeof next.question === "string" ? next.question.trim() : "";

  if (
    label &&
    /^\d+$/.test(label) &&
    typeof next.stem === "string" &&
    next.stem.trim()
  ) {
    delete next.questionLabel;
  }

  if (label && exercise) {
    const bodyText = formatCompactExpression(formatFormulaSpacing(exercise));
    const leadText = label.endsWith(":") ? label : `${label}:`;
    if (!shouldOmitInstructionLead(leadText, bodyText)) {
      next.questionLabel = leadText;
    } else {
      delete next.questionLabel;
    }
    next.exerciseText = bodyText;
    next.question = bodyText;
    return next;
  }

  const source = exercise || question;
  if (!source) return next;

  const split = splitStudentQuestionForDisplay(source);
  if (split.leadText && split.bodyText) {
    if (!label && !shouldOmitInstructionLead(split.leadText, split.bodyText)) {
      next.questionLabel = split.leadText;
    }
    next.exerciseText = formatCompactExpression(split.bodyText);
    next.question = next.exerciseText;
    return next;
  }

  if (isEquationLikeText(source) || isFormulaLikeText(source)) {
    next.exerciseText = formatCompactExpression(formatFormulaSpacing(source));
    if (!label && split.leadText && !shouldOmitInstructionLead(split.leadText, next.exerciseText)) {
      next.questionLabel = split.leadText;
    }
    return next;
  }

  if (exercise) next.exerciseText = formatFormulaSpacing(exercise);
  if (question) next.question = formatFormulaSpacing(question);
  return next;
}
