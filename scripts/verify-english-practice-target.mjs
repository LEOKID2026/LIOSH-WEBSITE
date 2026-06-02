/**
 * Verify English book practice mappings cover all pages and use valid topics.
 * Run: node scripts/verify-english-practice-target.mjs
 */
import {
  ENGLISH_PAGE_ORDER_BY_GRADE,
  ENGLISH_PAGE_TO_PRACTICE_BY_GRADE,
  ENGLISH_MASTER_TOPICS,
  resolveEnglishPracticeTarget,
} from "../lib/learning-book/english-book-practice-map.js";

const ENGLISH_GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

let ok = true;

for (const gradeKey of ENGLISH_GRADE_KEYS) {
  const pageOrder = ENGLISH_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  const map = ENGLISH_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  let gradeOk = true;

  for (const pageId of pageOrder) {
    if (!map[pageId]) {
      console.error(`FAIL [${gradeKey}]: no PAGE_TO_PRACTICE entry for ${pageId}`);
      ok = false;
      gradeOk = false;
      continue;
    }

    const practice = map[pageId];
    if (!ENGLISH_MASTER_TOPICS.has(practice.topic)) {
      console.error(
        `FAIL [${gradeKey}]: topic "${practice.topic}" is not a valid English master topic for ${pageId}`
      );
      ok = false;
      gradeOk = false;
    }

    const resolved = resolveEnglishPracticeTarget(gradeKey, pageId);
    if (!resolved) {
      console.error(
        `FAIL [${gradeKey}]: resolveEnglishPracticeTarget returned null for ${pageId}`
      );
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

console.log("English practice target verification PASSED.");
