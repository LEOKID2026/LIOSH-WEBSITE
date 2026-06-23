#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { aggregateParentReportPayload } from "../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../lib/parent-server/parent-report-parent-facing.server.js";
import { buildReportInputFromDbData } from "../lib/learning-supabase/report-data-adapter.js";
import { seedLocalStorageFromDbReportInput } from "../lib/learning-supabase/seed-db-report-local-storage.js";
import { resolveAaaStudents } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";
import { filterMistakesForRow } from "../utils/parent-report-row-trend.js";
import { resolveRowTaxonomyMatch } from "../utils/parent-report-engine-taxonomy-bridge.js";
import {
  moledetGeographyRoutingScores,
  orderMoledetTaxonomyCandidatesWithMeta,
} from "../utils/diagnostic-engine-v2/moledet-taxonomy-candidate-order.js";
import { routingHaystackForWrongEvent } from "../utils/diagnostic-engine-v2/diagnostic-routing-haystack.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "2026-05-01";
const TO = "2026-06-01";

function parseIsoDate(s) {
  return new Date(`${s}T00:00:00.000Z`);
}

function makeLs(store) {
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

function mistakesInDateRange(arr, startMs, endMs) {
  return (Array.isArray(arr) ? arr : []).filter((m) => {
    const t = m?.timestamp ?? m?.ts;
    const ms = typeof t === "number" ? t : t ? Date.parse(t) : NaN;
    return Number.isFinite(ms) && ms >= startMs && ms <= endMs;
  });
}

function safeJsonArray(store, key) {
  try {
    const raw = store.get(key);
    if (!raw) return [];
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function loadV2() {
  const m = await import(pathToFileURL(path.join(ROOT, "utils/parent-report-v2.js")).href);
  return m.generateParentReportV2;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key);
  const students = await resolveAaaStudents(supabase);
  const aaa5 = students.find((s) => String(s.login || "").toLowerCase() === "aaa5");
  if (!aaa5) throw new Error("AAA5 not found");

  const payload = await aggregateParentReportPayload(
    supabase,
    { id: aaa5.studentId, full_name: aaa5.fullName, grade_level: aaa5.gradeLevel, is_active: true },
    parseIsoDate(FROM),
    parseIsoDate(TO),
    { includeParentActivities: true },
  );
  const pub = await enrichPayloadWithParentFacing(supabase, payload, aaa5.studentId);
  const generateParentReportV2 = await loadV2();
  const dbInput = buildReportInputFromDbData(pub, { period: "custom", timezone: "UTC" });
  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
  store.set("mleo_player_name", aaa5.playerName);
  const startMs = parseIsoDate(FROM).getTime();
  const endMs = parseIsoDate(TO).getTime() + 86400000 - 1;
  globalThis.localStorage = makeLs(store);
  globalThis.window = globalThis;
  const report = generateParentReportV2(aaa5.playerName, "custom", FROM, TO);
  const raw = mistakesInDateRange(safeJsonArray(store, "mleo_moledet_geography_mistakes"), startMs, endMs);

  const topicRow = report?.subjects?.find?.((s) => s.id === "moledet-geography")?.topics?.find?.((t) =>
    String(t.label || "").includes("גאוגרפיה"),
  );
  if (!topicRow) throw new Error("geography row not found");

  const mapRow = report?.subjectMaps?.["moledet-geography"]?.[topicRow.topicKey];
  const wrongs = filterMistakesForRow("moledet-geography", topicRow.topicKey, mapRow, raw, startMs, endMs).filter(
    (e) => !e.isCorrect,
  );

  const tax = resolveRowTaxonomyMatch({
    subjectId: "moledet-geography",
    topicRowKey: topicRow.topicKey,
    row: mapRow,
    rawMistakes: raw,
    startMs,
    endMs,
  });

  const scores = moledetGeographyRoutingScores(wrongs, mapRow);
  const order = orderMoledetTaxonomyCandidatesWithMeta(["MG-01", "MG-02", "MG-05"], wrongs, {
    bucketKey: "geography",
    row: mapRow,
  });

  let defCount = 0;
  for (const w of wrongs) {
    const h = routingHaystackForWrongEvent(w, { excludeEnrichmentPatterns: true });
    if (/geography:|מה זה|מה הוא/.test(h)) defCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        wrongCount: wrongs.length,
        definitionLikeCount: defCount,
        scores,
        order,
        safety: tax.subskillSafety,
        labelPatterns: [...new Set(wrongs.map((w) => String(w.questionLabel || "").slice(0, 50)))],
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
