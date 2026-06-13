import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const BG_SNIPPET = "rgb(197, 232, 255)";

async function mockAuth(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ student: { id: "test", full_name: "Test", grade_level: 3 } }),
    });
  });
}

async function checkPage(page, path, selector, theme) {
  await page.addInitScript((t) => {
    localStorage.setItem("liosh_student_ui_theme", t);
  }, theme);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1500);
  return page.evaluate(
    ({ sel, bgSnippet }) => {
      const el = document.querySelector(sel) || document.body.firstElementChild;
      if (!el) return { error: "no element" };
      const cs = getComputedStyle(el);
      return {
        selector: sel,
        className: typeof el.className === "string" ? el.className.slice(0, 120) : null,
        hasInlineBg: Boolean(el.style.background || el.style.backgroundImage),
        bgImage: cs.backgroundImage.slice(0, 120),
        matchesBright: cs.backgroundImage.includes(bgSnippet),
      };
    },
    { sel: selector, bgSnippet: BG_SNIPPET }
  );
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await mockAuth(page);

  const cases = [
    ["/learning/math-master", '[dir="rtl"].h-dvh', "bright"],
    ["/learning/math-master", '[dir="rtl"].h-dvh', "classic"],
    ["/student/home", "div.min-h-\\[100svh\\]", "bright"],
    ["/learning", "div.min-h-\\[100svh\\]", "bright"],
    ["/games", "div.min-h-screen", "bright"],
  ];

  for (const [path, sel, theme] of cases) {
    const r = await checkPage(page, path, sel, theme);
    console.log(JSON.stringify({ path, theme, ...r }));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
