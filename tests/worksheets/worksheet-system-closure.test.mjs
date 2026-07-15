/**
 * Wave G functional closure checks — worksheets hub (no parent report changes).
 * Run: node --test tests/worksheets/worksheet-system-closure.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WORKSHEET_SUBJECT_ALLOWLIST } from "../../lib/worksheets/worksheet-print-allowlist.js";
import { GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS } from "../../lib/worksheets/worksheet-geometry-allowlist.js";
import { validateWorksheetPublicGenerationParams } from "../../lib/worksheets/worksheet-level-map.server.js";
import { generateWorksheetForParent } from "../../lib/worksheets/worksheet-generate.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const CORE_SUBJECT_SAMPLES = [
  { subjectId: "math", gradeKey: "g3", topicKey: "addition", levelKey: "regular", seed: 99001 },
  { subjectId: "geometry", gradeKey: "g3", topicKey: "area", levelKey: "regular", seed: 99002 },
  { subjectId: "hebrew", gradeKey: "g3", topicKey: "reading", levelKey: "regular", seed: 99003 },
  { subjectId: "english", gradeKey: "g3", topicKey: "grammar", levelKey: "regular", seed: 99004 },
];

describe("worksheet-system-closure", () => {
  test("three hub tabs and preview routes exist", () => {
    const hub = readFileSync(join(ROOT, "components/worksheets/ParentWorksheetsHub.jsx"), "utf8");
    assert.match(hub, /ready/);
    assert.match(hub, /create/);
    assert.match(hub, /recommendations/);
    for (const rel of [
      "pages/parent/worksheets/index.js",
      "pages/parent/worksheets/preview.js",
      "pages/parent/worksheets/preview/answers.js",
    ]) {
      assert.ok(existsSync(join(ROOT, rel)), rel);
    }
  });

  test("public worksheets routes exist under /practice/worksheets", () => {
    for (const rel of [
      "pages/practice/worksheets/index.js",
      "pages/practice/worksheets/preview.js",
      "pages/practice/worksheets/preview/answers.js",
    ]) {
      assert.ok(existsSync(join(ROOT, rel)), rel);
    }
    assert.equal(existsSync(join(ROOT, "pages/worksheets")), false);
  });

  test("parent report pages unchanged by worksheets hub", () => {
    for (const rel of ["pages/parent/parent-report.js", "pages/parent/parent-report-detailed.js"]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.doesNotMatch(src, /\/parent\/worksheets/);
      assert.doesNotMatch(src, /דפי עבודה להדפסה/);
    }
  });

  test("all four core subjects generate via public API params", async () => {
    for (const sample of CORE_SUBJECT_SAMPLES) {
      const v = validateWorksheetPublicGenerationParams({ ...sample, count: 5 });
      assert.equal(v.ok, true, sample.subjectId);
      const gen = await generateWorksheetForParent({ ...sample, count: 5 });
      assert.equal(gen.ok, true, `${sample.subjectId}: ${gen.ok ? "" : gen.code}`);
    }
  });

  test("geometry only pending remains as blocked diagram kind", () => {
    assert.ok(GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS.has("pending"));
    for (const kind of ["solid_cylinder", "solid_sphere", "solid_pyramid", "solid_cone", "solid_prism"]) {
      assert.equal(GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS.has(kind), false, kind);
    }
  });

  test("four core subjects in allowlist", () => {
    assert.equal(Object.keys(WORKSHEET_SUBJECT_ALLOWLIST).length, 4);
  });
});
