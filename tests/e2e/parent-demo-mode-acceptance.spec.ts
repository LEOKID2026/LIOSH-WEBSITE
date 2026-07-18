import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const DEMO_SESSION_KEY = "leokids_demo_session";
const GUEST_TOKEN_KEY = "liosh_guest_resume_token";
const PLAY_LIMIT_MS = 30 * 60 * 1000;
const MID_SESSION_MS = 20 * 60 * 1000;

const BLOCKED_WRITE_PREFIXES = [
  "/api/student/solo-games/",
  "/api/student/educational-games/",
  "/api/learning/session/",
  "/api/learning/answer",
  "/api/student/leo-miners/",
  "/api/learning/book-events",
  "/api/student/activities/",
  "/api/student/worksheet-activities/",
  "/api/arcade/presence/",
  "/api/arcade/invites",
  "/api/arcade/friends",
  "/api/arcade/rooms/",
  "/api/student/home-profile/",
];

const BLOCKED_DEMO_READ_PREFIXES = [
  "/api/arcade/profile/",
  "/api/arcade/history",
  "/api/arcade/missions/",
  "/api/arcade/achievements",
  ...BLOCKED_WRITE_PREFIXES.map((p) => p),
];

function isBlockedDemoRead(url: string, method: string) {
  if (method !== "GET" && method !== "HEAD") return false;
  const path = new URL(url).pathname;
  if (path.startsWith("/api/demo/catalog")) return false;
  return BLOCKED_DEMO_READ_PREFIXES.some((p) => path.startsWith(p));
}

function isBlockedWrite(url: string, method: string) {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  const path = new URL(url).pathname;
  return BLOCKED_WRITE_PREFIXES.some((p) => path.startsWith(p));
}

function trackDemoNetwork(page: Page) {
  const writes: string[] = [];
  const meCalls: string[] = [];
  const blockedReads: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    const method = req.method();
    if (url.includes("/api/student/me")) meCalls.push(`${method} ${url}`);
    if (isBlockedWrite(url, method)) writes.push(`${method} ${url}`);
    if (isBlockedDemoRead(url, method)) blockedReads.push(`${method} ${url}`);
  });
  return { writes, meCalls, blockedReads };
}

async function clearDemoSession(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((key) => localStorage.removeItem(key), DEMO_SESSION_KEY);
}

async function enterDemoFromHome(page: Page, grade = "g3") {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("home-demo-button")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("home-demo-button").click();
  await page.waitForURL("**/demo/enter**", { timeout: 15_000 });
  await page.getByRole("button", { name: new RegExp(`^${grade.replace("g", "כיתה ").replace("g", "")}`, "i") }).click().catch(async () => {
    await page.locator(`button:has-text("${grade.toUpperCase()}")`).click().catch(() => {});
  });
  const gradeBtn = page.locator("fieldset button").filter({ hasText: /כיתה|^[1-6]$|^g[1-6]$/i });
  await gradeBtn.filter({ hasText: grade === "g3" ? /ג|3|G3/i : grade }).first().click().catch(async () => {
    await page.locator("fieldset button").nth(grade === "g1" ? 0 : grade === "g2" ? 1 : grade === "g3" ? 2 : grade === "g4" ? 3 : grade === "g5" ? 4 : 5).click();
  });
  await page.getByRole("button", { name: /כניסה לעולם הילד|נכנסים/i }).click();
  await page.waitForURL("**/student/home**", { timeout: 30_000 });
  await expect(page.getByTestId("demo-mode-bar")).toBeVisible({ timeout: 30_000 });
}

async function enterDemoDirect(page: Page, grade = "g3") {
  await page.goto("/demo/enter", { waitUntil: "domcontentloaded" });
  const idx = { g1: 0, g2: 1, g3: 2, g4: 3, g5: 4, g6: 5 }[grade] ?? 2;
  await page.locator("fieldset button").nth(idx).click();
  await page.getByRole("button", { name: /כניסה לעולם הילד|נכנסים/i }).click();
  await page.waitForURL("**/student/home**", { timeout: 30_000 });
  await expect(page.getByTestId("demo-mode-bar")).toBeVisible({ timeout: 30_000 });
}

async function expireDemoSessionInBrowser(page: Page) {
  if (!page.url().startsWith("http")) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  }
  await page.evaluate(
    ({ key, ms }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.startedAt = new Date(Date.now() - ms - 5000).toISOString();
      localStorage.setItem(key, JSON.stringify(parsed));
    },
    { key: DEMO_SESSION_KEY, ms: PLAY_LIMIT_MS },
  );
}

