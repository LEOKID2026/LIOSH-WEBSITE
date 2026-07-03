import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = "http://127.0.0.1:3002";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "reports", "arcade-club-live-qa", "focused-round");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const cA = await browser.newContext();
const cB = await browser.newContext();
process.env.E2E_STUDENT_PIN = "1234";
process.env.E2E_STUDENT_USERNAME = "AAA11";
await applyStudentSessionFromLogin(cA, BASE);
process.env.E2E_STUDENT_USERNAME = "AAA12";
await applyStudentSessionFromLogin(cB, BASE);
const a = await cA.newPage();
const b = await cB.newPage();
a.setDefaultTimeout(60_000);
b.setDefaultTimeout(60_000);

const inv = { users: "AAA11 + AAA12" };

await a.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
await b.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });

await b.getByRole("button", { name: "חברים" }).click();
await b.waitForTimeout(1500);
const pend = await b.evaluate(async () => (await fetch("/api/arcade/friends")).json());
if (pend.pendingIncoming?.length) {
  inv.friendRequest = "PASS (pending existed)";
  await b.getByRole("button", { name: "אשר" }).first().click();
  await b.waitForTimeout(2000);
  inv.friendAccepted = "PASS";
} else inv.friendRequest = "FAIL no pending";

await a.reload();
await a.getByRole("button", { name: "חברים" }).click();
inv.friendship = (await a.evaluate(async () => (await fetch("/api/arcade/friends")).json())).friends?.length ? "PASS" : "FAIL";

await a.getByRole("button", { name: "הזמן" }).first().click();
await a.waitForTimeout(2000);
inv.sendInvite = /הזמנה|נשלח/.test(await a.locator("body").innerText()) ? "PASS" : "FAIL";

await b.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
await b.waitForTimeout(2000);
inv.receiveInvite = (await b.getByRole("button", { name: "קבל" }).isVisible()) ? "PASS" : "FAIL";

if (inv.receiveInvite === "PASS") {
  const [ir] = await Promise.all([
    b.waitForResponse((r) => r.url().includes("/api/arcade/invites") && r.request().method() === "POST"),
    b.getByRole("button", { name: "קבל" }).click(),
  ]);
  const ij = await ir.json();
  inv.roomId = ij.room?.id;
  inv.acceptStatus = ir.status();
  await b.waitForTimeout(5000);
  inv.guestUrl = b.url();
  inv.sameRoom = b.url().includes("fourline");
  inv.pendingAfter = await b.evaluate(async () => (await fetch("/api/arcade/invites")).json().then((x) => x.invites?.length ?? 0));
  const col = b.locator('[data-column], button[class*="column"]').first();
  inv.firstMove = (await col.isVisible().catch(() => false)) && (await col.click(), true);
}

await a.getByRole("button", { name: "הזמן" }).first().click().catch(() => {});
await b.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
if (await b.getByRole("button", { name: "דחה" }).isVisible().catch(() => false)) {
  await b.getByRole("button", { name: "דחה" }).click();
  inv.decline = "PASS";
} else inv.decline = "SKIP";

inv.status = inv.friendship === "PASS" && inv.sendInvite === "PASS" && inv.receiveInvite === "PASS" && inv.sameRoom ? "PASS" : "FAIL";

await cA.close();
await cB.close();
await browser.close();
writeFileSync(join(OUT, "invite-final.json"), JSON.stringify(inv, null, 2));
console.log(JSON.stringify(inv, null, 2));
