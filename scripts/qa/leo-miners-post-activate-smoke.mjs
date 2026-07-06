/**
 * Post-activation smoke for Leo Miners.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import {
  applyStudentSessionFromLogin,
  tryLoadE2EStudentEnvFromDotenv,
} from "../e2e-lib/hebrew-e2e-student-auth.mjs";

tryLoadE2EStudentEnvFromDotenv();
const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:3001";

function loadEnv(name) {
  const p = join(dirname(fileURLToPath(import.meta.url)), "..", "..", name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const eq = s.indexOf("=");
    if (eq === -1) continue;
    const key = s.slice(0, eq).trim();
    if (process.env[key]) continue;
    let val = s.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env.e2e.local");

const report = { checks: {} };
function pass(k, n = "") { report.checks[k] = { status: "PASS", note: n }; }
function fail(k, n = "") { report.checks[k] = { status: "FAIL", note: n }; }

async function api(ctx, path) {
  const res = await ctx.request.get(`${BASE}${path}`);
  const json = await res.json().catch(() => ({}));
  return { status: res.status(), json };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "he-IL" });
process.env.E2E_STUDENT_PIN = process.env.E2E_STUDENT_PIN || "1234";
process.env.E2E_STUDENT_USERNAME = process.env.E2E_STUDENT_USERNAME || "leo-s01";
await applyStudentSessionFromLogin(ctx, BASE);
const page = await ctx.newPage();

try {
  const access = await api(ctx, "/api/student/game-access");
  const lm = (access.json?.games || []).find((g) => g.gameKey === "leo-miners");
  if (lm?.playable && lm?.isEnabled) pass("game_on_hub", `accessState=${lm.accessState}`);
  else fail("game_on_hub", JSON.stringify(lm));

  const state = await api(ctx, "/api/student/leo-miners/state");
  report.state = {
    gameEnabled: state.json?.gameEnabled,
    economyEnabled: state.json?.economyEnabled,
    catalogEnabled: state.json?.catalogEnabled,
  };
  if (state.json?.gameEnabled && state.json?.economyEnabled) pass("server_flags_on");
  else fail("server_flags_on", JSON.stringify(report.state));

  await page.goto(`${BASE}/student/solo-games/leo-miners`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#miners-canvas", { timeout: 45_000 });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();

  if (!/המשחק כבוי כרגע/.test(body)) pass("no_disabled_banner");
  else fail("no_disabled_banner");

  const english = ["Close", "CLAIM", "Vault", "COLLECT", "Gift Phases", "Auto-Dog"].filter((w) =>
    body.includes(w)
  );
  if (english.length === 0) pass("no_english");
  else fail("no_english", english.join(", "));

  if (!/רקע \(פיתוח\)|סלע \(פיתוח\)/.test(body)) pass("no_dev_pickers");
  else fail("no_dev_pickers", "dev pickers visible");

  if (await page.getByRole("button", { name: "מימוש" }).count()) pass("claim_button");
  else fail("claim_button");

  await page.goto(`${BASE}/game`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const hub = await page.locator("body").innerText();
  if (/ליאו הכורה|leo-miners|כורים/i.test(hub) || /הכורה/.test(hub)) pass("visible_on_game_hub");
  else fail("visible_on_game_hub", hub.slice(0, 400));
} catch (e) {
  fail("runner", e?.message || String(e));
}

await ctx.close();
await browser.close();

console.log(JSON.stringify(report, null, 2));
const failed = Object.values(report.checks).some((c) => c.status === "FAIL");
process.exit(failed ? 1 : 0);
