import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

const SCREENSHOT_DIR = "docs/qa/rtl-route-regression-screenshots";

const REQUIRED_ROUTES = [
  {
    pageId: "add_two",
    section: 2,
    title: "חיבור שני מספרים",
    expected: ["30 + 20 = 50", "4 + 5 = 9", "50 + 9 = 59"],
    forbidden: ["5030", "5950"],
  },
  {
    pageId: "sub_two",
    section: 2,
    title: "חיסור שני מספרים",
    expected: ["60 − 20 = 40", "8 − 4 = 4", "40 + 4 = 44"],
    forbidden: ["4060", "4440"],
  },
  {
    pageId: "sub_two",
    section: 3,
    title: "חיסור שני מספרים - דוגמה מלאה",
    expected: ["68 − 24 = 44"],
    forbidden: ["4468 − 24"],
  },
  {
    pageId: "sub_vertical",
    section: 3,
    title: "חיסור מאונך",
    expected: ["52 − 27 = 25"],
    forbidden: ["2552"],
  },
  {
    pageId: "add_vertical",
    section: 3,
    title: "חיבור מאונך",
    expected: ["7 + 8 = 15", "47 + 28 = 75"],
    forbidden: ["157 + 8", "7547 + 28"],
  },
  {
    pageId: "ns_even_odd",
    section: 3,
    title: "זוגי ואי-זוגי",
    expected: ["24 זוגי", "35 אי-זוגי"],
    forbidden: ["24זוגי", "35אי-זוגי"],
  },
  {
    pageId: "ns_neighbors",
    section: 3,
    title: "ציר מספרים",
    expected: ["248 − 1 = 247", "248 + 1 = 249"],
    forbidden: ["137 + 6", "10 + 133"],
  },
  {
    pageId: "ns_place_tens_units",
    section: 3,
    title: "עשרות ואחדות",
    expected: ["100 + 20 + 4 = 124", "400 + 0 + 5 = 405"],
    forbidden: ["124 = 100 + 20 + 4", "405 = 400 + 0 + 5"],
  },
  {
    pageId: "cmp",
    section: 3,
    title: "השוואות",
    expected: ["612 < 628", "628 > 612"],
    forbidden: ["628612", "612628"],
  },
] as const;

const OWNER_FORBIDDEN = [
  "5030",
  "5950",
  "2552",
  "4060",
  "4440",
  "24זוגי",
  "137 + 6",
  "10 + 133",
  "58 = 50 + 8",
  "37 = 30 + 7",
  "68 = 60 + 8",
  "24 = 20 + 4",
  "124 = 100 + 20 + 4",
  "405 = 400 + 0 + 5",
] as const;

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/-/g, "−")
    .replace(/^[−\-•]\s+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function openBookSection(page: Page, pageId: string, section: number, grade = "g2") {
  await page.goto(`/learning/book/math/${grade}/${pageId}`);
  await page.getByRole("heading").first().waitFor();
  await expect(page.locator("[data-book-scroll]")).toBeVisible();

  for (let current = 1; current < section; current += 1) {
    const next = page
      .getByRole("navigation", { name: "ניווט בין עמודים בנושא" })
      .getByRole("button", { name: "עמוד הבא" });
    await next.scrollIntoViewIfNeeded();
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.getByText(`עמוד ${current + 1} מתוך`, { exact: false })).toBeVisible();
  }
}

