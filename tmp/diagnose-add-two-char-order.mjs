import { chromium } from "playwright";

const BASE = process.env.BIDI_QA_BASE_URL || "http://127.0.0.1:3130";

async function openSection(page, section) {
  await page.goto(`${BASE}/learning/book/math/g2/add_two`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-book-scroll]").waitFor({ state: "attached", timeout: 60000 });
  const btn = page.getByLabel(`עמוד ${section}`);
  await btn.waitFor({ state: "attached" });
  await btn.last().dispatchEvent("click");
  await page.waitForFunction(
    (s) => document.body.innerText.includes(`עמוד ${s} מתוך`),
    section,
    { timeout: 30000 }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await openSection(page, 3);

  const data = await page.evaluate(() => {
    function charBoxes(el) {
      const text = el.textContent || "";
      const chars = [];
      for (let i = 0; i < text.length; i++) {
        const range = document.createRange();
        range.setStart(el.firstChild || el, i);
        range.setEnd(el.firstChild || el, i + 1);
        const rect = range.getClientRects()[0];
        range.detach();
        if (!rect) continue;
        chars.push({
          ch: text[i],
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
      }
      return { logical: text, visualLtr: [...chars].sort((a, b) => a.left - b.left).map((c) => c.ch).join("") };
    }

    const rows = [...document.querySelectorAll("[data-book-diagram-line]")].map((row, idx) => {
      const math = row.querySelector("[data-book-math-run]");
      const label = row.querySelector("[data-book-label]");
      return {
        idx,
        innerText: (row.innerText || "").replace(/\u00a0/g, " "),
        label: label ? charBoxes(label) : null,
        math: math ? charBoxes(math) : null,
        mathHtml: math ? math.innerHTML.slice(0, 300) : null,
        mathDir: math?.getAttribute("dir"),
        rowDir: row.getAttribute("dir"),
      };
    });

    const title = document.querySelector("[data-book-example-title]");
    const titleMath = title?.querySelector("bdi");
    return {
      title: {
        innerText: title?.innerText,
        math: titleMath ? charBoxes(titleMath) : null,
      },
      rows,
    };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
