import fs from "fs";
import path from "path";
import {
  GEOMETRY_G1_BOOK_BATCHES,
  GEOMETRY_G1_PAGE_ORDER,
  GEOMETRY_G1_BOOK_META,
} from "./geometry-g1-registry";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "./parse-learning-page-markdown";

const DRAFTS_ABSOLUTE = path.join(process.cwd(), GEOMETRY_G1_BOOK_META.draftsDir);

/**
 * @param {string} pageId
 */
export function loadGeometryG1Page(pageId) {
  const filePath = path.join(DRAFTS_ABSOLUTE, `${pageId}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  assertMathG1PageSections(page);
  return page;
}

export function loadAllGeometryG1Pages() {
  return GEOMETRY_G1_PAGE_ORDER.map((pageId) => {
    const page = loadGeometryG1Page(pageId);
    if (!page) {
      throw new Error(`Missing Grade 1 Geometry draft: ${pageId}.md`);
    }
    return page;
  });
}

export function loadGeometryG1TocEntries() {
  const pages = loadAllGeometryG1Pages();
  const byId = Object.fromEntries(pages.map((p) => [p.pageId, p]));

  return GEOMETRY_G1_BOOK_BATCHES.map((batch) => ({
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

export function getGeometryG1StaticPaths() {
  return GEOMETRY_G1_PAGE_ORDER.map((pageId) => ({ params: { pageId } }));
}
