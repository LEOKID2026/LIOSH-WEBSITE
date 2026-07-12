/**
 * Regression guard: the parent-facing "insufficient evidence" diagnostic label must use
 * the softer, approved wording ("עדיין מוקדם לקבוע...") and must never regress to the
 * blunter "עדיין אין מספיק מידע כדי לקבוע..." phrasing.
 * Run: node --test tests/parent-report-language/insufficient-evidence-softer-wording.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { PARENT_DIAGNOSTIC_TYPE_LABEL_HE } from "../../utils/parent-report-language/parent-report-hebrew-copy-spec.js";

test("insufficient_evidence label uses the softer approved wording", () => {
  assert.match(PARENT_DIAGNOSTIC_TYPE_LABEL_HE.insufficient_evidence, /עדיין מוקדם לקבוע/);
  assert.doesNotMatch(
    PARENT_DIAGNOSTIC_TYPE_LABEL_HE.insufficient_evidence,
    /אין מספיק מידע כדי לקבוע/
  );
});

test("mixed_low_signal label uses the softer approved wording", () => {
  assert.match(PARENT_DIAGNOSTIC_TYPE_LABEL_HE.mixed_low_signal, /עדיין מוקדם לקבוע/);
  assert.doesNotMatch(
    PARENT_DIAGNOSTIC_TYPE_LABEL_HE.mixed_low_signal,
    /אין מספיק מידע כדי לקבוע/
  );
});
