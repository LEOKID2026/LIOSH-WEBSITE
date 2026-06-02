/**
 * Verify Grade 2 Science learning book draft content (documentation only).
 * Run: node scripts/verify-science-g2-book-content.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import {
  SCIENCE_G2_PAGE_ORDER,
  SCIENCE_G2_ALIGNMENT_ANCHORS,
  SCIENCE_G2_PAGE_META,
} from "./lib/science-g2-draft-manifest.mjs";
import { verifyScienceGradeBookContent } from "./lib/verify-science-grade-book-content-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/science/g2/drafts");

const { errors, markdownNotes, pageCount } = verifyScienceGradeBookContent({
  gradeKey: "g2",
  ageBand: "grades_1_2",
  draftsDir: DRAFTS_DIR,
  pageOrder: SCIENCE_G2_PAGE_ORDER,
  alignmentAnchors: SCIENCE_G2_ALIGNMENT_ANCHORS,
  pageMeta: SCIENCE_G2_PAGE_META,
  extraChecks(pageId, childFacing) {
    const extra = [];
    if (pageId === "experiments") {
      if (!/תצפית|השווא/.test(childFacing)) {
        extra.push("experiments: must include observation/comparison vocabulary");
      }
      if (!/משתנה|דבר אחד|הוגנ/.test(childFacing)) {
        extra.push("experiments: must introduce fair-test / one-variable concept");
      }
    }
    return extra;
  },
});

if (errors.length) {
  console.error(
    "G2 Science content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G2 Science content verification PASSED: ${pageCount} pages.`);
console.log("- 7 sections each; grades_1_2; science:g2:{topic}");
console.log("- includes experiments (first grade); plants included");
console.log("- safe experiments only; no fake practice routing");
if (markdownNotes.length) {
  console.log("\nMarkdown notes:", markdownNotes.join("; "));
} else {
  console.log("\nMarkdown notes: none.");
}