async function getRouteLevelText(page: Page) {
  return page.locator("[data-book-scroll]").evaluate((root) => {
    const normalize = (value: string) =>
      value
        .replace(/\u00a0/g, " ")
        .replace(/-/g, "−")
        .replace(/^[−\-•]\s+/u, "")
        .replace(/\s+/g, " ")
        .trim();

    function collectVisualRows() {
      const rows: string[] = [];
      const lineRoots = Array.from(
        root.querySelectorAll<HTMLElement>(
          ".book-mixed-hebrew-math, .book-equation-display-row"
        )
      );

      for (const line of lineRoots) {
        const pieces: {
          text: string;
          top: number;
          left: number;
          right: number;
        }[] = [];

        const addPiece = (text: string, rect: DOMRect) => {
          if (!text || rect.width === 0) return;
          pieces.push({
            text,
            top: Math.round(rect.top),
            left: rect.left,
            right: rect.right,
          });
        };

        const collectNode = (node: Node) => {
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
          const el = node as HTMLElement;
          if (
            el.matches("[data-book-label], [data-book-prose-run], [data-book-math-run], code")
          ) {
            const rect = el.getBoundingClientRect();
            addPiece(el.innerText || el.textContent || "", rect);
            return;
          }

          for (const child of Array.from(el.childNodes)) collectNode(child);
        };

        for (const child of Array.from(line.childNodes)) collectNode(child);

        const normalizedPieces = pieces
          .map((piece) => {
            return {
              ...piece,
              text: piece.text.replace(/\u00a0/g, " "),
            };
          })
          .filter((p) => p.text);

        if (!normalizedPieces.length) {
          const fallback = normalize(line.innerText || line.textContent || "");
          if (fallback) rows.push(fallback);
          continue;
        }

        const byLine = new Map<number, typeof normalizedPieces>();
        for (const piece of normalizedPieces) {
          const key = [...byLine.keys()].find((top) => Math.abs(top - piece.top) <= 3);
          const groupKey = key ?? piece.top;
          const group = byLine.get(groupKey) ?? [];
          group.push(piece);
          byLine.set(groupKey, group);
        }

        for (const group of byLine.values()) {
          const visual = group
            .sort((a, b) => b.right - a.right || b.left - a.left)
            .map((p) => p.text)
            .join("");
          if (visual) rows.push(normalize(visual));
        }
      }

      return rows;
    }

    return {
      domText: normalize((root as HTMLElement).innerText || root.textContent || ""),
      visualRows: collectVisualRows(),
    };
  });
}

async function getRenderedDiagramAndAnswerBlock(page: Page, answerText: string) {
  return page.locator("[data-book-scroll]").evaluate((root, expectedAnswer) => {
    const normalize = (value: string) =>
      value
        .replace(/\u00a0/g, " ")
        .replace(/-/g, "−")
        .replace(/^[−\-•]\s+/u, "")
        .replace(/\s+/g, " ")
        .trim();

    const diagram = root.querySelector<HTMLElement>('[role="img"][aria-label="דוגמה"]');
    const diagramRows = diagram
      ? Array.from(diagram.querySelectorAll<HTMLElement>("[data-book-diagram-line]")).map(
          (line) => ({
            text: normalize(line.innerText || line.textContent || ""),
            renderer: line.querySelector(".book-mixed-hebrew-math")
              ? "structured-mixed"
              : line.querySelector("[data-book-vertical-arithmetic]")
                ? "vertical-arithmetic"
                : line.querySelector("bdi")
                  ? "raw-bdi"
                  : "unknown",
          })
        )
      : [];

    const answerLines = Array.from(root.querySelectorAll<HTMLElement>(".book-mixed-hebrew-math"))
      .map((line) => normalize(line.innerText || line.textContent || ""))
      .filter((text) => text === expectedAnswer);

    if (!answerLines.length) {
      const scrollText = normalize(root.innerText || root.textContent || "");
      if (scrollText.includes(expectedAnswer)) {
        answerLines.push(expectedAnswer);
      }
    }

    const uniqueAnswers = [...new Set(answerLines)];

    return {
      lines: [...diagramRows.map((row) => row.text), ...uniqueAnswers],
      diagramRenderers: diagramRows.map((row) => row.renderer),
    };
  }, answerText);
}

type DiagramVisualRow = {
  innerText: string;
  visualText: string;
  mathLeft: number | null;
  mathRight: number | null;
  labelRight: number | null;
  labelToMathGapPx: number | null;
  proseToMathGapPx: number | null;
};

