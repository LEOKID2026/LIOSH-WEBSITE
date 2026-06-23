/**
 * Visual QA — issue detection on text the child actually sees.
 */

const RAW_ID_PATTERNS = [
  /\b(?:addition|subtraction|multiplication|division|division_with_remainder|word_problems|fractions|percentages|ratio|scale|order_of_operations|number_sense|prime_composite)\b/i,
  /\b(?:vocabulary|phonics|grammar|reading|writing|area_grid|concept_tf|translation|shapes_basic|mixed)\b/i,
  /\b(?:patternFamily|diagnosticSkillId|subtopicId|skillKey|gradeBand|grade_\d|g[1-6]_)\b/i,
  /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i,
];

const BAD_LITERAL = [
  /\bundefined\b/i,
  /\bnull\b/i,
  /\bNaN\b/i,
  /\[object Object\]/i,
];

const MOJIBAKE = [/×[\u0080-\u00FF]/, /Ã[\u0080-\u00FF]/, /â[\u0080-\u00FF]/];

const METADATA_FRAGMENTS = [
  /\(בלי/i,
  /בלי קריאה/i,
  /בלי בתיק/i,
  /בלי רשימת/i,
  /בלי מילים/i,
  /באופן שונה/i,
];

const SUSPICIOUS_PAREN = [
  /\([^)]*(?:kind|subKind|topicKey|operation|params|correctAnswer|skillKey)[^)]*\)/i,
  /\([^)]*(?:בלי|pattern|diagnostic)[^)]*\)/i,
];

const MAX_QUESTION_LEN = 600;

