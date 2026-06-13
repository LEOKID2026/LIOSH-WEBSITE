import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function inspect() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.addInitScript(() => {
    localStorage.setItem("liosh_student_ui_theme", "bright");
  });

  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        student: { id: "test", full_name: "Test", grade_level: 3 },
      }),
    });
  });

  await page.goto(`${BASE}/learning/math-master`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector(".learning-master-fill", { timeout: 120000 });
  await page.waitForTimeout(2000);

  const report = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        id: el.id || null,
        className: typeof el.className === "string" ? el.className.slice(0, 200) : null,
        inlineBackground: el.style.background || el.style.backgroundImage || null,
        computedBackground: cs.background,
        computedBackgroundImage: cs.backgroundImage,
        computedBackgroundColor: cs.backgroundColor,
        rect: { w: el.clientWidth, h: el.clientHeight },
      };
    };

    const shell =
      document.querySelector('[dir="rtl"].h-dvh') ||
      document.querySelector('[dir="rtl"].flex.flex-col.h-dvh') ||
      Array.from(document.querySelectorAll("body *")).find((el) => {
        const c = el.className;
        return typeof c === "string" && c.includes("h-dvh") && c.includes("overflow-hidden");
      });

    const wrap = document.querySelector(".learning-master-fill");
    const body = document.body;
    const html = document.documentElement;
    const next = document.getElementById("__next");

    const chain = [];
    let node = wrap;
    while (node && node !== document.documentElement) {
      chain.push(pick(node));
      node = node.parentElement;
    }

    return {
      shell: pick(shell),
      wrap: pick(wrap),
      body: pick(body),
      html: pick(html),
      next: pick(next),
      chainFromWrap: chain,
      theme: localStorage.getItem("liosh_student_ui_theme"),
    };
  });

  console.log(JSON.stringify(report, null, 2));

  await page.screenshot({ path: "tmp/math-master-bg-check.png", fullPage: false });
  const sample = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const el = document.querySelector(".learning-master-fill")?.parentElement;
    if (!el) return null;
    // sample top-left gutter (40,40) on shell
    const rect = el.getBoundingClientRect();
    const x = Math.floor(rect.left + 20);
    const y = Math.floor(rect.top + 20);
    return { x, y, note: "shell top-left gutter color sampled via elementFromPoint" };
  });
  console.log("samplePoint", sample);

  await browser.close();
}

inspect().catch((e) => {
  console.error(e);
  process.exit(1);
});
