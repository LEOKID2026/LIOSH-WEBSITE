/**
 * Verify Grade 4 Science learning book draft content (documentation only).
 * Run: node scripts/verify-science-g4-book-content.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import {
  SCIENCE_G4_PAGE_ORDER,
  SCIENCE_G4_ALIGNMENT_ANCHORS,
  SCIENCE_G4_PAGE_META,
} from "./lib/science-g4-draft-manifest.mjs";
import { verifyScienceGradeBookContent } from "./lib/verify-science-grade-book-content-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/science/g4/drafts");

const { errors, markdownNotes, pageCount } = verifyScienceGradeBookContent({
  gradeKey: "g4",
  ageBand: "grades_3_4",
  draftsDir: DRAFTS_DIR,
  pageOrder: SCIENCE_G4_PAGE_ORDER,
  alignmentAnchors: SCIENCE_G4_ALIGNMENT_ANCHORS,
  pageMeta: SCIENCE_G4_PAGE_META,
  forbiddenPageIds: ["plants"],
  extraChecks(pageId, childFacing) {
    const extra = [];
    if (pageId === "materials") {
      if (!childFacing.includes("מוליך") || !childFacing.includes("מבודד")) {
        extra.push("materials: must mention מוליך and מבודד (conceptual electricity)");
      }
    }
    return extra;
  },
});

if (errors.length) {
  console.error(
    "G4 Science content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G4 Science content verification PASSED: ${pageCount} pages.`);
console.log("- 7 sections each; grades_3_4; science:g4:{topic}");
console.log("- no plants page; materials: conceptual מוליך/מבודד only");
console.log("- no fake practice routing; safety checks");
if (markdownNotes.length) {
  console.log("\nMarkdown notes:", markdownNotes.join("; "));
}
