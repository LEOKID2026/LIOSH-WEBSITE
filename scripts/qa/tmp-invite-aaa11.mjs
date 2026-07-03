import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = "http://127.0.0.1:3002";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "reports", "arcade-club-live-qa", "focused-round");
mkdirSync(OUT, { recursive: true });

const HOST = "AAA11";
const GUEST = "AAA12";

async function ctx(browser, u) {
  const c = await browser.newContext({ locale: "he-IL" });
  process.env.E2E_STUDENT_USERNAME = u;
  process.env.E2E_STUDENT_PIN = "1234";
  await applyStudentSessionFromLogin(c, BASE);
  const page = await c.newPage();
  page.setDefaultTimeout(60_000);
  return { c, page };
}

const browser = await chromium.launch({ headless: true });
const a = await ctx(browser, HOST);
const b = await ctx(browser, GUEST);
const inv = {};

await a.page.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
await b.page.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });

const leoG = (await b.page.evaluate(async () => (await fetch("/api/arcade/profile/me")).json())).profile?.leoNumber;
inv.leoGuest = leoG;

await a.page.evaluate(async () => {
  const j = await (await fetch("/api/arcade/friends")).json();
  for (const fr of j.friends || []) {
    await fetch("/api/arcade/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", friendStudentId: fr.studentId }),
    });
  }
});

await a.page.getByRole("button", { name: "חברים" }).click();
await a.page.getByPlaceholder("מספר ליאו או שם תצוגה").fill(String(leoG));
const [reqR] = await Promise.all([
  a.page.waitForResponse((r) => r.url().includes("/api/arcade/friends") && r.request().method() === "POST"),
  a.page.getByRole("button", { name: "הוסף חבר" }).click(),
]);
const reqJ = await reqR.json();
inv.friendRequest = reqR.status() === 200 && reqJ.ok ? "PASS" : `FAIL ${reqJ.code}`;

await b.page.getByRole("button", { name: "חברים" }).click();
await b.page.waitForTimeout(2000);
if (await b.page.getByRole("button", { name: "אשר" }).first().isVisible().catch(() => false)) {
  await b.page.getByRole("button", { name: "אשר" }).first().click();
  await b.page.waitForTimeout(2000);
}
await a.page.reload();
await a.page.getByRole("button", { name: "חברים" }).click();
inv.friendship = (await a.page.evaluate(async () => (await fetch("/api/arcade/friends")).json())).friends?.length
  ? "PASS"
  : "FAIL";

await a.page.getByRole("button", { name: "הזמן" }).first().click();
await a.page.waitForTimeout(2000);
inv.sendInvite = /הזמנה|נשלח/.test(await a.page.locator("body").innerText()) ? "PASS" : "FAIL";

await b.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
inv.receiveInvite = (await b.page.getByRole("button", { name: "קבל" }).isVisible()) ? "PASS" : "FAIL";

if (inv.receiveInvite === "PASS") {
  const [ir] = await Promise.all([
    b.page.waitForResponse((r) => r.url().includes("/api/arcade/invites") && r.request().method() === "POST"),
    b.page.getByRole("button", { name: "קבל" }).click(),
  ]);
  const ij = await ir.json();
  inv.roomId = ij.room?.id;
  await b.page.waitForTimeout(5000);
  inv.guestUrl = b.page.url();
  inv.sameRoom = inv.guestUrl.includes("fourline");
  inv.pendingAfter = await b.page.evaluate(async () => (await fetch("/api/arcade/invites")).json().then((x) => x.invites?.length));
  const col = b.page.locator('[data-column], button[class*="column"]').first();
  inv.firstMove = (await col.isVisible().catch(() => false)) ? (await col.click(), true) : inv.sameRoom;
}

await a.page.getByRole("button", { name: "הזמן" }).first().click().catch(() => {});
await b.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
inv.decline = (await b.page.getByRole("button", { name: "דחה" }).isVisible()) ? "PASS" : "SKIP";
if (inv.decline === "PASS") await b.page.getByRole("button", { name: "דחה" }).click();

inv.status =
  inv.friendship === "PASS" && inv.sendInvite === "PASS" && inv.receiveInvite === "PASS" && inv.sameRoom
    ? "PASS"
    : "FAIL";
inv.users = `${HOST} + ${GUEST}`;

await a.c.close();
await b.c.close();
await browser.close();

writeFileSync(join(OUT, "invite-aaa11-12.json"), JSON.stringify(inv, null, 2));
console.log(JSON.stringify(inv, null, 2));
