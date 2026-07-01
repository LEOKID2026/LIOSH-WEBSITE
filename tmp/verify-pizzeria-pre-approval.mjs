#!/usr/bin/env node
import fs from "node:fs";
import { EDUCATIONAL_GAME_LIST, EDUCATIONAL_GAME_REGISTRY, EDUCATIONAL_GAME_KEYS } from "../lib/educational-games/educational-game-registry.js";
import { OFFLINE_EDUCATIONAL_GAMES, offlineEducationalRoute, isValidOfflineEducationalGameKey } from "../lib/offline/offline-game-catalog.js";
import { OFFLINE_FULL_PRECACHE_NAV_URLS } from "../lib/offline/offline-precache-manifest.js";
import { auditPizzeriaContent, CUSTOMERS_BY_DIFFICULTY, CUSTOMERS_PER_LEVEL, DIFFICULTIES } from "../components/educational-games/leo-pizzeria/leo-pizzeria-data.js";

const key = "leo-pizzeria";
const issues = [];

if (!EDUCATIONAL_GAME_LIST.some((g) => g.id === key)) issues.push("missing EDUCATIONAL_GAME_LIST");
if (!OFFLINE_EDUCATIONAL_GAMES.some((g) => g.id === key)) issues.push("missing OFFLINE_EDUCATIONAL_GAMES");
if (!isValidOfflineEducationalGameKey(key)) issues.push("invalid offline key");

const offlineRoute = offlineEducationalRoute(key);
if (offlineRoute !== "/student/offline/educational/leo-pizzeria") issues.push("bad offline route");
if (!OFFLINE_FULL_PRECACHE_NAV_URLS.includes(offlineRoute)) issues.push("missing precache manifest");

const gameSrc = fs.readFileSync("components/educational-games/leo-pizzeria/LeoPizzeriaGame.jsx", "utf8");
for (const [label, re] of [
  ["fetch", /fetch\s*\(/],
  ["supabase", /supabase/i],
  ["api route", /pages\/api\//],
]) {
  if (re.test(gameSrc)) issues.push(`LeoPizzeriaGame forbidden: ${label}`);
}
if (!/timeLeft/.test(gameSrc)) issues.push("LeoPizzeriaGame missing timer (timeLeft)");
if (!/setInterval\s*\(/.test(gameSrc)) issues.push("LeoPizzeriaGame missing countdown interval");

const audit = auditPizzeriaContent();
if (!audit.ok) issues.push(...audit.issues);

for (const diff of ["easy", "medium", "hard"]) {
  if (CUSTOMERS_BY_DIFFICULTY[diff].length !== CUSTOMERS_PER_LEVEL) {
    issues.push(`${diff} order count ${CUSTOMERS_BY_DIFFICULTY[diff].length}`);
  }
  const sc = DIFFICULTIES[diff].sliceCount;
  for (const o of CUSTOMERS_BY_DIFFICULTY[diff]) {
    if (o.sliceCount !== sc) issues.push(`${o.id} wrong slices`);
  }
}

const sql = fs.readFileSync("supabase/migrations/087_leo_pizzeria_educational_game.sql", "utf8");
if (!sql.includes("is_enabled = excluded.is_enabled")) {
  issues.push("SQL 087 missing is_enabled upsert");
}

const shell = fs.readFileSync("components/educational-games/EducationalGameShell.jsx", "utf8");
const offlineShell = fs.readFileSync("components/educational-games/OfflineEducationalGameShell.jsx", "utf8");
for (const k of EDUCATIONAL_GAME_KEYS) {
  if (!shell.includes(`"${k}"`)) issues.push(`EducationalGameShell missing ${k}`);
  if (!offlineShell.includes(`"${k}"`)) issues.push(`OfflineEducationalGameShell missing ${k}`);
}

const g = EDUCATIONAL_GAME_REGISTRY[key];
const card = OFFLINE_EDUCATIONAL_GAMES.find((x) => x.id === key);

console.log(
  JSON.stringify(
    {
      ok: issues.length === 0,
      issues,
      regularRoute: g.route,
      offlineRoute,
      titleHe: g.titleHe,
      offlineTitle: card?.titleHe,
      offlineCardRoute: card?.route,
      gameCount: EDUCATIONAL_GAME_KEYS.length,
    },
    null,
    2,
  ),
);

process.exit(issues.length ? 1 : 0);
