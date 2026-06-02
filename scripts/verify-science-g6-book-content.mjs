/**
 * Verify Grade 6 Science learning book draft content (documentation only).
 * Run: node scripts/verify-science-g6-book-content.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import {
  SCIENCE_G6_PAGE_ORDER,
  SCIENCE_G6_ALIGNMENT_ANCHORS,
  SCIENCE_G6_PAGE_META,
} from "./lib/science-g6-draft-manifest.mjs";
import { verifyScienceGradeBookContent } from "./lib/verify-science-grade-book-content-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/science/g6/drafts");

const CLIMATE_FEAR_RE =
  /סוף העולם|אין תקווה|נגמר הכל|נחרב|אסון בלתי נמנע|אין מה לעשות/i;

const { errors, markdownNotes, pageCount } = verifyScienceGradeBookContent({
  gradeKey: "g6",
  ageBand: "grades_5_6",
  draftsDir: DRAFTS_DIR,
  pageOrder: SCIENCE_G6_PAGE_ORDER,
  alignmentAnchors: SCIENCE_G6_ALIGNMENT_ANCHORS,
  pageMeta: SCIENCE_G6_PAGE_META,
  forbiddenPageIds: ["plants"],
  extraChecks(pageId, childFacing) {
    const extra = [];
    if (pageId === "environment" || pageId === "earth_space") {
      if (CLIMATE_FEAR_RE.test(childFacing)) {
        extra.push(`${pageId}: climate content must not use fear-based framing`);
      }
      if (!/פעול|בחיר|אפשר/.test(childFacing)) {
        extra.push(`${pageId}: climate/environment content should be action-oriented`);
      }
    }
    if (pageId === "materials") {
      if (!childFacing.includes("בטיחות") && !childFacing.includes("בטוח")) {
        extra.push("materials: must mention safety (בטיחות/בטוח)");
      }
    }
    return extra;
  },
});

if (errors.length) {
  console.error(
    "G6 Science content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G6 Science content verification PASSED: ${pageCount} pages.`);
console.log("- 7 sections each; grades_5_6; science:g6:{topic}");
console.log("- no plants page; climate action-oriented; materials safety");
console.log("- no fake practice routing; safety checks");
if (markdownNotes.length) {
  console.log("\nMarkdown notes:", markdownNotes.join("; "));
}