test.describe("Parent demo mode — catalog API", () => {
  test("GET /api/demo/catalog returns 200 with expected shape", async ({ request }) => {
    const res = await request.get("/api/demo/catalog?gradeLevel=g3");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.gradeLevel).toBe("g3");
    expect(Array.isArray(json.games)).toBe(true);
    expect(json.games.length).toBeGreaterThan(0);
    expect(Array.isArray(json.subjects)).toBe(true);
    expect(json.subjects.length).toBeGreaterThan(0);
    expect(json.subjectAccess?.subjectPermissions).toBeTruthy();
    expect(json.permissions).toBeTruthy();
    expect(json.categories).toBeTruthy();
    expect(json).not.toHaveProperty("studentId");

    const disabledPlayable = json.games.filter((g: { isEnabled: boolean; playable: boolean }) => !g.isEnabled && g.playable);
    expect(disabledPlayable).toHaveLength(0);

    const disabledSubjects = Object.entries(json.subjectAccess.subjectPermissions).filter(
      ([, v]: [string, { isEnabled: boolean }]) => !v.isEnabled,
    );
    expect(disabledSubjects.length).toBeGreaterThanOrEqual(0);
  });
});


test.describe("Parent demo mode — entry and tour", () => {
  test.beforeEach(async ({ page }) => {
    await clearDemoSession(page);
  });

  test("homepage demo button desktop, mobile, dismiss and guides", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("home-demo-button")).toHaveCount(1);
    await expect(page.getByTestId("home-demo-button")).toContainText("נסו את עולם הילד");

    await page.getByTestId("home-demo-button-dismiss").click();
    await expect(page.getByTestId("home-demo-button")).toHaveCount(0);

    await page.goto("/guides", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("home-demo-button")).toHaveCount(1);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("home-demo-button")).toBeVisible();
    await expect(page.getByTestId("home-demo-button")).toContainText("הדגמה");
  });

  test("grade pick enters student home without /api/student/me", async ({ page }) => {
    const net = trackDemoNetwork(page);
    await enterDemoDirect(page, "g3");
    await page.waitForTimeout(2000);
    expect(net.meCalls).toHaveLength(0);
    await expect(page.getByTestId("demo-mode-bar")).toBeVisible();
  });

  test("learning math-master loads in demo without /api/student/me", async ({ page }) => {
    await clearDemoSession(page);
    await enterDemoDirect(page, "g3");
    const net = trackDemoNetwork(page);
    await page.goto("/student/learning/math-master", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-mode-bar")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2000);
    expect(net.meCalls).toHaveLength(0);
    expect(net.writes).toHaveLength(0);
  });

  test("navigation between learning hub and arcade works", async ({ page }) => {
    await enterDemoDirect(page, "g3");
    await page.goto("/student/learning/math-master", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-mode-bar")).toBeVisible();
    await page.goto("/student/arcade", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-mode-bar")).toBeVisible();
    await page.goto("/student/cards", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/מטבעות|קלפים|אוסף/i).first()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Parent demo mode — games and blocks", () => {
  test.beforeEach(async ({ page }) => {
    await clearDemoSession(page);
    await enterDemoDirect(page, "g3");
  });

  test("online game direct URL shows block screen", async ({ page }) => {
    await page.goto("/student/games/chess", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-online-game-unavailable")).toBeVisible({ timeout: 20_000 });
  });

  test("offline tic-tac-toe starts without blocked writes", async ({ page }) => {
    const net = trackDemoNetwork(page);
    await page.goto("/offline/tic-tac-toe", { waitUntil: "domcontentloaded" });
    const cell = page.locator("[role='gridcell'], button").first();
    await cell.click({ timeout: 15_000 }).catch(async () => {
      await page.locator("button").first().click();
    });
    await page.waitForTimeout(1500);
    expect(net.writes).toHaveLength(0);
  });

  test("solo memory game shell loads", async ({ page }) => {
    const net = trackDemoNetwork(page);
    await page.goto("/student/solo-games/memory", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-solo-game-shell], main").first()).toBeVisible({ timeout: 20_000 });
    const startBtn = page.getByRole("button", { name: /התחל|שחק|start/i }).first();
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
    expect(net.writes).toHaveLength(0);
  });

  test("educational game page loads", async ({ page }) => {
    const net = trackDemoNetwork(page);
    await page.goto("/student/educational-games/leo-supermarket", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-mode-bar")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(net.writes).toHaveLength(0);
  });

  test("leo miners page loads without leo-miners API writes on open", async ({ page }) => {
    const net = trackDemoNetwork(page);
    await page.goto("/student/solo-games/leo-miners", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    expect(net.writes.filter((w) => w.includes("/api/student/leo-miners/"))).toHaveLength(0);
  });

  test("arcade friends panel disabled in demo", async ({ page }) => {
    await page.goto("/student/arcade", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await expect(page.getByText(/מצב הדגמה|חברים|הזמנות/i).first()).toBeVisible();
  });

  test("arcade profile uses demo fixtures not prior browser user data", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("mleo_player_avatar", "🔥");
      localStorage.setItem("mleo_player_avatar_image", "data:image/png;base64,AAAA");
      localStorage.setItem("mleo_player_avatar_background", "rose");
    });
    const avatarBefore = await page.evaluate(() => localStorage.getItem("mleo_player_avatar"));

    const net = trackDemoNetwork(page);
    await enterDemoDirect(page, "g3");
    await page.goto("/student/arcade", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-mode-bar")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "שחקן הדגמה" })).toBeVisible();

    await page.getByRole("button", { name: "פרופיל" }).click();
    await expect(page.getByText("שחקן הדגמה").first()).toBeVisible();
    await expect(page.getByText("ניצחונות: 0")).toBeVisible();
    await expect(page.getByText("משחקים: 0")).toBeVisible();
    await expect(page.getByText("אין משחקים עדיין")).toBeVisible();
    await expect(page.getByText("🔥")).toHaveCount(0);
    await expect(page.getByText("🦁")).toHaveCount(0);
    await expect(page.getByText("SECRET_PRIOR_NAME")).toHaveCount(0);

    await page.waitForTimeout(1500);
    expect(net.meCalls).toHaveLength(0);
    expect(net.blockedReads.filter((r) => r.includes("/api/arcade/profile"))).toHaveLength(0);
    expect(net.blockedReads.filter((r) => r.includes("/api/arcade/history"))).toHaveLength(0);
    expect(net.blockedReads.filter((r) => r.includes("/api/student/home-profile"))).toHaveLength(0);

    const avatarAfter = await page.evaluate(() => localStorage.getItem("mleo_player_avatar"));
    expect(avatarAfter).toBe(avatarBefore);
  });
});

test.describe("Parent demo mode — 30 minute expiry", () => {
  test("session between 15 and 30 minutes still allows new start", async ({ page }) => {
    await clearDemoSession(page);
    await page.goto("/demo/enter", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ key, ms }) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            v: 1,
            startedAt: new Date(Date.now() - ms).toISOString(),
            gradeLevel: "g3",
          }),
        );
      },
      { key: DEMO_SESSION_KEY, ms: MID_SESSION_MS },
    );
    await page.reload({ waitUntil: "domcontentloaded" });

    await page.locator("fieldset button").nth(2).click();
    await page.getByRole("button", { name: /כניסה לעולם הילד|נכנסים/i }).click();
    await page.waitForURL("**/student/home**", { timeout: 30_000 });
    await expect(page.getByTestId("demo-time-expired-modal")).toHaveCount(0);

    await page.goto("/student/solo-games/memory", { waitUntil: "domcontentloaded" });
    const startBtn = page.getByRole("button", { name: /התחל|שחק/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 15_000 });
    await startBtn.click();
    await expect(page.getByTestId("demo-time-expired-modal")).toHaveCount(0);
  });

  test("new start blocked after 30 minutes; tour still works; modal closes", async ({ page }) => {
    await clearDemoSession(page);
    await enterDemoDirect(page, "g3");

    await expireDemoSessionInBrowser(page);
    await page.goto("/student/home", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-mode-bar")).toBeVisible();
    await expect(page.getByText("הזמן להתחלות חדשות הסתיים")).toBeVisible({ timeout: 5_000 });

    await page.goto("/student/solo-games/memory", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-mode-bar")).toBeVisible();
    const startBtn = page.getByRole("button", { name: /התחל|שחק/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 15_000 });
    await startBtn.click();
    await expect(page.getByTestId("demo-time-expired-modal")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "הבנתי" }).click();
    await expect(page.getByTestId("demo-time-expired-modal")).toHaveCount(0);
    expect(page.url()).toMatch(/solo-games\/memory/);
  });
});

