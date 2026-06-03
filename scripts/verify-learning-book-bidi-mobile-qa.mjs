/**
 * Mobile visual QA for learning-book BiDi + line layout (360px viewport).
 * Run: BIDI_QA_BASE_URL=http://127.0.0.1:3001 node scripts/verify-learning-book-bidi-mobile-qa.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const baseUrl = (process.env.BIDI_QA_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

/** Broken visual patterns that must never appear in DOM text */
const FORBIDDEN_PATTERNS = [
  /37 = 30 \+ 758/,
  /758 = 50/,
  /\? = 68/,
  /24 = 20 \+-/,
  /20 \+ 4.*\+-ו/,
  /20 \+ 4-ו/,
  /\.24 = 20/,
  /4-ו$/,
];

/** @type {{ subject: string, grade: string, pageId: string, section: number, required?: string[], textPatterns?: RegExp[], layoutChecks?: string[] }[]} */
const MOBILE_QA_TARGETS = [
  {
    subject: "math",
    grade: "g2",
    pageId: "add_two",
    section: 3,
    required: ["58 + 37 = 95", "50 + 30 = 80", "58 = 50 + 8", "37 = 30 + 7"],
    layoutChecks: ["add_two_decomposition_lines"],
  },
  {
    subject: "math",
    grade: "g2",
    pageId: "sub_two",
    section: 4,
    required: ["68 = 60 + 8", "24 = 20 + 4", "68 − 24 = 44", "שלב 1:"],
    layoutChecks: ["sub_two_question_equation", "sub_two_step1_rows"],
  },
  {
    subject: "math",
    grade: "g2",
    pageId: "ns_place_tens_units",
    section: 2,
    required: ["236", "124", "405", "מאות", "עשרות", "אחדות"],
  },
  {
    subject: "math",
    grade: "g2",
    pageId: "ns_place_tens_units",
    section: 3,
    required: ["טבלת ערך מקום", "124", "= 124"],
    layoutChecks: ["place_value_table"],
  },
  {
    subject: "math",
    grade: "g2",
    pageId: "ns_place_tens_units",
    section: 4,
    required: ["236", "2 מאות = 200", "3 עשרות = 30", "6 אחדות = 6"],
    layoutChecks: ["comma_formula_rows"],
  },
  {
    subject: "math",
    grade: "g2",
    pageId: "cmp",
    section: 3,
    required: ["612", "628", "קטן", "מאות"],
    textPatterns: [/612[\s\S]*קטן[\s\S]*628/],
  },
  {
    subject: "math",
    grade: "g2",
    pageId: "ns_complement10",
    section: 2,
    required: ["8 + 5 = 8 + 2 + 3 = 10 + 3 = 13"],
  },
  {
    subject: "geometry",
    grade: "g4",
    pageId: "shapes_basic_properties_angles",
    section: 3,
    required: ["90", "°", "זוויות"],
  },
  {
    subject: "geometry",
    grade: "g4",
    pageId: "parallel_perpendicular",
    section: 2,
    required: ["מקביל", "מאונכות"],
  },
];

const errors = [];
/** @type {string[]} */
const screenshots = [];

async function waitForBookContent(page, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const gate = await page.getByText("בודק התחברות תלמיד").count();
    if (gate > 0) {
      await page.waitForTimeout(500);
      continue;
    }
    const login = await page.getByText("יש להתחבר כתלמיד").count();
    if (login > 0) {
      throw new Error("student login gate — page requires auth");
    }
    const hasArticle = await page.locator("article h2").count();
    const hasMarkdown = await page.locator(".learning-book-markdown").count();
    if (hasArticle > 0 && hasMarkdown > 0) return;
    await page.waitForTimeout(500);
  }
  throw new Error("book content did not hydrate in time");
}

async function dismissDevOverlay(page) {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
  });
}

async function clickBookNavButton(page, name) {
  await dismissDevOverlay(page);
  const clicked = await page.evaluate((label) => {
    const btn = [...document.querySelectorAll("button")].find(
      (el) => (el.textContent || "").trim() === label
    );
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  }, name);
  if (!clicked) {
    const fallback = page.getByRole("button", { name });
    if (await fallback.isEnabled()) {
      await fallback.click({ force: true });
    }
  }
}

