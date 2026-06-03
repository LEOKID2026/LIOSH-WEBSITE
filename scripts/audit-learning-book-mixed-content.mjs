/**
 * Scan all learning-book drafts for mixed Hebrew/math/symbol patterns.
 * Classifies each line for renderer handling requirements.
 *
 * Run: node scripts/audit-learning-book-mixed-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";
import { splitBookMarkdownBlocks } from "../lib/learning-book/book-markdown-blocks.js";
import { splitTextAndMathRuns, isFormulaLikeBody } from "../lib/learning-book/book-math-display.js";
import { hasProseBetweenMathRuns } from "../lib/learning-book/book-bidi-render.js";
import { isPipeTableBlock } from "../lib/learning-book/book-pipe-table.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** @type {string[]} */
const SCAN_ROOTS = [
  path.join(ROOT, "docs/learning-book/math"),
  path.join(ROOT, "docs/learning-book/geometry"),
];

const HEBREW = /[\u0590-\u05FF]/;
const MATH_SIGNAL = /[+−\-=×÷<>?_]|\d\s*[+−\-=×÷<>]/;
const PIPE_ROW = /^\|.+\|$/;

/**
 * @typedef {"safe" | "needs_inline_math_isolation" | "needs_table_rendering" | "needs_manual_review" | "unsupported_ambiguous"} LineClassification
 */

/**
 * @param {string} line
 * @returns {LineClassification}
 */
export function classifyMixedLine(line) {
  const input = String(line || "").trim();
  if (!input || input.startsWith("#") || input.startsWith("**Source")) {
    return "safe";
  }

  if (isPipeTableBlock([input])) {
    return "needs_table_rendering";
  }

  const hasHebrew = HEBREW.test(input);
  const hasDigit = /\d/.test(input);
  const hasMath = MATH_SIGNAL.test(input);

  if (!hasHebrew && !hasDigit) return "safe";
  if (hasHebrew && !hasDigit && !hasMath) return "safe";
  if (hasDigit && !hasHebrew && hasMath) return "safe";

  if (PIPE_ROW.test(input) && input.includes("|")) {
    return "needs_table_rendering";
  }

  if (isFormulaLikeBody(input)) {
    return "needs_inline_math_isolation";
  }

  const parts = splitTextAndMathRuns(input);
  const mathParts = parts.filter((p) => p.type === "math");
  const textWithMath = parts.some(
    (p) => p.type === "text" && /\d\s*[+−\-=×÷<>]\s*\d/.test(p.value)
  );

  if (textWithMath) {
    return "unsupported_ambiguous";
  }

  if (mathParts.length && hasHebrew) {
    if (hasProseBetweenMathRuns(input)) {
      return "needs_inline_math_isolation";
    }
    if (/(?:^|[\s,])([ובלשכה])-\d/.test(input)) {
      return "needs_inline_math_isolation";
    }
    if (mathParts.length >= 1) {
      return "needs_inline_math_isolation";
    }
  }

  if (/נוסחה:\s*[\u0590-\u05FF].*[=×÷]/.test(input)) {
    return "needs_manual_review";
  }

  if (/\d[\d,]*,\s*[+−\-=×÷]/.test(input)) {
    return "needs_manual_review";
  }

  return "safe";
}

function walkMarkdown(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMarkdown(p, acc);
    else if (ent.name.endsWith(".md") && p.includes(`${path.sep}drafts${path.sep}`)) {
      acc.push(p);
    }
  }
  return acc;
}

/** @type {string[]} */
const files = [];
for (const root of SCAN_ROOTS) {
  walkMarkdown(root, files);
}

/** @type {Record<LineClassification, { file: string, section: number, line: number, text: string }[]>} */
const byClass = {
  safe: [],
  needs_inline_math_isolation: [],
  needs_table_rendering: [],
  needs_manual_review: [],
  unsupported_ambiguous: [],
};

let totalLines = 0;

for (const filePath of files) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const raw = fs.readFileSync(filePath, "utf8");
  const pageId = path.basename(filePath, ".md");
  let page;
  try {
    page = parseLearningPageMarkdown(raw, pageId);
  } catch {
    continue;
  }

  for (const section of page.sections) {
    const blocks = splitBookMarkdownBlocks(section.body);
    let lineNum = 0;

    for (const block of blocks) {
      if (block.type === "pipe_table") {
        totalLines += 1;
        lineNum += 1;
        byClass.needs_table_rendering.push({
          file: rel,
          section: section.number,
          line: lineNum,
          text: `[pipe table ${block.rows.length} rows]`,
        });
        continue;
      }

      const lines =
        block.type === "prose"
          ? block.lines
          : block.type === "ul" || block.type === "ol"
            ? block.items.flat()
            : block.type === "code"
              ? String(block.content || "").split("\n").filter(Boolean)
              : [];

      for (const line of lines) {
        totalLines += 1;
        lineNum += 1;
        const cls = classifyMixedLine(line);
        if (cls !== "safe") {
          byClass[cls].push({
            file: rel,
            section: section.number,
            line: lineNum,
            text: line.trim().slice(0, 120),
          });
        } else {
          byClass.safe.push({
            file: rel,
            section: section.number,
            line: lineNum,
            text: "",
          });
        }
      }
    }
  }
}

const reportPath = path.join(ROOT, "docs/learning-book/LEARNING_BOOK_MIXED_CONTENT_AUDIT.md");
const report = `# Learning Book Mixed Content Audit

Generated: ${new Date().toISOString()}

## Summary

| Classification | Count |
|----------------|------:|
| safe | ${byClass.safe.length} |
| needs_inline_math_isolation | ${byClass.needs_inline_math_isolation.length} |
| needs_table_rendering | ${byClass.needs_table_rendering.length} |
| needs_manual_review | ${byClass.needs_manual_review.length} |
| unsupported_ambiguous | ${byClass.unsupported_ambiguous.length} |

**Files scanned:** ${files.length}  
**Lines scanned:** ${totalLines}

## needs_table_rendering

${byClass.needs_table_rendering.map((r) => `- \`${r.file}\` §${r.section}: ${r.text}`).join("\n") || "_none_"}

## needs_manual_review

${byClass.needs_manual_review.slice(0, 40).map((r) => `- \`${r.file}\` §${r.section}: ${r.text}`).join("\n") || "_none_"}
${byClass.needs_manual_review.length > 40 ? `\n_…and ${byClass.needs_manual_review.length - 40} more_` : ""}

## unsupported_ambiguous

${byClass.unsupported_ambiguous.map((r) => `- \`${r.file}\` §${r.section}: ${r.text}`).join("\n") || "_none_"}

## needs_inline_math_isolation (sample)

${byClass.needs_inline_math_isolation.slice(0, 30).map((r) => `- \`${r.file}\` §${r.section}: ${r.text}`).join("\n") || "_none_"}
${byClass.needs_inline_math_isolation.length > 30 ? `\n_…and ${byClass.needs_inline_math_isolation.length - 30} more (handled by renderer)_` : ""}
`;

fs.writeFileSync(reportPath, report, "utf8");

console.log(`Audit → ${path.relative(ROOT, reportPath)}`);
console.log(
  `Scanned ${files.length} files, ${totalLines} lines — ` +
    `isolation: ${byClass.needs_inline_math_isolation.length}, ` +
    `tables: ${byClass.needs_table_rendering.length}, ` +
    `review: ${byClass.needs_manual_review.length}, ` +
    `ambiguous: ${byClass.unsupported_ambiguous.length}`
);

if (byClass.unsupported_ambiguous.length > 0) {
  process.exit(1);
}