export function compact(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function dedupeRepeatedStem(text) {
  const t = compact(text);
  if (t.length > 12 && t.length % 2 === 0) {
    const half = t.slice(0, t.length / 2);
    if (t.slice(t.length / 2) === half) return half;
  }
  return t;
}

export { dedupeRepeatedStem };

export function detectMojibake(text) {
  const t = String(text || "");
  return MOJIBAKE.some((re) => re.test(t));
}

export function analyzeVisibleText(text, context = {}) {
  const combined = compact(text);
  const details = [];
  const flags = {
    rawIds: false,
    undefinedNullNan: false,
    suspiciousMetadata: false,
    inputMismatch: false,
    mojibake: false,
    textTooLong: false,
    emptyQuestion: false,
    emptyAnswers: false,
    duplicateAnswers: false,
  };

  const { inputType, answersDisplayed = [], questionText = "" } = context;
  const q = compact(questionText || combined);

  if (!q && !combined) {
    details.push("empty visible question surface");
    flags.emptyQuestion = true;
  }

  for (const re of BAD_LITERAL) {
    if (re.test(combined)) {
      details.push(`forbidden literal: ${re.source}`);
      flags.undefinedNullNan = true;
    }
  }

  for (const re of RAW_ID_PATTERNS) {
    if (re.test(combined)) {
      details.push(`raw id pattern: ${re.source}`);
      flags.rawIds = true;
    }
  }

  for (const re of METADATA_FRAGMENTS) {
    if (re.test(combined)) {
      details.push(`suspicious metadata fragment: ${re.source}`);
      flags.suspiciousMetadata = true;
    }
  }

  for (const re of SUSPICIOUS_PAREN) {
    if (re.test(combined)) {
      details.push("suspicious parenthetical metadata");
      flags.suspiciousMetadata = true;
    }
  }

  if (detectMojibake(combined)) {
    details.push("mojibake detected");
    flags.mojibake = true;
  }

  if (q.length > MAX_QUESTION_LEN) {
    details.push(`question text too long (${q.length} chars)`);
    flags.textTooLong = true;
  }

  const asksChoice =
    /בחרו|איזה מהבאים|נכון\/לא נכון|סמנו את|איזה מושג|נכון או לא נכון/i.test(combined) ||
    (answersDisplayed.length >= 2 && inputType === "numeric");
  const strongNumericCue = new RegExp(
    "=\\s*__|=\\s*\\?|\\d+\\s*[+\\-×÷*/=]|^\\s*\\d+\\s*=|(?:^|\\s)כמה\\s+זה\\s",
    "u"
  ).test(combined);

  if (asksChoice && inputType === "numeric" && answersDisplayed.length === 0) {
    details.push("choice wording but numeric-only input");
    flags.inputMismatch = true;
  }
  if (strongNumericCue && inputType === "mcq" && answersDisplayed.length >= 2) {
    details.push("numeric-style stem but MCQ-only input");
    flags.inputMismatch = true;
  }

  if (answersDisplayed.length >= 2) {
    const empty = answersDisplayed.filter((a) => !compact(a));
    if (empty.length) {
      details.push("empty MCQ option label");
      flags.emptyAnswers = true;
    }
    const labels = answersDisplayed.map((a) => compact(a));
    const dup = new Set(labels);
    if (dup.size !== labels.length) {
      details.push("duplicate MCQ labels");
      flags.duplicateAnswers = true;
    }
  }

  return { ...flags, details };
}

export function analyzeSubjectRules(sample) {
  const details = [];
  const flags = {};
  const {
    subject,
    gradeNumber,
    questionText = "",
    answersDisplayed = [],
    inputType,
    audioButtonVisible,
    audioRequired,
    hasDiagram,
    diagramType,
    hasStepButton,
    hasFullExplanationButton,
    pageBodySnippet = "",
    hasHeshbonLabel,
  } = sample;

  const q = compact(questionText);
  const answers = answersDisplayed.map(compact);
  const blob = [q, ...answers, pageBodySnippet].join("\n");

  if (hasHeshbonLabel) {
    details.push('visible label "חשבון" instead of "מתמטיקה"');
  }

  if (subject === "hebrew" && gradeNumber <= 2) {
    if (!audioButtonVisible) {
      details.push("hebrew g1-g2: audio button not visible after settle");
    }
    if (/באופן שונה/.test(blob)) {
      details.push("hebrew: forbidden phrase באופן שונה");
    }
  }

  if (subject === "english" && gradeNumber <= 2) {
    if (!audioButtonVisible) {
      details.push("english g1-g2: audio button required but not visible");
    }
    if (/\btranslation\b/i.test(blob) || /תרגום/.test(q)) {
      details.push("english g1-g2: translation visible in stem");
    }
    if (detectMojibake(blob)) {
      details.push("english: mojibake in visible UI");
    }
    if (hasFullExplanationButton && /phonics|פוניק/i.test(sample.topic || sample.topicDisplay || "")) {
      details.push("english phonics: empty full-explanation affordance");
    }
  }

  if (subject === "geometry") {
    if (/=\s*\?|:\s*\?/.test(q)) {
      details.push("geometry: forbidden = ? or : ? in stem");
    }
    if (/נכון או לא נכון|נכון\/לא נכון/i.test(q)) {
      const hasTrueFalse = answers.some((a) => /^(נכון|לא נכון)$/i.test(a));
      if (!hasTrueFalse || inputType !== "mcq") {
        details.push("geometry true/false question must be MCQ with נכון/לא נכון");
      }
    }
    if (/משבצות|רשת|grid/i.test(q)) {
      if (!hasDiagram) {
        details.push("geometry grid question missing diagram");
      }
    }
    if (/^[1-4]$/.test(answers.join(" ")) && /סיווג|מושג|איזה/i.test(q)) {
      details.push("geometry classification question shows numeric 1-4 answers");
    }
  }

  if (subject === "math") {
    if (/בחרו/i.test(q) && inputType === "numeric") {
      details.push("math: בחרו wording with numeric input");
    }
  }

  return {
    details,
    hasSubjectIssues: details.length > 0,
    ...flags,
  };
}

export function mergeIssues(...parts) {
  const details = parts.flatMap((p) => p?.details || []);
  return {
    rawIds: parts.some((p) => p?.rawIds),
    undefinedNullNan: parts.some((p) => p?.undefinedNullNan),
    suspiciousMetadata: parts.some((p) => p?.suspiciousMetadata),
    inputMismatch: parts.some((p) => p?.inputMismatch),
    mojibake: parts.some((p) => p?.mojibake),
    textTooLong: parts.some((p) => p?.textTooLong),
    emptyQuestion: parts.some((p) => p?.emptyQuestion),
    details: [...new Set(details)],
  };
}

export function analyzeSample(sample) {
  const visibleBlob = [sample.questionText, ...(sample.answersDisplayed || [])].join("\n");
  const base = analyzeVisibleText(visibleBlob, {
    inputType: sample.inputType,
    answersDisplayed: sample.answersDisplayed || [],
    questionText: sample.questionText,
  });
  const subjectRules = analyzeSubjectRules(sample);
  return mergeIssues(base, subjectRules);
}

export function sampleHasIssues(issues) {
  return Boolean(
    issues?.details?.length ||
      issues?.rawIds ||
      issues?.undefinedNullNan ||
      issues?.mojibake ||
      issues?.inputMismatch ||
      issues?.suspiciousMetadata ||
      issues?.emptyQuestion
  );
}
