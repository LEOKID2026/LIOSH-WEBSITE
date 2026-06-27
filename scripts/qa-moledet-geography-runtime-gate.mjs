/**
 * Moledet/Geography runtime gate — static bank pools must cover every curriculum topic × grade × UI level.
 * Writes reports/curriculum-audit/moledet-geography-runtime-gate-export.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "reports", "curriculum-audit");
const modUrl = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { GRADES } = await import(modUrl("utils/moledet-geography-constants.js"));
const { MOLEDET_GEOGRAPHY_TEACHABLE_GRADE_ORDER } = await import(
  modUrl("data/moledet-geography-curriculum.js")
);
const geoModule = await import(modUrl("data/geography-questions/index.js"));
const GEO = geoModule.default ?? geoModule;

const G12_STEM_ADVISORY_LEN = 260;

function poolObj(gNum, uiLevel) {
  const L = uiLevel === "easy" ? "EASY" : uiLevel === "medium" ? "MEDIUM" : "HARD";
  const name = `G${gNum}_${L}_QUESTIONS`;
  return GEO[name];
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const g12LongStemAdvisory = [];
  let checks = 0;

  for (const gk of MOLEDET_GEOGRAPHY_TEACHABLE_GRADE_ORDER) {
    const gNum = parseInt(String(gk).replace(/\D/g, ""), 10);
    const topics = (GRADES[gk]?.topics || []).filter((t) => t !== "mixed");
    for (const uiLevel of ["easy", "medium", "hard"]) {
      const pool = poolObj(gNum, uiLevel);
      if (!pool || typeof pool !== "object") {
        failures.push(`${gk} ${uiLevel}: missing export pool`);
        continue;
      }
      for (const topic of topics) {
        checks++;
        const arr = pool[topic];
        const n = Array.isArray(arr) ? arr.length : 0;
        if (n === 0) {
          failures.push(`${gk} ${uiLevel} topic=${topic}: empty pool (no questions)`);
        }
      }
    }
  }

  for (let gNum = 2; gNum <= 2; gNum++) {
    for (const uiLevel of ["easy", "medium", "hard"]) {
      const pool = poolObj(gNum, uiLevel);
      if (!pool) continue;
      for (const [, list] of Object.entries(pool)) {
        if (!Array.isArray(list)) continue;
        for (const row of list) {
          const stem = String(row?.question ?? "").trim();
          if (stem.length > G12_STEM_ADVISORY_LEN) {
            g12LongStemAdvisory.push(`g${gNum} ${uiLevel} len=${stem.length}`);
          }
        }
      }
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      poolCellsChecked: checks,
      failureCount: failures.length,
      g12LongStemAdvisoryCount: g12LongStemAdvisory.length,
      gatePassed: failures.length === 0,
    },
    failures: failures.slice(0, 800),
    failuresTruncated: failures.length > 800,
    g12LongStemAdvisory: g12LongStemAdvisory.slice(0, 120),
  };

  await writeFile(join(OUT_DIR, "moledet-geography-runtime-gate-export.json"), JSON.stringify(payload, null, 2), "utf8");

  console.log(JSON.stringify(payload.summary, null, 2));
  if (!payload.summary.gatePassed) {
    console.error("qa-moledet-geography-runtime-gate: FAILED");
    process.exit(1);
  }
  console.log("qa-moledet-geography-runtime-gate: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
