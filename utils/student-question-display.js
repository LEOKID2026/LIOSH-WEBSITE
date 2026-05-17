/**
 * Split and format student-facing question text for readable display
 * (instruction line vs equation/formula body, LTR isolation).
 */

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
  /^בחרו(?:\s+תשובה)?$/u,
  /^מה\s+המשפט/u,
  /^מה\s+המילה/u,
  /^Choose\b/iu,
];

/** @param {string} s */
export function isEquationLikeText(s) {
  const t = String(s ?? "").trim();
  if (!t) return false;
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

/**
 * Add readable spaces around × ÷ in Hebrew formula strings.
 * @param {string} text
 * @returns {string}
 */
export function formatFormulaSpacing(text) {
  let t = String(text ?? "");
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
  t = t.replace(/\s{2,}/g, " ");
  return t.trim();
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

  const colonIdx = raw.indexOf(":");
  if (colonIdx > 0 && colonIdx < 72) {
    const lead = raw.slice(0, colonIdx).trim();
    const body = raw.slice(colonIdx + 1).trim();
    if (
      body &&
      (isKnownInstructionLead(lead) ||
        (lead.length <= 56 && (isEquationLikeText(body) || isFormulaLikeText(body))))
    ) {
      const bodyKind =
        isEquationLikeText(body) ? "equation" : isFormulaLikeText(body) ? "mixed" : "text";
      return {
        leadText: `${lead}:`,
        bodyText: formatFormulaSpacing(body),
        bodyKind,
      };
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

  const formatted = formatFormulaSpacing(raw);
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
    const bodyText = formatFormulaSpacing(exercise);
    return {
      leadText: label.endsWith(":") ? label : `${label}:`,
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
      return {
        leadText: label.endsWith(":") ? label : `${label}:`,
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
  if (typeof q.questionLabel === "string" && q.questionLabel.trim()) return q;

  return {
    ...q,
    questionLabel: MATH_EQUATION_LABELS[gradeKey] || "השלימו את המשוואה:",
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
    next.questionLabel = label.endsWith(":") ? label : `${label}:`;
    next.exerciseText = formatFormulaSpacing(exercise);
    return next;
  }

  const source = exercise || question;
  if (!source) return next;

  const split = splitStudentQuestionForDisplay(source);
  if (split.leadText && split.bodyText) {
    if (!label) next.questionLabel = split.leadText;
    next.exerciseText = split.bodyText;
    next.question = split.bodyText;
    return next;
  }

  if (isEquationLikeText(source) || isFormulaLikeText(source)) {
    next.exerciseText = formatFormulaSpacing(source);
    if (!label && split.leadText) next.questionLabel = split.leadText;
    return next;
  }

  if (exercise) next.exerciseText = formatFormulaSpacing(exercise);
  if (question) next.question = formatFormulaSpacing(question);
  return next;
}
