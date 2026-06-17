#!/usr/bin/env node
/**
 * Browser-level scanner for Grade 2 math learning-book BiDi regressions.
 *
 * This intentionally opens the real routes and reconstructs child-visible rows
 * from DOM geometry. It catches visual failures that raw Markdown / helper
 * scanners can miss, such as a bold result span visually moving before the
 * start of an equation (5030 + 20 =) or a number gluing to Hebrew prose
 * (24זוגי).
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const SCREENSHOT_DIR = "docs/qa/rtl-route-regression-screenshots";

const ROUTES = [
  {
    pageId: "add_two",
    section: 2,
    title: "חיבור שני מספרים",
    expected: ["30 + 20 = 50", "4 + 5 = 9", "50 + 9 = 59"],
  },
  {
    pageId: "sub_two",
    section: 2,
    title: "חיסור שני מספרים",
    expected: ["60 − 20 = 40", "8 − 4 = 4", "40 + 4 = 44"],
  },
  {
    pageId: "sub_two",
    section: 3,
    title: "חיסור שני מספרים — דוגמה מלאה",
    expected: ["68 − 24 = 44"],
  },
  {
    pageId: "sub_vertical",
    section: 3,
    title: "חיסור מאונך",
    expected: ["52 − 27 = 25"],
  },
  {
    pageId: "add_vertical",
    section: 3,
    title: "חיבור מאונך",
    expected: ["7 + 8 = 15", "47 + 28 = 75"],
  },
  {
    pageId: "ns_even_odd",
    section: 3,
    title: "זוגי ואי-זוגי",
    expected: ["24 זוגי", "35 אי-זוגי"],
  },
  {
    pageId: "ns_neighbors",
    section: 3,
    title: "ציר מספרים",
    expected: ["248 − 1 = 247", "248 + 1 = 249"],
  },
  {
    pageId: "ns_place_tens_units",
    section: 3,
    title: "עשרות ואחדות",
    expected: ["100 + 20 + 4 = 124", "400 + 0 + 5 = 405"],
  },
  {
    pageId: "ns_place_tens_units",
    section: 3,
    title: "עשרות ואחדות",
    expected: [
      "1 מאה + 2 עשרות + 4 אחדות = 124",
      "100 + 20 + 4 = 124",
      "דוגמה נוספת — 405:",
      "4 מאות, 0 עשרות, 5 אחדות",
      "400 + 0 + 5 = 405",
    ],
  },
  {
    pageId: "cmp",
    section: 3,
    title: "השוואות",
    expected: ["612 < 628", "628 > 612"],
  },
];

const FORBIDDEN = [
  "5030",
  "5950",
  "2552",
  "4060",
  "4440",
  "24זוגי",
  "35אי-זוגי",
  "137 + 6",
  "10 + 133",
  "157 + 8",
  "7547 + 28",
  "4468 − 24",
  "124 = 100 + 20 + 4",
  "405 = 400 + 0 + 5",
];

const EXACT_BLOCKS = [
  {
    pageId: "add_two",
    section: 3,
    title: "חיבור עם נשיאה",
    expected: [
      "58 = 50 + 8",
      "37 = 30 + 7",
      "עשרות: 50 + 30 = 80",
      "אחדות: 8 + 7 = 15 → 5, נשיאה 1",
      "סה״כ: 80 + 15 = 95",
      "58 + 37 = 95",
    ],
    requireStructuredDiagram: true,
    answer: "58 + 37 = 95",
  },
  {
    pageId: "sub_two",
    section: 3,
    title: "חיסור",
    expected: [
      "68 = 60 + 8",
      "24 = 20 + 4",
      "עשרות: 60 − 20 = 40",
      "אחדות: 8 − 4 = 4",
      "סה״כ: 40 + 4 = 44",
      "68 − 24 = 44",
    ],
    requireStructuredDiagram: true,
    answer: "68 − 24 = 44",
  },
  {
    pageId: "add_vertical",
    section: 3,
    title: "חיבור מאונך",
    expected: [
      "אחדות: 7 + 8 = 15 → כותבים 5, מעבירים 1 לעשרות",
      "עשרות: 4 + 2 + 1 (נשיאה) = 7",
      "47 + 28 = 75",
    ],
  },
  {
    pageId: "sub_vertical",
    section: 3,
    title: "חיסור עם השאלה",
    expected: [
      "באחדות 2 קטן מ-7 → מחליפים עשרה: 52 → 42 + 12 (4 עשרות, 12 אחדות)",
      "אחדות: 12 − 7 = 5",
      "עשרות: 4 − 2 = 2",
      "52 − 27 = 25",
    ],
  },
  {
    pageId: "mul",
    section: 3,
    title: "כפל קבוצות",
    expected: ["4 × 6 = 24", "חיבור חוזר: 6 + 6 + 6 + 6 = 24"],
  },
  {
    pageId: "ns_even_odd",
    section: 3,
    title: "זוגי ואי-זוגי",
    expected: [
      "24 — זוגי:",
      "לכל כוכב יש שותף → 24 זוגי.",
      "35 — אי-זוגי:",
      "נשאר כוכב אחד לבד → 35 אי-זוגי.",
      "טיפ: ב-35 הספרה האחרונה היא 5 → אי-זוגי.",
    ],
  },
  {
    pageId: "ns_neighbors",
    section: 3,
    title: "ציר מספרים",
    expected: ["248 − 1 = 247", "248 + 1 = 249"],
  },
  {
    pageId: "ns_place_tens_units",
    section: 3,
    title: "עשרות ואחדות",
    expected: [
      "1 מאה + 2 עשרות + 4 אחדות = 124",
      "100 + 20 + 4 = 124",
      "דוגמה נוספת — 405:",
      "4 מאות, 0 עשרות, 5 אחדות",
      "400 + 0 + 5 = 405",
    ],
  },
  {
    pageId: "cmp",
    section: 3,
    title: "השוואות",
    expected: [
      "מאות: 6 = 6 → שוות, ממשיכים",
      "עשרות: 1 < 2",
      "612 קטן מ-628, לכן: 612 < 628",
    ],
  },
  {
    pageId: "ns_complement10",
    section: 3,
    title: "FrameDiagram מסגרת עשר",
    expected: [
      "מסגרת עשר — 7 מקומות מלאים, 3 מקומות ריקים:",
      "┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐",
      "└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘",
      "7 מקומות מלאים 3 מקומות ריקים",
    ],
  },
];

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/-/g, "−")
    .replace(/^[−\-•]\s+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function getRouteLevelText(page) {
  return page.locator("[data-book-scroll]").evaluate((root) => {
    const normalize = (value) =>
      String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/-/g, "−")
        .replace(/^[−\-•]\s+/u, "")
        .replace(/\s+/g, " ")
        .trim();

    const rows = [];
    const lineRoots = Array.from(
      root.querySelectorAll(".book-mixed-hebrew-math, .book-equation-display-row")
    );

    for (const line of lineRoots) {
      const pieces = [];

      const addPiece = (text, rect) => {
        if (!text || rect.width === 0) return;
        pieces.push({
          text: String(text).replace(/\u00a0/g, " "),
          top: Math.round(rect.top),
          left: rect.left,
          right: rect.right,
        });
      };

      const collectNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || "";
          if (!text) return;
          const range = document.createRange();
          range.selectNodeContents(node);
          const rect = range.getClientRects()[0];
          range.detach();
          if (rect) addPiece(text, rect);
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = /** @type {HTMLElement} */ (node);
        if (
          el.matches("[data-book-label], [data-book-prose-run], [data-book-math-run], code")
        ) {
          addPiece(el.innerText || el.textContent || "", el.getBoundingClientRect());
          return;
        }

        for (const child of Array.from(el.childNodes)) collectNode(child);
      };

      for (const child of Array.from(line.childNodes)) collectNode(child);

      if (!pieces.length) {
        const fallback = normalize(line.innerText || line.textContent || "");
        if (fallback) rows.push(fallback);
        continue;
      }

      const byLine = new Map();
      for (const piece of pieces) {
        const key = [...byLine.keys()].find((top) => Math.abs(top - piece.top) <= 3);
        const groupKey = key ?? piece.top;
        const group = byLine.get(groupKey) ?? [];
        group.push(piece);
        byLine.set(groupKey, group);
      }

      for (const group of byLine.values()) {
        const visual = group
          .sort((a, b) => b.right - a.right || b.left - a.left)
          .map((piece) => piece.text)
          .join("");
        if (visual) rows.push(normalize(visual));
      }
    }

    return {
      domText: normalize(root.innerText || root.textContent || ""),
      visualRows: rows,
    };
  });
}

