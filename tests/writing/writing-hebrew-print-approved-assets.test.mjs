/**
 * Approved Hebrew print asset integration tests.
 * Run: node tests/writing/writing-hebrew-print-approved-assets.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HEBREW_PRINT_PUBLISH_ORDER,
  glyphAssetSlug,
} from "../../lib/writing/glyph-asset-slugs.js";
import {
  resolveWritingTraceAssetUrl,
  WRITING_TRACE_ASSET_VERSION,
} from "../../lib/writing/writing-trace-asset-resolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ASSETS_DIR = path.join(ROOT, "public", "assets", "writing");
const APPROVED_SOLID = path.join(ROOT, "tmp", "hebrew-glyphs", "approved-print", "export", "solid");
const APPROVED_DASHED = path.join(ROOT, "tmp", "hebrew-glyphs", "approved-print", "export", "dashed");

/**
 * @param {string} svgText
 */
function parsePaths(svgText) {
  return [...svgText.matchAll(/<path\b[^>]*\/>/g)].map((m) => m[0]);
}

/**
 * @param {string} pathTag
 */
function pathAttrs(pathTag) {
  /** @type {Record<string, string>} */
  const attrs = {};
  const re = /([\w:-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(pathTag)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

assert.equal(HEBREW_PRINT_PUBLISH_ORDER.length, 27, "expected 27 Hebrew print letters");

for (const { letter, jsonSlug, assetSlug } of HEBREW_PRINT_PUBLISH_ORDER) {
  assert.equal(glyphAssetSlug(letter), assetSlug, `slug mismatch for ${letter}`);

  const approvedSolidPath = path.join(APPROVED_SOLID, `${jsonSlug}.svg`);
  const approvedDashedPath = path.join(APPROVED_DASHED, `${jsonSlug}.svg`);
  const outlinePath = path.join(ASSETS_DIR, "outline", "he-print", `${assetSlug}.svg`);
  const strokePathPath = path.join(ASSETS_DIR, "stroke-path", "he-print", `${assetSlug}.svg`);
  const fullTracePath = path.join(ASSETS_DIR, "full-trace", "he-print", `${assetSlug}.svg`);
  const orderPath = path.join(ASSETS_DIR, "stroke-order", "he-print", `${assetSlug}.json`);

  for (const p of [approvedSolidPath, approvedDashedPath, outlinePath, strokePathPath, fullTracePath, orderPath]) {
    assert.ok(fs.existsSync(p), `missing file: ${p}`);
  }

  const approvedSolid = fs.readFileSync(approvedSolidPath, "utf8");
  const approvedDashed = fs.readFileSync(approvedDashedPath, "utf8");
  const outlineSvg = fs.readFileSync(outlinePath, "utf8");
  const strokePathSvg = fs.readFileSync(strokePathPath, "utf8");
  const fullTraceSvg = fs.readFileSync(fullTracePath, "utf8");

  assert.match(outlineSvg, /viewBox="0 0 100 100"/, `${assetSlug} outline viewBox`);
  assert.match(strokePathSvg, /viewBox="0 0 100 100"/, `${assetSlug} stroke-path viewBox`);
  assert.match(fullTraceSvg, /viewBox="0 0 100 100"/, `${assetSlug} full-trace viewBox`);

  assert.ok(!outlineSvg.includes("<circle"), `${assetSlug} outline must not contain circles`);
  assert.ok(!fullTraceSvg.includes("<circle"), `${assetSlug} full-trace must not contain circles`);
  assert.ok(outlineSvg.includes('data-outline="true"'), `${assetSlug} outline marker`);
  assert.ok(strokePathSvg.includes('data-centerline="true"'), `${assetSlug} stroke-path marker`);
  assert.ok(fullTraceSvg.includes('data-trace="full_trace"'), `${assetSlug} full-trace marker`);
  assert.ok(fullTraceSvg.includes("stroke-dasharray"), `${assetSlug} full-trace dashed`);

  const approvedSolidPaths = parsePaths(approvedSolid);
  const approvedDashedPaths = parsePaths(approvedDashed);
  const outlinePaths = parsePaths(outlineSvg);
  const strokePaths = parsePaths(strokePathSvg);
  const fullTracePaths = parsePaths(fullTraceSvg);

  assert.equal(outlinePaths.length, approvedSolidPaths.length, `${assetSlug} outline path count`);
  assert.equal(strokePaths.length, approvedSolidPaths.length, `${assetSlug} stroke-path path count`);
  assert.equal(fullTracePaths.length, approvedDashedPaths.length, `${assetSlug} full-trace path count`);

  for (let i = 0; i < approvedSolidPaths.length; i++) {
    const a = pathAttrs(approvedSolidPaths[i]);
    const o = pathAttrs(outlinePaths[i]);
    const s = pathAttrs(strokePaths[i]);
    for (const key of ["id", "d", "stroke-width", "stroke-linecap", "stroke-linejoin"]) {
      assert.equal(o[key], a[key], `${assetSlug} outline ${a.id} ${key}`);
      assert.equal(s[key], a[key], `${assetSlug} stroke-path ${a.id} ${key}`);
    }
  }

  for (let i = 0; i < approvedDashedPaths.length; i++) {
    const a = pathAttrs(approvedDashedPaths[i]);
    const f = pathAttrs(fullTracePaths[i]);
    for (const key of ["id", "d", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset"]) {
      if (a[key] !== undefined) {
        assert.equal(f[key], a[key], `${assetSlug} full-trace ${a.id} ${key}`);
      }
    }
  }

  if (jsonSlug === "tsadi") {
    assert.ok(fullTraceSvg.includes('id="stroke-3-1"'), "tsadi dashed stroke-3-1");
    assert.ok(fullTraceSvg.includes('id="stroke-3-2"'), "tsadi dashed stroke-3-2");
    assert.ok(fullTraceSvg.includes('id="stroke-3-3"'), "tsadi dashed stroke-3-3");
  }

  const fullTraceUrl = resolveWritingTraceAssetUrl({
    language: "he",
    scriptStyle: "print",
    character: letter,
    traceRenderMode: "full_trace",
  });
  const outlineUrl = resolveWritingTraceAssetUrl({
    language: "he",
    scriptStyle: "print",
    character: letter,
    traceRenderMode: "outline",
  });
  const strokePathUrl = resolveWritingTraceAssetUrl({
    language: "he",
    scriptStyle: "print",
    character: letter,
    traceRenderMode: "stroke_path",
  });

  assert.ok(fullTraceUrl?.includes(`/full-trace/he-print/${assetSlug}.svg`), fullTraceUrl);
  assert.ok(outlineUrl?.includes(`/outline/he-print/${assetSlug}.svg`), outlineUrl);
  assert.ok(strokePathUrl?.includes(`/stroke-path/he-print/${assetSlug}.svg`), strokePathUrl);
  assert.ok(fullTraceUrl?.includes(`v=${WRITING_TRACE_ASSET_VERSION}`), fullTraceUrl);
  assert.ok(!fullTraceUrl?.includes("%"), `${letter} resolver URL must not be encoded`);
}

assert.equal(WRITING_TRACE_ASSET_VERSION, "writing-trace-hebrew-print-v4");

console.log("writing-hebrew-print-approved-assets.test.mjs OK (27 letters, 54 SVG paths verified)");
