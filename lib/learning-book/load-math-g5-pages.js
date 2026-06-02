import fs from "fs";
import path from "path";
import {
  MATH_G5_BOOK_BATCHES,
  MATH_G5_PAGE_ORDER,
  MATH_G5_BOOK_META,
} from "./math-g5-registry";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "./parse-learning-page-markdown";

const DRAFTS_ABSOLUTE = path.join(process.cwd(), MATH_G5_BOOK_META.draftsDir);

/**
 * @param {string} pageId
 */
export function loadMathG5Page(pageId) {
  const filePath = path.join(DRAFTS_ABSOLUTE, `${pageId}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  assertMathG1PageSections(page);
  return page;
}

export function loadAllMathG5Pages() {
  return MATH_G5_PAGE_ORDER.map((pageId) => {
    const page = loadMathG5Page(pageId);
    if (!page) {
      throw new Error(`Missing Grade 5 Math draft: ${pageId}.md`);
    }
    return page;
  });
}

export function loadMathG5TocEntries() {
  const pages = loadAllMathG5Pages();
  const byId = Object.fromEntries(pages.map((p) => [p.pageId, p]));

  return MATH_G5_BOOK_BATCHES.map((batch) => ({
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

export function getMathG5StaticPaths() {
  return MATH_G5_PAGE_ORDER.map((pageId) => ({ params: { pageId } }));
}
