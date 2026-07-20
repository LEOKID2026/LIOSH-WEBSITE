/**
 * Coloring pages catalog — reads generated manifest from data/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLORING_CATALOG_PATH } from "./coloring-worksheet-types.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOG_FILE = path.join(ROOT, COLORING_CATALOG_PATH.replace(/\//g, path.sep));

/** @typedef {import("./coloring-worksheet-types.js").ColoringCatalogEntry} ColoringCatalogEntry */

let cached = /** @type {{ cards: ColoringCatalogEntry[] } | null} */ (null);

function loadCatalogFile() {
  if (!fs.existsSync(CATALOG_FILE)) {
    return { cards: [] };
  }
  const raw = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8"));
  return { cards: Array.isArray(raw.cards) ? raw.cards : [] };
}

export function getColoringCatalogEntries() {
  if (!cached) cached = loadCatalogFile();
  return cached.cards.slice();
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
