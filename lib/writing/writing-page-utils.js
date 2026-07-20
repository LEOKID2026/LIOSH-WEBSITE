/**
 * Writing page content helpers.
 * @module lib/writing/writing-page-utils
 */

/**
 * @param {import("./writing-worksheet-types.js").WritingPage} page
 * @returns {boolean}
 */
export function writingPageHasContent(page) {
  return page.blocks.some((b) => {
    if (b.blockType === "practice" || b.blockType === "answer_area") {
      return b.rows.some((r) => r.items.length > 0);
    }
    return b.blockType === "title" || b.blockType === "instruction" || b.blockType === "image";
  });
}

/**
 * @param {import("./writing-worksheet-types.js").WritingPage} page
 * @returns {number}
 */
export function writingPageItemCount(page) {
  let n = 0;
  for (const block of page.blocks) {
    if (block.blockType !== "practice" && block.blockType !== "answer_area") continue;
    for (const row of block.rows) n += row.items.length;
  }
  return n;
}