async function getDiagramVisualLayout(page: Page): Promise<DiagramVisualRow[]> {
  return page.locator('[role="img"][aria-label="דוגמה"]').evaluate((diagram) => {
    const normalize = (value: string) =>
      value
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return Array.from(diagram.querySelectorAll<HTMLElement>("[data-book-diagram-line]")).map(
      (row) => {
        const label = row.querySelector<HTMLElement>("[data-book-label]");
        const gap = row.querySelector<HTMLElement>("[data-book-label-gap]");
        const math = row.querySelector<HTMLElement>("[data-book-math-run]");
        const prose = row.querySelector<HTMLElement>("[data-book-prose-run]");

        const pieces: { text: string; right: number }[] = [];
        const add = (el: HTMLElement | null) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          pieces.push({
            text: (el.textContent || "").replace(/\u00a0/g, " "),
            right: rect.right,
          });
        };

        add(label);
        add(gap);
        add(math);
        add(prose);

        const visualText = normalize(
          pieces
            .sort((a, b) => b.right - a.right)
            .map((piece) => piece.text)
            .join("")
        );

        const labelRect = label?.getBoundingClientRect();
        const mathRect = math?.getBoundingClientRect();
        const proseRect = prose?.getBoundingClientRect();

        return {
          innerText: normalize(row.innerText || row.textContent || ""),
          visualText,
          mathLeft: mathRect ? Math.round(mathRect.left) : null,
          mathRight: mathRect ? Math.round(mathRect.right) : null,
          labelRight: labelRect ? Math.round(labelRect.right) : null,
          labelToMathGapPx:
            labelRect && mathRect
              ? Math.round(labelRect.left - mathRect.right)
              : null,
          proseToMathGapPx:
            mathRect && proseRect
              ? Math.round(mathRect.left - proseRect.right)
              : null,
        };
      }
    );
  });
}

async function getStructuredLineTexts(page: Page) {
  return page.locator("[data-book-scroll]").evaluate((root) => {
    const normalize = (value: string) =>
      value
        .replace(/\u00a0/g, " ")
        .replace(/-/g, "−")
        .replace(/^[−\-•]\s+/u, "")
        .replace(/\s+/g, " ")
        .trim();

    const lines = Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-book-example-title], [data-book-place-value-equation], .book-mixed-hebrew-math, [data-book-diagram-line]"
      )
    )
      .map((line) => normalize(line.innerText || line.textContent || ""))
      .filter(Boolean);

    return lines;
  });
}

function expectExactOrderedBlock(actualLines: string[], expectedBlock: string[]) {
  const expected = expectedBlock.map(normalizeText);
  const visibleContentLines = actualLines
    .map(normalizeText)
    .filter((line) => line && !/[★●✕]/u.test(line));
  const start = visibleContentLines.findIndex((line) => line === expected[0]);
  expect(
    start,
    `missing first block line "${expected[0]}" in ${JSON.stringify(visibleContentLines)}`
  ).toBeGreaterThanOrEqual(0);
  expect(visibleContentLines.slice(start, start + expected.length)).toEqual(expected);
}

