/**
 * Live Learning Book bidi QA — static page scan + optional Playwright DOM checks.
 * Run: node scripts/verify-learning-book-bidi-live-qa.mjs
 * Optional: BIDI_QA_BASE_URL=http://127.0.0.1:3000 node scripts/verify-learning-book-bidi-live-qa.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";
import { splitBookMarkdownBlocks } from "../lib/learning-book/book-markdown-blocks.js";
import {
  findInlineMathRuns,
  splitTextAndMathRuns,
  isFormulaLikeBody,
} from "../lib/learning-book/book-math-display.js";
import {
  parseBookLineStructure,
  splitMixedBodyClauses,
} from "../lib/learning-book/book-line-structure.js";
import { stripStrayMarkdown } from "../lib/learning-book/parse-inline-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** @type {{ subject: string, grade: string, pageId: string, sections: number[] }[]} */
export const BIDI_LIVE_QA_PAGES = [
  { subject: "math", grade: "g1", pageId: "add_two", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g1", pageId: "sub_two", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g2", pageId: "add_two", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g2", pageId: "sub_two", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g2", pageId: "add_vertical", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g2", pageId: "sub_vertical", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g5", pageId: "div_with_remainder", sections: [2, 3, 4, 6] },
  { subject: "geometry", grade: "g4", pageId: "square_perimeter", sections: [2, 3, 4, 6] },
  { subject: "geometry", grade: "g5", pageId: "heights_triangle", sections: [2, 3, 4, 6] },
];

const errors = [];
const notes = [];

function fail(msg) {
  errors.push(msg);
}

function normMath(value) {
  return stripStrayMarkdown(value).replace(/\s+/g, " ").trim();
}

function lineNeedsMathIsolation(line) {
  const input = String(line || "");
  if (!/[\u0590-\u05FF]/.test(input) || !/\d/.test(input)) return false;
  if (/\d{1,3}(?:,\d{3})+/.test(input)) return true;
  if (/\d\s*[=×÷]/.test(input)) return true;
  if (/__/.test(input)) return true;
  if (/\d\s*[+−\-]\s*\d/.test(input)) return true;
  return false;
}

function analyzeLine(line) {
  const input = String(line || "").trim();
  const structure = parseBookLineStructure(input);
  const body = structure?.body ?? input;
  const clauses = splitMixedBodyClauses(body);
  /** @type {{ type: string, value: string }[]} */
  const segments = [];

  for (const clause of clauses) {
    const sub = parseBookLineStructure(clause);
    const scanText = sub?.body ?? clause;
    if (isFormulaLikeBody(scanText)) {
      segments.push({ type: "formula", value: scanText });
      continue;
    }
    for (const part of splitTextAndMathRuns(scanText)) {
      segments.push({
        type: part.type,
        value: normMath(part.value),
      });
    }
  }

  return {
    label: structure?.label ?? null,
    segments,
    mathValues: segments.filter((s) => s.type === "math").map((s) => s.value),
  };
}

function assertLineStructure(line, context) {
  const got = analyzeLine(line);
  if (!lineNeedsMathIsolation(line) && !/[÷×=]/.test(line)) return;

  if (/\d{1,3},\d{3}/.test(line) && /[÷×=+\-−]/.test(line)) {
    if (
      got.mathValues.length > 1 &&
      /^\d{1,3},\d{3}$/.test(got.mathValues[0])
    ) {
      const bare = got.mathValues[0];
      const start = line.indexOf(bare);
      if (start >= 0) {
        const afterBare = line.slice(start + bare.length);
        if (/^\s*[÷×=+−\-]/.test(afterBare)) {
          fail(
            `${context}: fragmented comma-thousands in "${line}" → ${JSON.stringify(got.mathValues)}`
          );
        }
      }
    }
  }

  for (const seg of got.segments) {
    if (seg.type === "text" && /\d\s*[+−\-=×÷]\s*\d/.test(seg.value)) {
      fail(`${context}: un-isolated math in text segment "${seg.value}" from "${line}"`);
    }
    if (seg.type === "math" && /שלב/u.test(seg.value)) {
      fail(`${context}: step label inside math run "${seg.value}"`);
    }
  }

  if (lineNeedsMathIsolation(line) && !got.mathValues.length && !got.segments.some((s) => s.type === "formula")) {
    const runs = findInlineMathRuns(line);
    if (!runs.length) {
      fail(`${context}: no math runs in mixed line "${line}"`);
    }
  }
}

