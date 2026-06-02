import fs from "fs";
import path from "path";
import {
  GEOMETRY_G4_BOOK_BATCHES,
  GEOMETRY_G4_PAGE_ORDER,
  GEOMETRY_G4_BOOK_META,
} from "./geometry-g4-registry";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "./parse-learning-page-markdown";

const DRAFTS_ABSOLUTE = path.join(process.cwd(), GEOMETRY_G4_BOOK_META.draftsDir);

/**
 * @param {string} pageId
 */
export function loadGeometryG4Page(pageId) {
  const filePath = path.join(DRAFTS_ABSOLUTE, `${pageId}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  assertMathG1PageSections(page);
  return page;
}

export function loadAllGeometryG4Pages() {
  return GEOMETRY_G4_PAGE_ORDER.map((pageId) => {
    const page = loadGeometryG4Page(pageId);
    if (!page) {
      throw new Error(`Missing Grade 4 Geometry draft: ${pageId}.md`);
    }
    return page;
  });
}

export function loadGeometryG4TocEntries() {
  const pages = loadAllGeometryG4Pages();
  const byId = Object.fromEntries(pages.map((p) => [p.pageId, p]));

  return GEOMETRY_G4_BOOK_BATCHES.map((batch) => ({
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

export function getGeometryG4StaticPaths() {
  return GEOMETRY_G4_PAGE_ORDER.map((pageId) => ({ params: { pageId } }));
}
