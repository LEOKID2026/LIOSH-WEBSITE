#!/usr/bin/env node
/**
 * Generate CURRENT_REMAINING_LANGUAGE_ISSUES.md from book-text-extract.json
 * Read-only — does not modify book markdown.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const JSON_IN = path.join(ROOT, "data/language-review/book-text-extract.json");
const MD_OUT = path.join(ROOT, "docs/language-review/books/CURRENT_REMAINING_LANGUAGE_ISSUES.md");

const PATTERNS = [
  { key: "x_mark", re: /❌/ },
  { key: "lo_bang", re: /(?:^|[\s—-])לא!(?:\s|$|[.!])/ },
  { key: "haser", re: /חסר/ },
  { key: "lo_nachon", re: /לא נכון/ },
  { key: "tsarich", re: /צריך/ },
  { key: "present_simple", re: /Present Simple/ },
  { key: "chayav", re: /חייב/ },
  { key: "drush", re: /דרוש/ },
];

const SKIP_TEXT_TYPES = new Set([
  "section_heading",
  "book_title",
  "catalog_tile_label",
  "toc_batch_title",
  "toc_page_title",
]);

const IMPROVED_MARKERS = [
  /לא מתאים/,
  /הוא בזמן/,
  /היא בזמן/,
  /פירושו/,
  /לכן צריך/,
  /אחרי /,
  /כאן צריך/,
  /כאן מדברים/,
  /לא חייב/,
  /בודקים/,
  /זה לא משפט/,
  /זו לא/,
  /זה לא נכון במשפט/,
  /אינו בזמן/,
  /אינה צורה/,
  /לא מספיק/,
  /לא מתייחס/,
  /לא פותחים/,
  /לא קובעים/,
];

const ABRUPT_MARKERS = [
  /— לא!/,
  /לא מקבל/,
  /חסר s!/,
  /חסר es!/,
  /Present Simple!/,
  /= רבים!/,
  /— לא נכון!/,
  /צריך [a-z]+!/i,
];

/** @param {string} subject @param {string} text */
function classifyStatus(subject, text) {
  const t = String(text || "").trim();
  if (subject === "math") return "MATH_EXPECTED";
  if (subject === "geometry") return "GEOMETRY_EXPECTED";
  if (subject === "english" && (t.startsWith("❌") || /Present Simple/.test(t))) {
    return "ENGLISH_GRAMMAR_EXPECTED";
  }

  if (t.startsWith("❌")) {
    if (IMPROVED_MARKERS.some((p) => p.test(t))) return "OK_AS_TEACHING_ERROR";
    if (ABRUPT_MARKERS.some((p) => p.test(t))) return "NEEDS_FIX";
    if (["hebrew", "science", "moledet", "geography"].includes(subject)) {
      if (/— לא!/.test(t)) return "NEEDS_FIX";
      return "OK_AS_TEACHING_ERROR";
    }
    if (subject === "english") return "ENGLISH_GRAMMAR_EXPECTED";
    return "REVIEW_LATER";
  }

  if (/Present Simple/.test(t)) return "ENGLISH_GRAMMAR_EXPECTED";
  if (/(?:^|[\s—-])לא!(?:\s|$|[.!])/.test(t)) return "NEEDS_FIX";
  if (/לא נכון/.test(t)) {
    if (subject === "science") return "OK_AS_TEACHING_ERROR";
    return "REVIEW_LATER";
  }
  if (/חסר/.test(t) || /צריך/.test(t) || /חייב/.test(t) || /דרוש/.test(t)) {
    return "REVIEW_LATER";
  }
  return "REVIEW_LATER";
}

/** @param {string[]} matchedPatterns */
function matchedPatternLabels(matchedPatterns) {
  return matchedPatterns.join(", ");
}

