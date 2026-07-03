import { chromium } from "playwright";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = "http://127.0.0.1:3002";
const browser = await chromium.launch({ headless: true });
async function mk(u) {
  const c = await browser.newContext();
  process.env.E2E_STUDENT_USERNAME = u;
  process.env.E2E_STUDENT_PIN = "1234";
  await applyStudentSessionFromLogin(c, BASE);
  return { c, p: await c.newPage() };
}

const a = await mk("AAA11");
const b = await mk("AAA12");
await a.p.goto(`${BASE}/student/arcade`);
await a.p.getByRole("button", { name: "חברים" }).click();
await a.p.waitForTimeout(1000);

const sendResp = await a.p.evaluate(async () => {
  const r = await fetch("/api/arcade/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "send", toStudentId: (await fetch("/api/arcade/friends")).json().then((x) => x.friends?.[0]?.studentId), gameKey: "fourline" }),
  });
  return { status: r.status, json: await r.json() };
});
// fix - get friend id properly
const friends = await a.p.evaluate(async () => (await fetch("/api/arcade/friends")).json());
const toId = friends.friends?.[0]?.studentId;
const send2 = await a.p.evaluate(async (id) => {
  const r = await fetch("/api/arcade/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "send", toStudentId: id, gameKey: "fourline" }),
  });
  return { status: r.status, json: await r.json() };
}, toId);
console.log("send invite api", send2);

await b.p.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
await b.p.waitForTimeout(2000);
console.log("banner visible", await b.p.getByRole("button", { name: "קבל" }).isVisible());
const inv = await b.p.evaluate(async () => (await fetch("/api/arcade/invites")).json());
console.log("invites list", inv);

if (await b.p.getByRole("button", { name: "קבל" }).isVisible()) {
  const [resp] = await Promise.all([
    b.p.waitForResponse((r) => r.url().includes("/api/arcade/invites") && r.request().method() === "POST"),
    b.p.getByRole("button", { name: "קבל" }).click(),
  ]);
  console.log("accept", resp.status(), await resp.json());
  await b.p.waitForTimeout(6000);
  console.log("url after accept", b.p.url());
}

await browser.close();
