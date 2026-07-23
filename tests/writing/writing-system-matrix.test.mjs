/**
 * Writing system matrix — payload, layout, word packs, assets.
 * Run: node tests/writing/writing-system-matrix.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HEBREW_GLYPH_SLUGS,
  HEBREW_LETTERS_ORDER,
  HEBREW_PRINT_PUBLISH_ORDER,
  glyphAssetSlug,
} from "../../lib/writing/glyph-asset-slugs.js";
import {
  ENGLISH_LOWER,
  ENGLISH_UPPER,
  HEBREW_WORD_PACKS,
  ENGLISH_WORD_PACKS,
  wordsFromPack,
} from "../../lib/writing/writing-constants.js";
import {
  buildWritingPayloadFromRequest,
  buildReadyWritingPayload,
} from "../../lib/writing/writing-payload-build.server.js";
import { validateWritingRequest } from "../../lib/writing/writing-validate.server.js";
import { applyReferenceSheetPreset } from "../../lib/writing/writing-reference-sheet-presets.js";
import { resolveWritingTraceAssetUrl } from "../../lib/writing/writing-trace-asset-resolver.js";
import { getReadyWritingBySlug } from "../../lib/writing/writing-ready-catalog.js";
import { generateWritingForParent } from "../../lib/writing/writing-generate.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ASSETS = path.join(ROOT, "public", "assets", "writing");

function validated(body) {
  const result = validateWritingRequest(body);
  assert.equal(result.ok, true, `validation failed: ${!result.ok ? result.code : ""}`);
  return /** @type {import("../../lib/writing/writing-worksheet-types.js").WritingWorksheetRequest} */ (
    result.request
  );
}

function practiceWords(payload) {
  /** @type {string[]} */
  const texts = [];
  for (const page of payload.pages) {
    for (const block of page.blocks) {
      if (block.blockType !== "practice") continue;
      for (const row of block.rows) {
        for (const item of row.items) {
          if (item.itemType === "word" && item.text) texts.push(item.text);
        }
      }
    }
  }
  return texts;
}

function allGlyphChars(payload) {
  /** @type {string[]} */
  const chars = [];
  for (const page of payload.pages) {
    for (const block of page.blocks) {
      if (block.blockType !== "practice") continue;
      for (const row of block.rows) {
        for (const item of row.items) {
          if (item.itemType === "glyph" && item.character) chars.push(item.character);
        }
      }
    }
  }
  return chars;
}

