/**
 * Phase 4-C2 — Hebrew grammar (H-02 vs H-06) and writing (H-03 vs H-07) candidate ordering from wrong-event evidence.
 * Run: npx tsx scripts/parent-report-grade-aware-hebrew-routing-selftest.mjs
 */

import assert from "node:assert/strict";

const { orderHebrewTaxonomyCandidates, hebrewGrammarRoutingScores, hebrewWritingRoutingScores } =
  await import(new URL("../utils/diagnostic-engine-v2/hebrew-taxonomy-candidate-order.js", import.meta.url).href);

const { orderEnglishTaxonomyCandidates } = await import(
  new URL("../utils/diagnostic-engine-v2/english-taxonomy-candidate-order.js", import.meta.url).href
);

const { orderFractionTaxonomyCandidates } = await import(
  new URL("../utils/diagnostic-engine-v2/fraction-taxonomy-candidate-order.js", import.meta.url).href
);

const { orderGeometryTaxonomyCandidates } = await import(
  new URL("../utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js", import.meta.url).href
);

const { resolveGradeAwareParentRecommendationHe } = await import(
  new URL("../utils/parent-report-language/grade-aware-recommendation-resolver.js", import.meta.url).href
);

const { GRADE_AWARE_RECOMMENDATION_TEMPLATES } = await import(
  new URL("../utils/parent-report-language/grade-aware-recommendation-templates.js", import.meta.url).href
);

const { runDiagnosticEngineV2 } = await import(
  new URL("../utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js", import.meta.url).href
);

// —— 1. Basic grammar evidence → H-02 before H-06 ——
{
  const out = orderHebrewTaxonomyCandidates(
    ["H-02", "H-06"],
    [{ patternFamily: "grammar_basic", kind: "agreement", params: { subject_verb: true, gender: "f" } }],
    { bucketKey: "grammar", row: { gradeKey: "g4" } }
  );
  assert.deepEqual(out, ["H-02", "H-06"], "basic grammar evidence should prefer H-02 first");
  const s = hebrewGrammarRoutingScores([{ isCorrect: false, patternFamily: "grammar_basic", params: { tense: "past" } }], {});
  assert.ok(s.h02Score > s.h06Score, "sanity: basic grammar constructed evidence should favor H-02 score");
}

// —— 2. Advanced grammar / syntax / root-pattern → H-06 before H-02 ——
{
  const out = orderHebrewTaxonomyCandidates(
    ["H-02", "H-06"],
    [{ patternFamily: "syntax", params: { binyan: "hifil", root_pattern: "ש־ר־ש" } }],
    { bucketKey: "grammar" }
  );
  assert.deepEqual(out, ["H-06", "H-02"], "syntax/binyan/root-pattern evidence should prefer H-06 first");
  const s = hebrewGrammarRoutingScores(
    [{ isCorrect: false, conceptTag: "complex_sentence", params: { grammatical_analysis: true, connector: "למרות" } }],
    {}
  );
  assert.ok(s.h06Score > s.h02Score, "sanity: advanced grammar constructed evidence should favor H-06 score");
}

// —— 3. Basic writing / sentence-level → H-03 before H-07 ——
{
  const out = orderHebrewTaxonomyCandidates(
    ["H-03", "H-07"],
    [{ kind: "spelling", params: { sentence_writing: true, handwriting: true } }],
    { bucketKey: "writing", row: { levelKey: "medium" } }
  );
  assert.deepEqual(out, ["H-03", "H-07"], "spelling/sentence-level evidence should prefer H-03 first");
  const s = hebrewWritingRoutingScores([{ isCorrect: false, patternFamily: "writing_basic", diagnosticSkillId: "punctuation" }], {});
  assert.ok(s.h03Score > s.h07Score, "sanity: basic writing constructed evidence should favor H-03 score");
}

