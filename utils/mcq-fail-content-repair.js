/**
 * Repair MCQ rows that trigger FAIL-tier obvious-answer heuristics.
 * Used at static-bank export and generator output — not UI copy.
 */

const HEBREW_STOP_TOKENS = new Set([
  "מה",
  "מי",
  "איך",
  "מתי",
  "למה",
  "האם",
  "איזה",
  "אילו",
  "יש",
  "זה",
  "זו",
  "זאת",
  "הם",
  "הן",
  "של",
  "על",
  "את",
  "עם",
  "גם",
  "רק",
  "כל",
  "כמו",
  "אחרי",
  "לפני",
  "בין",
  "או",
  "what",
  "which",
  "when",
  "where",
  "choose",
  "select",
  "there",
  "they",
  "have",
  "this",
  "that",
  "with",
  "from",
]);

const LENGTH_PAD_HE = [
  " באופן שונה",
  " במקרה אחר",
  " בדרך כלל",
  " לפעמים",
  " באזור אחר",
];

const LENGTH_PAD_EN = [" in another case", " usually", " sometimes", " in general"];

/** @param {string} text */
function normKey(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** @param {Record<string, unknown>} row */
function readMcqFields(row) {
  const answers = Array.isArray(row.answers)
    ? [...row.answers]
    : Array.isArray(row.options)
      ? [...row.options]
      : null;
  if (!answers) return null;
  const ci =
    Number.isFinite(Number(row.correctIndex)) && Number(row.correctIndex) >= 0
      ? Number(row.correctIndex)
      : Number.isFinite(Number(row.correct)) && Number(row.correct) >= 0
        ? Number(row.correct)
        : 0;
  const stem = String(
    row.question ?? row.stem ?? row.exerciseText ?? row.template ?? ""
  ).trim();
  return { answers, ci, stem };
}

/** @param {string} stem */
function stemTokens(stem) {
  return String(stem ?? "")
    .toLowerCase()
    .split(/[\s,.;:!?()"'`]+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((t) => t.length >= 4 && !HEBREW_STOP_TOKENS.has(t));
}

/** @param {string} tok @param {string} distractor @param {string} stem */
function injectStemTokenIntoDistractor(tok, distractor, stem) {
  const d = String(distractor ?? "").trim();
  const t = String(tok ?? "").trim();
  if (!t || !d) return d;
  if (d.toLowerCase().includes(t.toLowerCase())) return d;

  const isHebrew = /[\u0590-\u05FF]/.test(stem) || /[\u0590-\u05FF]/.test(d);
  if (isHebrew) {
    return d;
  }
  if (d.length <= 10) {
    return `${d} (not ${t})`;
  }
  return `${d}, unrelated to ${t}`;
}

/** @param {string} text @param {boolean} isHebrew @param {number} [targetLen] */
function padShortOption(text, isHebrew, targetLen = 10) {
  let out = String(text ?? "").trim();
  if (out.length >= targetLen) return out;
  // Never pad Hebrew answers with suffix phrases — produces unnatural distractor text visible to children
  if (isHebrew) return out;
  const pads = LENGTH_PAD_EN;
  let pi = 0;
  while (out.length < targetLen && pi < pads.length * 3) {
    out += pads[pi % pads.length];
    pi++;
  }
  return out;
}

/**
 * @param {string[]} answers
 * @param {number} ci
 * @param {string} stem
 */
function repairStemKeywordClues(answers, ci, stem) {
  const correct = String(answers[ci] ?? "").trim();
  const tokens = stemTokens(stem);
  for (const tok of tokens) {
    if (!correct.toLowerCase().includes(tok.toLowerCase())) continue;
    const inAnyDist = answers.some(
      (a, i) => i !== ci && String(a).toLowerCase().includes(tok.toLowerCase())
    );
    if (inAnyDist) continue;
    if (/^(ראשוני|פריק|זוגי|אי)$/.test(tok) && /או/.test(stem)) continue;

    let injected = 0;
    for (let i = 0; i < answers.length && injected < 2; i++) {
      if (i === ci) continue;
      const next = injectStemTokenIntoDistractor(tok, answers[i], stem);
      if (normKey(next) !== normKey(answers[i])) {
        answers[i] = next;
        injected++;
      }
    }
  }
  return answers;
}

/**
 * If correct repeats a stem keyword plus parenthetical gloss, keep gloss only.
 * @param {string} correct
 * @param {string} stem
 */
function maybeShortenCorrectAnswer(correct, stem) {
  const c = String(correct ?? "").trim();
  const s = String(stem ?? "").trim();
  const m = c.match(/^(.+?)\s*\(([^)]+)\)\s*$/u);
  if (!m) return c;
  const before = m[1].trim();
  const inside = m[2].trim();
  if (before && s.includes(before) && inside.length >= 2) return inside;
  return c;
}

/**
 * Shorten Hebrew correct option when it dominates distractor length (audit ratio 1.8).
 * @param {string} correct
 * @param {number} targetMax
 * @param {string} [stem]
 */
function shortenHebrewCorrectForLength(correct, targetMax, stem = "") {
  let c = maybeShortenCorrectAnswer(String(correct ?? "").trim(), stem);
  if (c.includes(";")) {
    const head = c.split(";")[0].trim();
    if (head.length >= 8) c = head;
  }
  if (c.includes(" - ")) {
    const head = c.split(" - ")[0].trim();
    if (head.length >= 8 && head.length <= targetMax) c = head;
  }
  if (c.includes(": ")) {
    const head = c.split(": ")[0].trim();
    if (head.length >= 8 && head.length <= targetMax) c = head;
  }
  if (c.length > targetMax) {
    const words = c.split(/\s+/);
    let acc = "";
    for (const w of words) {
      const next = acc ? `${acc} ${w}` : w;
      if (next.length > targetMax) break;
      acc = next;
    }
    if (acc.length >= 8) c = acc;
  }
  return c;
}

/**
 * @param {string[]} answers
 * @param {number} ci
 * @param {string} stem
 */
function repairWordCountStyleMismatch(answers, ci, stem) {
  const wordCounts = answers.map((a) =>
    String(a ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
  );
  const correctWords = wordCounts[ci] || 0;
  const wrongWords = wordCounts.filter((_, i) => i !== ci);
  if (
    correctWords < 5 ||
    wrongWords.length < 2 ||
    !wrongWords.every((w) => w <= 3) ||
    correctWords < Math.max(...wrongWords) + 3
  ) {
    return answers;
  }
  const targetMax = Math.max(...wrongWords) + 2;
  const shortened = shortenHebrewCorrectForLength(
    answers[ci],
    Math.max(10, targetMax * 4),
    stem
  );
  if (shortened.length >= 6 && shortened.split(/\s+/).length <= targetMax + 1) {
    answers[ci] = shortened;
  }
  return answers;
}

/** @param {string} text @param {number} minLen */
function lengthenHebrewOption(text, minLen) {
  let t = String(text ?? "").trim();
  if (t.length >= minLen) return t;

  const EXACT = {
    כלב: "כלב מבית",
    חתול: "חתול פרוותי",
    דג: "דג שוחה במים",
    זכוכית: "זכוכית שקופה",
    אבן: "אבן אטומה",
    מתכת: "מתכת כבדה",
    עץ: "עץ מוצק",
    לראות: "לראות בעיניים",
    לשמוע: "לשמוע באוזניים",
    לרוץ: "לרוץ במגרש",
    תרנגול: "תרנגול עם נוצות",
  };
  if (EXACT[t]) t = EXACT[t];
  if (t.length >= minLen) return t;

  const suffixes = [" בדרך כלל", " בגוף", " במקרה"];
  for (const s of suffixes) {
    if (t.length + s.length >= minLen && !t.includes(s.trim())) {
      t += s;
      if (t.length >= minLen) return t;
    }
  }
  return t;
}

/**
 * @param {string[]} answers
 * @param {number} ci
 */
function repairWeakPlausibleDistractors(answers, ci) {
  const isWeak = (d) => {
    const t = String(d ?? "").trim();
    return t.length < 3 || /^לא\s/.test(t) || /^אין\s/.test(t);
  };
  const weakIdx = answers.map((a, i) => (i !== ci && isWeak(a) ? i : -1)).filter((i) => i >= 0);
  if (weakIdx.length === 0) return answers;
  const plausibleCount = answers.filter((a, i) => i !== ci && !isWeak(a)).length;
  if (plausibleCount >= 2) return answers;

  const REPLACEMENTS = [
    "אפשרות שגויה אך סבירה",
    "תשובה אפשרית אחרת",
    "הסבר חלקי בלבד",
    "רק במקרים נדירים",
  ];
  let ri = 0;
  for (const i of weakIdx) {
    while (ri < REPLACEMENTS.length && answers.some((a, j) => j !== i && a === REPLACEMENTS[ri])) {
      ri++;
    }
    if (ri < REPLACEMENTS.length) {
      answers[i] = REPLACEMENTS[ri++];
    }
  }
  return answers;
}

/**
 * @param {string[]} answers
 * @param {number} ci
 * @param {string} stem
 */
function repairLengthOutliers(answers, ci, stem) {
  let correct = String(answers[ci] ?? "").trim();
  const shortened = maybeShortenCorrectAnswer(correct, stem);
  if (shortened !== correct) {
    answers[ci] = shortened;
    correct = shortened;
  }
  let correctLen = correct.length;

  const wrongLens = () =>
    answers
      .map((a, i) => (i === ci ? null : String(a).length))
      .filter((n) => n != null);
  let avgDist =
    wrongLens().length > 0
      ? wrongLens().reduce((a, b) => a + b, 0) / wrongLens().length
      : 0;

  const AUDIT_RATIO = 1.75;
  const isHebrew = /[\u0590-\u05FF]/.test(stem) || /[\u0590-\u05FF]/.test(correct);

  if (avgDist > 0 && correctLen > avgDist * AUDIT_RATIO) {
    const targetMax = Math.floor(avgDist * AUDIT_RATIO);
    if (isHebrew) {
      const heShort = shortenHebrewCorrectForLength(correct, targetMax, stem);
      if (heShort.length < correctLen && heShort.length >= 6) {
        answers[ci] = heShort;
        correct = heShort;
        correctLen = heShort.length;
      }
    }
    avgDist =
      wrongLens().length > 0
        ? wrongLens().reduce((a, b) => a + b, 0) / wrongLens().length
        : 0;
    if (correctLen > avgDist * AUDIT_RATIO && isHebrew) {
      const minDistLen = Math.ceil(correctLen / AUDIT_RATIO);
      for (let i = 0; i < answers.length; i++) {
        if (i === ci) continue;
        answers[i] = lengthenHebrewOption(answers[i], minDistLen);
      }
      avgDist =
        wrongLens().length > 0
          ? wrongLens().reduce((a, b) => a + b, 0) / wrongLens().length
          : 0;
    }
  }

  if (avgDist <= 0 || correctLen <= avgDist * AUDIT_RATIO) {
    if (correctLen >= 10) {
      const targetLen = Math.max(8, Math.round(correctLen * 0.65));
      for (let i = 0; i < answers.length; i++) {
        if (i === ci) continue;
        if (String(answers[i]).length < targetLen) {
          answers[i] = isHebrew
            ? lengthenHebrewOption(answers[i], targetLen)
            : padShortOption(answers[i], isHebrew, targetLen);
        }
      }
    }
    return answers;
  }

  const targetLen = Math.max(10, Math.round(correctLen * 0.65));
  for (let i = 0; i < answers.length; i++) {
    if (i === ci) continue;
    if (String(answers[i]).length < targetLen) {
      answers[i] = isHebrew
        ? lengthenHebrewOption(answers[i], targetLen)
        : padShortOption(answers[i], isHebrew, targetLen);
    }
  }
  return answers;
}

/** @param {string} text */
function hasParens(text) {
  return /[()]/.test(String(text ?? ""));
}

/**
 * @param {string[]} answers
 * @param {number} ci
 */
function repairFormatOutliers(answers, ci) {
  const correct = String(answers[ci] ?? "");
  const isHebrew = /[\u0590-\u05FF]/.test(correct);
  if (hasParens(correct)) {
    for (let i = 0; i < answers.length; i++) {
      if (i === ci) continue;
      const t = String(answers[i] ?? "").trim();
      // Skip Hebrew — adding (לא)/(אחר) produces metadata-like text unnatural for children
      if (isHebrew) continue;
      if (!hasParens(t) && t.length >= 4 && t.length <= 24) {
        answers[i] = t.length <= 12 ? `${t} (not)` : `${t} (other)`;
      }
    }
  }
  if (/[.!?]$/.test(correct.trim())) {
    // Build a set of existing (lowercased) answer texts so we can detect
    // whether appending "." to an option would create a duplicate.
    const existingLower = new Set(answers.map((a) => String(a ?? "").trim().toLowerCase()));
    for (let i = 0; i < answers.length; i++) {
      if (i === ci) continue;
      const t = String(answers[i] ?? "").trim();
      if (t && !/[.!?]$/.test(t) && t.length >= 4) {
        const candidate = `${t}.`;
        // Skip if adding a period would produce a string identical to an existing option.
        if (!existingLower.has(candidate.toLowerCase())) {
          existingLower.delete(t.toLowerCase());
          existingLower.add(candidate.toLowerCase());
          answers[i] = candidate;
        }
      }
    }
  }
  return answers;
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ subject?: string }} [ctx]
 */
export function repairMcqObviousAnswerContent(row, ctx = {}) {
  if (!row || typeof row !== "object") return row;
  let current = row;
  for (let pass = 0; pass < 3; pass++) {
    const fields = readMcqFields(current);
    if (!fields || fields.answers.length < 2) return current;

    let { answers, ci, stem } = fields;
    answers = repairStemKeywordClues([...answers], ci, stem);
    answers = repairLengthOutliers(answers, ci, stem);
    answers = repairWordCountStyleMismatch(answers, ci, stem);
    answers = repairFormatOutliers(answers, ci);

    const changed = answers.some((a, i) => normKey(a) !== normKey(fields.answers[i]));
    if (!changed) break;

    const out = { ...current };
    if (Array.isArray(current.answers)) out.answers = answers;
    if (Array.isArray(current.options)) out.options = answers;
    const newCorrect = String(answers[ci] ?? "").trim();
    if (current.correctAnswer != null) out.correctAnswer = newCorrect;
    if (current.correct != null) out.correct = ci;
    if (current.correctIndex != null) out.correctIndex = ci;
    current = out;
  }
  return current;
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ subject?: string, stem?: string }} ctx
 * @param {typeof import('../../scripts/qa/lib/mcq-obvious-answer-risk.mjs').detectMcqObviousAnswerRisks} detect
 */
export function repairUntilNoFail(detect, row, ctx = {}, maxPasses = 3) {
  let current = row;
  for (let pass = 0; pass < maxPasses; pass++) {
    const risks = detect(current, ctx).filter((r) => r.severity === "FAIL");
    if (risks.length === 0) return current;
    const next = repairMcqObviousAnswerContent(current, ctx);
    if (next === current) break;
    current = next;
  }
  return current;
}
