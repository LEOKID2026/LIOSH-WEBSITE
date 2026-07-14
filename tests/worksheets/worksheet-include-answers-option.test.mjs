/**
 * Include-answers preference + hub wiring.
 * Run: node --test tests/worksheets/worksheet-include-answers-option.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("worksheet-include-answers-option", () => {
  test("ready and recommendations tabs expose include-answers option", () => {
    const ready = readFileSync(join(ROOT, "components/worksheets/ReadyWorksheetsTab.jsx"), "utf8");
    const rec = readFileSync(join(ROOT, "components/worksheets/RecommendationsTab.jsx"), "utf8");
    const hub = readFileSync(join(ROOT, "components/worksheets/ParentWorksheetsHub.jsx"), "utf8");

    assert.match(ready, /WorksheetIncludeAnswersOption/);
    assert.match(rec, /WorksheetIncludeAnswersOption/);
    assert.match(hub, /includeAnswers/);
    assert.match(hub, /loadWorksheetIncludeAnswersPref/);
    assert.match(hub, /saveWorksheetIncludeAnswersPref/);
    assert.doesNotMatch(hub, /openPreview\([\s\S]*false,\s*"ready"/);
    assert.doesNotMatch(hub, /openPreview\([\s\S]*false,\s*"recommendation"/);
  });

  test("shared preference module persists boolean flag", () => {
    const pref = readFileSync(
      join(ROOT, "lib/worksheets/worksheet-include-answers-pref.client.js"),
      "utf8"
    );
    assert.match(pref, /WORKSHEET_INCLUDE_ANSWERS_PREF_KEY/);
    assert.match(pref, /localStorage/);
    assert.match(pref, /loadWorksheetIncludeAnswersPref/);
    assert.match(pref, /saveWorksheetIncludeAnswersPref/);
  });
});
