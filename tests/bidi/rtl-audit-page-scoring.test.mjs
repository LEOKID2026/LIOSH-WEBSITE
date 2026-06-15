import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeRtlAuditPageText,
  selectRtlAuditSections,
} from "../../lib/bidi/rtl-audit-page-scoring.js";

test("place-value line scores as RTL-relevant", () => {
  const a = analyzeRtlAuditPageText(
    "1 מאה + 2 עשרות + 4 אחדות = 124\n100 + 20 + 4 = 124",
    "פירוק לפי ערך מקום"
  );
  assert.equal(a.isRtlRelevant, true);
  assert.ok(a.matchedSignals.includes("="));
});

test("intro page is skipped", () => {
  const a = analyzeRtlAuditPageText("מה לומדים היום?", "מה לומדים?");
  assert.equal(a.isRtlRelevant, false);
  assert.equal(a.isIntro, true);
});

test("selects top math sections not first intro", () => {
  const sections = [
    { sectionIndex: 1, sectionTotal: 5, title: "מה לומדים?", text: "מה לומדים היום?", analysis: analyzeRtlAuditPageText("מה לומדים היום?", "מה לומדים?") },
    { sectionIndex: 2, sectionTotal: 5, title: "פירוק", text: "1 מאה + 2 עשרות + 4 אחדות = 124", analysis: analyzeRtlAuditPageText("1 מאה + 2 עשרות + 4 אחדות = 124", "פירוק") },
    { sectionIndex: 3, sectionTotal: 5, title: "חיבור", text: "58 + 37 = 95", analysis: analyzeRtlAuditPageText("58 + 37 = 95", "חיבור") },
  ];
  const picked = selectRtlAuditSections(sections);
  assert.ok(picked.length >= 2);
  assert.ok(picked.every((p) => p.sectionIndex > 1));
});

test("pi formula page is RTL-relevant", () => {
  const a = analyzeRtlAuditPageText("בשיעור: π ≈ 3.14\nשטח = π × רדיוס²", "מעגל");
  assert.equal(a.isRtlRelevant, true);
  assert.ok(a.matchedSignals.includes("π"));
});
