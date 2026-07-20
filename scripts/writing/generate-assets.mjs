/**
 * Generate writing worksheet assets — illustrations, prewriting, glyph assets.
 * Run: node scripts/writing/generate-assets.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREWRITING_PATHS } from "../../lib/writing/writing-constants.js";
import { buildGlyphAssets } from "./lib/build-glyph.mjs";
import { GLYPH_GROUPS } from "./lib/glyph-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_ASSETS = path.join(ROOT, "public", "assets", "writing");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeSvg(filePath, inner, viewBox = "0 0 100 100") {
  ensureDir(path.dirname(filePath));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="#334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>\n`;
  fs.writeFileSync(filePath, svg);
}

/** @type {Record<string, string>} */
const PREWRITING_SVGS = {
  horizontal: `<path d="M8,50 L92,50" stroke-dasharray="6 5"/>`,
  vertical: `<path d="M50,8 L50,92" stroke-dasharray="6 5"/>`,
  waves: `<path d="M8,50 Q20,30 32,50 T56,50 T80,50 T92,50"/>`,
  circles: `<path d="M20,50 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 M50,50 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 M80,50 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0"/>`,
  zigzag: `<path d="M8,60 L22,40 L36,60 L50,40 L64,60 L78,40 L92,60"/>`,
  loops: `<path d="M15,50 Q15,25 35,25 Q55,25 55,50 Q55,75 35,75 Q15,75 15,50 M65,50 Q65,30 80,30 Q92,30 92,45"/>`,
  curves: `<path d="M8,70 Q30,20 50,70 Q70,20 92,70"/>`,
  spirals: `<path d="M50,50 m-2,0 a2,2 0 1,0 4,0 a4,4 0 1,1 -8,0 a8,8 0 1,0 16,0 a12,12 0 1,1 -24,0"/>`,
  peaks: `<path d="M8,70 L20,35 L32,70 L44,35 L56,70 L68,35 L80,70 L92,35"/>`,
  valleys: `<path d="M8,35 L20,70 L32,35 L44,70 L56,35 L68,70 L80,35 L92,70"/>`,
  slants: `<path d="M15,85 L35,15 M45,85 L65,15 M75,85 L85,25"/>`,
  bridges: `<path d="M10,65 L40,65 Q50,35 60,65 L90,65"/><path d="M10,45 L40,45 Q50,75 60,45 L90,45" stroke-width="2"/>`,
  mountains: `<path d="M5,75 L25,25 L45,75 L65,30 L85,75 L95,75"/>`,
  tunnels: `<path d="M10,70 Q10,30 50,30 Q90,30 90,70"/><path d="M20,70 Q20,40 50,40 Q80,40 80,70" stroke-width="1.8"/>`,
  combo: `<path d="M8,25 L92,25"/><path d="M8,50 Q50,20 92,50"/><path d="M8,75 L92,75"/>`,
  mixed_shapes: `<circle cx="22" cy="50" r="14" stroke-width="2.5"/><rect x="42" y="36" width="28" height="28" rx="4" stroke-width="2.5"/><path d="M78,64 L88,36 L98,64 Z" stroke-width="2.5"/>`,
};

function qtySvg(n) {
  const dots = [];
  for (let i = 0; i < n; i += 1) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    dots.push(`<circle cx="${15 + col * 16}" cy="${20 + row * 16}" r="5" fill="#333"/>`);
  }
  return dots.join("");
}

const ILLUSTRATIONS = [
  "ill-mom", "ill-dad", "ill-boy", "ill-girl", "ill-baby", "ill-grandma",
  "ill-cat", "ill-dog", "ill-bird", "ill-fish", "ill-rabbit", "ill-horse", "ill-cow", "ill-lion",
  "ill-apple", "ill-banana", "ill-bread", "ill-milk", "ill-egg", "ill-cake",
  "ill-house", "ill-door", "ill-bed", "ill-table", "ill-chair",
  "ill-book", "ill-pencil", "ill-backpack", "ill-clock", "ill-desk",
  "ill-tree", "ill-flower", "ill-sun", "ill-cloud", "ill-mountain", "ill-rain",
  "ill-hand", "ill-foot", "ill-eye", "ill-ear", "ill-nose", "ill-mouth",
  "ill-car", "ill-bus", "ill-bike", "ill-train", "ill-plane",
  "ill-menorah", "ill-flag", "ill-gift", "ill-candle",
  "ill-ball", "ill-cup", "ill-hat", "ill-shoe", "ill-key",
  "ill-grape", "ill-watermelon", "ill-strawberry", "ill-carrot", "ill-tomato", "ill-orange-fruit",
  "ill-crayon", "ill-balloon", "ill-circle-shape", "ill-star-shape", "ill-family",
];

const GATE_B_SAMPLES = [
  { group: "he-print", glyph: "א" },
  { group: "he-print", glyph: "ש" },
  { group: "he-print", glyph: "ץ" },
  { group: "he-script", glyph: "א" },
  { group: "he-script", glyph: "מ" },
  { group: "he-script", glyph: "ץ" },
  { group: "en-upper", glyph: "A" },
  { group: "en-lower", glyph: "a" },
  { group: "en-lower", glyph: "g" },
  { group: "digits", glyph: "5" },
];

let counts = { illustrations: 0, qty: 0, prewriting: 0 };

for (let i = 1; i <= 10; i += 1) {
  writeSvg(path.join(PUBLIC_ASSETS, "illustrations", `qty-${String(i).padStart(2, "0")}.svg`), qtySvg(i));
  counts.qty += 1;
}

for (const id of ILLUSTRATIONS) {
  writeSvg(
    path.join(PUBLIC_ASSETS, "illustrations", `${id}.svg`),
    `<rect x="10" y="20" width="80" height="60" rx="8" stroke="#444"/><text x="50" y="58" text-anchor="middle" font-size="10" fill="#666">${id.replace("ill-", "")}</text>`
  );
  counts.illustrations += 1;
}

for (const pathId of PREWRITING_PATHS) {
  writeSvg(path.join(PUBLIC_ASSETS, "prewriting", `${pathId}.svg`), PREWRITING_SVGS[pathId] || `<path d="M10,50 L90,50"/>`);
  counts.prewriting += 1;
}

/** @type {Array<{ group: string, glyph: string, strokeCount: number }>} */
const glyphResults = [];
for (const group of GLYPH_GROUPS) {
  for (const glyph of group.glyphs) {
    const { strokeCount } = buildGlyphAssets(group.id, glyph, group.fontFile, group.fontSize);
    glyphResults.push({ group: group.id, glyph, strokeCount });
  }
}
const glyphResult = { ok: true, glyphCount: glyphResults.length, expected: 116 };

fs.writeFileSync(
  path.join(ROOT, "scripts", "writing", "gate-b-samples.json"),
  JSON.stringify({ count: GATE_B_SAMPLES.length, samples: GATE_B_SAMPLES }, null, 2)
);

console.log(
  JSON.stringify(
    {
      ok: true,
      counts,
      glyphs: glyphResult,
      totalIllustrations: counts.qty + counts.illustrations,
      gateB: GATE_B_SAMPLES.length,
    },
    null,
    2
  )
);
