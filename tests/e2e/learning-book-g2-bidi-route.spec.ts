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
    title: "חיסור שני מספרים — דוגמה מלאה",
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
] as const;

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/-/g, "−")
    .replace(/\s+/g, " ")
    .trim();
}

async function openBookSection(page: Page, pageId: string, section: number) {
  await page.goto(`/learning/book/math/g2/${pageId}`);
  await page.getByRole("heading").first().waitFor();
  await page.getByLabel(`עמוד ${section}`).click();
  await expect(page.locator("[data-book-scroll]")).toBeVisible();
}

async function getRouteLevelText(page: Page) {
  return page.locator("[data-book-scroll]").evaluate((root) => {
    const normalize = (value: string) =>
      value
        .replace(/\u00a0/g, " ")
        .replace(/-/g, "−")
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
});