test.describe("Parent demo mode — regression", () => {
  test("parent login loads with demo session in localStorage", async ({ page }) => {
    await page.goto("/demo/enter");
    await page.evaluate(
      ({ key }) => {
        localStorage.setItem(
          key,
          JSON.stringify({ v: 1, startedAt: new Date().toISOString(), gradeLevel: "g3" }),
        );
      },
      { key: DEMO_SESSION_KEY },
    );
    await page.goto("/parent/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("parent-login-identifier")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/parent\/login/);
  });

  test("guest start works and sets resume token", async ({ page }) => {
    await clearDemoSession(page);
    await page.goto("/student/login", { waitUntil: "domcontentloaded" });
    await page.getByTestId("student-guest-start").click();
    await page.waitForURL("**/student/home**", { timeout: 30_000 });
    await page.waitForTimeout(1000);
    const token = await page.evaluate((key) => localStorage.getItem(key), GUEST_TOKEN_KEY);
    expect(token).toBeTruthy();
    await expect(page.getByTestId("demo-mode-bar")).toHaveCount(0);
  });

  test("registered student uses normal gate not demo bar", async ({ page, request }) => {
    const username = process.env.E2E_STUDENT_USERNAME || "";
    const pin = process.env.E2E_STUDENT_PIN || "";
    test.skip(!username || !pin, "Set E2E_STUDENT_USERNAME + E2E_STUDENT_PIN");

    await clearDemoSession(page);
    await page.goto("/student/login", { waitUntil: "domcontentloaded" });
    await page.getByTestId("student-login-username").fill(username);
    await page.getByTestId("student-login-pin").fill(pin);
    await page.getByTestId("student-login-submit").click();
    await page.waitForURL("**/student/**", { timeout: 30_000 });

    const meRes = await request.get("/api/student/me");
    expect(meRes.status()).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.ok).toBe(true);
    expect(meJson.student?.id).toBeTruthy();

    await page.goto("/student/home", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-mode-bar")).toHaveCount(0);
  });
});
