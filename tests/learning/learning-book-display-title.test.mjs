/**
 * Child-facing book title sanitization.
 * Run: node --test tests/learning/learning-book-display-title.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cleanDisplayTitle, parseLearningPageMarkdown } from "../../lib/learning-book/parse-learning-page-markdown.js";
import { getLearningBookEntry } from "../../lib/learning-book/learning-book-catalog.js";

test("cleanDisplayTitle strips em-dash draft markers", () => {
  assert.equal(
    cleanDisplayTitle("חיבור [DRAFT \u2014 not owner-approved]"),
    "חיבור",
  );
  assert.equal(cleanDisplayTitle("DRAFT"), "");
  assert.equal(cleanDisplayTitle("not owner-approved"), "");
  assert.equal(cleanDisplayTitle("[approved]"), "");
  assert.equal(cleanDisplayTitle("undefined"), "");
});

test("math g1 TOC has no internal English markers", () => {
  const batches = getLearningBookEntry("math", "g1").loader.loadTocEntries();
  const titles = batches.flatMap((b) => b.pages.map((p) => p.displayTitle));
  assert.ok(titles.length > 0);
  for (const title of titles) {
    assert.match(title, /[\u0590-\u05FF]/);
    assert.doesNotMatch(title, /DRAFT|owner-approved|\[approved\]|undefined/i);
  }
});

test("parseLearningPageMarkdown cleans title_hebrew from sample draft", () => {
  const raw = fs.readFileSync("docs/learning-book/math/g1/drafts/add_two.md", "utf8");
  const page = parseLearningPageMarkdown(raw, "add_two");
  assert.equal(page.displayTitle, "חיבור של שני מספרים");
});
