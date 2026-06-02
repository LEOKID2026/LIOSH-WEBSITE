/**
 * Verify Science learning books G1–G6 runtime integration.
 * Run: node scripts/verify-science-books.mjs
 */
import {
  SCIENCE_G1_PAGE_ORDER,
  SCIENCE_G1_BOOK_META,
} from "../lib/learning-book/science-g1-registry.js";
import {
  SCIENCE_G2_PAGE_ORDER,
  SCIENCE_G2_BOOK_META,
} from "../lib/learning-book/science-g2-registry.js";
import {
  SCIENCE_G3_PAGE_ORDER,
  SCIENCE_G3_BOOK_META,
} from "../lib/learning-book/science-g3-registry.js";
import {
  SCIENCE_G4_PAGE_ORDER,
  SCIENCE_G4_BOOK_META,
} from "../lib/learning-book/science-g4-registry.js";
import {
  SCIENCE_G5_PAGE_ORDER,
  SCIENCE_G5_BOOK_META,
} from "../lib/learning-book/science-g5-registry.js";
import {
  SCIENCE_G6_PAGE_ORDER,
  SCIENCE_G6_BOOK_META,
} from "../lib/learning-book/science-g6-registry.js";
import {
  verifyScienceBookRuntime,
  assertScienceMasterPath,
} from "./lib/verify-science-book-runtime-lib.mjs";

const SPECS = [
  {
    grade: "g1",
    pageOrder: SCIENCE_G1_PAGE_ORDER,
    bookMeta: SCIENCE_G1_BOOK_META,
    batchCount: 2,
    mustExcludeExperiments: true,
    mustIncludePlants: true,
  },
  {
    grade: "g2",
    pageOrder: SCIENCE_G2_PAGE_ORDER,
    bookMeta: SCIENCE_G2_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustIncludePlants: true,
  },
  {
    grade: "g3",
    pageOrder: SCIENCE_G3_PAGE_ORDER,
    bookMeta: SCIENCE_G3_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustIncludePlants: true,
  },
  {
    grade: "g4",
    pageOrder: SCIENCE_G4_PAGE_ORDER,
    bookMeta: SCIENCE_G4_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustExcludePlants: true,
  },
  {
    grade: "g5",
    pageOrder: SCIENCE_G5_PAGE_ORDER,
    bookMeta: SCIENCE_G5_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustExcludePlants: true,
  },
  {
    grade: "g6",
    pageOrder: SCIENCE_G6_PAGE_ORDER,
    bookMeta: SCIENCE_G6_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustExcludePlants: true,
  },
];

const errors = [...assertScienceMasterPath()];

for (const spec of SPECS) {
  errors.push(...verifyScienceBookRuntime(spec));
}

const totalPages = SPECS.reduce((n, s) => n + s.pageOrder.length, 0);

if (errors.length) {
  console.error(
    "Science books runtime verification FAILED:\n" +
      errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`Science books runtime verification PASSED: G1–G6 (${totalPages} pages total).`);
console.log("- all grades authored via dynamic routes /learning/book/science/g{1-6}");
console.log("- practice feature enabled on all grades with real topic mappings");
console.log("- G1: no experiments; G2–G6: experiments included");
console.log("- G1–G3: plants included; G4–G6: plants excluded");
