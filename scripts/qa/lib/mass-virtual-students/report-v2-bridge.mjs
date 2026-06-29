import { buildReportInputFromDbData } from "../../../../lib/learning-supabase/report-data-adapter.js";
import { seedLocalStorageFromDbReportInput } from "../../../../lib/learning-supabase/seed-db-report-local-storage.js";
import { runWithParentReportRebuildLock } from "../../../../lib/parent-server/db-input-to-detailed-report.server.js";
import { generateParentReportV2 } from "../../../../utils/parent-report-v2.js";

function makeStorageShim(store) {
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

/** Preserve responseMs on storage mistakes so row behavior can detect speed_pressure. */
function patchStorageMistakeTiming(store, dbInput) {
  const subjectMistakeKeys = {
    math: "mleo_mistakes",
    geometry: "mleo_geometry_mistakes",
    english: "mleo_english_mistakes",
    science: "mleo_science_mistakes",
    history: "mleo_history_mistakes",
    hebrew: "mleo_hebrew_mistakes",
    moledet_geography: "mleo_moledet_geography_mistakes",
  };
  for (const [subjectId, storageKey] of Object.entries(subjectMistakeKeys)) {
    const dbMistakes = dbInput?.subjects?.[subjectId]?.mistakes;
    if (!Array.isArray(dbMistakes) || !dbMistakes.length) continue;
    const raw = store.get(storageKey);
    if (!raw) continue;
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(stored)) continue;
    const byAnswerId = new Map();
    for (const m of dbMistakes) {
      if (m?.answerId) byAnswerId.set(String(m.answerId), m);
      if (m?.questionId) byAnswerId.set(String(m.questionId), m);
    }
    let touched = false;
    for (const m of stored) {
      const src =
        byAnswerId.get(String(m.answerId || "")) ||
        byAnswerId.get(String(m.questionLabel || m.questionId || ""));
      const responseMs = src?.responseMs ?? src?.timeSpentMs;
      if (responseMs != null && Number.isFinite(Number(responseMs))) {
        m.responseMs = Math.round(Number(responseMs));
        touched = true;
      }
    }
    if (touched) store.set(storageKey, JSON.stringify(stored));
  }
}

/**
 * Rebuild parent-report V2 maps (mathOperations, …) from aggregated DB payload.
 * Matches the client report pipeline used for topic engine decisions.
 */
export async function buildParentReportV2FromAggregate(raw, { studentName, fromDate, toDate }) {
  const from = fromDate.toISOString().slice(0, 10);
  const to = toDate.toISOString().slice(0, 10);
  const payload =
    raw && typeof raw === "object" ? JSON.parse(JSON.stringify(raw)) : raw;
  const dbInput = buildReportInputFromDbData(payload, { period: "custom", timezone: "UTC" });
  const playerName = String(studentName || dbInput.student?.name || "").trim() || "Student";

  return runWithParentReportRebuildLock(async () => {
    const store = new Map();
    globalThis.localStorage = makeStorageShim(store);
    globalThis.window = globalThis;
    store.set("mleo_player_name", playerName);
    seedLocalStorageFromDbReportInput(store, dbInput);
    patchStorageMistakeTiming(store, dbInput);
    return generateParentReportV2(playerName, "custom", from, to);
  });
}
