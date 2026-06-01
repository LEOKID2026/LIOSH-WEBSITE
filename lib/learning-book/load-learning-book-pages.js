/**
 * Generic learning-book page loader (build-time SSG).
 */

import fs from "fs";
import path from "path";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "./parse-learning-page-markdown.js";
import {
  buildPlaceholderPageMarkdown,
  PLACEHOLDER_PAGE_ID,
} from "./learning-book-placeholders.js";

/**
 * @typedef {{
 *   batches: { id: string, titleHe: string, pages: string[] }[],
 *   pageOrder: string[],
 *   meta: { draftsDir: string, routeBase: string, [key: string]: unknown },
 *   getPageNeighbors: (pageId: string) => { prev: string|null, next: string|null, index: number },
 *   isValidPageId: (pageId: string) => boolean,
 * }} LearningBookRegistry
 */

/**
 * @param {LearningBookRegistry} registry
 */
export function createLearningBookPageLoader(registry) {
  const draftsAbsolute = path.join(process.cwd(), registry.meta.draftsDir);

  /**
   * @param {string} pageId
   */
  function loadPage(pageId) {
    const filePath = path.join(draftsAbsolute, `${pageId}.md`);
    let raw = null;

    if (fs.existsSync(filePath)) {
      raw = fs.readFileSync(filePath, "utf8");
    } else if (
      pageId === PLACEHOLDER_PAGE_ID &&
      registry.meta.status === "placeholder"
    ) {
      raw = buildPlaceholderPageMarkdown({
        subject: String(registry.meta.subject),
        grade: String(registry.meta.grade),
        subjectTitleHe: registry.meta.subjectTitleHe,
      });
    } else {
      return null;
    }

    const page = parseLearningPageMarkdown(raw, pageId);
    assertMathG1PageSections(page);
    return page;
  }

  function loadAllPages() {
    return registry.pageOrder.map((pageId) => {
      const page = loadPage(pageId);
      if (!page) {
        throw new Error(
          `Missing ${registry.meta.subject}/${registry.meta.grade} draft: ${pageId}.md`
        );
      }
      return page;
    });
  }

  function loadTocEntries() {
    const pages = loadAllPages();
    const byId = Object.fromEntries(pages.map((p) => [p.pageId, p]));

    return registry.batches.map((batch) => ({
      id: batch.id,
      titleHe: batch.titleHe,
      pages: batch.pages.map((pageId) => ({
        pageId,
        displayTitle: byId[pageId]?.displayTitle || pageId,
      })),
    }));
  }

  function getStaticPaths() {
    return registry.pageOrder.map((pageId) => ({ params: { pageId } }));
  }

  return {
    loadPage,
    loadAllPages,
    loadTocEntries,
    getStaticPaths,
  };
}

/**
 * @param {LearningBookRegistry} registry
 * @param {string} pageId
 */
export function loadLearningBookPage(registry, pageId) {
  return createLearningBookPageLoader(registry).loadPage(pageId);
}
