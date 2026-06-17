/**
 * One-off visual diagnosis for add_two section 3 (58 + 37).
 * No code changes — extracts visual order + bounding boxes from live DOM.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = (process.env.BIDI_QA_BASE_URL || "http://127.0.0.1:3118").replace(/\/$/, "");
const OUT = path.join(ROOT, "tmp", "diagnose-add-two-58-37.json");

async function main() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`${BASE}/learning/book/math/g2/add_two`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.locator("[data-book-scroll]").waitFor({ state: "attached", timeout: 60000 });
  const sectionButton = page.getByLabel("עמוד 3");
  await sectionButton.waitFor({ state: "attached", timeout: 60000 });
  await sectionButton.last().dispatchEvent("click");
  await page.waitForFunction(
    (expected) => document.body.innerText.includes(`עמוד ${expected} מתוך`),
    3,
    { timeout: 30000 }
  );
  await page.locator("[data-book-scroll]").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(800);

  const diagnosis = await page.locator("[data-book-scroll]").evaluate(() => {
    const normalize = (v) =>
      String(v || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const scrollRect = document.querySelector("[data-book-scroll]")?.getBoundingClientRect();
    const viewportW = document.documentElement.clientWidth;

    function collectPieces(root) {
      const pieces = [];
      const add = (el, role) => {
        const text = normalize(el.innerText || el.textContent || "");
        if (!text) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        pieces.push({
          role,
          text,
          dir: el.getAttribute("dir") || el.closest("[dir]")?.getAttribute("dir") || null,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          centerX: Math.round(rect.left + rect.width / 2),
        });
      };

      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = normalize(node.textContent || "");
          if (!text) return;
          const range = document.createRange();
          range.selectNodeContents(node);
          const rect = range.getClientRects()[0];
          range.detach();
          if (!rect || rect.width === 0) return;
          pieces.push({
            role: "text-node",
            text,
            dir: null,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            centerX: Math.round(rect.left + rect.width / 2),
          });
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node;
        if (
          el.matches(
            "[data-book-label], [data-book-label-gap], [data-book-prose-run], [data-book-math-run], [data-book-example-title], code, bdi"
          )
        ) {
          add(el, el.getAttribute("data-book-label")
            ? "label"
            : el.getAttribute("data-book-label-gap")
              ? "gap"
              : el.getAttribute("data-book-math-run")
                ? "math-run"
                : el.getAttribute("data-book-prose-run")
                  ? "prose-run"
                  : el.matches("[data-book-example-title]")
                    ? "title"
                    : el.matches("bdi")
                      ? "bdi"
                      : "other");
          return;
        }
        for (const child of Array.from(el.childNodes)) walk(child);
      };

      walk(root);
      return pieces;
    }

    function visualOrderFromPieces(pieces) {
      const byLine = new Map();
      for (const p of pieces) {
        const key = [...byLine.keys()].find((top) => Math.abs(top - p.top) <= 4);
        const groupKey = key ?? p.top;
        const group = byLine.get(groupKey) ?? [];
        group.push(p);
        byLine.set(groupKey, group);
      }

      const lines = [];
      for (const [top, group] of [...byLine.entries()].sort((a, b) => a[0] - b[0])) {
        const sorted = group.sort((a, b) => b.right - a.right || b.left - a.left);
        const visualText = sorted.map((p) => p.text).join("");
        const readingOrderRtl = sorted.map((p) => p.text).join(" ");
        const rightmost = sorted[0];
        const leftmost = sorted[sorted.length - 1];
        lines.push({
          top,
          visualText: normalize(visualText),
          readingOrderRtl,
          rightSide: rightmost?.text ?? null,
          leftSide: leftmost?.text ?? null,
          pieces: sorted.map((p) => ({
            role: p.role,
            text: p.text,
            dir: p.dir,
            left: p.left,
            right: p.right,
            centerX: p.centerX,
          })),
        });
      }
      return lines;
    }

    const diagram = document.querySelector('[role="img"][aria-label="דוגמה"]');
    const diagramLines = diagram
      ? [...diagram.querySelectorAll("[data-book-diagram-line]")].map((row, index) => {
          const rect = row.getBoundingClientRect();
          const pieces = collectPieces(row);
          const visual = visualOrderFromPieces(pieces);
          const mathRuns = [...row.querySelectorAll("[data-book-math-run]")].map((el) => ({
            text: normalize(el.innerText || el.textContent || ""),
            dir: el.getAttribute("dir"),
            left: Math.round(el.getBoundingClientRect().left),
            right: Math.round(el.getBoundingClientRect().right),
          }));
          const labels = [...row.querySelectorAll("[data-book-label]")].map((el) => ({
            text: normalize(el.innerText || el.textContent || ""),
            left: Math.round(el.getBoundingClientRect().left),
            right: Math.round(el.getBoundingClientRect().right),
          }));
          const labelBeforeMath =
            labels.length && mathRuns.length
              ? labels[0].right >= mathRuns[0].right
              : null;
          return {
            index,
            innerText: normalize(row.innerText || row.textContent || ""),
            rowDir: row.getAttribute("dir"),
            rowClass: row.className,
            rowRect: {
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
            },
            renderer: row.querySelector(".book-mixed-hebrew-math")
              ? "structured-mixed"
              : row.querySelector("bdi")
                ? "raw-bdi"
                : "unknown",
            labels,
            mathRuns,
            labelVisuallyBeforeMath: labelBeforeMath,
            visualLines: visual,
          };
        })
      : [];

    const title = document.querySelector("[data-book-example-title]");
    const answerLine = [...document.querySelectorAll(".book-mixed-hebrew-math")]
      .map((el) => normalize(el.innerText || el.textContent || ""))
      .filter((t) => t === "58 + 37 = 95");

    const allMixed = [...document.querySelectorAll(".book-mixed-hebrew-math")].map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        text: normalize(el.innerText || el.textContent || ""),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        inDiagram: Boolean(el.closest('[role="img"][aria-label="דוגמה"]')),
      };
    });

    return {
      route: "/learning/book/math/g2/add_two",
      section: 3,
      viewport: { width: viewportW, height: window.innerHeight },
      scrollRect: scrollRect
        ? {
            left: Math.round(scrollRect.left),
            right: Math.round(scrollRect.right),
            width: Math.round(scrollRect.width),
          }
        : null,
      title: title
        ? {
            innerText: normalize(title.innerText || title.textContent || ""),
            rect: (() => {
              const r = title.getBoundingClientRect();
              return {
                left: Math.round(r.left),
                right: Math.round(r.right),
                top: Math.round(r.top),
              };
            })(),
          }
        : null,
      diagramLines,
      answerLines: answerLine,
      allMixedLines: allMixed,
      domText: normalize(document.querySelector("[data-book-scroll]")?.innerText || ""),
    };
  });

  const shotPath = path.join(ROOT, "tmp", "diagnose-add-two-58-37.png");
  const diagram = page.locator('[role="img"][aria-label="דוגמה"]');
  if (await diagram.count()) {
    await diagram.screenshot({ path: shotPath });
  } else {
    await page.locator("[data-book-scroll]").screenshot({ path: shotPath });
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ baseUrl: BASE, diagnosis, screenshot: shotPath }, null, 2));

  console.log(JSON.stringify({ out: OUT, screenshot: shotPath, lineCount: diagnosis.diagramLines.length }, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
