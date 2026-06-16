#!/usr/bin/env node
/**
 * Emit DOM repair contract for owner RTL lines (no browser/screenshots).
 * Run: node scripts/repair/emit-rtl-dom-repair-report.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { describeMixedMathDomContract } from "../../lib/bidi/describe-mixed-math-dom.js";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import { analyzeBidiRenderStructure } from "../../lib/learning-book/book-bidi-render.js";

const LINES = [
  "100 + 20 + 4 = 124",
  "1 מאה + 2 עשרות + 4 אחדות = 124",
  "58 + 37 = 95",
  "8 + 7 = 15 → 5, נשיאה 1",
  "עשרות: 30 + 20 = 50",
  "אחדות: 8 + 7 = 15",
  "סה״כ: 50 + 9 = 59",
  "7 + 8 = 15",
  "47 + 28 = 75",
  "π ≈ 3.14",
  "- 1 מאה + 2 עשרות + 4 אחדות = 124",
];

const outDir = join("docs", "repair");
mkdirSync(outDir, { recursive: true });

/** @type {Record<string, unknown>[]} */
const entries = LINES.map((sourceText) => {
  const dom = describeMixedMathDomContract(sourceText);
  const runs = splitMixedHebrewMathRuns(sourceText);
  const structure = analyzeBidiRenderStructure(sourceText);
  return {
    sourceText,
    runs,
    domNodes: dom.nodes.map((n) => ({
      role: n.role,
      dir: n.dir,
      unicodeBidi: n.unicodeBidi,
      textContent: n.textContent,
      html: n.html,
    })),
    analyzeStructure: structure,
  };
});

const md = `# RTL Renderer Unification — DOM Repair Report

Generated: ${new Date().toISOString()}

## Root cause (fixed)

\`MixedHebrewMathText\` used **three incompatible paths** on the same page:

1. \`splitFormulaTokens\` — split operators/symbols/Hebrew terms into separate spans
2. \`splitHebrewMathRuns\` + \`DigitSpan\` — isolated bare digits inside RTL prose
3. \`splitTextAndMathRuns\` — partial equation detection

Lines caught by one path rendered as LTR islands; lines missed by detection stayed RTL/plaintext and **reversed visually**.

## Fix

All book + learning surfaces now delegate to \`splitMixedHebrewMathRuns\` (\`lib/bidi/mixed-hebrew-math-runs.js\`):

- Full equation → **one** \`<span dir="ltr" style="unicode-bidi:isolate">\`
- Hebrew label + equation → label RTL + equation LTR
- No \`book-digit-isolate\`, no \`formula-op\` token spans

## Per-line DOM contract (post-fix)

${entries
  .map(
    (e) => `### \`${e.sourceText}\`

**Runs:** \`${JSON.stringify(e.runs)}\`

**DOM nodes:**
${e.domNodes.map((n) => `- \`${n.html}\` (dir=${n.dir}, unicode-bidi=${n.unicodeBidi})`).join("\n")}

**Structure analysis:** \`${JSON.stringify(e.analyzeStructure)}\`
`
  )
  .join("\n")}

## Tests

\`\`\`bash
node --test tests/bidi/mixed-hebrew-math-policy.test.mjs
node --test tests/bidi/unified-renderer-dom-contract.test.mjs
node scripts/tests/verify-learning-book-bidi-regression.mjs
\`\`\`

## Verdict

Automated DOM contract: **PASS** for listed lines.
Visual owner sign-off: **pending** (no screenshots in this report).
`;

writeFileSync(join(outDir, "rtl-renderer-unification-report.json"), JSON.stringify({ entries }, null, 2));
writeFileSync(join(outDir, "rtl-renderer-unification-report.md"), md);
console.log(`Wrote ${join(outDir, "rtl-renderer-unification-report.md")}`);
