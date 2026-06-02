/**
 * Verify geometry book practice mappings cover all pages and use valid topics.
 * Run: node scripts/verify-geometry-practice-target.mjs
 */
import {
  GEOMETRY_PAGE_ORDER_BY_GRADE,
  GEOMETRY_PAGE_TO_PRACTICE_BY_GRADE,
  resolveGeometryPracticeTarget,
} from "../lib/learning-book/geometry-book-practice-map.js";
import { GRADES } from "../utils/geometry-constants.js";

const GEOMETRY_GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

let ok = true;

for (const gradeKey of GEOMETRY_GRADES) {
  const pageOrder = GEOMETRY_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  const map = GEOMETRY_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  const topics = new Set(GRADES[gradeKey]?.topics || []);
  let gradeOk = true;

  for (const pageId of pageOrder) {
    if (!map[pageId]) {
      console.error(`FAIL [${gradeKey}]: no PAGE_TO_PRACTICE entry for ${pageId}`);
      ok = false;
      gradeOk = false;
      continue;
    }

    const practice = map[pageId];
    if (!topics.has(practice.topic)) {
      console.error(
        `FAIL [${gradeKey}]: topic "${practice.topic}" not in GRADES.${gradeKey} for ${pageId}`
      );
      ok = false;
      gradeOk = false;
    }

    const resolved = resolveGeometryPracticeTarget(gradeKey, pageId);
    if (!resolved) {
      console.error(`FAIL [${gradeKey}]: resolveGeometryPracticeTarget returned null for ${pageId}`);
      ok = false;
      gradeOk = false;
    }
  }

  const extraKeys = Object.keys(map).filter((id) => !pageOrder.includes(id));
  for (const pageId of extraKeys) {
    console.error(`FAIL [${gradeKey}]: stale PAGE_TO_PRACTICE entry for unknown page ${pageId}`);
    ok = false;
    gradeOk = false;
  }

  if (gradeOk) {
    console.log(`OK [${gradeKey}]: ${pageOrder.length} pages with practice mappings.`);
  }
}

if (!ok) process.exit(1);
