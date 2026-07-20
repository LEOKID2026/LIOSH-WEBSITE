/**
 * Coloring pages catalog — bundled JSON manifest (works on Vercel serverless).
 */
import catalogDocument from "../../data/coloring/coloring-pages-catalog.json" with { type: "json" };

/** @typedef {import("./coloring-worksheet-types.js").ColoringCatalogEntry} ColoringCatalogEntry */

let cached = /** @type {ColoringCatalogEntry[] | null} */ (null);

function loadCatalogFile() {
  return {
    cards: Array.isArray(catalogDocument.cards) ? catalogDocument.cards : [],
  };
}

export function getColoringCatalogEntries() {
  if (!cached) cached = loadCatalogFile().cards;
  return cached.slice();
}

export function getColoringCatalogEntryByKey(cardKey) {
  const key = String(cardKey || "").trim();
  return getColoringCatalogEntries().find((c) => c.cardKey === key) || null;
}

export function getColoringCatalogForHub() {
  return getColoringCatalogEntries().map((entry) => ({
    cardKey: entry.cardKey,
    displayNameHe: entry.displayNameHe,
    category: entry.category,
    previewPath: entry.previewPath,
    a4Path: entry.a4Path,
  }));
}

export function invalidateColoringCatalogCache() {
  cached = null;
}
