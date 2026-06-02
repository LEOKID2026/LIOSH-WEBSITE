/**
 * Learning Book Hebrew text spacing verification + audit report.
 * Run: node scripts/verify-learning-book-text-spacing.mjs
 * Browser QA: SPACING_QA_BASE_URL=http://127.0.0.1:3000 node scripts/verify-learning-book-text-spacing.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../lib/learning-book/math-g1-registry.js";
import { MATH_G2_PAGE_ORDER } from "../lib/learning-book/math-g2-registry.js";
import { MATH_G3_PAGE_ORDER } from "../lib/learning-book/math-g3-registry.js";
import { MATH_G4_PAGE_ORDER } from "../lib/learning-book/math-g4-registry.js";
import { MATH_G5_PAGE_ORDER } from "../lib/learning-book/math-g5-registry.js";
import { MATH_G6_PAGE_ORDER } from "../lib/learning-book/math-g6-registry.js";
import { GEOMETRY_G1_PAGE_ORDER } from "../lib/learning-book/geometry-g1-registry.js";
import { GEOMETRY_G2_PAGE_ORDER } from "../lib/learning-book/geometry-g2-registry.js";
import { GEOMETRY_G3_PAGE_ORDER } from "../lib/learning-book/geometry-g3-registry.js";
import { GEOMETRY_G4_PAGE_ORDER } from "../lib/learning-book/geometry-g4-registry.js";
import { GEOMETRY_G5_PAGE_ORDER } from "../lib/learning-book/geometry-g5-registry.js";
import { GEOMETRY_G6_PAGE_ORDER } from "../lib/learning-book/geometry-g6-registry.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  detectSpacingRegression,
  flattenBookSectionVisibleLines,
  flattenMixedHebrewMathVisibleText,
} from "../lib/learning-book/book-visible-text-render.js";
import { stripStrayMarkdown } from "../lib/learning-book/parse-inline-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const baseUrl = (
  process.env.SPACING_QA_BASE_URL ||
  process.env.BIDI_QA_BASE_URL ||
  ""
).replace("127.0.0.1", "localhost");

/** @type {{ subject: string, grade: string, order: string[] }[]} */
const CATALOG = [
  { subject: "math", grade: "g1", order: MATH_G1_PAGE_ORDER },
  { subject: "math", grade: "g2", order: MATH_G2_PAGE_ORDER },
  { subject: "math", grade: "g3", order: MATH_G3_PAGE_ORDER },
  { subject: "math", grade: "g4", order: MATH_G4_PAGE_ORDER },
  { subject: "math", grade: "g5", order: MATH_G5_PAGE_ORDER },
  { subject: "math", grade: "g6", order: MATH_G6_PAGE_ORDER },
  { subject: "geometry", grade: "g1", order: GEOMETRY_G1_PAGE_ORDER },
  { subject: "geometry", grade: "g2", order: GEOMETRY_G2_PAGE_ORDER },
  { subject: "geometry", grade: "g3", order: GEOMETRY_G3_PAGE_ORDER },
  { subject: "geometry", grade: "g4", order: GEOMETRY_G4_PAGE_ORDER },
  { subject: "geometry", grade: "g5", order: GEOMETRY_G5_PAGE_ORDER },
  { subject: "geometry", grade: "g6", order: GEOMETRY_G6_PAGE_ORDER },
];

const KNOWN_GLUED_PATTERNS = [
  "קוישר",
  "נקודותמסומנות",
  "חציימינה",
  "מעלהקו",
  "מספרגדוליותר",
  "צעד־צעדימינה",
  "קדימה=ימינה",
  "היאהולכת",
];

const CANONICAL_CASES = [
  { line: "קו ישר עם נקודות מסומנות", mustInclude: ["קו ישר", "נקודות מסומנות"] },
  { line: "חץ ימינה מעל הקו", mustInclude: ["חץ ימינה", "מעל הקו"] },
  {
    line: "קדימה = ימינה = מספר גדול יותר",
    mustInclude: ["קדימה =", "ימינה =", "מספר גדול יותר"],
  },
  { line: "היא הולכת צעד-צעד ימינה", mustInclude: ["היא הולכת", "צעד-צעד", "ימינה"] },
  { line: "מספר גדול יותר", mustInclude: ["מספר גדול יותר"] },
  { line: "חילוק במחלק דו־ספרתי", mustInclude: ["חילוק", "דו־ספרתי"] },
  { line: "155 ושארית 7", mustInclude: ["155", "ושארית 7"] },
  {
    line: "1,247 ÷ 8 = 155 ושארית 7",
    mustInclude: ["1,247 ÷ 8 = 155", "ושארית 7"],
  },
];

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

