/**
 * Generate real outline, centerline stroke_path, and stroke-order assets for 116 glyphs.
 * Run: node scripts/writing/build-glyph-assets.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { buildGlyphAssets } from "./lib/build-glyph.mjs";
import { ASSETS_DIR, GLYPH_GROUPS } from "./lib/glyph-config.mjs";
import { isLegacyEncodedGlyphFilename } from "../../lib/writing/glyph-asset-slugs.js";

/** @param {string} dir */
function removeLegacyAssetFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      removed += removeLegacyAssetFiles(full);
      continue;
    }
    const legacyEncoded = isLegacyEncodedGlyphFilename(name);
    const legacyDigit = /^[0-9]\.(svg|json)$/.test(name);
    if (legacyEncoded || legacyDigit) {
      fs.unlinkSync(full);
      removed += 1;
    }
  }
  return removed;
}

const removedLegacy = removeLegacyAssetFiles(ASSETS_DIR);

/** @type {Array<{ group: string, glyph: string, strokeCount: number, manual: boolean }>} */
const results = [];
/** @type {Array<{ group: string, glyph: string, error: string }>} */
const errors = [];

for (const group of GLYPH_GROUPS) {
  for (const glyph of group.glyphs) {
    try {
      const { strokeCount, usedManualOverride } = buildGlyphAssets(
        group.id,
        glyph,
        group.fontFile,
        group.fontSize
      );
      results.push({ group: group.id, glyph, strokeCount, manual: usedManualOverride === true });
    } catch (err) {
      errors.push({ group: group.id, glyph, error: String(err?.message || err) });
    }
  }
}

const manualOverrides = results.filter((r) => r.manual);

console.log(
  JSON.stringify(
    {
      ok: errors.length === 0,
      glyphCount: results.length,
      expected: GLYPH_GROUPS.reduce((n, g) => n + g.glyphs.length, 0),
      manualOverrideCount: manualOverrides.length,
      manualOverrides,
      removedLegacy,
      errors,
      sample: results.slice(0, 5),
    },
    null,
    2
  )
);

if (errors.length) process.exit(1);
