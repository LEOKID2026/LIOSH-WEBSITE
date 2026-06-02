/**
 * Scan + optional auto-fix fragile RTL/LTR patterns in Learning Book drafts.
 * Run: node scripts/audit-learning-book-rtl-content.mjs
 * Apply: node scripts/audit-learning-book-rtl-content.mjs --write
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  auditLineRisks,
  normalizeLearningBookMarkdown,
  RTL_CONTENT_RISK_PATTERNS,
} from "../lib/learning-book/book-rtl-content-normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const WRITE = process.argv.includes("--write");

/** @type {string[]} */
const SCAN_ROOTS = [
  path.join(ROOT, "docs/learning-book/math"),
  path.join(ROOT, "docs/learning-book/geometry"),
];

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

/** @type {{ file: string, line: number, text: string, risks: string[] }[]} */
const riskyLines = [];
/** @type {{ file: string, changes: { before: string, after: string[] }[] }[]} */
const autoFixed = [];
/** @type {{ file: string, line: number, text: string, risks: string[] }[]} */
const remainingRisky = [];

let totalLines = 0;

for (const filePath of files) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  totalLines += lines.length;

  for (let i = 0; i < lines.length; i += 1) {
    const risks = auditLineRisks(lines[i]);
    if (risks.length) {
      riskyLines.push({ file: rel, line: i + 1, text: lines[i].trim(), risks });
    }
  }

  const normalized = normalizeLearningBookMarkdown(raw);
  if (normalized.changes.length) {
    autoFixed.push({ file: rel, changes: normalized.changes });
    if (WRITE) {
      fs.writeFileSync(filePath, normalized.markdown, "utf8");
    }
  }

  const afterRaw = WRITE ? normalized.markdown : raw;
  const afterNorm = WRITE ? afterRaw : normalizeLearningBookMarkdown(raw).markdown;
  const afterLines = afterNorm.split(/\r?\n/);
  for (let i = 0; i < afterLines.length; i += 1) {
    const risks = auditLineRisks(afterLines[i]);
    if (risks.length) {
      remainingRisky.push({
        file: rel,
        line: i + 1,
        text: afterLines[i].trim(),
        risks,
      });
    }
  }
}

/** @type {{ before: string, after: string[] }[]} */
const exampleChanges = autoFixed
  .flatMap((f) => f.changes)
  .slice(0, 12);

const reportPath = path.join(
  ROOT,
  "docs/learning-book/LEARNING_BOOK_RTL_CONTENT_AUDIT.md"
);

const report = `# Learning Book RTL Content Audit

Generated: ${new Date().toISOString().slice(0, 10)}

## Summary

| Metric | Count |
|--------|------:|
| Files scanned | ${files.length} |
| Total lines scanned | ${totalLines} |
| Risky lines (before) | ${riskyLines.length} |
| Files with auto-fixes | ${autoFixed.length} |
| Auto-fix operations | ${autoFixed.reduce((n, f) => n + f.changes.length, 0)} |
| Risky lines (after ${WRITE ? "write" : "dry-run"}) | ${remainingRisky.length} |

Mode: **${WRITE ? "WRITE applied" : "dry-run only"}**

## Risk pattern definitions

${RTL_CONTENT_RISK_PATTERNS.map((p) => `- \`${p.id}\` — ${p.label}`).join("\n")}

## Auto-fix examples (before → after)

${exampleChanges.length ? exampleChanges.map((c) => `### Before\n\`\`\`\n${c.before}\n\`\`\`\n\nAfter:\n${c.after.map((a) => `- \`${a}\``).join("\n")}\n`).join("\n") : "_No auto-fixes matched._"}

## Files auto-fixed

${autoFixed.length ? autoFixed.map((f) => `- \`${f.file}\` (${f.changes.length} change(s))`).join("\n") : "_None._"}

## Remaining risky lines (manual review)

${remainingRisky.length ? remainingRisky.slice(0, 40).map((r) => `- \`${r.file}:${r.line}\` [${r.risks.join(", ")}] — ${r.text}`).join("\n") + (remainingRisky.length > 40 ? `\n\n_…and ${remainingRisky.length - 40} more._` : "") : "_None after normalization._"}

## Content rules applied

1. Remainder phrasing: \`155 ושארית 7\` (not \`155 שארית 7\`)
2. No child-facing verbal formulas like \`מחולק = (מחלק × מנה) + שארית\`
3. Split comma-after-equation Hebrew (\`, ונשאר\`) into separate lines
4. Split chained comma equations (\`522, + 1 =\`) into separate math lines
5. Replace geometry verbal \`נוסחה:\` lines with numeric examples where matched

`;

fs.writeFileSync(reportPath, report, "utf8");

console.log(`RTL content audit — ${files.length} files, ${riskyLines.length} risky lines (before)`);
console.log(`Auto-fix candidates: ${autoFixed.length} files, ${autoFixed.reduce((n, f) => n + f.changes.length, 0)} operations`);
console.log(`Remaining risky (after): ${remainingRisky.length}`);
console.log(`Report: ${path.relative(ROOT, reportPath)}`);
if (!WRITE) {
  console.log("Run with --write to apply normalization to draft files.");
} else {
  console.log("Normalization written to draft files.");
}