// —— 4. Higher writing / paragraph / structure → H-07 before H-03 ——
{
  const out = orderHebrewTaxonomyCandidates(
    ["H-03", "H-07"],
    [{ patternFamily: "text_structure", params: { cohesion: true, paragraph: "body" } }],
    { bucketKey: "writing" }
  );
  assert.deepEqual(out, ["H-07", "H-03"], "text structure/cohesion/paragraph evidence should prefer H-07 first");
  const s = hebrewWritingRoutingScores(
    [{ isCorrect: false, topicOrOperation: "argument", kind: "evidence", params: { revision: true } }],
    {}
  );
  assert.ok(s.h07Score > s.h03Score, "sanity: higher writing constructed evidence should favor H-07 score");
}

// —— 5. Ambiguous / missing / tied → preserve bridge order ——
{
  assert.deepEqual(
    orderHebrewTaxonomyCandidates(["H-02", "H-06"], [], { bucketKey: "grammar" }),
    ["H-02", "H-06"],
    "missing evidence preserves grammar bridge order"
  );
  const w = [{ isCorrect: false, kind: "grammar_basic" }, { isCorrect: false, params: { kind: "syntax" } }];
  const gs = hebrewGrammarRoutingScores(w, {});
  assert.equal(gs.h02Score, gs.h06Score, "constructed tie for next assertion");
  assert.deepEqual(orderHebrewTaxonomyCandidates(["H-02", "H-06"], w, { bucketKey: "grammar" }), ["H-02", "H-06"], "tied grammar scores preserve default order");
  assert.deepEqual(
    orderHebrewTaxonomyCandidates(["H-03", "H-07"], [], { bucketKey: "writing" }),
    ["H-03", "H-07"],
    "missing evidence preserves writing bridge order"
  );
}

// —— 6. Non-conflict Hebrew candidates unchanged ——
{
  assert.deepEqual(
    orderHebrewTaxonomyCandidates(["H-01"], [{ kind: "anything" }], { bucketKey: "vocabulary" }),
    ["H-01"],
    "vocabulary bucket list unchanged"
  );
  assert.deepEqual(
    orderHebrewTaxonomyCandidates(["H-04"], [], { bucketKey: "reading" }),
    ["H-04"],
    "reading bucket unchanged"
  );
  assert.deepEqual(
    orderHebrewTaxonomyCandidates(["H-08"], [], { bucketKey: "speaking" }),
    ["H-08"],
    "speaking bucket unchanged"
  );
}

// —— 7. Non-Hebrew / unrelated lists: helper does not strip or reorder ——
{
  const out = orderHebrewTaxonomyCandidates(["M-04", "M-05"], [{ kind: "grammar_basic" }], { bucketKey: "grammar" });
  assert.deepEqual(out, ["M-04", "M-05"], "no H-02/H-06 pair → order unchanged");
  assert.deepEqual(
    orderEnglishTaxonomyCandidates(["E-02", "E-04"], [{ kind: "tense" }], { bucketKey: "grammar" }),
    ["E-02", "E-04"],
    "English grammar routing unchanged smoke"
  );
}

// —— 8. H-04 / H-08 resolver still resolves (templates unchanged) ——
{
  const r4 = resolveGradeAwareParentRecommendationHe({
    subjectId: "hebrew",
    taxonomyId: "H-04",
    bucketKey: "reading",
    gradeKey: "g4",
    slot: "action",
  });
  if (r4 == null || String(r4).trim() === "") throw new Error("H-04 reading g4 action expected non-empty");
  const r8a = resolveGradeAwareParentRecommendationHe({
    subjectId: "hebrew",
    taxonomyId: "H-08",
    bucketKey: "speaking",
    gradeKey: "g5",
    slot: "action",
  });
  if (r8a == null || String(r8a).trim() === "") throw new Error("H-08 speaking g5 action expected non-empty");
  const r8g = resolveGradeAwareParentRecommendationHe({
    subjectId: "hebrew",
    taxonomyId: "H-08",
    bucketKey: "speaking",
    gradeKey: "g6",
    slot: "nextGoal",
  });
  if (r8g == null || String(r8g).trim() === "") throw new Error("H-08 speaking g6 nextGoal expected non-empty");
}

