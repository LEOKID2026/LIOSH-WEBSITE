/**
 * Verify writing fonts — existence, size, checksum, glyph coverage.
 * Run: node scripts/writing/verify-fonts.mjs
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import opentype from "opentype.js";
import { fileURLToPath } from "node:url";
import { HEBREW_LETTERS, ENGLISH_UPPER, ENGLISH_LOWER } from "../../lib/writing/writing-constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const FONTS_DIR = path.join(ROOT, "public", "fonts", "writing");
const OUT_MANIFEST = path.join(ROOT, "docs", "audits", "writing-fonts-manifest.json");

const FONT_SPECS = [
  {
    file: "NotoSansHebrew-Regular.ttf",
    family: "Noto Sans Hebrew",
    role: "he-print",
    glyphs: HEBREW_LETTERS,
  },
  {
    file: "GveretLevin-Regular.ttf",
    family: "Gveret Levin",
    role: "he-script",
    glyphs: HEBREW_LETTERS,
  },
  {
    file: "NotoSans-Regular.ttf",
    family: "Noto Sans",
    role: "en-upper+digits",
    glyphs: [...ENGLISH_UPPER, ..."0123456789".split("")],
  },
  {
    file: "PatrickHand-Regular.ttf",
    family: "Patrick Hand",
    role: "en-lower",
    glyphs: ENGLISH_LOWER,
  },
];

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

/** @type {Array<Record<string, unknown>>} */
const results = [];
let ok = true;

for (const spec of FONT_SPECS) {
  const filePath = path.join(FONTS_DIR, spec.file);
  const entry = {
    file: spec.file,
    family: spec.family,
    role: spec.role,
    exists: fs.existsSync(filePath),
    bytes: 0,
    sha256: "",
    missingGlyphs: /** @type {string[]} */ ([]),
    licenseFile: fs.existsSync(path.join(FONTS_DIR, "LICENSE")),
  };

  if (!entry.exists) {
    ok = false;
    results.push(entry);
    continue;
  }

  const stat = fs.statSync(filePath);
  entry.bytes = stat.size;
  entry.sha256 = sha256(filePath);

  if (stat.size < 1024) {
    ok = false;
    entry.error = "file too small";
  }

  const buffer = fs.readFileSync(filePath);
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  for (const g of spec.glyphs) {
    const glyph = font.charToGlyph(g);
    if (!glyph || glyph.index === 0) entry.missingGlyphs.push(g);
  }
  if (entry.missingGlyphs.length) ok = false;

  results.push(entry);
}

ensureDir(path.dirname(OUT_MANIFEST));
fs.writeFileSync(
  OUT_MANIFEST,
  JSON.stringify({ generatedAt: new Date().toISOString(), ok, fonts: results }, null, 2)
);

console.log(JSON.stringify({ ok, manifest: OUT_MANIFEST, fonts: results.length }, null, 2));
if (!ok) process.exit(1);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
