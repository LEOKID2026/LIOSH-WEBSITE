#!/usr/bin/env node
/**
 * Strict scanner for free mixed Hebrew + math strings in the learning books.
 *
 * Every math/geometry draft line that mixes Hebrew with a math symbol is pushed
 * through the SAME render pipeline the UI uses (lib/learning-book/simulate-book-bidi-runs.js)
 * and checked for real BiDi breakage:
 *   - equation-in-prose      : an equation stranded inside an RTL prose run (gluing risk)
 *   - hebrew-phrase-in-math  : 2+ non-place-value Hebrew words trapped in an LTR island
 *
 * A "real hit" must be one of:
 *   - converted to structured runs (fix the content / renderer), OR
 *   - documented as pure math only, OR
 *   - listed in ALLOWLIST below as explicitly out-of-scope (with a reason).
 *
 * Exits non-zero when any un-allowlisted real hit remains, so it can gate CI.
 *
 * Usage: node scripts/scan-mixed-math-strings.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";
import { splitBookMarkdownBlocks } from "../lib/learning-book/book-markdown-blocks.js";
import { detectBookLineBidiBreakage } from "../lib/learning-book/simulate-book-bidi-runs.js";
import { flattenMixedHebrewMathVisibleText } from "../lib/learning-book/book-visible-text-render.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SCAN_ROOTS = [
  path.join(ROOT, "docs/learning-book/math"),
  path.join(ROOT, "docs/learning-book/geometry"),
];

const HEBREW = /[\u0590-\u05FF]/;
const MATH_OP = /\d\s*[+\-−×÷=<>]\s*\d|\d\s*[+\-−×÷=<>]|[+\-−×÷=<>]\s*\d/;
const FORBIDDEN_VISIBLE_PATTERNS = [
  { label: "5030", re: /5030/u },
  { label: "3020", re: /3020/u },
  { label: "4060", re: /4060/u },
  { label: "5950", re: /5950/u },
  { label: "4440", re: /4440/u },
  { label: "2552", re: /2552/u },
  { label: "246", re: /246\s*\+\s*6/u },
  { label: "137", re: /137\s*\+\s*6/u },
  { label: "24זוגי", re: /24זוגי/u },
];

/**
 * Explicitly out-of-scope lines. Each entry MUST carry a reason. Keep empty —
 * a non-empty allowlist is a signal that something needs a real fix instead.
 * @type {{ file: string, line: string, reason: string }[]}
 */
const ALLOWLIST = [];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith(".md") && p.includes(`${path.sep}drafts${path.sep}`)) {
      acc.push(p);
    }
  }
  return acc;
}

function isAllowlisted(rel, line) {
  return ALLOWLIST.some((a) => a.file === rel && a.line === line.trim());
}

const files = [];
for (const root of SCAN_ROOTS) walk(root, files);

const hits = [];
const forbiddenHits = [];
let mixedCount = 0;
for (const filePath of files) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  let page;
  try {
    page = parseLearningPageMarkdown(
      fs.readFileSync(filePath, "utf8"),
      path.basename(filePath, ".md")
    );
  } catch {
    continue;
  }
  for (const section of page.sections) {
    for (const block of splitBookMarkdownBlocks(section.body)) {
      const lines =
        block.type === "prose"
          ? block.lines
          : block.type === "ul" || block.type === "ol"
            ? block.items.flat()
            : [];
      for (const line of lines) {
        const t = String(line || "").trim();
        if (!t) continue;

        const visible = flattenMixedHebrewMathVisibleText(t);
        for (const bad of FORBIDDEN_VISIBLE_PATTERNS) {
          if (bad.re.test(t) || bad.re.test(visible)) {
            forbiddenHits.push({
              rel,
              section: section.number,
              pattern: bad.label,
              t,
              visible,
            });
          }
        }

        if (HEBREW.test(t) && MATH_OP.test(t)) {
          mixedCount += 1;
          const breakage = detectBookLineBidiBreakage(t);
          if (breakage && !isAllowlisted(rel, t)) {
            hits.push({ rel, section: section.number, t, breakage });
          }
        }
      }
    }
  }
}

console.log(`Scanned files            : ${files.length}`);
console.log(`Mixed Hebrew+math lines  : ${mixedCount}`);
console.log(`Allowlisted (out-of-scope): ${ALLOWLIST.length}`);
console.log(`REAL hits                : ${hits.length}`);
console.log(`Forbidden visible hits   : ${forbiddenHits.length}`);

if (hits.length || forbiddenHits.length) {
  console.log("");
  for (const h of forbiddenHits) {
    console.log(`  [${h.rel} §${h.section}] forbidden-visible:${h.pattern}`);
    console.log(`     visible: ${h.visible}`);
    console.log(`     line   : ${h.t}`);
  }
  for (const h of hits) {
    console.log(`  [${h.rel} §${h.section}] ${h.breakage.kind}`);
    console.log(`     run : ${h.breakage.run}`);
    console.log(`     line: ${h.t}`);
  }
  console.error("\nFAIL: free mixed Hebrew+math strings detected.");
  process.exit(1);
}

console.log("\nPASS: 0 free mixed Hebrew+math strings.");
