/**
 * Effective Moledet/Geography bank counts — mirrors utils/moledet-geography-question-generator.js pool lookup.
 * Dynamic import of banks avoids loading all grade files at module top in non-bundler contexts.
 */
import { GRADES } from "./moledet-geography-constants.js";

const LEVEL_KEYS = ["easy", "medium", "hard"];

function poolExportName(gNum, uiLevel) {
  const L = uiLevel === "easy" ? "EASY" : uiLevel === "medium" ? "MEDIUM" : "HARD";
  return `G${gNum}_${L}_QUESTIONS`;
}

/**
 * @param {Record<string, object>} geoPack — namespace import from data/geography-questions/index.js
 */
export function countMoledetGeoRuntimeBucket(geoPack, gradeKey, topic, uiLevel) {
  const gNum = Number(String(gradeKey).replace(/\D/g, ""));
  const exportName = poolExportName(gNum, uiLevel);
  const pool = geoPack[exportName];
  if (!pool || typeof pool !== "object") return 0;
  const arr = pool[topic];
  return Array.isArray(arr) ? arr.length : 0;
}

/**
 * @param {Record<string, object>} geoPack
 */
export function listMoledetGeoRuntimeThinBuckets(geoPack) {
  /** @type {{ key: string, gradeKey: string, topic: string, uiLevel: string, count: number }[]} */
  const thin = [];
  for (const gradeKey of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    const topics = (GRADES[gradeKey]?.topics || []).filter((t) => t !== "mixed");
    for (const topic of topics) {
      for (const uiLevel of LEVEL_KEYS) {
        const count = countMoledetGeoRuntimeBucket(geoPack, gradeKey, topic, uiLevel);
        const key = `${gradeKey}|${topic}|${uiLevel}`;
        if (count < 3) thin.push({ key, gradeKey, topic, uiLevel, count });
      }
    }
  }
  thin.sort((a, b) => a.count - b.count || a.gradeKey.localeCompare(b.gradeKey));
  return thin;
}

const G12_THIN_REASON =
  "כיתות א׳–ב׳: דגש על הקשר האישי והמקומי; מאגר בנק סטטי עשוי להישאר דק ברמות בינוני/קשה עד הרחבה נפרדת.";

export function classifyMoledetGeoThinBucket(row) {
  const gnum = Number(String(row.gradeKey).replace(/^g/, ""));
  if (row.count === 0) return { kind: "A", blocking: true };
  if (Number.isFinite(gnum) && gnum <= 2 && row.count > 0 && row.count < 3) {
    return { kind: "C", blocking: false, reason: G12_THIN_REASON };
  }
  if (row.count < 3 && gnum >= 3) return { kind: "A", blocking: true };
  return { kind: "C", blocking: false, reason: "כיסוי דק - ייעוץ בלבד עד הרחבת מאגר." };
}

export function summarizeMoledetGeoRuntimeThinForClosure(geoPack) {
  const thin = listMoledetGeoRuntimeThinBuckets(geoPack);
  const classified = thin.map((t) => {
    const c = classifyMoledetGeoThinBucket(t);
    return {
      ...t,
      classification: c.kind,
      blocking: c.blocking,
      nonBlockingReason: c.reason || null,
      visibleToStudents: true,
      generatedAtRuntime: true,
    };
  });
  const blocking = classified.filter((x) => x.blocking);
  return {
    thinRuntimeBuckets: classified,
    blockingThinRuntimeCount: blocking.length,
    blockingThinRuntimeBuckets: blocking,
    advisoryThinRuntimeCount: classified.length - blocking.length,
  };
}
