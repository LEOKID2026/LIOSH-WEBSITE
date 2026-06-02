/**
 * Verify Grade 5 Science learning book draft content (documentation only).
 * Run: node scripts/verify-science-g5-book-content.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import {
  SCIENCE_G5_PAGE_ORDER,
  SCIENCE_G5_ALIGNMENT_ANCHORS,
  SCIENCE_G5_PAGE_META,
} from "./lib/science-g5-draft-manifest.mjs";
import { verifyScienceGradeBookContent } from "./lib/verify-science-grade-book-content-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/science/g5/drafts");

const { errors, markdownNotes, pageCount } = verifyScienceGradeBookContent({
  gradeKey: "g5",
  ageBand: "grades_5_6",
  draftsDir: DRAFTS_DIR,
  pageOrder: SCIENCE_G5_PAGE_ORDER,
  alignmentAnchors: SCIENCE_G5_ALIGNMENT_ANCHORS,
  pageMeta: SCIENCE_G5_PAGE_META,
  forbiddenPageIds: ["plants"],
});

if (errors.length) {
  console.error(
    "G5 Science content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G5 Science content verification PASSED: ${pageCount} pages.`);
console.log("- 7 sections each; grades_5_6; science:g5:{topic}");
console.log("- no plants page; no fake practice routing; safety checks");
if (markdownNotes.length) {
  console.log("\nMarkdown notes:", markdownNotes.join("; "));
}
