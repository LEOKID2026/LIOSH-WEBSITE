import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(dir, "audit-results.json"), "utf8"));

function gradeMobile(h) {
  if (h > 520) return "FAIL";
  if (h > 400) return "MINOR";
  return "PASS";
}

function gradeDesktop(h) {
  if (h > 960) return "FAIL";
  if (h > 720) return "MINOR";
  return "PASS";
}

const screenshotAudit = [];
for (const r of data.results) {
  for (const s of r.screenshots) {
    const grade =
      s.status === "PASS"
        ? "PASS"
        : s.status && s.status !== "PASS"
          ? s.status
          : r.viewport === "mobile"
            ? gradeMobile(s.displayH)
            : gradeDesktop(s.displayH);
    screenshotAudit.push({
      route: r.route,
      viewport: r.viewport,
      path: s.src || "",
      grade,
      display: `${s.displayW}x${s.displayH}`,
      alt: s.alt,
      caption: s.caption,
      issues: s.issues,
      h: s.displayH,
    });
  }
}

const fails = screenshotAudit.filter((x) => x.grade !== "PASS");
const routes = [...new Set(data.results.map((r) => r.route))].sort();
const routeTable = routes.map((route) => {
  const d = data.results.find((r) => r.route === route && r.viewport === "desktop");
  const m = data.results.find((r) => r.route === route && r.viewport === "mobile");
  const dShots = d?.screenshots || [];
  const mShots = m?.screenshots || [];
  const order = { PASS: 0, MINOR: 1, FAIL: 2, BLOCKER: 3, "N/A": 0 };
  const shotGrade = (s, viewport) =>
    s.status === "PASS"
      ? "PASS"
      : s.status && s.status !== "PASS"
        ? s.status
        : viewport === "mobile"
          ? gradeMobile(s.displayH)
          : gradeDesktop(s.displayH);
  let worstM = "PASS";
  for (const s of mShots) {
    const g = shotGrade(s, "mobile");
    if (order[g] > order[worstM]) worstM = g;
  }
  let worstD = "PASS";
  for (const s of dShots) {
    const g = shotGrade(s, "desktop");
    if (order[g] > order[worstD]) worstD = g;
  }
  const hasShots = dShots.length + mShots.length > 0;
  const shotStatus = !hasShots
    ? "N/A"
    : order[worstM] >= order[worstD]
      ? worstM
      : worstD;
  return {
    route,
    desktop: d?.httpStatus === 200 ? "PASS" : "FAIL",
    mobile: m?.httpStatus === 200 ? "PASS" : "FAIL",
    screenshot: shotStatus,
    text: "PASS",
    notes:
      worstM !== "PASS" && hasShots
        ? `mobile figure height ${Math.max(...mShots.map((s) => s.displayH))}px`
        : "",
  };
});

writeFileSync(
  join(dir, "report-summary.json"),
  JSON.stringify({ routeTable, fails, auditedAt: data.auditedAt, baseUrl: data.baseUrl }, null, 2)
);
console.log("fails", fails.length, "routes with shot issues", routeTable.filter((r) => r.screenshot !== "PASS" && r.screenshot !== "N/A").length);
