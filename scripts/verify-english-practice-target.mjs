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
import {
  ENGLISH_G1_PAGE_SKILLS,
  ENGLISH_G2_PAGE_SKILLS,
  ENGLISH_G3_PAGE_SKILLS,
  ENGLISH_G4_PAGE_SKILLS,
  ENGLISH_G5_PAGE_SKILLS,
  ENGLISH_G6_PAGE_SKILLS,
} from "../lib/learning-book/english-page-skill-index.js";
import { getRuntimeEligiblePhonicsPool } from "../data/english-questions/index.js";

const GRADE_SKILLS_MAP = {
  g1: ENGLISH_G1_PAGE_SKILLS,
  g2: ENGLISH_G2_PAGE_SKILLS,
  g3: ENGLISH_G3_PAGE_SKILLS,
  g4: ENGLISH_G4_PAGE_SKILLS,
  g5: ENGLISH_G5_PAGE_SKILLS,
  g6: ENGLISH_G6_PAGE_SKILLS,
};

const ENGLISH_GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

let ok = true;

for (const gradeKey of ENGLISH_GRADE_KEYS) {
  const pageOrder = ENGLISH_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  const map = ENGLISH_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  const pageSkills = GRADE_SKILLS_MAP[gradeKey] || {};
  let gradeOk = true;

  for (const pageId of pageOrder) {
    if (!map[pageId]) {
      // Determine whether the missing entry is intentional.
      const skillId = String(pageSkills[pageId]?.skillId || "");
      const isPhonicsSkill =
        skillId.includes(":phonics:") || skillId.startsWith("english:phonics:");
      const isTranslationSkill =
        skillId.includes(":translation:") || skillId.includes("pool:translation:");

      if (isTranslationSkill) {
        // Translation is hidden from launch by design.
        console.log(
          `INFO [${gradeKey}]: translation page ${pageId} intentionally excluded from practice map.`
        );
        continue;
      }

      if (isPhonicsSkill) {
        const eligible = getRuntimeEligiblePhonicsPool(gradeKey, pageId);
        if (eligible.length === 0) {
          // Audio-only or display-blocked phonics page — no runtime self-practice available.
          console.log(
            `INFO [${gradeKey}]: phonics page ${pageId} has no runtime-eligible items (audio-only/display-blocked); no practice entry needed.`
          );
          continue;
        }
      }

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
