/**
 * Verify Science book practice mappings cover all pages and use valid topics.
 * Run: node scripts/verify-science-practice-target.mjs
 */
import {
  SCIENCE_PAGE_ORDER_BY_GRADE,
  SCIENCE_PAGE_TO_PRACTICE_BY_GRADE,
  resolveSciencePracticeTarget,
} from "../lib/learning-book/science-book-practice-map.js";
import { SCIENCE_GRADES } from "../data/science-curriculum.js";

const SCIENCE_GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

let ok = true;

for (const gradeKey of SCIENCE_GRADE_KEYS) {
  const pageOrder = SCIENCE_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  const map = SCIENCE_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  const topics = new Set(SCIENCE_GRADES[gradeKey]?.topics || []);
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
        `FAIL [${gradeKey}]: topic "${practice.topic}" not in SCIENCE_GRADES.${gradeKey} for ${pageId}`
      );
      ok = false;
      gradeOk = false;
    }

    const resolved = resolveSciencePracticeTarget(gradeKey, pageId);
    if (!resolved) {
      console.error(`FAIL [${gradeKey}]: resolveSciencePracticeTarget returned null for ${pageId}`);
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

  if (gradeKey === "g1" && pageOrder.includes("experiments")) {
    console.error("FAIL [g1]: must not include experiments page");
    ok = false;
    gradeOk = false;
  }
  if (["g4", "g5", "g6"].includes(gradeKey) && pageOrder.includes("plants")) {
    console.error(`FAIL [${gradeKey}]: must not include plants page`);
    ok = false;
    gradeOk = false;
  }

  if (gradeOk) {
    console.log(`OK [${gradeKey}]: ${pageOrder.length} pages with practice mappings.`);
  }
}

if (!ok) process.exit(1);

console.log("Science practice target verification PASSED.");