async function openSection(page, pageId, section) {
  const path = `/learning/book/math/g2/${pageId}`;
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "load", timeout: 120_000 });
  await page.locator("[data-book-scroll]").first().waitFor({ state: "attached", timeout: 60_000 });
  await page.getByText(/עמוד \d+ מתוך/u).waitFor({ state: "visible", timeout: 60_000 });

  const targetIndex = section - 1;
  for (let i = 0; i < targetIndex; i += 1) {
    const next = page.getByRole("button", { name: "עמוד הבא" });
    await next.waitFor({ state: "visible", timeout: 60_000 });
    await next.click();
    await page.locator("[data-book-scroll]").first().waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForTimeout(200);
  }

  await page
    .getByText(`עמוד ${section} מתוך`, { exact: false })
    .waitFor({ state: "visible", timeout: 60_000 });
  return path;
}

async function getStructuredLineTexts(page) {
  return page.locator("[data-book-scroll]").evaluate((root) => {
    const normalize = (value) =>
      String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/-/g, "−")
        .replace(/^[−\-•]\s+/u, "")
        .replace(/\s+/g, " ")
        .trim();

    return Array.from(
      root.querySelectorAll("[data-book-example-title], [data-book-place-value-equation], .book-mixed-hebrew-math, [data-book-diagram-line]")
    )
      .map((line) => normalize(line.innerText || line.textContent || ""))
      .filter((line) => line && !/[★●✕]/u.test(line));
  });
}