// —— 9–10. Hebrew template keys: only H-04 and H-08 (no new H-01/H-02/H-03/H-06/H-07 templates) ——
{
  const he = GRADE_AWARE_RECOMMENDATION_TEMPLATES.hebrew;
  const keys = Object.keys(he).sort();
  assert.deepEqual(
    keys,
    ["H-01", "H-02", "H-03", "H-04", "H-05", "H-06", "H-07", "H-08"],
    "hebrew grade-aware template taxonomy ids (Phase 4-C3 adds H-01/H-02/H-03/H-06/H-07)"
  );
}

// —— 11. Engine wiring: Hebrew grammar row chooses taxonomy from reordered candidates ——
{
  const t0 = Date.now();
  const mkWrong = (patternFamily, extra = {}) => ({
    subject: "hebrew",
    topicOrOperation: "grammar",
    isCorrect: false,
    timestamp: t0,
    patternFamily,
    ...extra,
  });
  const row = {
    needsPractice: true,
    questions: 12,
    correct: 7,
    wrong: 5,
    accuracy: 58,
    displayName: "דקדוק",
  };
  const maps = { hebrew: { grammar: row } };
  const rawBasic = [mkWrong("grammar_basic"), mkWrong("agreement"), mkWrong("gender"), mkWrong("number"), mkWrong("subject_verb")];
  const outBasic = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject: { hebrew: rawBasic },
    startMs: t0 - 1,
    endMs: t0 + 1,
  });
  const uBasic = outBasic.units.find((u) => u.subjectId === "hebrew" && u.bucketKey === "grammar");
  const tidBasic = uBasic?.diagnosis?.taxonomyId ?? uBasic?.canonicalState?.classification?.taxonomyId;
  if (!uBasic || tidBasic !== "H-02") {
    throw new Error(`engine grammar basic evidence: expected taxonomy H-02, got ${JSON.stringify({ tidBasic, uBasic: uBasic?.classification })}`);
  }
  const rawAdv = [mkWrong("syntax"), mkWrong("binyan"), mkWrong("root_pattern"), mkWrong("complex_sentence"), mkWrong("connector")];
  const outAdv = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject: { hebrew: rawAdv },
    startMs: t0 - 1,
    endMs: t0 + 1,
  });
  const uAdv = outAdv.units.find((u) => u.subjectId === "hebrew" && u.bucketKey === "grammar");
  const tidAdv = uAdv?.diagnosis?.taxonomyId ?? uAdv?.canonicalState?.classification?.taxonomyId;
  if (!uAdv || tidAdv !== "H-06") {
    throw new Error(`engine grammar advanced evidence: expected taxonomy H-06, got ${JSON.stringify({ tidAdv, uAdv: uAdv?.classification })}`);
  }
}

// —— 12. Math / geometry ordering helpers unchanged (smoke) ——
{
  const frac = orderFractionTaxonomyCandidates(
    ["M-04", "M-05"],
    [{ patternFamily: "equivalent_fractions" }],
    { row: {}, bucketKey: "fractions", topicRowKey: "fractions" }
  );
  assert.deepEqual(frac, ["M-04", "M-05"], "fraction routing smoke unchanged");
  const geo = orderGeometryTaxonomyCandidates(["G-01", "G-03"], [], { bucketKey: "quadrilaterals" });
  assert.deepEqual(geo, ["G-01", "G-03"], "geometry routing smoke unchanged");
}

// —— Reversed input respects evidence winner ——
{
  const out = orderHebrewTaxonomyCandidates(
    ["H-06", "H-02"],
    [{ isCorrect: false, patternFamily: "grammar_basic", params: { agreement: true } }],
    { bucketKey: "grammar" }
  );
  assert.deepEqual(out, ["H-02", "H-06"], "H-02 should lead when basic grammar evidence wins regardless of input order");
}

console.log("parent-report-grade-aware-hebrew-routing-selftest: ok");
