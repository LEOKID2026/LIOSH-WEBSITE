/**
 * Verify Grade 3 Science learning book draft content (documentation only).
 * Run: node scripts/verify-science-g3-book-content.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import {
  SCIENCE_G3_PAGE_ORDER,
  SCIENCE_G3_ALIGNMENT_ANCHORS,
  SCIENCE_G3_PAGE_META,
} from "./lib/science-g3-draft-manifest.mjs";
import { verifyScienceGradeBookContent } from "./lib/verify-science-grade-book-content-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/science/g3/drafts");

const { errors, markdownNotes, pageCount } = verifyScienceGradeBookContent({
  gradeKey: "g3",
  ageBand: "grades_3_4",
  draftsDir: DRAFTS_DIR,
  pageOrder: SCIENCE_G3_PAGE_ORDER,
  alignmentAnchors: SCIENCE_G3_ALIGNMENT_ANCHORS,
  pageMeta: SCIENCE_G3_PAGE_META,
  extraChecks(pageId, childFacing) {
    const extra = [];
    if (pageId === "plants") {
      if (!/סיכום|אחרון|ג׳|ג'/.test(childFacing)) {
        extra.push("plants: should mark final consolidation for G3 plant spine");
      }
    }
    return extra;
  },
});

if (errors.length) {
  console.error(
    "G3 Science content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G3 Science content verification PASSED: ${pageCount} pages.`);
console.log("- 7 sections each; grades_3_4; science:g3:{topic}");
console.log("- plants consolidation page present");
console.log("- no fake practice routing; safety checks");
if (markdownNotes.length) {
  console.log("\nMarkdown notes:", markdownNotes.join("; "));
}
