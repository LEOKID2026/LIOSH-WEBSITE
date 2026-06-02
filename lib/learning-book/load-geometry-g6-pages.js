import fs from "fs";
import path from "path";
import {
  GEOMETRY_G6_BOOK_BATCHES,
  GEOMETRY_G6_PAGE_ORDER,
  GEOMETRY_G6_BOOK_META,
  getGeometryG6AccessibleBookBatches,
  getGeometryG6AccessiblePageOrder,
} from "./geometry-g6-registry";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "./parse-learning-page-markdown";

const DRAFTS_ABSOLUTE = path.join(process.cwd(), GEOMETRY_G6_BOOK_META.draftsDir);

/**
 * @param {string} pageId
 */
export function loadGeometryG6Page(pageId) {
  const filePath = path.join(DRAFTS_ABSOLUTE, `${pageId}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  assertMathG1PageSections(page);
  return page;
}

export function loadAllGeometryG6Pages() {
  return GEOMETRY_G6_PAGE_ORDER.map((pageId) => {
    const page = loadGeometryG6Page(pageId);
    if (!page) {
      throw new Error(`Missing Grade 6 Geometry draft: ${pageId}.md`);
    }
    return page;
  });
}

export function loadGeometryG6TocEntries() {
  const pages = loadAllGeometryG6Pages();
  const byId = Object.fromEntries(pages.map((p) => [p.pageId, p]));
  const accessibleBatches = getGeometryG6AccessibleBookBatches();

  return accessibleBatches.map((batch) => ({
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

export function getGeometryG6StaticPaths() {
  return getGeometryG6AccessiblePageOrder().map((pageId) => ({ params: { pageId } }));
}