/** @type {{ file: string, section: number, source: string, rendered: string, issues: string[] }[]} */
const suspicious = [];

let totalFiles = 0;
let totalPages = 0;
let totalSections = 0;
let totalLines = 0;

function draftPath(subject, grade, pageId) {
  return path.join(
    ROOT,
    `docs/learning-book/${subject}/${grade}/drafts/${pageId}.md`
  );
}

function scanLine(source, rendered, context) {
  totalLines += 1;

  if (/\*\*/.test(rendered) || /(?<!\*)\*(?!\*)/.test(rendered) || /`/.test(rendered)) {
    fail(`${context}: markdown artifact in rendered text: ${rendered}`);
  }

  for (const bad of KNOWN_GLUED_PATTERNS) {
    if (rendered.includes(bad)) {
      fail(`${context}: known glued pattern "${bad}" in: ${rendered}`);
    }
  }

  const issues = detectSpacingRegression(source, rendered);
  const ignorableWhitespace =
    issues.length === 1 &&
    issues[0] === "whitespace_only_change" &&
    source.replace(/\s+/g, " ").trim() === rendered.replace(/\s+/g, " ").trim();
  if (issues.length && !ignorableWhitespace) {
    suspicious.push({
      file: context,
      section: 0,
      source,
      rendered,
      issues,
    });
    fail(
      `${context}: spacing regression [${issues.join(", ")}]\n  source: ${source}\n  rendered: ${rendered}`
    );
  }
}

for (const sample of CANONICAL_CASES) {
  const rendered = flattenMixedHebrewMathVisibleText(sample.line);
  for (const part of sample.mustInclude) {
    if (!rendered.includes(part)) {
      fail(`canonical "${sample.line}" missing "${part}" in "${rendered}"`);
    }
  }
  for (const bad of KNOWN_GLUED_PATTERNS) {
    if (rendered.includes(bad)) {
      fail(`canonical "${sample.line}" contains glued pattern "${bad}"`);
    }
  }
}

for (const { subject, grade, order } of CATALOG) {
  for (const pageId of order) {
    const filePath = draftPath(subject, grade, pageId);
    if (!fs.existsSync(filePath)) continue;

    totalFiles += 1;
    totalPages += 1;
    const rel = `${subject}/${grade}/${pageId}`;
    const raw = fs.readFileSync(filePath, "utf8");
    const page = parseLearningPageMarkdown(raw, pageId);

    for (const section of page.sections) {
      totalSections += 1;
      const ctx = `${rel} §${section.number}`;
      const { lines, diagramLines } = flattenBookSectionVisibleLines(section.body);

      for (const row of lines) {
        scanLine(row.source, row.rendered, ctx);
      }
      for (const dl of diagramLines) {
        totalLines += 1;
        for (const bad of KNOWN_GLUED_PATTERNS) {
          if (dl.includes(bad)) {
            fail(`${ctx} diagram: glued pattern "${bad}" in: ${dl}`);
          }
        }
      }
    }

    const cardTitle = stripStrayMarkdown(page.title || pageId);
    const cardRendered = flattenMixedHebrewMathVisibleText(cardTitle);
    if (cardTitle.replace(/\s+/g, " ") !== cardRendered.replace(/\s+/g, " ")) {
      fail(`${rel} topic title spacing: source="${cardTitle}" rendered="${cardRendered}"`);
    }
  }
}

const beforeAfterExamples = [
  {
    label: "Formula-like equals chain (diagram caption)",
    before: "קדימה=ימינה=מספרגדוליותר",
    after: flattenMixedHebrewMathVisibleText("קדימה = ימינה = מספר גדול יותר"),
  },
  {
    label: "Word-hyphen prose misclassified as formula",
    before: "היאהולכתצעד-צעדימינה",
    after: flattenMixedHebrewMathVisibleText("היא הולכת צעד-צעד ימינה"),
  },
  {
    label: "List item Hebrew phrase",
    before: "קוישרעםנקודותמסומנות",
    after: flattenMixedHebrewMathVisibleText("קו ישר עם נקודות מסומנות"),
  },
  {
    label: "Geometry-style label phrase",
    before: "חציימינהמעלהקו",
    after: flattenMixedHebrewMathVisibleText("חץ ימינה מעל הקו"),
  },
];

const auditPath = path.join(
  ROOT,
  "docs/learning-book/LEARNING_BOOK_TEXT_SPACING_AUDIT.md"
);

const audit = `# Learning Book Text Spacing Audit

Generated: ${new Date().toISOString().slice(0, 10)}

## Summary

| Metric | Count |
|--------|------:|
| Files scanned | ${totalFiles} |
| Pages scanned | ${totalPages} |
| Sections scanned | ${totalSections} |
| Visible lines checked | ${totalLines} |
| Suspicious spacing issues | ${suspicious.length} |
| Test failures | ${failures} |

## Root cause

The RTL/LTR renderer treated some **plain Hebrew prose** as **formula-like bodies** (\`isFormulaLikeBody\`):

1. **ASCII hyphen** in patterns like \`צעד-צעד\` matched formula operators, routing prose into \`splitFormulaTokens\`.
2. **Equals chains** like \`קדימה = ימינה = מספר גדול יותר\` were classified as formulas despite being child-facing explanations.
3. \`splitFormulaTokens\` used \`.trim()\` on chunks and **discarded whitespace tokens**, so adjacent \`<span>\` / \`<bdi>\` runs glued in the browser.
4. \`renderContentRuns\` / \`renderMixedBodyInner\` did not re-insert **source gaps** between digit/math/text runs, so \`unicode-bidi: isolate\` spans could collapse inter-word spaces.

**Source markdown was correct** for the known screenshot examples; the bug was **renderer-side**.

## Fix applied

- Tightened \`isFormulaLikeBody\` (exclude word hyphens and multi-word explanatory equals chains).
- \`splitFormulaTokens\` preserves whitespace as \`space\` tokens; no \`.trim()\` on Hebrew chunks.
- \`MixedHebrewMathText\` re-inserts source gaps between runs/segments and renders formula space tokens.
- Added \`book-visible-text-render.js\` for export + regression simulation.

## Known glued patterns checked

${KNOWN_GLUED_PATTERNS.map((p) => `- \`${p}\``).join("\n")}

## Before / after examples

${beforeAfterExamples
  .map(
    (ex) => `### ${ex.label}

| | Text |
|--|------|
| Before (broken) | \`${ex.before}\` |
| After (fixed renderer) | \`${ex.after}\` |`
  )
  .join("\n\n")}

## Files / pages with suspicious spacing

${
  suspicious.length
    ? suspicious
        .slice(0, 50)
        .map(
          (s) =>
            `- \`${s.file}\` [${s.issues.join(", ")}]\n  - source: ${s.source}\n  - rendered: ${s.rendered}`
        )
        .join("\n") +
      (suspicious.length > 50 ? `\n\n_…and ${suspicious.length - 50} more._` : "")
    : "_None — all scanned lines preserve source spacing._"
}

## Affected renderer files

- \`components/learning-book/MixedHebrewMathText.js\`
- \`lib/learning-book/book-math-display.js\`
- \`lib/learning-book/book-visible-text-render.js\` (new simulation helper)

## Verification

Run \`node scripts/verify-learning-book-text-spacing.mjs\` — failures: **${failures}**
`;

fs.writeFileSync(auditPath, audit, "utf8");

async function captureScreenshots() {
  if (!baseUrl) return [];

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    fail("Playwright not installed for browser QA");
    return [];
  }

  const { tryLoadE2EStudentEnvFromDotenv, applyStudentSessionFromLogin } =
    await import("./e2e-lib/hebrew-e2e-student-auth.mjs");
  tryLoadE2EStudentEnvFromDotenv();

  const screenshotDir = path.join(ROOT, "tmp/text-spacing-qa-screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });
  /** @type {string[]} */
  const paths = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  if (process.env.E2E_STUDENT_PIN) {
    try {
      await applyStudentSessionFromLogin(context, baseUrl);
    } catch {
      try {
        const { authenticateStudent } = await import(
          "./virtual-student-qa/lib/student-auth.mjs"
        );
        await authenticateStudent({
          context,
          page,
          baseUrl,
          mode: "ui",
          account: {
            label: "spacing-qa",
            username: process.env.E2E_STUDENT_USERNAME,
            code: process.env.E2E_STUDENT_CODE,
            pin: process.env.E2E_STUDENT_PIN,
          },
          log: () => {},
        });
      } catch (e) {
        fail(`student auth for G1 book QA: ${e.message}`);
      }
    }
  }

  /** @type {{ url: string, section: number, name: string, checks?: string[] }[]} */
  const targets = [
    {
      url: `${baseUrl}/learning/book/math/g1/ns_counting_forward`,
      section: 3,
      name: "g1-number-line-section3-mobile.png",
      checks: ["קו ישר", "נקודות מסומנות", "קדימה = ימינה"],
    },
    {
      url: `${baseUrl}/learning/book/math/g5/div_with_remainder`,
      section: 2,
      name: "g5-div_with_remainder-section2-mobile.png",
      checks: ["155 ושארית 7", "1,247 ÷ 8"],
    },
    {
      url: `${baseUrl}/learning/book/geometry/g4/shapes_basic_properties_angles`,
      section: 3,
      name: "geometry-labels-mobile.png",
    },
  ];

  async function navigateToSection(sectionNumber) {
    for (let i = 0; i < 8; i += 1) {
      const prev = page.getByRole("button", { name: "עמוד קודם" });
      if (!(await prev.isEnabled())) break;
      await prev.click();
      await page.waitForTimeout(250);
    }
    for (let s = 1; s < sectionNumber; s += 1) {
      const next = page.getByRole("button", { name: "עמוד הבא" });
      await next.scrollIntoViewIfNeeded();
      await next.click();
      await page.waitForTimeout(400);
    }
  }

  for (const target of targets) {
    try {
      await page.goto(target.url, { waitUntil: "load", timeout: 60000 });
      await page.waitForSelector(".learning-book-markdown", {
        timeout: 60000,
        state: "attached",
      });
      await navigateToSection(target.section);

      const bodyText = await page.locator(".learning-book-markdown").innerText();
      for (const bad of KNOWN_GLUED_PATTERNS) {
        if (bodyText.includes(bad)) {
          fail(`${target.name}: browser shows glued pattern "${bad}"`);
        }
      }
      if (target.checks) {
        for (const snippet of target.checks) {
          if (!bodyText.includes(snippet)) {
            fail(`${target.name}: missing visible "${snippet}"`);
          }
        }
      }

      const shotPath = path.join(screenshotDir, target.name);
      await page.screenshot({ path: shotPath, fullPage: true });
      paths.push(`tmp/text-spacing-qa-screenshots/${target.name}`);
    } catch (e) {
      fail(`screenshot ${target.name}: ${e.message}`);
    }
  }

  try {
    await page.goto(`${baseUrl}/learning/book/math/g5/div_with_remainder`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector("footer", { timeout: 30000 });
    const footer = page.locator("footer").last();
    const topicShot = path.join(screenshotDir, "topic-cards-spacing-mobile.png");
    await footer.screenshot({ path: topicShot });
    paths.push("tmp/text-spacing-qa-screenshots/topic-cards-spacing-mobile.png");
  } catch (e) {
    fail(`topic cards screenshot: ${e.message}`);
  }

  await browser.close();
  return paths;
}
console.log(`Spacing audit → ${path.relative(ROOT, auditPath)}`);
console.log(`Scanned ${totalFiles} files, ${totalSections} sections, ${totalLines} lines`);

if (failures > 0) {
  console.error(`\n${failures} static spacing failure(s).`);
  process.exit(1);
}

console.log(
  `OK: learning book text spacing — ${CANONICAL_CASES.length} canonical cases + full math/geometry scan.`
);

if (!baseUrl) {
  console.log("(Set SPACING_QA_BASE_URL for browser screenshots)");
  process.exit(0);
}

failures = 0;
const screenshotPaths = await captureScreenshots();

if (screenshotPaths.length) {
  console.log("Screenshots:");
  for (const p of screenshotPaths) {
    console.log(`  ${p}`);
  }
}

const requiredShots = [
  "g1-number-line-section3-mobile.png",
  "g5-div_with_remainder-section2-mobile.png",
  "geometry-labels-mobile.png",
  "topic-cards-spacing-mobile.png",
];

for (const name of requiredShots) {
  const full = path.join(ROOT, "tmp/text-spacing-qa-screenshots", name);
  if (!fs.existsSync(full)) {
    fail(`required screenshot missing: tmp/text-spacing-qa-screenshots/${name}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} browser QA failure(s).`);
  process.exit(1);
}

console.log("OK: browser text-spacing QA screenshots captured.");
