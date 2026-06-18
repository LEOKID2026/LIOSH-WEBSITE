import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SUBJECTS = [
  {
    file: "pages/learning/hebrew-master.js",
    stemTestId: 'data-testid="hebrew-question-stem"',
    dockTestId: 'testId="hebrew-question-mobile-actions"',
    answerMarker: 'className="w-full flex-1 min-h-0 mt-2 flex flex-col items-center justify-end"',
  },
  {
    file: "pages/learning/english-master.js",
    stemTestId: 'data-testid="english-question-stem"',
    dockTestId: 'testId="english-question-mobile-actions"',
    answerMarker: "LEARNING_MASTER_ANSWER_SURFACE_CLASS",
  },
  {
    file: "pages/learning/geometry-master.js",
    stemTestId: 'data-testid="geometry-question-stem"',
    dockTestId: 'testId="geometry-question-mobile-actions"',
    answerMarker: "LEARNING_MASTER_ANSWER_SURFACE_CLASS",
  },
  {
    file: "pages/learning/science-master.js",
    stemTestId: 'testId="science-question-stem"',
    dockTestId: 'testId="science-question-mobile-actions"',
    answerMarker: "LEARNING_MASTER_ANSWER_SURFACE_CLASS",
  },
  {
    file: "pages/learning/moledet-geography-master.js",
    stemTestId: 'data-testid="moledet-question-stem"',
    dockTestId: 'testId="moledet-question-mobile-actions"',
    answerMarker: "LEARNING_MASTER_ANSWER_SURFACE_CLASS",
  },
];

function readSubjectSrc(relPath) {
  return readFileSync(fileURLToPath(new URL(`../../${relPath}`, import.meta.url)), "utf8");
}

function stemBlock(src, stemTestId) {
  const start = src.indexOf(stemTestId);
  assert.ok(start >= 0, `missing stem marker: ${stemTestId}`);
  const relativeIdx = src.lastIndexOf("relative", start);
  const openDiv = src.lastIndexOf("<div", start);
  assert.ok(openDiv >= 0 && openDiv >= relativeIdx - 40, "missing stem container open");
  let depth = 0;
  for (let i = openDiv; i < src.length; i += 1) {
    if (src.startsWith("<div", i)) depth += 1;
    if (src.startsWith("</div>", i)) {
      depth -= 1;
      if (depth === 0) {
        return src.slice(openDiv, i + "</div>".length);
      }
    }
  }
  throw new Error(`could not close stem block for ${stemTestId}`);
}

for (const subject of SUBJECTS) {
  test(`${subject.file}: mobile dock is inside relative question stem`, () => {
    const src = readSubjectSrc(subject.file);
    const block = stemBlock(src, subject.stemTestId);
    assert.match(block, /relative/);
    assert.match(block, /LearningMasterMobileQuestionActionDock/);
    assert.match(block, new RegExp(subject.dockTestId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const dockIdx = block.indexOf("LearningMasterMobileQuestionActionDock");
    const closeIdx = block.lastIndexOf("</div>");
    assert.ok(dockIdx >= 0 && dockIdx < closeIdx, "dock must be inside stem container");
  });

  test(`${subject.file}: answer surface follows question stem container`, () => {
    const src = readSubjectSrc(subject.file);
    const stemEnd = src.indexOf(stemBlock(src, subject.stemTestId)) + stemBlock(src, subject.stemTestId).length;
    const answerIdx = src.indexOf(subject.answerMarker, stemEnd);
    assert.ok(answerIdx >= 0, `answer surface must follow stem for ${subject.file}`);
    const between = src.slice(stemEnd, answerIdx);
    assert.doesNotMatch(between, /LearningMasterMobileQuestionActionDock/);
  });
}

test("math-master mobile dock remains inline inside math-question-surface (reference only)", () => {
  const src = readSubjectSrc("pages/learning/math-master.js");
  const surfaceStart = src.indexOf('data-testid="math-question-surface"');
  assert.ok(surfaceStart >= 0);
  const surfaceBlock = stemBlock(src, 'data-testid="math-question-surface"');
  assert.match(surfaceBlock, /questionMobileActionDock/);
  assert.doesNotMatch(surfaceBlock, /LearningMasterMobileQuestionActionDock/);
});
