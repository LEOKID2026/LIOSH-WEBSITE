/**
 * Place-value diagram parser + column alignment checks.
 * Run: node scripts/tests/verify-math-book-place-value-diagram.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { splitBookMarkdownBlocks } from "../../lib/learning-book/book-markdown-blocks.js";
import {
  detectDiagramType,
  parsePlaceValueDiagram,
} from "../../lib/learning-book/diagram-detect.js";
import { parseLearningPageMarkdown } from "../../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

function assertColumn(parsed, label, digit) {
  const col = parsed.columns.find((c) => c.label.includes(label));
  if (!col) {
    fail(`missing column "${label}" in ${JSON.stringify(parsed.columns)}`);
    return;
  }
  if (col.digit !== String(digit)) {
    fail(`column "${label}": expected digit ${digit}, got ${col.digit}`);
  }
}

const TABLE_124 = `┌────────┬─────────┬─────────┐
│ מאות   │ עשרות   │ אחדות   │
│   1    │    2    │    4    │
└────────┴─────────┴─────────┘
          = 124`;

const TABLE_405 = `┌────────┬─────────┬─────────┐
│ מאות   │ עשרות   │ אחדות   │
│   4    │    0    │    5    │
└────────┴─────────┴─────────┘
          = 405`;

const TABLE_17 = `┌─────────┬─────────┐
│ עשרות   │ אחדות   │
│    1    │    7    │
└─────────┴─────────┘
         = 17`;

{
  if (detectDiagramType(TABLE_124) !== "place_value") {
    fail("124 table should detect as place_value");
  }
  const parsed124 = parsePlaceValueDiagram(TABLE_124);
  if (!parsed124) fail("124 table failed to parse");
  else {
    assertColumn(parsed124, "מאות", 1);
    assertColumn(parsed124, "עשרות", 2);
    assertColumn(parsed124, "אחדות", 4);
    if (parsed124.equation !== "124") {
      fail(`124 equation expected 124, got ${parsed124.equation}`);
    }
    if (parsed124.columns[0].label !== "מאות") {
      fail(`124 first column label should be מאות, got ${parsed124.columns[0].label}`);
    }
    if (parsed124.columns.map((c) => c.digit).join("") !== "124") {
      fail(`124 digit order should be 124 left-to-right`);
    }
  }

  const parsed405 = parsePlaceValueDiagram(TABLE_405);
  if (!parsed405) fail("405 table failed to parse");
  else {
    assertColumn(parsed405, "מאות", 4);
    assertColumn(parsed405, "עשרות", 0);
    assertColumn(parsed405, "אחדות", 5);
  }

  const parsed17 = parsePlaceValueDiagram(TABLE_17);
  if (!parsed17) fail("17 table failed to parse");
  else {
    assertColumn(parsed17, "עשרות", 1);
    assertColumn(parsed17, "אחדות", 7);
    if (parsed17.columns.length !== 2) {
      fail(`G1 table expected 2 columns, got ${parsed17.columns.length}`);
    }
  }

  const tenFrame = `┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│  │  │  │  │  │  │  │  │  │  │
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘`;
  if (detectDiagramType(tenFrame) !== "frame") {
    fail("ten-frame should remain frame, not place_value");
  }
  if (parsePlaceValueDiagram(tenFrame)) {
    fail("ten-frame should not parse as place-value");
  }
}

function checkBookPage(pageId, grade, sectionNumber) {
  const raw = fs.readFileSync(
    path.join(ROOT, `docs/learning-book/math/${grade}/drafts/${pageId}.md`),
    "utf8"
  );
  const page = parseLearningPageMarkdown(raw, pageId);
  const section = page.sections.find((s) => s.number === sectionNumber);
  if (!section) {
    fail(`${pageId}: missing section ${sectionNumber}`);
    return;
  }

  const codeBlock = splitBookMarkdownBlocks(section.body).find((b) => b.type === "code");
  if (!codeBlock) {
    fail(`${pageId} §${sectionNumber}: no diagram code block`);
    return;
  }
  if (detectDiagramType(codeBlock.content) !== "place_value") {
    fail(`${pageId} §${sectionNumber}: diagram not detected as place_value`);
    return;
  }
  const parsed = parsePlaceValueDiagram(codeBlock.content);
  if (!parsed) {
    fail(`${pageId} §${sectionNumber}: place-value parse returned null`);
  }
}

checkBookPage("ns_place_tens_units", "g2", 3);
checkBookPage("ns_place_tens_units", "g1", 3);

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log("OK: place-value diagram parser and book page checks.");