test.describe("Grade 2 math learning book route-level BiDi regressions", () => {
  test.beforeAll(async () => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
  });

  for (const route of REQUIRED_ROUTES) {
    test(`${route.title}: route text is child-visible in correct order`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openBookSection(page, route.pageId, route.section);

      const routeText = await getRouteLevelText(page);
      const searchable = normalizeText([
        routeText.domText,
        ...routeText.visualRows,
      ].join("\n"));

      for (const expected of route.expected) {
        expect(searchable, `${route.pageId} section ${route.section}`).toContain(
          normalizeText(expected)
        );
      }

      for (const forbidden of [...OWNER_FORBIDDEN, ...route.forbidden]) {
        expect(searchable, `${route.pageId} section ${route.section}`).not.toContain(
          normalizeText(forbidden)
        );
      }

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/g2-${route.pageId}-section-${route.section}.png`,
        fullPage: true,
      });
    });
  }

  test("חיבור עם נשיאה: exact ordered explanation block uses one structured renderer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBookSection(page, "add_two", 3);

    const block = await getRenderedDiagramAndAnswerBlock(page, "58 + 37 = 95");
    expect(block.lines).toEqual([
      "50 + 8 = 58",
      "30 + 7 = 37",
      "עשרות: 50 + 30 = 80",
      "אחדות: 8 + 7 = 15 → 5, נשיאה 1",
      "סה״כ: 80 + 15 = 95",
      "58 + 37 = 95",
    ]);
    expect(new Set(block.diagramRenderers)).toEqual(new Set(["structured-mixed"]));

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/g2-add_two-section-3-exact-block.png`,
      fullPage: true,
    });
  });

  test("חיבור עם נשיאה: diagram layout keeps one math column and label gaps", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBookSection(page, "add_two", 3);

    const layout = await getDiagramVisualLayout(page);
    expect(layout).toHaveLength(5);

    const pureMathRows = layout.filter(
      (row) => row.innerText === "50 + 8 = 58" || row.innerText === "30 + 7 = 37"
    );
    const labeledRows = layout.filter((row) => /^(עשרות|אחדות|סה״כ):/.test(row.innerText));

    expect(pureMathRows).toHaveLength(2);
    expect(labeledRows).toHaveLength(3);

    const baselineMathRight = pureMathRows[0]?.mathRight;
    expect(baselineMathRight, "pure math row missing math-run box").not.toBeNull();

    for (const row of labeledRows) {
      expect(
        row.mathRight,
        `labeled row "${row.innerText}" math column drift`
      ).not.toBeNull();
      expect(
        Math.abs((row.mathRight as number) - (baselineMathRight as number)),
        `math column misaligned for "${row.innerText}"`
      ).toBeLessThanOrEqual(4);
    }

    const tensRow = layout.find((row) => row.innerText.startsWith("עשרות:"));
    expect(tensRow?.labelToMathGapPx ?? 0).toBeGreaterThanOrEqual(4);
    expect(tensRow?.visualText).toMatch(/^עשרות:\s+50 \+ 30 = 80$/);

    const onesRow = layout.find((row) => row.innerText.startsWith("אחדות:"));
    expect(onesRow?.visualText).toMatch(/^אחדות:\s+8 \+ 7 = 15 → 5,\s*נשיאה 1$/);
    expect(onesRow?.proseToMathGapPx ?? 99).toBeLessThanOrEqual(8);

    await page.locator('[role="img"][aria-label="דוגמה"]').screenshot({
      path: `${SCREENSHOT_DIR}/g2-add_two-section-3-diagram-layout.png`,
    });
  });

  test("חיסור: diagram decomposition rows are parts-first and compact", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBookSection(page, "sub_two", 3);

    const layout = await getDiagramVisualLayout(page);
    expect(layout.map((row) => row.innerText)).toEqual([
      "60 + 8 = 68",
      "20 + 4 = 24",
      "עשרות: 60 − 20 = 40",
      "אחדות: 8 − 4 = 4",
      "סה״כ: 40 + 4 = 44",
    ]);

    for (const forbidden of ["68 = 60 + 8", "24 = 20 + 4"]) {
      expect(layout.some((row) => row.innerText === forbidden)).toBe(false);
    }

    const tensRow = layout.find((row) => row.innerText.startsWith("עשרות:"));
    expect(tensRow?.labelToMathGapPx ?? 0).toBeGreaterThanOrEqual(4);
    expect(tensRow?.visualText).toMatch(/^עשרות:\s+60 − 20 = 40$/);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/g2-sub_two-section-3-exact-block.png`,
      fullPage: true,
    });

    await page.locator('[role="img"][aria-label="דוגמה"]').screenshot({
      path: `${SCREENSHOT_DIR}/g2-sub_two-section-3-diagram-layout.png`,
    });
  });

  test("חיסור: exact ordered explanation block uses one structured renderer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBookSection(page, "sub_two", 3);

    const block = await getRenderedDiagramAndAnswerBlock(page, "68 − 24 = 44");
    expect(block.lines).toEqual([
      "60 + 8 = 68",
      "20 + 4 = 24",
      "עשרות: 60 − 20 = 40",
      "אחדות: 8 − 4 = 4",
      "סה״כ: 40 + 4 = 44",
      "68 − 24 = 44",
    ]);
    expect(new Set(block.diagramRenderers)).toEqual(new Set(["structured-mixed"]));
  });

  for (const blockCase of [
    {
      title: "חיבור מאונך",
      pageId: "add_vertical",
      section: 3,
      expected: [
        "אחדות: 7 + 8 = 15 → כותבים 5, מעבירים 1 לעשרות",
        "עשרות: 4 + 2 + 1 (נשיאה) = 7",
        "47 + 28 = 75",
      ],
    },
    {
      title: "חיסור עם השאלה",
      pageId: "sub_vertical",
      section: 3,
      expected: [
        "באחדות 2 קטן מ-7 → מחליפים עשרה: 52 → 42 + 12 (4 עשרות, 12 אחדות)",
        "אחדות: 12 − 7 = 5",
        "עשרות: 4 − 2 = 2",
        "52 − 27 = 25",
      ],
    },
    {
      title: "כפל קבוצות",
      pageId: "mul",
      section: 3,
      expected: ["4 × 6 = 24", "חיבור חוזר: 6 + 6 + 6 + 6 = 24"],
    },
    {
      title: "זוגי ואי-זוגי",
      pageId: "ns_even_odd",
      section: 3,
      expected: [
        "24 - זוגי:",
        "לכל כוכב יש שותף → 24 זוגי.",
        "35 - אי-זוגי:",
        "נשאר כוכב אחד לבד → 35 אי-זוגי.",
        "טיפ: ב-35 הספרה האחרונה היא 5 → אי-זוגי.",
      ],
    },
    {
      title: "ציר מספרים",
      pageId: "ns_neighbors",
      section: 3,
      expected: ["248 − 1 = 247", "248 + 1 = 249"],
    },
    {
      title: "עשרות ואחדות",
      pageId: "ns_place_tens_units",
      section: 3,
      expected: [
        "1 מאה + 2 עשרות + 4 אחדות = 124",
        "100 + 20 + 4 = 124",
        "דוגמה נוספת - 405:",
        "4 מאות, 0 עשרות, 5 אחדות",
        "400 + 0 + 5 = 405",
      ],
    },
    {
      title: "השוואות",
      pageId: "cmp",
      section: 3,
      expected: [
        "מאות: 6 = 6 → שוות, ממשיכים",
        "עשרות: 1 < 2",
        "612 קטן מ-628, לכן: 612 < 628",
      ],
    },
  ]) {
    test(`${blockCase.title}: exact ordered explanation block`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openBookSection(page, blockCase.pageId, blockCase.section);

      const lines = await getStructuredLineTexts(page);
      expectExactOrderedBlock(lines, blockCase.expected);
    });
  }

  for (const contract of [
    {
      renderer: "BookVerticalArithmetic",
      pageId: "add_vertical",
      section: 3,
      selector: "[data-book-vertical-arithmetic]",
      expected: ["47", "+ 28", "75", "47 + 28 = 75"],
      forbidden: ["7547 + 28", "4752", "5030"],
    },
    {
      renderer: "BookVerticalArithmetic",
      pageId: "sub_vertical",
      section: 3,
      selector: "[data-book-vertical-arithmetic]",
      expected: ["52", "− 27", "25", "52 − 27 = 25"],
      forbidden: ["2552", "5227", "4752"],
    },
    {
      renderer: "BookPlaceValueEquation",
      pageId: "ns_place_tens_units",
      section: 3,
      selector: "[data-book-place-value-equation]",
      expected: ["100 + 20 + 4 = 124", "400 + 0 + 5 = 405"],
      forbidden: ["124 = 100 + 20 + 4", "405 = 400 + 0 + 5"],
    },
    {
      renderer: "NumberLineRow",
      pageId: "ns_neighbors",
      section: 3,
      selector: "[dir='ltr']",
      expected: ["246", "247", "248", "249", "250"],
      forbidden: ["137 + 6", "10 + 133"],
    },
    {
      renderer: "PlaceValueDiagram",
      pageId: "ns_place_tens_units",
      section: 3,
      selector: "[aria-label='טבלת ערך מקום']",
      expected: ["מאות", "עשרות", "אחדות", "1", "2", "4"],
      forbidden: ["124 = 100 + 20 + 4", "405 = 400 + 0 + 5"],
    },
    {
      renderer: "object visual rows",
      pageId: "mul",
      section: 3,
      selector: "[role='img'][aria-label='דוגמה']",
      expected: ["4 × 6 = 24", "חיבור חוזר: 6 + 6 + 6 + 6 = 24"],
      forbidden: ["246 + 6 + 6", "24זוגי"],
    },
    {
      renderer: "card visual rows",
      pageId: "wp_groups_g2",
      section: 3,
      selector: "[role='img'][aria-label='דוגמה']",
      expected: ["5 × 4 = 20"],
      forbidden: ["2552", "5030"],
    },
    {
      renderer: "coin visual rows",
      pageId: "wp_coins",
      section: 3,
      selector: "[role='img'][aria-label='דוגמה']",
      expected: ["4 × 5 = 20"],
      forbidden: ["24זוגי", "5030"],
    },
    {
      renderer: "BookExampleTitleLine",
      pageId: "add_two",
      section: 3,
      selector: "[data-book-example-title]",
      expected: ["58 + 37", "פירוק לעשרות ואחדות"],
      forbidden: ["3758", "58 + 37פירוק"],
    },
    {
      renderer: "FrameDiagram",
      pageId: "ns_complement10",
      section: 3,
      selector: "[role='img'][aria-label='דוגמה']",
      expected: [
        "7 מקומות מלאים",
        "3 מקומות ריקים",
        "7 + 3 = 10",
      ],
      forbidden: ["37 מקומות", "73 מקומות", "5030", "3020"],
      noLtrHebrewPhrase: true,
    },
  ]) {
    test(`${contract.renderer} ${contract.grade || "g2"}/${contract.pageId}/${contract.section}: specialized renderer DOM contract`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openBookSection(page, contract.pageId, contract.section, contract.grade || "g2");

      const target = page.locator(contract.selector).first();
      await expect(target).toBeVisible();
      const text = normalizeText(await page.locator("[data-book-scroll]").innerText());
      const targetText = normalizeText(await target.innerText());
      const searchable = `${text} ${targetText}`;

      for (const expected of contract.expected) {
        expect(searchable, contract.renderer).toContain(normalizeText(expected));
      }
      for (const forbidden of contract.forbidden) {
        expect(searchable, contract.renderer).not.toContain(normalizeText(forbidden));
      }
      if (contract.noLtrHebrewPhrase) {
        const ltrHebrewPhrases = await target.evaluate((root) =>
          Array.from(root.querySelectorAll<HTMLElement>("[dir='ltr'], bdi"))
            .map((el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim())
            .filter((text) => /[\u0590-\u05FF]+\s+[\u0590-\u05FF]+/u.test(text))
        );
        expect(ltrHebrewPhrases, contract.renderer).toEqual([]);
      }
    });
  }
});
