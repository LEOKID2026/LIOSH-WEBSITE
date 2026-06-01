import fs from "fs";
import path from "path";
import {
  MATH_G2_BOOK_BATCHES,
  MATH_G2_PAGE_ORDER,
  MATH_G2_BOOK_META,
} from "./math-g2-registry";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "./parse-learning-page-markdown";

const DRAFTS_ABSOLUTE = path.join(process.cwd(), MATH_G2_BOOK_META.draftsDir);

/**
 * @param {string} pageId
 */
export function loadMathG2Page(pageId) {
  const filePath = path.join(DRAFTS_ABSOLUTE, `${pageId}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  assertMathG1PageSections(page);
  return page;
}

export function loadAllMathG2Pages() {
  return MATH_G2_PAGE_ORDER.map((pageId) => {
    const page = loadMathG2Page(pageId);
    if (!page) {
      throw new Error(`Missing Grade 2 Math draft: ${pageId}.md`);
    }
    return page;
  });
}

export function loadMathG2TocEntries() {
  const pages = loadAllMathG2Pages();
  const byId = Object.fromEntries(pages.map((p) => [p.pageId, p]));

  return MATH_G2_BOOK_BATCHES.map((batch) => ({
    id: batch.id,
    titleHe: batch.titleHe,
    pages: batch.pages.map((pageId) => {
      const page = byId[pageId];
      return {
        pageId,
        displayTitle: page?.displayTitle || pageId,
      };
    }),
  }));
}

export function getMathG2StaticPaths() {
  return MATH_G2_PAGE_ORDER.map((pageId) => ({ params: { pageId } }));
}
