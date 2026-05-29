#!/usr/bin/env node
/**
 * QA guard: flags non-semantic JSX opening tags with onClick but no cursor/accessibility markers.
 * Run: node scripts/qa/scan-clickable-cursor.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKIP = /(node_modules|review-packages|\.next|docs[\\/]school-portal)/;
const EXT = /\.(js|jsx|tsx)$/;
const SCAN_DIRS = ["pages", "components", "lib"];
const NON_SEMANTIC = new Set(["div", "span", "li", "tr", "td", "article", "section", "p", "h1", "h2", "h3", "h4"]);
const MARKERS =
  /cursor-pointer|cursor-not-allowed|data-clickable|role=["']button["']|role=["']link["']|SCHOOL_PORTAL_BTN_CURSOR/;
const BACKDROP =
  /\bfixed\s+inset-0\b|aria-hidden|inset-0\s+bg-black|bg-black\/\d+.*inset-0|stopPropagation|learningModalOverlay|learningModalPanel|role=["']presentation["']|closeExplanationModal|closeModal|setOpen\(false\)|onClose\b/;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP.test(full)) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (EXT.test(entry.name)) files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function parseJsxOpenTag(content, startIndex) {
  let i = startIndex + 1;
  while (i < content.length && /[\w.-]/.test(content[i])) i += 1;
  const tag = content.slice(startIndex + 1, i);
  while (i < content.length) {
    const ch = content[i];
    if (ch === ">" && content[i - 1] !== "=") {
      const attrs = content.slice(startIndex + 1 + tag.length, i);
      return { tag, attrs, end: i + 1 };
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < content.length && content[i] !== quote) {
        if (content[i] === "\\") i += 1;
        i += 1;
      }
    } else if (ch === "{") {
      let depth = 1;
      i += 1;
      while (i < content.length && depth > 0) {
        if (content[i] === "{") depth += 1;
        else if (content[i] === "}") depth -= 1;
        i += 1;
      }
      continue;
    }
    i += 1;
  }
  return null;
}

function scanFile(file) {
  const content = fs.readFileSync(file, "utf8");
  const hits = [];
  let idx = 0;
  while (idx < content.length) {
    const lt = content.indexOf("<", idx);
    if (lt === -1) break;
    if (content[lt + 1] === "/" || content[lt + 1] === "!") {
      idx = lt + 1;
      continue;
    }
    const parsed = parseJsxOpenTag(content, lt);
    if (!parsed) break;
    idx = parsed.end;
    const lower = parsed.tag.toLowerCase();
    if (!NON_SEMANTIC.has(lower)) continue;
    const { attrs } = parsed;
    if (!/\bonClick\b/.test(attrs)) continue;
    if (MARKERS.test(attrs)) continue;
    if (BACKDROP.test(attrs)) continue;
    const line = content.slice(0, lt).split("\n").length;
    hits.push({
      file: rel(file),
      line,
      tag: lower,
      snippet: `<${parsed.tag}${attrs}>`.replace(/\s+/g, " ").slice(0, 160),
    });
  }
  return hits;
}

const warnOnly = process.argv.includes("--warn-only");
const allHits = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    allHits.push(...scanFile(file));
  }
}

if (allHits.length === 0) {
  console.log("scan-clickable-cursor: OK — no suspicious non-semantic onClick without cursor markers.");
  process.exit(0);
}

console.log(`scan-clickable-cursor: ${allHits.length} suspicious hit(s):\n`);
for (const h of allHits) {
  console.log(`${h.file}:${h.line} <${h.tag}>`);
  console.log(`  ${h.snippet}\n`);
}

process.exit(warnOnly ? 0 : 1);
