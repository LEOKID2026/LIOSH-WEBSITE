import { chromium } from "playwright";

const BASE = process.env.BIDI_QA_BASE_URL || "http://127.0.0.1:3140";

async function openSection(page, section) {
  await page.goto(`${BASE}/learning/book/math/g2/add_two`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-book-scroll]").waitFor({ state: "attached", timeout: 60000 });
  const btn = page.getByLabel(`עמוד ${section}`);
  await btn.last().dispatchEvent("click");
  await page.waitForFunction(
    (s) => document.body.innerText.includes(`עמוד ${s} מתוך`),
    section,
    { timeout: 30000 }
  );
}

async function getLayout(page) {
  return page.locator('[role="img"][aria-label="דוגמה"]').evaluate((diagram) => {
    const normalize = (v) => v.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    return [...diagram.querySelectorAll("[data-book-diagram-line]")].map((row) => {
      const label = row.querySelector("[data-book-label]");
      const gap = row.querySelector("[data-book-label-gap]");
      const math = row.querySelector("[data-book-math-run]");
      const prose = row.querySelector("[data-book-prose-run]");
      const pieces = [];
      for (const el of [label, gap, math, prose]) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        pieces.push({ text: (el.textContent || "").replace(/\u00a0/g, " "), right: rect.right, width: rect.width });
      }
      const visualText = normalize(pieces.sort((a, b) => b.right - a.right).map((p) => p.text).join(""));
      const lr = label?.getBoundingClientRect();
      const mr = math?.getBoundingClientRect();
      const pr = prose?.getBoundingClientRect();
      const gr = gap?.getBoundingClientRect();
      return {
        innerText: normalize(row.innerText || ""),
        visualText,
        mathRight: mr ? Math.round(mr.right) : null,
        labelToMathGapPx: lr && mr ? Math.round(lr.left - mr.right) : null,
        proseToMathGapPx: mr && pr ? Math.round(mr.left - pr.right) : null,
        gapWidth: gr ? Math.round(gr.width) : null,
        pieces,
      };
    });
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await openSection(page, 3);
const layout = await getLayout(page);
console.log(JSON.stringify(layout, null, 2));
await browser.close();