function assetFileExists(url) {
  const rel = String(url || "").split("?")[0].replace(/^\//, "");
  return fs.existsSync(path.join(ROOT, "public", rel.replace(/\//g, path.sep)));
}

// --- Word packs ---
const heAnimals = wordsFromPack(HEBREW_WORD_PACKS, "animals");
assert.ok(heAnimals.length >= 5, "hebrew animals pack should have words");
assert.ok(heAnimals.includes("חָתוּל"), "hebrew animals pack must include חָתוּל");

const enAnimals = wordsFromPack(ENGLISH_WORD_PACKS, "animals");
assert.ok(enAnimals.includes("cat"), "english animals pack must include cat");

// --- Hebrew letter assets (print + script) ---
for (const letter of HEBREW_LETTERS_ORDER) {
  const slug = glyphAssetSlug(letter);
  for (const scriptStyle of ["print", "script"]) {
    for (const mode of ["full_trace", "outline", "stroke_path"]) {
      const url = resolveWritingTraceAssetUrl({
        language: "he",
        scriptStyle,
        character: letter,
        traceRenderMode: mode,
      });
      assert.ok(url, `missing url for ${letter} ${scriptStyle} ${mode}`);
      assert.ok(assetFileExists(url), `missing file for ${letter} ${scriptStyle} ${mode}: ${url}`);
    }
  }
}

assert.equal(HEBREW_PRINT_PUBLISH_ORDER.length, 27);

// --- Reference sheet: all 27 letters ---
{
  const req = validated(applyReferenceSheetPreset("he_print"));
  const payload = buildWritingPayloadFromRequest(req);
  const chars = allGlyphChars(payload);
  assert.equal(chars.length, 27, "he_print reference sheet must have 27 glyphs");
  for (const f of ["ך", "ם", "ן", "ף", "ץ"]) {
    assert.ok(chars.includes(f), `final letter missing from reference sheet: ${f}`);
  }
}

// --- Single Hebrew letter hero ---
{
  const req = validated({
    worksheetType: "writing",
    writingCategory: "hebrew_letters",
    characters: ["א"],
    scriptStyle: "print",
    tracingMode: "trace",
    traceRenderMode: "full_trace",
    lineCount: 6,
    itemsPerLine: 4,
  });
  assert.equal(req.lineTemplate, "single_letter_hero");
  assert.equal(req.itemsPerLine, 1);
  const payload = buildWritingPayloadFromRequest(req);
  assert.equal(payload.meta.lineTemplate, "single_letter_hero");
}

// --- Hebrew word pack payload ---
{
  const req = validated({
    worksheetType: "writing",
    writingCategory: "hebrew_words",
    wordPackId: "animals",
    scriptStyle: "print",
    tracingMode: "trace",
    traceRenderMode: "full_trace",
    lineCount: 6,
    itemsPerLine: 1,
    includeImage: true,
  });
  const payload = buildWritingPayloadFromRequest(req);
  const words = practiceWords(payload);
  assert.ok(words.length > 0, "hebrew word pack payload must contain words");
  assert.ok(words.some((w) => w.includes("ח")), "hebrew word trace must preserve full word");
}

// --- English word pack ---
{
  const req = validated({
    worksheetType: "writing",
    writingCategory: "english_words",
    wordPackId: "animals",
    scriptStyle: "print",
    tracingMode: "trace",
    traceRenderMode: "full_trace",
    lineCount: 6,
    itemsPerLine: 1,
  });
  const payload = buildWritingPayloadFromRequest(req);
  const words = practiceWords(payload);
  assert.ok(words.includes("cat"), "english word cat must appear in payload");
  assert.equal(payload.meta.pageDirection, "ltr");
}

// --- Personal text: whole word ---
{
  const req = validated({
    worksheetType: "writing",
    writingCategory: "personal_text",
    customTextKind: "word",
    customText: "שלום",
    scriptStyle: "print",
    tracingMode: "trace_and_copy",
    traceRenderMode: "full_trace",
    lineCount: 6,
    itemsPerLine: 4,
  });
  const payload = buildWritingPayloadFromRequest(req);
  const words = practiceWords(payload);
  assert.deepEqual(words.filter((w, i, a) => a.indexOf(w) === i), ["שלום"]);
  assert.equal(req.lineTemplate, "word_row");
}

// --- Personal text: name with final letter ---
{
  const req = validated({
    worksheetType: "writing",
    writingCategory: "personal_text",
    customTextKind: "full_name",
    customText: "Noa",
    scriptStyle: "print",
    tracingMode: "trace",
    traceRenderMode: "full_trace",
    lineCount: 6,
    itemsPerLine: 4,
  });
  const payload = buildWritingPayloadFromRequest(req);
  const chars = allGlyphChars(payload);
  assert.ok(chars.includes("N") && chars.includes("o") && chars.includes("a"));
}

// --- Hebrew name with space → blank cells, not crash ---
{
  const req = validated({
    worksheetType: "writing",
    writingCategory: "personal_text",
    customTextKind: "full_name",
    customText: "דן י",
    scriptStyle: "print",
    tracingMode: "trace",
    traceRenderMode: "full_trace",
    lineCount: 4,
    itemsPerLine: 1,
  });
  const payload = buildWritingPayloadFromRequest(req);
  let blankCount = 0;
  for (const page of payload.pages) {
    for (const block of page.blocks) {
      if (block.blockType !== "practice") continue;
      for (const row of block.rows) {
        for (const item of row.items) {
          if (item.itemType === "blank") blankCount += 1;
        }
      }
    }
  }
  assert.ok(blankCount >= 1, "space in name should produce blank practice cell");
}

// --- English letters bulk ---
for (const letter of ENGLISH_UPPER) {
  const slug = glyphAssetSlug(letter);
  const url = resolveWritingTraceAssetUrl({
    language: "en",
    scriptStyle: "print",
    character: letter,
    traceRenderMode: "full_trace",
  });
  assert.ok(assetFileExists(url), `missing en-upper asset for ${letter} (${slug})`);
}

for (const letter of ENGLISH_LOWER) {
  const url = resolveWritingTraceAssetUrl({
    language: "en",
    scriptStyle: "print",
    character: letter,
    traceRenderMode: "full_trace",
  });
  assert.ok(assetFileExists(url), `missing en-lower asset for ${letter}`);
}

// --- Digits 0-9 ---
for (const digit of "0123456789") {
  const url = resolveWritingTraceAssetUrl({
    language: "he",
    scriptStyle: "print",
    character: digit,
    traceRenderMode: "full_trace",
  });
  assert.ok(assetFileExists(url), `missing digit asset for ${digit}`);
}

// --- Ready catalog: hebrew word trace ---
{
  const entry = getReadyWritingBySlug("writing-he-words-animals-trace");
  assert.ok(entry, "ready hebrew animals trace entry must exist");
  const payload = buildReadyWritingPayload(entry);
  const words = practiceWords(payload);
  assert.ok(words.length > 0, "ready hebrew animals page must include words");
}

// --- Ready catalog: single letter ---
{
  const entry = getReadyWritingBySlug("writing-he-aleph-trace-standard");
  assert.ok(entry);
  const payload = buildReadyWritingPayload(entry);
  assert.equal(payload.meta.lineTemplate, "single_letter_hero");
}

// --- Parent generate path parity ---
{
  const gen = generateWritingForParent({
    worksheetType: "writing",
    writingCategory: "english_words",
    wordPackId: "colors",
    scriptStyle: "print",
    tracingMode: "trace",
    traceRenderMode: "full_trace",
    lineCount: 4,
    itemsPerLine: 1,
  });
  assert.equal(gen.ok, true);
  const words = practiceWords(gen.worksheetPayload);
  assert.ok(words.includes("red"), "parent generate english colors must include red");
}

// --- Slug map sanity ---
for (const [letter, slug] of Object.entries(HEBREW_GLYPH_SLUGS)) {
  assert.equal(glyphAssetSlug(letter), slug, `slug mismatch for ${letter}`);
}

console.log("writing-system-matrix.test.mjs OK");
