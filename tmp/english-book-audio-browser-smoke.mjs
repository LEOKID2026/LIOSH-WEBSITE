/**
 * Browser smoke — English book section audio playback.
 * Run: node tmp/english-book-audio-browser-smoke.mjs
 */
import { chromium } from "playwright";

const BASE = (process.env.QA_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "book-audio-smoke", full_name: "BookSmoke", grade_level: 1, is_active: true },
      }),
    });
  });
}

async function testBookPage(page, path, label) {
  const audioResponses = [];
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/audio/learning-books/english/") && u.includes(".mp3")) {
      audioResponses.push({ url: u, status: res.status(), len: res.headers()["content-length"] || null });
    }
  });

  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByText("בודק התחברות תלמיד").waitFor({ state: "hidden", timeout: 45000 }).catch(() => {});
  const playBtn = page.getByRole("button", { name: /האזנה לעמוד|טוען שמע/ });
  await playBtn.first().waitFor({ state: "visible", timeout: 60000 });
  await playBtn.first().click();
  await page.waitForTimeout(2500);
  const err = await page.getByText("לא ניתן לטעון את השמע כרגע").isVisible().catch(() => false);
  return {
    label,
    path,
    playButton: true,
    errorVisible: err,
    audioResponses: audioResponses.slice(0, 3),
    pass: !err && audioResponses.some((r) => r.status === 200 && Number(r.len || 0) > 500),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await mockStudent(page);

  const g1Letters = await testBookPage(page, "/learning/book/english/g1/letters_upper", "g1 letters_upper");
  const g1Listening = await testBookPage(page, "/learning/book/english/g1/listening_commands", "g1 listening_commands");
  const g2Review = await testBookPage(page, "/learning/book/english/g2/letters_review", "g2 letters_review");

  await browser.close();
  const pass = g1Letters.pass && g1Listening.pass && g2Review.pass;
  console.log(JSON.stringify({ status: pass ? "PASS" : "FAIL", g1Letters, g1Listening, g2Review }, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
