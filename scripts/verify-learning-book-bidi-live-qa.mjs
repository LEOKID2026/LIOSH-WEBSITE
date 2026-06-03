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
import { auditLineRisks } from "../lib/learning-book/book-rtl-content-normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** @type {{ subject: string, grade: string, pageId: string, sections: number[] }[]} */
export const BIDI_LIVE_QA_PAGES = [
  { subject: "math", grade: "g1", pageId: "add_two", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g1", pageId: "sub_two", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g2", pageId: "add_two", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g2", pageId: "sub_two", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g2", pageId: "cmp", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g2", pageId: "add_vertical", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g2", pageId: "sub_vertical", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g3", pageId: "add_two", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g4", pageId: "cmp", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g5", pageId: "div_with_remainder", sections: [2, 3, 4, 6] },
  { subject: "math", grade: "g6", pageId: "add_two", sections: [2, 3, 4, 6] },
  { subject: "geometry", grade: "g3", pageId: "parallel_perpendicular", sections: [2, 3, 4, 6] },
  { subject: "geometry", grade: "g4", pageId: "square_perimeter", sections: [2, 3, 4, 6] },
  { subject: "geometry", grade: "g4", pageId: "shapes_basic_properties_angles", sections: [2, 3, 4, 6] },
  { subject: "geometry", grade: "g5", pageId: "heights_triangle", sections: [2, 3, 4, 6] },
  { subject: "geometry", grade: "g6", pageId: "triangle_angles", sections: [2, 3, 4, 6] },
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
        const risks = auditLineRisks(line);
        if (risks.includes("verbal_formula_label") || risks.includes("remainder_without_vav")) {
          fail(
            `${subject}/${grade}/${pageId} §${sectionNumber}: risky content "${line.trim()}" [${risks.join(", ")}]`
          );
        }
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
  for (let i = 0; i < 8; i += 1) {
    const prev = page.getByRole("button", { name: "עמוד קודם" });
    if (!(await prev.isEnabled())) break;
    await prev.scrollIntoViewIfNeeded();
    await prev.click();
    await page.waitForTimeout(350);
  }

  const targetIndex = Math.max(0, sectionNumber - 1);
  for (let i = 0; i < targetIndex; i += 1) {
    const next = page.getByRole("button", { name: "עמוד הבא" });
    if (!(await next.isEnabled())) break;
    await next.scrollIntoViewIfNeeded();
    await next.click();
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(400);
}

const REQUIRED_G5_SCREENSHOTS = [
  "g5-div_with_remainder-section2-mobile.png",
  "g5-div_with_remainder-section3-mobile.png",
  "g5-div_with_remainder-section4-mobile.png",
  "g5-div_with_remainder-section6-mobile.png",
  "g5-div_with_remainder-topic-cards-mobile.png",
];

async function waitForProductionHydration(page, url) {
  /** @type {string[]} */
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
  if (!response || response.status() !== 200) {
    return { ok: false, reason: `HTTP ${response?.status() ?? "?"}` };
  }

  await page.waitForSelector(".learning-book-markdown", {
    timeout: 30000,
    state: "attached",
  });
  await page.waitForFunction(
    () => {
      const scripts = [...document.querySelectorAll("script[src*='/_next/static/']")];
      return scripts.some(
        (s) =>
          s.getAttribute("src")?.includes("framework-") ||
          s.getAttribute("src")?.includes("webpack-")
      );
    },
    { timeout: 30000 }
  );

  const chunk404 = consoleErrors.filter(
    (e) =>
      e.includes("_next/static") &&
      (e.includes("404") || e.includes("MIME type") || e.includes("webpack.js"))
  );
  if (chunk404.length) {
    return {
      ok: false,
      reason: `missing production chunks: ${chunk404[0]}`,
    };
  }

  await page.waitForTimeout(1500);
  const next = page.getByRole("button", { name: "עמוד הבא" });
  if (!(await next.isEnabled())) {
    return { ok: false, reason: "next button disabled" };
  }

  const h2Before = await page.locator("article h2").first().innerText();
  await next.scrollIntoViewIfNeeded();
  await next.click();
  await page.waitForTimeout(1500);
  const h2After = await page.locator("article h2").first().innerText();
  if (h2Before === h2After) {
    return { ok: false, reason: `section nav stuck on "${h2Before}"` };
  }

  return { ok: true, reason: null };
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
    2: ["1,247 ÷ 8:", "1,247 ÷ 8 = 155", "8 × 155 = 1,240", "8 × 155 + 7 = 1,247"],
    3: ["523 ÷ 6:", "523 ÷ 6 = 87", "6 × 87 = 522", "522 + 1 = 523"],
    4: ["1,247 ÷ 8 = ?", "8 × 155 = 1,240", "1,247 − 1,240 = 7"],
    6: ["1,247 ÷ 8 = 155"],
  };

  const G5_REQUIRED_TEXT = {
    2: ["155 ושארית 7", "נשאר 7"],
    4: [
      "שלב 1: מחשבים כמה קרוב אפשר להגיע.",
      "שלב 2: מחשבים מה נשאר.",
      "תשובה: 155 ושארית 7",
    ],
  };

  const screenshotDir = path.join(ROOT, "tmp/bidi-qa-screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });
  /** @type {string[]} */
  const screenshotPaths = [];

  for (const target of BIDI_LIVE_QA_PAGES) {
    const url = `${baseUrl}/learning/book/${target.subject}/${target.grade}/${target.pageId}`;
    const isG5Remainder =
      target.subject === "math" &&
      target.grade === "g5" &&
      target.pageId === "div_with_remainder";

    try {
      if (isG5Remainder) {
        const hydration = await waitForProductionHydration(page, url);
        if (!hydration.ok) {
          fail(`G5 visual QA hydration failed for ${url}: ${hydration.reason}`);
          continue;
        }

        for (let i = 0; i < 6; i += 1) {
          const prev = page.getByRole("button", { name: "עמוד קודם" });
          if (!(await prev.isEnabled())) break;
          await prev.click();
          await page.waitForTimeout(300);
        }

        for (const sectionNumber of target.sections) {
          await navigateToSection(page, sectionNumber);
          await assertDomSection(page, url, sectionNumber, target, G5_REQUIRED_MATH);

          const bodyText = await page.locator(".learning-book-markdown").innerText();
          if (bodyText.includes("[DRAFT") || bodyText.includes("**") || bodyText.includes(":::")) {
            fail(`${url} §${sectionNumber}: raw markdown artifacts in visible text`);
          }
          if (/מחולק\s*=\s*\(מחלק/.test(bodyText)) {
            fail(`${url} §${sectionNumber}: verbal formula still visible`);
          }

          const requiredText = G5_REQUIRED_TEXT[sectionNumber];
          if (requiredText) {
            for (const snippet of requiredText) {
              if (!bodyText.includes(snippet)) {
                fail(`${url} §${sectionNumber}: missing visible text "${snippet}"`);
              }
            }
          }

          const shotName = `g5-div_with_remainder-section${sectionNumber}-mobile.png`;
          const shotPath = path.join(screenshotDir, shotName);
          await page.screenshot({ path: shotPath, fullPage: true });
          screenshotPaths.push(`tmp/bidi-qa-screenshots/${shotName}`);
        }

        await page.goto(url, { waitUntil: "load", timeout: 60000 });
        await page.waitForSelector(".learning-book-markdown", { timeout: 30000 });
        await navigateToSection(page, 2);
        const topicShot = path.join(
          screenshotDir,
          "g5-div_with_remainder-topic-cards-mobile.png"
        );
        const footer = page.locator("footer").last();
        await footer.scrollIntoViewIfNeeded();
        await footer.screenshot({ path: topicShot });
        screenshotPaths.push("tmp/bidi-qa-screenshots/g5-div_with_remainder-topic-cards-mobile.png");

        const nextTitle = await page
          .getByText("נושא הבא")
          .locator("..")
          .innerText();
        if (/חילוקבמחלק|דו-ספרתינושא/.test(nextTitle)) {
          fail(`${url}: topic card text appears glued: ${JSON.stringify(nextTitle)}`);
        }
        if (!nextTitle.includes("חילוק במחלק דו-ספרתי")) {
          fail(`${url}: topic card missing spaced next title: ${JSON.stringify(nextTitle)}`);
        }
        continue;
      }

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

      try {
        await page.waitForSelector(".learning-book-markdown", {
          timeout: 30000,
          state: "attached",
        });
      } catch {
        notes.push(`DOM skip ${url} — book markdown not rendered`);
        continue;
      }

      const hydrated = await waitForProductionHydration(page, url);
      if (!hydrated.ok) {
        notes.push(`DOM skip ${url} — ${hydrated.reason}`);
        continue;
      }

      // Return to section 1 before iterating target sections
      for (let i = 0; i < 6; i += 1) {
        const prev = page.getByRole("button", { name: "עמוד קודם" });
        if (!(await prev.isEnabled())) break;
        await prev.click();
        await page.waitForTimeout(300);
      }

      for (const sectionNumber of target.sections) {
        await navigateToSection(page, sectionNumber);

        await assertDomSection(page, url, sectionNumber, target, G5_REQUIRED_MATH);

        notes.push(`DOM OK ${url} §${sectionNumber}`);
      }
    } catch (e) {
      fail(`Playwright failed ${url}: ${e.message}`);
    }
  }

  await browser.close();

  for (const required of REQUIRED_G5_SCREENSHOTS) {
    const full = path.join(screenshotDir, required);
    if (!fs.existsSync(full)) {
      fail(`required screenshot missing: tmp/bidi-qa-screenshots/${required}`);
    }
  }

  if (screenshotPaths.length) {
    notes.push("Screenshots:");
    for (const p of screenshotPaths) {
      notes.push(`  ${p}`);
    }
  }
}

async function assertDomSection(page, url, sectionNumber, target, g5RequiredMath) {
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
    g5RequiredMath[sectionNumber]
  ) {
    for (const expected of g5RequiredMath[sectionNumber]) {
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