async function getDiagramRenderers(page, answerText) {
  return page.locator("[data-book-scroll]").evaluate((root, expectedAnswer) => {
    const normalize = (value) =>
      String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/-/g, "−")
        .replace(/^[−\-•]\s+/u, "")
        .replace(/\s+/g, " ")
        .trim();

    const diagram = root.querySelector('[role="img"][aria-label="דוגמה"]');
    const rows = diagram
      ? Array.from(diagram.querySelectorAll("[data-book-diagram-line]")).map((line) => ({
          text: normalize(line.innerText || line.textContent || ""),
          renderer: line.querySelector(".book-mixed-hebrew-math")
            ? "structured-mixed"
            : line.querySelector("[data-book-vertical-arithmetic]")
              ? "vertical-arithmetic"
              : line.querySelector("bdi")
                ? "raw-bdi"
                : "unknown",
        }))
      : [];
    const answer = Array.from(root.querySelectorAll(".book-mixed-hebrew-math"))
      .map((line) => normalize(line.innerText || line.textContent || ""))
      .filter((line) => line === expectedAnswer);
    return { rows, answer };
  }, normalizeText(answerText));
}

function verifyExactBlock(lines, expectedBlock) {
  const expected = expectedBlock.map(normalizeText);
  const deduped = [];
  for (const line of lines) {
    if (line && deduped[deduped.length - 1] !== line) deduped.push(line);
  }
  const start = deduped.findIndex((line) => line === expected[0]);
  if (start < 0) return false;
  return JSON.stringify(deduped.slice(start, start + expected.length)) === JSON.stringify(expected);
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
  });

  const failures = [];
  for (const route of ROUTES) {
    const path = await openSection(page, route.pageId, route.section);

    const routeText = await getRouteLevelText(page);
    const searchable = normalizeText([routeText.domText, ...routeText.visualRows].join("\n"));

    for (const expected of route.expected) {
      if (!searchable.includes(normalizeText(expected))) {
        failures.push({
          route: path,
          section: route.section,
          kind: "missing-expected",
          value: expected,
          rendered: searchable,
        });
      }
    }

    for (const forbidden of FORBIDDEN) {
      if (searchable.includes(normalizeText(forbidden))) {
        failures.push({
          route: path,
          section: route.section,
          kind: "forbidden-visible",
          value: forbidden,
          rendered: searchable,
        });
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/g2-${route.pageId}-section-${route.section}.png`,
      fullPage: true,
    });
  }

  for (const block of EXACT_BLOCKS) {
    const path = await openSection(page, block.pageId, block.section);

    const lines = await getStructuredLineTexts(page);
    if (!verifyExactBlock(lines, block.expected)) {
      failures.push({
        route: path,
        section: block.section,
        kind: "exact-block-mismatch",
        value: block.title,
        rendered: lines.join(" | "),
      });
    }

    if (block.requireStructuredDiagram) {
      const { rows, answer } = await getDiagramRenderers(page, block.answer);
      const rendererSet = [...new Set(rows.map((row) => row.renderer))];
      if (JSON.stringify(rendererSet) !== JSON.stringify(["structured-mixed"]) || !answer.length) {
        failures.push({
          route: path,
          section: block.section,
          kind: "mixed-renderer-block",
          value: block.title,
          rendered: JSON.stringify({ rendererSet, rows, answer }),
        });
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/g2-${block.pageId}-section-${block.section}-exact-block.png`,
      fullPage: true,
    });
  }

  await browser.close();

  console.log(`Route-level G2 scans : ${ROUTES.length}`);
  console.log(`Exact block scans     : ${EXACT_BLOCKS.length}`);
  console.log(`Forbidden patterns   : ${FORBIDDEN.length}`);
  console.log(`Failures             : ${failures.length}`);

  if (failures.length) {
    for (const failure of failures) {
      console.log("");
      console.log(`[${failure.kind}] ${failure.route} section ${failure.section}`);
      console.log(`value   : ${failure.value}`);
      console.log(`rendered: ${failure.rendered}`);
    }
    process.exit(1);
  }

  console.log("PASS: route-level G2 visual BiDi scan is clean.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
