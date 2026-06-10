import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function mock(page) {
  await page.route("**/api/student/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "x", full_name: "T", grade_level: 1, is_active: true, coin_balance: 0 },
      }),
    })
  );
  await page.route("**/api/student/learning-profile", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, studentId: "x", row: { subjects: { english: {} } }, derived: {} }),
    })
  );
  await page.route("**/api/learning/session/start", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  );
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newContext().then((c) => c.newPage());
await mock(page);
await page.goto(`${BASE}/learning/english-master`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.getByTestId("english-topic-select").selectOption("phonics");
await page.getByTestId("english-start-game").click();
await page.locator("[data-testid='english-question-stem']").first().waitFor({ state: "visible", timeout: 60000 });

for (let i = 0; i < 3; i++) {
  const stem = await page.locator("[data-testid='english-question-stem']").first().innerText();
  const opts = [];
  for (let idx = 0; idx < 4; idx++) {
    const btn = page.locator(`[data-testid='english-mcq-${idx}']`);
    if (await btn.isVisible().catch(() => false)) {
      opts.push({
        idx,
        text: await btn.innerText(),
        disabled: await btn.isDisabled(),
      });
    }
  }
  console.log(`before q${i}`, { stem, opts });
  await page.locator("[data-testid='english-mcq-0']").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('[data-testid="english-mcq-0"]')?.click());
  await page.waitForTimeout(600);
  const afterDisabled = await page.locator("[data-testid='english-mcq-0']").isDisabled();
  const feedback = await page.locator("body").innerText();
  console.log(`after q${i}`, { disabled: afterDisabled, hasWrong: /Wrong|Correct|שגוי|נכון/i.test(feedback) });
  await page.waitForTimeout(8000);
}
await browser.close();
