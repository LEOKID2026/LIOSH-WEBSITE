/**
 * Rebuild three auto pipeline samples after Y-axis fix (ב, F, 5).
 * Run: node scripts/writing/rebuild-flip-fix-samples.mjs
 */

import { buildGlyphAssets } from "./lib/build-glyph.mjs";

/** @type {Array<[string, string, string]>} */
const SAMPLES = [
  ["he-print", "ב", "NotoSansHebrew-Regular.ttf"],
  ["en-upper", "F", "NotoSans-Regular.ttf"],
  ["digits", "5", "NotoSans-Regular.ttf"],
];

for (const [group, glyph, fontFile] of SAMPLES) {
  const result = buildGlyphAssets(group, glyph, fontFile);
  console.log(`${group}/${glyph}: ${result.strokeCount} strokes, manual=${result.usedManualOverride}`);
}

console.log("rebuild-flip-fix-samples.mjs OK");
