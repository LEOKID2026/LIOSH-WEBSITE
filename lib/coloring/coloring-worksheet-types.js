/** Shared coloring worksheet constants and types. */

export const COLORING_PAYLOAD_KIND = "coloring_worksheet";

export const WORKSHEET_TYPE_COLORING = "coloring";

export const COLORING_ASSET_BASE = "/assets/coloring-pages/cards";

export const COLORING_CATALOG_PATH = "data/coloring/coloring-pages-catalog.json";

/**
 * @typedef {Object} ColoringCatalogEntry
 * @property {string} cardKey
 * @property {string} displayNameHe
 * @property {"shop"|"achievement"|"event"|string} category
 * @property {string} sourceImagePath
 * @property {string} lineArtPath
 * @property {string} a4Path
 * @property {string} previewPath
 */

/**
 * @typedef {Object} ColoringWorksheetPayload
 * @property {"coloring_worksheet"} payloadKind
 * @property {string} worksheetType
 * @property {string} cardKey
 * @property {string} displayNameHe
 * @property {string} previewUrl
 * @property {string} a4Url
 * @property {string} title
 * @property {number} savedAt
 */

export const COLORING_LINE_ART_PROMPT = `Children's printable coloring book page, portrait orientation. Pure white background. Single large centered character matching the reference image exactly: preserve identity, pose, costume, important props and central background elements. Bold clean black outline strokes only, no color, no gray shading, no black fills in large areas, no card frame, no text, no numbers, no rarity symbols, no coins, no UI buttons. Simplified kid-friendly closed line art for ages 4-8. Do not crop ears, tail, limbs or important objects. No busy confetti noise.`;
