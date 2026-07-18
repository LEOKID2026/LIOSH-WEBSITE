/**
 * Smoke test for GET /api/demo/catalog (requires dev server + .env.local).
 * Run: node --env-file=.env.local scripts/tests/demo-catalog-api-smoke.mjs
 * Optional: DEMO_CATALOG_BASE_URL=http://127.0.0.1:3001
 */

import assert from "node:assert/strict";

const BASE = (process.env.DEMO_CATALOG_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

const res = await fetch(`${BASE}/api/demo/catalog?gradeLevel=g3`, {
  method: "GET",
  headers: { Accept: "application/json" },
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Non-JSON response:", text.slice(0, 500));
  process.exit(1);
}

assert.equal(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(json)}`);
assert.equal(json.ok, true);
assert.equal(json.gradeLevel, "g3");
assert.ok(Array.isArray(json.games) && json.games.length > 0, "games array");
assert.ok(Array.isArray(json.subjects) && json.subjects.length > 0, "subjects array");
assert.ok(json.subjectAccess?.subjectPermissions, "subjectPermissions");
assert.ok(json.permissions, "permissions");
assert.ok(json.categories, "categories");
assert.equal("studentId" in json, false);
assert.equal("id" in json, false);

const adminDisabled = json.games.filter((g) => g.isEnabled === false);
const disabledStillPlayable = adminDisabled.filter((g) => g.playable === true);
assert.equal(
  disabledStillPlayable.length,
  0,
  `admin-disabled games must not be playable: ${disabledStillPlayable.map((g) => g.gameKey).join(", ")}`,
);

const disabledSubjects = Object.entries(json.subjectAccess.subjectPermissions).filter(
  ([, v]) => v.isEnabled === false,
);
for (const [key, perm] of Object.entries(json.subjectAccess.subjectPermissions)) {
  assert.ok(typeof perm.effectiveGrade === "string", `${key} effectiveGrade`);
  assert.ok(typeof perm.isGradeSuitable === "boolean", `${key} isGradeSuitable`);
}

const sample = {
  ok: json.ok,
  gradeLevel: json.gradeLevel,
  gamesCount: json.games.length,
  enabledGames: json.games.filter((g) => g.isEnabled).length,
  playableGames: json.games.filter((g) => g.playable).length,
  adminDisabledGameKeys: adminDisabled.map((g) => g.gameKey),
  subjectsCount: json.subjects.length,
  subjectKeys: json.subjects.map((s) => s.subjectKey),
  disabledSubjectKeys: disabledSubjects.map(([k]) => k),
  permissions: json.permissions,
  categoryKeys: Object.keys(json.categories),
  sampleGame: json.games.find((g) => g.playable),
  sampleSubject: json.subjects[0],
};

console.log("PASS demo-catalog-api-smoke");
console.log(JSON.stringify(sample, null, 2));
