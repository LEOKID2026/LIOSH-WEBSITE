#!/usr/bin/env node
/**
 * Audit child-facing History text: question bank + learning book sections 1–7.
 * Fails on Latin letters, internal keys, grade/level prefixes, (שאלה N).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HISTORY_QUESTIONS } from "../data/history-questions/index.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  detectStudentStemMetadataLeaks,
  STUDENT_STEM_METADATA_LEAK_CHECKS,
} from "../utils/student-question-stem-sanitizer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BOOK_DRAFTS = join(ROOT, "docs/learning-book/history/g6/drafts");

const LATIN = /[a-zA-Z]/;
const INTERNAL_FRAGMENTS = [
  /\bhist_[a-z0-9_]+/i,
  /\btopicKey\b/i,
  /\bsubtopicKey\b/i,
  /\bskillId\b/i,
  /מוקד\s+[a-z0-9_]/i,
  /primary_source|secondary_source|concept_tag/i,
  /history:g6:/i,
  /grades_\d+_\d+/i,
];
const PREFIX_PATTERNS = [
  { id: "grade_level_prefix", re: /כיתה\s+ו['׳]?\s*[·•—|]\s*רמה/u },
  { id: "question_number", re: /\(שאלה\s+\d+\)/u },
  { id: "level_prefix", re: /^רמה\s+(קלה|בינונית|מתקדמת|קשה)/u },
];

function issuesForText(text, field) {
  const found = [];
  const s = String(text || "");
  if (!s.trim()) return found;

  if (LATIN.test(s)) {
    found.push({ field, type: "latin", sample: s.slice(0, 120) });
  }
  for (const re of INTERNAL_FRAGMENTS) {
    if (re.test(s)) {
      found.push({ field, type: "internal_fragment", pattern: String(re), sample: s.slice(0, 120) });
    }
  }
  for (const p of PREFIX_PATTERNS) {
    if (p.re.test(s)) {
      found.push({ field, type: "prefix_leak", pattern: p.id, sample: s.slice(0, 120) });
    }
  }
  return found;
}

function auditQuestion(q) {
  const stem = q.stem || q.question || "";
  const options = Array.isArray(q.options) ? q.options : [];
  const explanation = q.explanation || "";
  const issues = [
    ...issuesForText(stem, "stem"),
    ...options.flatMap((o, i) => issuesForText(o, `options[${i}]`)),
    ...issuesForText(explanation, "explanation"),
  ];
  const leak = detectStudentStemMetadataLeaks(stem);
  if (leak.leak) {
    issues.push({
      field: "stem",
      type: "metadata_leak",
      pattern: leak.checks.map((c) => c.id).join(", "),
      sample: stem.slice(0, 120),
    });
  }
  return issues;
}

function auditBookPage(pageId, raw) {
  const page = parseLearningPageMarkdown(raw, pageId);
  const issues = [];
  for (const section of page.sections) {
    const fields = [
      ["title", section.title],
      ["body", section.body],
    ];
    for (const [field, text] of fields) {
      for (const iss of issuesForText(text, `section${section.number}.${field}`)) {
        issues.push(iss);
      }
    }
  }
  return { pageId, displayTitle: page.displayTitle, issues };
}

const allQuestionIssues = [];
for (const q of HISTORY_QUESTIONS) {
  const issues = auditQuestion(q);
  if (issues.length) allQuestionIssues.push({ id: q.id, issues });
}

const bookIssues = [];
for (const file of readdirSync(BOOK_DRAFTS).filter((f) => f.endsWith(".md"))) {
  const pageId = file.replace(/\.md$/, "");
  const raw = readFileSync(join(BOOK_DRAFTS, file), "utf8");
  const row = auditBookPage(pageId, raw);
  if (row.issues.length) bookIssues.push(row);
}

console.log("=== History child-text audit ===");
console.log(`Questions: ${HISTORY_QUESTIONS.length} (${allQuestionIssues.length} with issues)`);
console.log(`Book pages: ${readdirSync(BOOK_DRAFTS).filter((f) => f.endsWith(".md")).length} (${bookIssues.length} with issues)`);
console.log(`Metadata leak checks registered: ${STUDENT_STEM_METADATA_LEAK_CHECKS.length}`);

function countTypes(rows, getIssues) {
  const counts = { latin: 0, internal_fragment: 0, prefix_leak: 0, metadata_leak: 0 };
  for (const row of rows) {
    for (const iss of getIssues(row)) {
      counts[iss.type] = (counts[iss.type] || 0) + 1;
    }
  }
  return counts;
}

const qCounts = countTypes(allQuestionIssues, (r) => r.issues);
const bCounts = countTypes(bookIssues, (r) => r.issues);
console.log("Question issue counts:", qCounts);
console.log("Book issue counts:", bCounts);

const totalIssues = allQuestionIssues.length + bookIssues.length;
if (totalIssues > 0) {
  console.log("\nFirst question issues:");
  for (const row of allQuestionIssues.slice(0, 5)) {
    console.log(`- ${row.id}:`, row.issues.map((i) => `${i.field}/${i.type}`).join(", "));
  }
  console.log("\nBook issues:");
  for (const row of bookIssues) {
    console.log(`- ${row.pageId}:`, row.issues.map((i) => `${i.field}/${i.type}`).join(", "));
  }
  process.exit(1);
}

console.log("PASS: 0 child-facing Latin/internal/prefix issues in questions and book sections");
process.exit(0);
