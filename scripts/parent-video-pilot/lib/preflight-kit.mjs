import { mkdirSync, writeFileSync } from "node:fs";

export function fail(checks, id, message) {
  checks.push({ id, ok: false, message });
  return false;
}

export function pass(checks, id, message = "ok") {
  checks.push({ id, ok: true, message });
  return true;
}

export function writePreflightReport(outDir, preflightPath, report) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(preflightPath, `${JSON.stringify({ ...report, at: new Date().toISOString() }, null, 2)}\n`);
}

export function finalizePreflight({ checks, blockers, baseUrl, outDir, preflightPath, title, pilot, extra = {} }) {
  const ok = checks.every((c) => c.ok !== false) && blockers.length === 0;
  writePreflightReport(outDir, preflightPath, { ok, checks, blockers, baseUrl, title, pilot, ...extra });
  console.log(JSON.stringify({ ok, blockers, checks }, null, 2));
  process.exit(ok ? 0 : 1);
}
