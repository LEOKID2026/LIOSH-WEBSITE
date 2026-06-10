/**
 * Phase 5B — Hebrew G3 text-quality guard (grammar + vocabulary + shared pool scan).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { HEBREW_G3_LITERACY_POOL } from "../../data/hebrew-literacy-g3/literacy-pool-builder.js";
import {
  HEBREW_G3_GRAMMAR_POOL,
  HEBREW_G3_VOCABULARY_POOL,
} from "../../data/hebrew-literacy-g3/grammar-vocabulary-banks.js";

/** @param {string} text */
function scanHebrewTextQuality(text) {
  const hits = [];
  const s = String(text || "");
  if (/\S\/\S/.test(s) && /\/ה\b|\/ה'|עשה\/|שמר\/|בדק\/|שבר\/|מכר\/|שכח\//.test(s)) {
    hits.push("gender-slash form");
  }
  if (/סימון\s/.test(s)) hits.push("סימון tag");
  if (/שאלה\s+\d+\s*:/.test(s)) hits.push("numbered stem prefix");
  if (/\([א-ת]{1,6}\)/.test(s) && /\(סימון|\([א-ת]{1,3}\)/.test(s)) {
    hits.push("odd parenthetical label");
  }
  if (/\b[a-z]{3,}\b/i.test(s)) hits.push("latin token");
  return hits;
}

/** @param {object[]} rows @param {string} label */
function assertNoBlockers(rows, label) {
  const failures = [];
  for (const row of rows) {
    const hits = scanHebrewTextQuality(row.question);
    for (const opt of row.answers || []) {
      hits.push(...scanHebrewTextQuality(String(opt)));
    }
    if (hits.length) failures.push(`${label}: ${row.question?.slice(0, 60)} → ${[...new Set(hits)].join(", ")}`);
  }
  assert.equal(failures.length, 0, failures.slice(0, 8).join("\n"));
}

describe("hebrew G3 text quality (Phase 5B)", () => {
  it("grammar + vocabulary banks have no blocker Hebrew patterns", () => {
    assertNoBlockers(HEBREW_G3_GRAMMAR_POOL, "grammar");
    assertNoBlockers(HEBREW_G3_VOCABULARY_POOL, "vocabulary");
  });

  it("full G3 literacy pool has no gender-slash or סימון patterns", () => {
    const critical = [];
    for (const row of HEBREW_G3_LITERACY_POOL) {
      const hits = scanHebrewTextQuality(row.question);
      const blockers = hits.filter((h) => h === "gender-slash form" || h === "סימון tag");
      if (blockers.length) critical.push(`${row.question?.slice(0, 70)} → ${blockers.join(", ")}`);
    }
    assert.equal(critical.length, 0, critical.slice(0, 8).join("\n"));
  });
});