function scanPageSections(subject, grade, pageId, sectionNumbers) {
  const draftPath = path.join(
    ROOT,
    `docs/learning-book/${subject}/${grade}/drafts/${pageId}.md`
  );
  if (!fs.existsSync(draftPath)) {
    fail(`missing draft ${subject}/${grade}/${pageId}`);
    return;
  }

  const raw = fs.readFileSync(draftPath, "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);

  for (const sectionNumber of sectionNumbers) {
    const section = page.sections.find((s) => s.number === sectionNumber);
    if (!section) {
      fail(`${subject}/${grade}/${pageId}: missing §${sectionNumber}`);
      continue;
    }

    const blocks = splitBookMarkdownBlocks(section.body);
    for (const block of blocks) {
      const lines =
        block.type === "prose"
          ? block.lines
          : block.type === "ul" || block.type === "ol"
            ? block.items.flat()
            : block.type === "code"
              ? String(block.content || "")
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
              : [];

      for (const line of lines) {
        assertLineStructure(line, `${subject}/${grade}/${pageId} §${sectionNumber}`);
      }
    }
  }

  notes.push(`static OK ${subject}/${grade}/${pageId} §${sectionNumbers.join(",")}`);
}

for (const target of BIDI_LIVE_QA_PAGES) {
  scanPageSections(target.subject, target.grade, target.pageId, target.sections);

  const entry = getLearningBookEntry(target.subject, target.grade);
  if (!entry) {
    fail(`missing catalog entry ${target.subject}/${target.grade}`);
  }
}

const baseUrl = process.env.BIDI_QA_BASE_URL?.replace(/\/$/, "");

async function navigateToSection(page, sectionNumber) {
  const targetIndex = Math.max(0, sectionNumber - 1);
  for (let i = 0; i < targetIndex; i += 1) {
    const next = page.getByRole("button", { name: "עמוד הבא" });
    if (!(await next.isEnabled())) break;
    await next.click();
    await page.waitForTimeout(350);
  }
}

async function runPlaywrightDomChecks() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    fail("Playwright not installed — skip DOM checks or run npm install");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  /** @type {Record<string, string[]>} */
  const G5_REQUIRED_MATH = {
    2: ["1,247 ÷ 8:", "1,247 ÷ 8 = 155", "8 × 155 = 1,240"],
    3: ["523 ÷ 6:", "523 ÷ 6 = 87"],
    4: ["1,247 ÷ 8 = ?", "8 × 155 = 1,240", "1,247 − 1,240 = 7"],
    6: ["1,247 ÷ 8 = 155"],
  };

  for (const target of BIDI_LIVE_QA_PAGES) {
    const url = `${baseUrl}/learning/book/${target.subject}/${target.grade}/${target.pageId}`;
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      if (!response || response.status() !== 200) {
        fail(`HTTP ${response?.status() ?? "?"} for ${url}`);
        continue;
      }

      await page.waitForTimeout(1500);
      const loginGate = await page.getByText("כניסה ללמידה").count();
      if (loginGate > 0) {
        notes.push(`DOM skip ${url} — login gate (static checks still apply)`);
        continue;
      }

      await page.waitForSelector(".learning-book-markdown", {
        timeout: 30000,
        state: "attached",
      });

      for (const sectionNumber of target.sections) {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForSelector(".learning-book-markdown", {
          timeout: 30000,
          state: "attached",
        });
        await navigateToSection(page, sectionNumber);

        const domReport = await page.evaluate(() => {
          /** @type {string[]} */
          const issues = [];
          const mathRuns = document.querySelectorAll("[data-book-math-run]");
          for (const el of mathRuns) {
            if (el.getAttribute("dir") !== "ltr") {
              issues.push(`math run missing dir=ltr: ${el.textContent}`);
            }
            if (el.closest(".book-line-label")) {
              issues.push(`math run nested inside label: ${el.textContent}`);
            }
          }

          const labels = document.querySelectorAll("[data-book-label]");
          for (const el of labels) {
            if (el.querySelector("[data-book-math-run]")) {
              issues.push(`label contains math run: ${el.textContent}`);
            }
          }

          return {
            issues,
            mathRunCount: mathRuns.length,
            labelCount: labels.length,
            mathTexts: [...mathRuns].map((el) => el.textContent?.trim() || ""),
          };
        });

        if (domReport.issues.length) {
          for (const issue of domReport.issues) {
            fail(`${url} §${sectionNumber}: ${issue}`);
          }
        }

        if (
          target.pageId === "div_with_remainder" &&
          G5_REQUIRED_MATH[sectionNumber]
        ) {
          for (const expected of G5_REQUIRED_MATH[sectionNumber]) {
            const found = domReport.mathTexts.some(
              (t) => t.includes(expected) || expected.includes(t)
            );
            if (!found) {
              fail(
                `${url} §${sectionNumber}: missing DOM math run containing "${expected}" (got ${JSON.stringify(domReport.mathTexts)})`
              );
            }
          }
        }

        notes.push(
          `DOM OK ${url} §${sectionNumber} — mathRuns=${domReport.mathRunCount} labels=${domReport.labelCount}`
        );
      }

      if (target.pageId === "div_with_remainder") {
        await navigateToSection(page, 3);
        const screenshotDir = path.join(ROOT, "tmp/bidi-qa-screenshots");
        fs.mkdirSync(screenshotDir, { recursive: true });
        await page.screenshot({
          path: path.join(screenshotDir, "g5-div_with_remainder-section3-mobile.png"),
          fullPage: true,
        });
        notes.push(
          `screenshot saved tmp/bidi-qa-screenshots/g5-div_with_remainder-section3-mobile.png`
        );
      }
    } catch (e) {
      fail(`Playwright failed ${url}: ${e.message}`);
    }
  }

  await browser.close();
}

if (baseUrl) {
  await runPlaywrightDomChecks();
} else {
  notes.push("(Set BIDI_QA_BASE_URL=http://127.0.0.1:3000 for Playwright DOM checks)");
}

if (errors.length) {
  console.error("Learning book bidi live QA FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`Learning book bidi live QA PASSED — ${BIDI_LIVE_QA_PAGES.length} target pages.`);
for (const note of notes) {
  console.log(`  ${note}`);
}
