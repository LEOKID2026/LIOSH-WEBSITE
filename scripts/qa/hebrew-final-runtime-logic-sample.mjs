#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { generateQuestion } from "../../utils/hebrew-question-generator.js";
import { attachHebrewAudioToQuestion } from "../../utils/hebrew-audio-attach.js";
import { sanitizeQuestionForStudentDisplay } from "../../utils/student-question-stem-sanitizer.js";
import {
  isG1G2RuntimePracticeEligible,
  isLowerGradeG1G2Key,
  sanitizeLowerGradeChildFacingText,
} from "../../utils/lower-grade-practice-runtime-quality.js";

const OUT = "reports/hebrew-final-visual-runtime-qa/runtime-logic-sample.json";

const LEVEL_CONFIG = { name: "קל" };
const LOWER_TOPICS = ["reading", "comprehension", "grammar", "vocabulary", "writing", "speaking"];
const UPPER_TOPICS = ["reading", "comprehension", "grammar", "vocabulary"];
const PLAN = [
  ...LOWER_TOPICS.map((topic) => ["g1", topic, 7]),
  ...LOWER_TOPICS.map((topic) => ["g2", topic, 7]),
  ...["g3", "g4", "g5", "g6"].flatMap((grade) => UPPER_TOPICS.map((topic) => [grade, topic, 5])),
];

const FORBIDDEN = [
  ["internal_paren_bli", /\(בלי\b/u],
  ["bli_kria", /בלי קריאה/u],
  ["bli_batik", /בלי בתיק/u],
  ["bli_reshimat", /בלי רשימת/u],
  ["bli_milim", /בלי מילים/u],
  ["undefined", /\bundefined\b/u],
  ["null", /\bnull\b/u],
  ["nan", /\bNaN\b/u],
  ["raw_id", /\b(?:patternFamily|diagnosticSkillId|subtopicId|skillKey|gradeBand|g[1-6]\.)\b/iu],
];
const PUNCT_FALLBACK = new Set(["בדרך כלל לא", "לא תמיד", "תלוי במצב", "רק לפעמים"]);
const PUNCT_ALLOWED = new Set(["נקודה", "סימן שאלה", "סימן קריאה", "פסיק", ".", "?", "!", ","]);

function answersOf(q) {
  return Array.isArray(q?.answers) ? q.answers.map((a) => String(a ?? "").trim()) : [];
}

function questionText(q) {
  return String(q?.exerciseText || q?.question || q?.stem || "").replace(/\s+/g, " ").trim();
}

function correctOf(q) {
  if (q?.correctAnswer != null) return String(q.correctAnswer).trim();
  const answers = answersOf(q);
  const idx = Number.isFinite(Number(q?.correct)) ? Number(q.correct) : 0;
  return answers[idx] || "";
}

function analyze(row) {
  const issues = [];
  const allText = [row.question, ...row.answers].join(" | ");
  for (const [id, re] of FORBIDDEN) {
    if (re.test(allText)) issues.push(id);
  }
  if ((row.question.match(/האזינו ובחרו/g) || []).length > 1) issues.push("duplicate_audio_instruction");
  if (/איזה סימן מתאים בסוף המשפט|סימן פיסוק|איזה סימן/u.test(row.question)) {
    if (row.answers.some((a) => PUNCT_FALLBACK.has(a))) issues.push("punctuation_fallback_answer");
    if (!row.answers.every((a) => PUNCT_ALLOWED.has(a))) issues.push("punctuation_non_symbol_answer");
  }
  if (new Set(row.answers).size !== row.answers.length) issues.push("duplicate_answers");
  if (row.answers.some((a) => a.length > 90)) issues.push("long_answer_card");
  if ((row.grade === "g1" || row.grade === "g2") && !row.hasAudioStem) issues.push("missing_audio_stem");
  return issues;
}

const samples = [];
let seq = 0;
for (const [grade, topic, count] of PLAN) {
  for (let i = 0; i < count; i += 1) {
    let q = generateQuestion(LEVEL_CONFIG, topic, grade, null, { excludeFingerprints: new Set() });
    if (isLowerGradeG1G2Key(grade)) {
      seq += 1;
      attachHebrewAudioToQuestion(q, { gradeKey: grade, topic: q.topic || q.operation || topic, sequenceIndex: seq });
      sanitizeLowerGradeChildFacingText(q);
    }
    q = sanitizeQuestionForStudentDisplay(q);
    if (isLowerGradeG1G2Key(grade) && !isG1G2RuntimePracticeEligible(q, { gradeKey: grade, subject: "hebrew" })) {
      i -= 1;
      continue;
    }
    const row = {
      grade,
      topic,
      question: questionText(q),
      answers: answersOf(q),
      correctAnswer: correctOf(q),
      hasAudioStem: Boolean(q?.params?.audioStem),
      answerMode: q?.answerMode || "choice",
    };
    row.issues = analyze(row);
    samples.push(row);
  }
}

const byGradeTopic = {};
for (const row of samples) {
  const key = `${row.grade}/${row.topic}`;
  byGradeTopic[key] = (byGradeTopic[key] || 0) + 1;
}
const issues = samples.flatMap((row, index) => row.issues.map((issue) => ({ issue, index, row })));
await mkdir("reports/hebrew-final-visual-runtime-qa", { recursive: true });
await writeFile(OUT, JSON.stringify({ total: samples.length, byGradeTopic, examples: samples.slice(0, 10), issues, samples }, null, 2));

console.log(JSON.stringify({ total: samples.length, byGradeTopic, issueCount: issues.length, examples: samples.slice(0, 10), issues: issues.slice(0, 20) }, null, 2));
