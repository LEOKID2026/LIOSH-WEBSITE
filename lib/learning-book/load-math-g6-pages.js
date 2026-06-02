import fs from "fs";
import path from "path";
import {
  MATH_G6_BOOK_BATCHES,
  MATH_G6_PAGE_ORDER,
  MATH_G6_BOOK_META,
} from "./math-g6-registry";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "./parse-learning-page-markdown";

const DRAFTS_ABSOLUTE = path.join(process.cwd(), MATH_G6_BOOK_META.draftsDir);

/**
 * @param {string} pageId
 */
export function loadMathG6Page(pageId) {
  const filePath = path.join(DRAFTS_ABSOLUTE, `${pageId}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  assertMathG1PageSections(page);
  return page;
}

export function loadAllMathG6Pages() {
  return MATH_G6_PAGE_ORDER.map((pageId) => {
    const page = loadMathG6Page(pageId);
    if (!page) {
      throw new Error(`Missing Grade 6 Math draft: ${pageId}.md`);
    }
    return page;
  });
}

export function loadMathG6TocEntries() {
  const pages = loadAllMathG6Pages();
  const byId = Object.fromEntries(pages.map((p) => [p.pageId, p]));

  return MATH_G6_BOOK_BATCHES.map((batch) => ({
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

export function getMathG6StaticPaths() {
  return MATH_G6_PAGE_ORDER.map((pageId) => ({ params: { pageId } }));
}
