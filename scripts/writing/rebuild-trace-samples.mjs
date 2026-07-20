/**
 * Write pilot full_trace SVGs — hand-authored monoline paths (aleph + digit 2).
 * Run: node scripts/writing/rebuild-trace-samples.mjs
 */

import fs from "node:fs";
import { fullTraceSvgFromStrokes } from "./lib/font-outline.mjs";
import { fullTraceSvgPath } from "./lib/glyph-config.mjs";

/** @param {string} group @param {string} glyph @param {Array<{ path: string }>} strokes @param {{ strokeWidth?: string, strokeDasharray?: string }} [options] */
function writePilotTrace(group, glyph, strokes, options) {
  const outPath = fullTraceSvgPath(group, glyph);
  fs.mkdirSync(outPath.replace(/[/\\][^/\\]+$/, ""), { recursive: true });
  fs.writeFileSync(outPath, fullTraceSvgFromStrokes(strokes, undefined, options));
}

const alephStrokes = [
  { path: "M 27 18 L 73 84" },
  { path: "M 76 19 L 65 63" },
  { path: "M 24 81 L 35 37" },
];

const digit2Strokes = [
  {
    path: "M 24 27 C 30 12 66 12 77 28 C 86 47 66 60 50 72 L 25 89 L 80 89",
  },
];

writePilotTrace("he-print", "א", alephStrokes);
writePilotTrace("digits", "2", digit2Strokes);

console.log("rebuild-trace-samples.mjs OK (hand-authored aleph + digit-2 monoline)");