async function navigateToSection(page, sectionNumber) {
  for (let i = 0; i < 8; i += 1) {
    const prev = page.getByRole("button", { name: "עמוד קודם" });
    if (!(await prev.isEnabled())) break;
    await clickBookNavButton(page, "עמוד קודם");
    await page.waitForTimeout(300);
  }
  for (let i = 0; i < Math.max(0, sectionNumber - 1); i += 1) {
    const next = page.getByRole("button", { name: "עמוד הבא" });
    if (!(await next.isEnabled())) break;
    await clickBookNavButton(page, "עמוד הבא");
    await page.waitForTimeout(500);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string} label
 */
async function assertDiagramLinesSeparate(page, label, lineA, lineB) {
  const result = await page.evaluate(
    ({ lineA, lineB }) => {
      const rows = [...document.querySelectorAll("[data-book-diagram-line]")];
      const findRow = (snippet) =>
        rows.find((row) => (row.textContent || "").replace(/\s+/g, " ").includes(snippet));

      const rowA = findRow(lineA);
      const rowB = findRow(lineB);
      if (!rowA || !rowB) {
        return {
          ok: false,
          reason: `missing rows A=${Boolean(rowA)} B=${Boolean(rowB)} (total rows=${rows.length})`,
        };
      }

      const a = rowA.getBoundingClientRect();
      const b = rowB.getBoundingClientRect();
      const verticalGap = Math.abs(a.top - b.top);
      const separate = verticalGap >= 8;

      return {
        ok: separate,
        reason: separate
          ? null
          : `rows too close vertically (gap=${Math.round(verticalGap)}px)`,
        topA: Math.round(a.top),
        topB: Math.round(b.top),
      };
    },
    { lineA, lineB }
  );

  if (!result.ok) {
    errors.push(`${label}: diagram lines not separate — ${lineA} / ${lineB} — ${result.reason}`);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string} label
 */
async function assertMathRunOrder(page, label, equationSnippet) {
  const result = await page.evaluate((snippet) => {
    const runs = [...document.querySelectorAll("[data-book-math-run]")];
    const hit = runs.find((el) => (el.textContent || "").includes(snippet.split(" ")[0]));
    if (!hit) return { ok: false, reason: "math run not found" };
    const text = (hit.textContent || "").replace(/\s+/g, " ").trim();
    const qIndex = text.indexOf("?");
    const eqIndex = text.indexOf("=");
    if (qIndex >= 0 && eqIndex >= 0 && qIndex < eqIndex) {
      return { ok: false, reason: `reversed equation: "${text}"` };
    }
    return { ok: text.includes(snippet.replace(/\s+/g, " ").trim().slice(0, 8)), text };
  }, equationSnippet);

  if (!result.ok) {
    errors.push(`${label}: equation order — ${result.reason}`);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string} label
 */
async function assertCommaFormulaRows(page, label) {
  const result = await page.evaluate(() => {
    const lines = [...document.querySelectorAll(".book-equation-display-row")];
    if (lines.length < 2) {
      return { ok: false, reason: `expected >=2 display rows, got ${lines.length}` };
    }
    const tops = lines.map((el) => Math.round(el.getBoundingClientRect().top));
    const uniqueTops = new Set(tops);
    if (uniqueTops.size < 2) {
      return { ok: false, reason: `display rows share same top (${tops.join(",")})` };
    }
    return { ok: true };
  });

  if (!result.ok) {
    errors.push(`${label}: comma formula rows — ${result.reason}`);
  }
}

async function assertStep1EquationRows(page, label) {
  const result = await page.evaluate(() => {
    const lines = [...document.querySelectorAll(".book-structured-line, .book-equation-display-row")];
    const hit = lines.find((el) => (el.textContent || "").includes("68 = 60 + 8"));
    if (!hit) return { ok: false, reason: "step 1 decomposition block not found" };

    const container = hit.closest(".book-structured-line") || hit.parentElement;
    const rows = container
      ? [...container.querySelectorAll(".book-equation-display-row")]
      : [];
    if (rows.length < 2) {
      return { ok: false, reason: `expected 2 equation rows in step 1, got ${rows.length}` };
    }

    const textB = (rows[1].textContent || "").replace(/\s+/g, " ");
    if (/4-ו|\+-ו|\.24 =/.test(textB)) {
      return { ok: false, reason: `row 2 mangled: "${textB.trim()}"` };
    }
    if (!/24 = 20 \+ 4/.test(textB)) {
      return { ok: false, reason: `row 2 missing 24 = 20 + 4: "${textB.trim()}"` };
    }

    const tops = rows.map((row) => Math.round(row.getBoundingClientRect().top));
    if (Math.abs(tops[0] - tops[1]) < 8) {
      return { ok: false, reason: `equation rows share line tops ${tops.join(",")}` };
    }

    return { ok: true };
  });

  if (!result.ok) {
    errors.push(`${label}: step 1 rows — ${result.reason}`);
  }
}

async function runLayoutChecks(page, target) {
  const tag = `${target.grade}/${target.pageId} §${target.section}`;

  for (const check of target.layoutChecks || []) {
    if (check === "add_two_decomposition_lines") {
      await assertDiagramLinesSeparate(page, tag, "58 = 50 + 8", "37 = 30 + 7");
    } else if (check === "sub_two_question_equation") {
      await assertMathRunOrder(page, tag, "68 − 24 = ?");
    } else if (check === "sub_two_step1_rows") {
      await assertStep1EquationRows(page, tag);
    } else if (check === "place_value_table") {
      const count = await page.locator('[aria-label="טבלת ערך מקום"]').count();
      if (count < 1) {
        errors.push(`${tag}: missing place-value table`);
      }
    } else if (check === "comma_formula_rows") {
      await assertCommaFormulaRows(page, tag);
    }
  }
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright not installed — skip mobile visual QA");
    process.exit(0);
  }

  const screenshotDir = path.join(ROOT, "tmp/bidi-mobile-qa");
  fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 360, height: 740 });

  for (const target of MOBILE_QA_TARGETS) {
    const url = `${baseUrl}/learning/book/${target.subject}/${target.grade}/${target.pageId}`;
    const tag = `${target.grade}/${target.pageId} §${target.section}`;
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (!response || response.status() !== 200) {
        errors.push(`HTTP ${response?.status() ?? "?"} for ${url}`);
        continue;
      }

      await waitForBookContent(page);
      await navigateToSection(page, target.section);
      await page.waitForTimeout(1000);

      const bodyText = await page.locator(".learning-book-markdown").innerText();

      for (const snippet of target.required || []) {
        if (!bodyText.includes(snippet)) {
          errors.push(`${tag}: missing "${snippet}"`);
        }
      }

      for (const pattern of target.textPatterns || []) {
        if (!pattern.test(bodyText)) {
          errors.push(`${tag}: pattern ${pattern} not matched`);
        }
      }

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(bodyText)) {
          errors.push(`${tag}: forbidden mangled text matched ${pattern}`);
        }
      }

      if (/השוואת\d{3}/.test(bodyText) || /קטן מ-\d{3}\d{3}/.test(bodyText)) {
        errors.push(`${tag}: glued Hebrew/digit text`);
      }

      const mangled =
        /20 \+ 4.*\+-ו|24 = 20 \+-|000,1|9 \+ 50 = 59/.test(bodyText) ||
        (bodyText.includes("24 = 20") &&
          bodyText.includes("68 = 60") &&
          bodyText.indexOf("24 = 20") < bodyText.indexOf("68 = 60"));
      if (mangled) {
        errors.push(`${tag}: BiDi mangling detected`);
      }

      await runLayoutChecks(page, target);

      const overflow = await page.evaluate(() => {
        const article = document.querySelector("article");
        if (!article) return false;
        return article.scrollWidth > document.documentElement.clientWidth + 2;
      });
      if (overflow) {
        errors.push(`${tag}: horizontal overflow at 360px`);
      }

      const shotName = `${target.subject}-${target.grade}-${target.pageId}-s${target.section}-360px.png`;
      const shotPath = path.join(screenshotDir, shotName);
      await page.locator("article").first().screenshot({ path: shotPath });
      screenshots.push(shotPath);
    } catch (err) {
      errors.push(`${tag}: ${err.message || err}`);
    }
  }

  await browser.close();

  const summaryPath = path.join(screenshotDir, "SUMMARY.md");
  fs.writeFileSync(
    summaryPath,
    `# BiDi Mobile QA (360px)

Base URL: ${baseUrl}
Date: ${new Date().toISOString()}

## Screenshots
${screenshots.map((s) => `- ${path.relative(ROOT, s)}`).join("\n")}

## Status
${errors.length ? `FAIL (${errors.length} issues)` : "PASS"}
${errors.map((e) => `- ${e}`).join("\n")}
`,
    "utf8"
  );

  if (errors.length) {
    console.error("Mobile BiDi QA FAILED:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`OK: mobile BiDi QA — ${MOBILE_QA_TARGETS.length} pages, 360px viewport`);
  console.log(`Screenshots → ${path.relative(ROOT, screenshotDir)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
