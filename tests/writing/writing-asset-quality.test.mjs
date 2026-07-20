/**
 * Anti-placeholder + real asset quality tests for writing glyphs.
 * Run: node tests/writing/writing-asset-quality.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GLYPH_GROUPS, ASSETS_DIR, glyphAssetBasename } from "../../scripts/writing/lib/glyph-config.mjs";
import { isLegacyEncodedGlyphFilename } from "../../lib/writing/glyph-asset-slugs.js";
import { resolveWritingTraceAssetUrl } from "../../lib/writing/writing-trace-asset-resolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLACEHOLDER_PATTERNS = [
  /md5/i,
  /placeholder/i,
  /fallback/i,
  /M20,80 L80,20/,
  /M20,80 Q50,/,
  /simpleGlyphPath/,
  /generatedBy.*hash/i,
];

/** @type {Set<string>} */
const strokePathContents = new Set();
/** @type {Set<string>} */
const outlineContents = new Set();
/** @type {Set<string>} */
const fullTraceContents = new Set();
let strokePathCount = 0;
let strokeOrderCount = 0;
let fullTraceCount = 0;

for (const group of GLYPH_GROUPS) {
  for (const glyph of group.glyphs) {
    const slug = glyphAssetBasename(group.id, glyph);
    assert.ok(!isLegacyEncodedGlyphFilename(`${slug}.svg`), `legacy encoded slug for ${group.id}/${glyph}`);
    assert.ok(!/%[0-9A-Fa-f]{2}/.test(slug), `slug must be ASCII: ${slug}`);

    const publicUrl = resolveWritingTraceAssetUrl({
      language: group.id.startsWith("he") ? "he" : "en",
      scriptStyle: group.id === "he-script" ? "script" : "print",
      character: glyph,
      traceRenderMode: "full_trace",
    });
    assert.ok(publicUrl, `missing resolver URL for ${group.id}/${glyph}`);
    assert.ok(!publicUrl.includes("%"), `public URL must not be percent-encoded: ${publicUrl}`);

    const strokePath = path.join(ASSETS_DIR, "stroke-path", group.id, `${slug}.svg`);
    const outlinePath = path.join(ASSETS_DIR, "outline", group.id, `${slug}.svg`);
    const fullTracePath = path.join(ASSETS_DIR, "full-trace", group.id, `${slug}.svg`);
    const orderPath = path.join(ASSETS_DIR, "stroke-order", group.id, `${slug}.json`);

    assert.ok(fs.existsSync(strokePath), `missing stroke-path ${group.id}/${slug}`);
    assert.ok(fs.existsSync(outlinePath), `missing outline ${group.id}/${slug}`);
    assert.ok(fs.existsSync(fullTracePath), `missing full-trace ${group.id}/${slug}`);
    assert.ok(fs.existsSync(orderPath), `missing stroke-order ${group.id}/${slug}`);

    const strokeSvg = fs.readFileSync(strokePath, "utf8");
    const outlineSvg = fs.readFileSync(outlinePath, "utf8");
    const fullTraceSvg = fs.readFileSync(fullTracePath, "utf8");
    const orderJson = JSON.parse(fs.readFileSync(orderPath, "utf8"));

    assert.ok(strokeSvg.includes('data-centerline="true"'), `${group.id}/${glyph} stroke_path missing centerline marker`);
    assert.ok(!strokeSvg.includes("<text"), `${group.id}/${glyph} stroke_path must not use text fallback`);
    assert.ok(strokeSvg.includes("<path"), `${group.id}/${glyph} stroke_path must contain path elements`);
    assert.ok(outlineSvg.includes("<path"), `${group.id}/${glyph} outline must contain font path`);
    assert.ok(!outlineSvg.includes("<text"), `${group.id}/${glyph} outline must not use text fallback`);

    assert.ok(fullTraceSvg.includes('data-trace="full_trace"'), `${group.id}/${glyph} full-trace marker`);
    assert.ok(fullTraceSvg.includes("stroke-dasharray"), `${group.id}/${glyph} full-trace must be dashed`);
    assert.ok(fullTraceSvg.includes('fill="none"'), `${group.id}/${glyph} full-trace must not fill`);
    assert.ok(!fullTraceSvg.includes("<text"), `${group.id}/${glyph} full-trace must not use text`);

    for (const pattern of PLACEHOLDER_PATTERNS) {
      assert.ok(!pattern.test(strokeSvg), `${group.id}/${glyph} stroke_path matches placeholder ${pattern}`);
      assert.ok(!pattern.test(outlineSvg), `${group.id}/${glyph} outline matches placeholder ${pattern}`);
      assert.ok(!pattern.test(fullTraceSvg), `${group.id}/${glyph} full-trace matches placeholder ${pattern}`);
      assert.ok(!pattern.test(JSON.stringify(orderJson)), `${group.id}/${glyph} stroke-order matches placeholder ${pattern}`);
    }

    assert.notEqual(strokeSvg.trim(), outlineSvg.trim(), `${group.id}/${glyph} outline and stroke_path must differ`);
    assert.notEqual(fullTraceSvg.trim(), outlineSvg.trim(), `${group.id}/${glyph} full-trace and outline must differ`);
    assert.equal(orderJson.glyphId, glyph);
    assert.equal(orderJson.group, group.id);
    assert.ok(orderJson.strokeCount >= 1, `${group.id}/${glyph} needs strokes`);
    assert.equal(orderJson.strokes.length, orderJson.strokeCount);
    assert.equal(orderJson.generatedBy, "build-glyph-assets");

    const pathIds = (strokeSvg.match(/id="stroke-\d+"/g) || []).length;
    assert.equal(pathIds, orderJson.strokeCount, `${group.id}/${glyph} SVG path count must match JSON`);

    for (const stroke of orderJson.strokes) {
      assert.ok(stroke.path?.startsWith("M "), `${group.id}/${glyph} stroke ${stroke.order} invalid path`);
      assert.ok(stroke.start && typeof stroke.start.x === "number");
      assert.ok(stroke.end && typeof stroke.end.x === "number");
      assert.ok(stroke.direction);
      assert.equal(typeof stroke.arrow, "boolean");
    }

    strokePathContents.add(strokeSvg.replace(/\s+/g, " ").slice(0, 200));
    outlineContents.add(outlineSvg.replace(/\s+/g, " ").slice(0, 200));
    fullTraceContents.add(fullTraceSvg.replace(/\s+/g, " ").slice(0, 200));
    strokePathCount += 1;
    strokeOrderCount += 1;
    fullTraceCount += 1;
  }
}

assert.equal(strokePathCount, 116);
assert.equal(strokeOrderCount, 116);
assert.equal(fullTraceCount, 116);
assert.equal(strokePathContents.size, 116, "each glyph stroke_path must be unique");
assert.equal(outlineContents.size, 116, "each glyph outline must be unique");
assert.equal(fullTraceContents.size, 116, "each glyph full-trace must be unique");

console.log(`writing-asset-quality.test.mjs OK (${strokePathCount} centerline + ${fullTraceCount} dashed trace assets)`);
