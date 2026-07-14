/**
 * Parent worksheets hub — routes and catalog contract — Wave E.
 * Run: node --test tests/worksheets/parent-worksheets-hub.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  READY_WORKSHEET_CATALOG,
  countReadyCatalogBySubject,
} from "../../lib/worksheets/worksheet-ready-catalog.js";
import { WORKSHEET_SUBJECT_ALLOWLIST } from "../../lib/worksheets/worksheet-print-allowlist.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("parent-worksheets-hub", () => {
  test("hub page and preview routes exist", () => {
    const paths = [
      "pages/parent/worksheets/index.js",
      "pages/parent/worksheets/preview.js",
      "pages/parent/worksheets/preview/answers.js",
    ];
    for (const rel of paths) {
      assert.ok(existsSync(join(ROOT, rel)), `${rel} missing`);
    }
  });

  test("hub components exist", () => {
    const components = [
      "components/worksheets/ParentWorksheetsHub.jsx",
      "components/worksheets/ReadyWorksheetsTab.jsx",
      "components/worksheets/CreateWorksheetTab.jsx",
      "components/worksheets/RecommendationsTab.jsx",
      "components/worksheets/WorksheetPreviewPage.jsx",
      "components/worksheets/WorksheetPreviewActions.jsx",
    ];
    for (const rel of components) {
      assert.ok(existsSync(join(ROOT, rel)), `${rel} missing`);
    }
  });

  test("hub page requires parent bearer session", () => {
    const src = readFileSync(join(ROOT, "pages/parent/worksheets/index.js"), "utf8");
    assert.match(src, /resolveParentBearerSession/);
    assert.match(src, /clearParentBearerSessionAndRedirect/);
  });

  test("ready catalog covers all four core subjects", () => {
    const subjects = new Set(READY_WORKSHEET_CATALOG.map((e) => e.subjectId));
    for (const sid of Object.keys(WORKSHEET_SUBJECT_ALLOWLIST)) {
      assert.ok(subjects.has(sid), `catalog missing subject ${sid}`);
    }
    assert.ok(READY_WORKSHEET_CATALOG.length >= 30);
    const counts = countReadyCatalogBySubject();
    assert.ok(counts.math >= 15);
    assert.ok(counts.geometry >= 5);
    assert.ok(counts.hebrew >= 5);
    assert.ok(counts.english >= 5);
  });

  test("worksheet APIs use parent auth", () => {
    for (const rel of [
      "pages/api/parent/worksheets/catalog.js",
      "pages/api/parent/worksheets/generate.js",
      "pages/api/parent/worksheets/answer-key.js",
      "pages/api/parent/worksheets/recommendations.js",
    ]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.match(src, /requireParentApiContext/, `${rel} must require parent auth`);
    }
  });

  test("hub does not reference parent report pages", () => {
    const hubSrc = readFileSync(join(ROOT, "components/worksheets/ParentWorksheetsHub.jsx"), "utf8");
    assert.doesNotMatch(hubSrc, /parent-report/);
    assert.doesNotMatch(hubSrc, /דוח/);
  });

  test("parent dashboard links to worksheets hub", () => {
    const dash = readFileSync(join(ROOT, "pages/parent/dashboard.js"), "utf8");
    assert.match(dash, /\/parent\/worksheets/);
    assert.match(dash, /דפי עבודה להדפסה/);
    assert.doesNotMatch(dash, /parent-report.*worksheets/);
  });
});
