/**
 * Unit tests for book-line-classifier + vertical-arithmetic-parse.
 * Run: node scripts/tests/verify-book-line-classifier.mjs
 */
import {
  classifyBookLine,
  isExampleTitleLine,
  isPlaceValueEquationLine,
  parseExampleTitleLine,
  parsePlaceValueEquationLine,
} from "../../lib/learning-book/book-line-classifier.js";
import {
  isVerticalArithmeticBlock,
  parseVerticalArithmetic,
} from "../../lib/learning-book/vertical-arithmetic-parse.js";

const errors = [];

function assert(name, cond) {
  if (!cond) errors.push(name);
}

assert(
  "example title add_two",
  classifyBookLine("**58 + 37 — פירוק לעשרות ואחדות:**") === "example_title"
);
assert(
  "example title sub_two",
  classifyBookLine("**68 − 24 — פירוק לעשרות ואחדות:**") === "example_title"
);
assert(
  "example title g4 place",
  classifyBookLine("7,056 — פירוק לפי מיקום:") === "example_title"
);
assert(
  "example title g5 place",
  classifyBookLine("63,405 — פירוק לפי מיקום:") === "example_title"
);
assert(
  "not example title — result line",
  !isExampleTitleLine("58 + 37 = 95")
);
assert(
  "place value g2 124",
  classifyBookLine("- 124 = 100 + 20 + 4") === "place_value_equation"
);
assert(
  "place value g4",
  classifyBookLine("7,056 = 7,000 + 0 + 50 + 6") === "place_value_equation"
);
assert(
  "place value g5",
  classifyBookLine("63,405 = 60,000 + 3,000 + 400 + 0 + 5") === "place_value_equation"
);
assert(
  "two-term decomposition is place value",
  isPlaceValueEquationLine("58 = 50 + 8")
);
assert(
  "diagram context keeps decomposition on mixed renderer",
  classifyBookLine("58 = 50 + 8", { context: "diagram" }) === "fallback"
);

const parsedTitle = parseExampleTitleLine("58 + 37 — פירוק לעשרות ואחדות:");
assert("parse title math", parsedTitle?.mathPart === "58 + 37");
assert("parse title hebrew", parsedTitle?.hebrewPart === "פירוק לעשרות ואחדות");
assert("parse title colon", parsedTitle?.trailingColon === true);

const parsedEq = parsePlaceValueEquationLine("7,056 = 7,000 + 0 + 50 + 6");
assert("parse eq total", parsedEq?.total === "7,056");
assert("parse eq terms", parsedEq?.terms?.length === 4);
assert(
  "parse eq canonical order",
  parsedEq?.terms?.join(" + ") + " = " + parsedEq?.total ===
    "7,000 + 0 + 50 + 6 = 7,056"
);

const parsedG2 = parsePlaceValueEquationLine("- 124 = 100 + 20 + 4");
assert("parse g2 total", parsedG2?.total === "124");
assert(
  "parse g2 canonical",
  parsedG2?.terms?.join(" + ") === "100 + 20 + 4"
);

const subVertical = `  4 12
  52
− 27
----
  25`;
assert("vertical block sub", isVerticalArithmeticBlock(subVertical));
const subParsed = parseVerticalArithmetic(subVertical);
assert("vertical parse rows", (subParsed?.rows?.length || 0) >= 3);
assert("vertical parse operator", subParsed?.operator === "−");

const addVertical = `   ¹
  47
+ 28
----
  75`;
assert("vertical block add", isVerticalArithmeticBlock(addVertical));

assert(
  "example title vertical compact",
  classifyBookLine("**52 − 27 במאונך:**") === "example_title"
);
assert(
  "vertical via block context",
  classifyBookLine(subVertical, { context: "diagram_block" }) === "vertical_arithmetic_block"
);
assert(
  "fallback prose",
  classifyBookLine("עשרות: 50 + 30 = 80") === "fallback"
);
assert(
  "compact title separator",
  parseExampleTitleLine("52 − 27 במאונך:")?.separator === " "
);

if (errors.length) {
  console.error("FAIL: verify-book-line-classifier");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log("OK: verify-book-line-classifier — 20 checks passed.");