/** @param {string} sourceFile @param {string} visibleText */
function findSourceLine(sourceFile, visibleText) {
  if (!sourceFile || !sourceFile.endsWith(".md")) return null;
  const abs = path.join(ROOT, sourceFile.replace(/\//g, path.sep));
  if (!fs.existsSync(abs)) return null;
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  const needle = visibleText.trim();
  for (const line of lines) {
    if (line.includes(needle)) return line.trim();
  }
  // Partial: strip leading ❌ and match core
  const core = needle.replace(/^❌\s*/, "").slice(0, 40);
  if (core.length >= 8) {
    for (const line of lines) {
      if (line.includes(core)) return line.trim();
    }
  }
  return null;
}

function main() {
  const data = JSON.parse(fs.readFileSync(JSON_IN, "utf8"));
  /** @type {Array<object>} */
  const issues = [];

  for (const block of data.text_blocks) {
    const t = String(block.visible_text || "").trim();
    if (!t || SKIP_TEXT_TYPES.has(block.text_type)) continue;

    /** @type {string[]} */
    const matched = [];
    for (const p of PATTERNS) {
      if (p.re.test(t)) matched.push(p.key);
    }
    if (!matched.length) continue;

    const status = classifyStatus(block.subject, t);
    const sourceLine = findSourceLine(block.source_file, t);

    issues.push({
      subject: block.subject,
      grade: block.grade,
      page_id: block.page_id,
      source_file: block.source_file || "",
      section_number: block.section_number,
      section_title: block.section_title || "",
      text_type: block.text_type,
      visible_text: t,
      source_line: sourceLine,
      matched_patterns: matched,
      status,
    });
  }

  const bySubject = {};
  const byStatus = {};
  for (const i of issues) {
    bySubject[i.subject] = (bySubject[i.subject] || 0) + 1;
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  }

  const needsFix = issues.filter((i) => i.status === "NEEDS_FIX");

  const lines = [];
  lines.push("# Current Remaining Language Issues");
  lines.push("");
  lines.push(`Generated: ${data.generated_at}`);
  lines.push(`Source: \`data/language-review/book-text-extract.json\``);
  lines.push("");
  lines.push("Scan patterns: `❌`, `לא!`, `חסר`, `לא נכון`, `צריך`, `Present Simple`, `חייב`, `דרוש`");
  lines.push("");
  lines.push("Book markdown was **not** modified. This report reflects current extracted visible text only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Total issues | ${issues.length} |`);
  for (const [s, c] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${s} | ${c} |`);
  }
  lines.push("");
  lines.push("### By subject");
  lines.push("");
  lines.push("| Subject | Count |");
  lines.push("|---------|------:|");
  for (const subj of ["math", "geometry", "science", "hebrew", "english", "moledet", "geography"]) {
    if (bySubject[subj]) lines.push(`| ${subj} | ${bySubject[subj]} |`);
  }
  lines.push("");
  lines.push("## NEEDS_FIX (priority)");
  lines.push("");
  if (!needsFix.length) {
    lines.push("_None classified as NEEDS_FIX._");
  } else {
    for (const [idx, i] of needsFix.entries()) {
      lines.push(`### ${idx + 1}. ${i.subject}:${i.grade}/${i.page_id}`);
      lines.push("");
      lines.push(`- **Status:** NEEDS_FIX`);
      lines.push(`- **Source file:** \`${i.source_file || "(none)"}\``);
      lines.push(`- **Section:** ${i.section_number ?? "—"} ${i.section_title ? `— ${i.section_title}` : ""}`);
      lines.push(`- **Patterns:** ${matchedPatternLabels(i.matched_patterns)}`);
      lines.push(`- **Visible text:** ${i.visible_text}`);
      lines.push(`- **Source line:** ${i.source_line ? `\`${i.source_line}\`` : "_not matched in source file_"}`);
      lines.push("");
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## All current issues");
  lines.push("");

  const subjectOrder = ["math", "geometry", "science", "hebrew", "english", "moledet", "geography"];
  for (const subject of subjectOrder) {
    const group = issues.filter((i) => i.subject === subject);
    if (!group.length) continue;
    lines.push(`### ${subject} (${group.length})`);
    lines.push("");
    for (const i of group) {
      const sec = i.section_number != null ? `§${i.section_number}` : "§—";
      const secTitle = i.section_title ? ` ${i.section_title}` : "";
      lines.push(`- **${i.grade}/${i.page_id}** ${sec}${secTitle} — **${i.status}**`);
      lines.push(`  - File: \`${i.source_file || "(none)"}\``);
      lines.push(`  - Patterns: ${matchedPatternLabels(i.matched_patterns)}`);
      lines.push(`  - Visible: ${i.visible_text}`);
      if (i.source_line) lines.push(`  - Source: \`${i.source_line}\``);
    }
    lines.push("");
  }

  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(MD_OUT, lines.join("\n"), "utf8");

  console.log(JSON.stringify({
    output: MD_OUT,
    total: issues.length,
    bySubject,
    byStatus,
    needsFixCount: needsFix.length,
    topNeedsFix: needsFix.slice(0, 30).map((i) => ({
      file: i.source_file,
      text: i.visible_text,
      subject: i.subject,
      grade: i.grade,
      page_id: i.page_id,
    })),
  }, null, 2));
}

main();
