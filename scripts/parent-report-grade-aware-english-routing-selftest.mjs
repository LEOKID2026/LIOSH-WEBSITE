/**
 * Phase 4-B3 — English vocabulary (E-01 vs E-05) and grammar (E-02 vs E-04) candidate ordering from wrong-event evidence.
 * Run: npx tsx scripts/parent-report-grade-aware-english-routing-selftest.mjs
 */

import assert from "node:assert/strict";

const { orderEnglishTaxonomyCandidates, englishVocabularyRoutingScores, englishGrammarRoutingScores } =
  await import(new URL("../utils/diagnostic-engine-v2/english-taxonomy-candidate-order.js", import.meta.url).href);

const { orderGeometryTaxonomyCandidates } = await import(
  new URL("../utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js", import.meta.url).href
);

const { orderFractionTaxonomyCandidates } = await import(
  new URL("../utils/diagnostic-engine-v2/fraction-taxonomy-candidate-order.js", import.meta.url).href
);

const { resolveGradeAwareParentRecommendationHe } = await import(
  new URL("../utils/parent-report-language/grade-aware-recommendation-resolver.js", import.meta.url).href
);

const { GRADE_AWARE_RECOMMENDATION_TEMPLATES } = await import(
  new URL("../utils/parent-report-language/grade-aware-recommendation-templates.js", import.meta.url).href
);

// —— 1. Vocabulary recognition → E-01 before E-05 ——
{
  const out = orderEnglishTaxonomyCandidates(
    ["E-01", "E-05"],
    [{ patternFamily: "vocabulary", kind: "word_meaning", conceptTag: "identify_word" }],
    { bucketKey: "vocabulary", row: { gradeKey: "g3" } }
  );
  assert.deepEqual(out, ["E-01", "E-05"], "vocabulary recognition evidence should prefer E-01 first");
  const s = englishVocabularyRoutingScores([{ kind: "word_bank", params: { operation: "recall" } }], {});
  assert.ok(s.e01Score > s.e05Score, "sanity: vocab-basic constructed evidence should favor E-01 score");
}

// —— 2. Collocation / false friend / vocab recall metadata → E-01 before E-05 ——
{
  const out = orderEnglishTaxonomyCandidates(
    ["E-01", "E-05"],
    [
      {
        patternFamily: "vocab_recall_en",
        questionLabel: "vocabulary|vocab_recall_en|לתת|מה פירוש המילה",
        metadata: { possibleErrorPatterns: ["תרגום מילולי שגוי", "false friend"] },
        params: { direction: "he_to_en", patternFamily: "vocab_recall_en" },
      },
      { conceptTag: "false_friend" },
    ],
    { bucketKey: "vocabulary" },
  );
  assert.deepEqual(out, ["E-01", "E-05"], "vocab recall / false-friend evidence should prefer E-01 first");
}

// —— 2b. Preposition-in-context → E-05 before E-01 ——
{
  const out = orderEnglishTaxonomyCandidates(
    ["E-01", "E-05"],
    [{ params: { kind: "preposition", semanticFamily: "meaning_from_context" } }],
    { bucketKey: "vocabulary" },
  );
  assert.deepEqual(out, ["E-05", "E-01"], "preposition-in-context evidence should prefer E-05 first");
  const s = englishVocabularyRoutingScores(
    [{ diagnosticSkillId: "choose_word", topicOrOperation: "sentence_context", params: { kind: "preposition" } }],
    {},
  );
  assert.ok(s.e05Score > s.e01Score, "sanity: preposition-context constructed evidence should favor E-05 score");
}

// —— 3. Basic grammar / tense → E-02 before E-04 ——
{
  const out = orderEnglishTaxonomyCandidates(
    ["E-02", "E-04"],
    [{ kind: "tense", params: { operation: "present", conceptTag: "he_she_it" } }],
    { bucketKey: "grammar", row: { levelKey: "medium" } }
  );
  assert.deepEqual(out, ["E-02", "E-04"], "basic tense/agreement evidence should prefer E-02 first");
  const s = englishGrammarRoutingScores([{ patternFamily: "grammar_basic", params: { has_have: true } }], {});
  assert.ok(s.e02Score > s.e04Score, "sanity: basic grammar constructed evidence should favor E-02 score");
}

// —— 4. Sentence structure / word order / connectors → E-04 before E-02 ——
{
  const out = orderEnglishTaxonomyCandidates(
    ["E-02", "E-04"],
    [{ patternFamily: "sentence_structure", params: { word_order: true, connector: "because" } }],
    { bucketKey: "grammar" }
  );
  assert.deepEqual(out, ["E-04", "E-02"], "structure/word-order/connector evidence should prefer E-04 first");
  const s = englishGrammarRoutingScores([{ topicOrOperation: "build_sentence", kind: "grammar_context" }], {});
  assert.ok(s.e04Score > s.e02Score, "sanity: structure grammar constructed evidence should favor E-04 score");
}

// —— 5. Ambiguous / missing / tied → preserve bridge order ——
{
  assert.deepEqual(
    orderEnglishTaxonomyCandidates(["E-01", "E-05"], [], { bucketKey: "vocabulary" }),
    ["E-01", "E-05"],
    "missing evidence preserves vocabulary bridge order"
  );
  const w = [{ kind: "word_meaning" }, { params: { kind: "meaning_from_context" } }];
  const vs = englishVocabularyRoutingScores(w, {});
  assert.equal(vs.e01Score, vs.e05Score, "constructed tie for next assertion");
  assert.deepEqual(
    orderEnglishTaxonomyCandidates(["E-01", "E-05"], w, { bucketKey: "vocabulary" }),
    ["E-01", "E-05"],
    "tied vocab scores preserve default order"
  );
  assert.deepEqual(
    orderEnglishTaxonomyCandidates(["E-02", "E-04"], [], { bucketKey: "grammar" }),
    ["E-02", "E-04"],
    "missing evidence preserves grammar bridge order"
  );
}

// —— 6. Non-conflict English buckets unchanged ——
{
  assert.deepEqual(
    orderEnglishTaxonomyCandidates(["E-03"], [{ kind: "anything" }], { bucketKey: "translation" }),
    ["E-03"],
    "translation bucket list unchanged"
  );
  assert.deepEqual(
    orderEnglishTaxonomyCandidates(["E-07"], [], { bucketKey: "writing" }),
    ["E-07"],
    "writing bucket list unchanged"
  );
}

// —— 7. Non-English candidate lists: helper does not strip unrelated ids ——
{
  const out = orderEnglishTaxonomyCandidates(["M-04", "M-05"], [{ kind: "word_meaning" }], { bucketKey: "vocabulary" });
  assert.deepEqual(out, ["M-04", "M-05"], "no E-01/E-05 pair → order unchanged");
}

// —— 8–9. E-03 / E-07 resolver still resolves ——
{
  const a = resolveGradeAwareParentRecommendationHe({
    subjectId: "english",
    taxonomyId: "E-03",
    bucketKey: "translation",
    gradeKey: "g4",
    slot: "action",
  });
  if (a == null || String(a).trim() === "") throw new Error("E-03 translation g4 action expected non-empty");
  const g = resolveGradeAwareParentRecommendationHe({
    subjectId: "english",
    taxonomyId: "E-07",
    bucketKey: "writing",
    gradeKey: "g4",
    slot: "nextGoal",
  });
  if (g == null || String(g).trim() === "") throw new Error("E-07 writing g4 nextGoal expected non-empty");
}

// —— 10. English template taxonomy ids (Phase 4-B4) ——
{
  const eng = GRADE_AWARE_RECOMMENDATION_TEMPLATES.english;
  const keys = Object.keys(eng).sort();
  assert.deepEqual(keys, ["E-01", "E-02", "E-03", "E-04", "E-05", "E-06", "E-07"], "english template taxonomy ids");
}

// —— 10b. Routing + resolver template integration (no crash) ——
{
  const v1 = orderEnglishTaxonomyCandidates(
    ["E-01", "E-05"],
    [{ kind: "word_meaning" }],
    { bucketKey: "vocabulary" }
  );
  assert.equal(v1[0], "E-01");
  const a1 = resolveGradeAwareParentRecommendationHe({
    subjectId: "english",
    taxonomyId: v1[0],
    bucketKey: "vocabulary",
    gradeKey: "g4",
    slot: "action",
  });
  if (!a1 || !String(a1).includes("אוצר מילים")) throw new Error("E-01 vocabulary g4 action expected from routing winner");

  const v2 = orderEnglishTaxonomyCandidates(
    ["E-01", "E-05"],
    [{ params: { kind: "meaning_from_context" } }],
    { bucketKey: "vocabulary" }
  );
  assert.equal(v2[0], "E-05");
  const a5 = resolveGradeAwareParentRecommendationHe({
    subjectId: "english",
    taxonomyId: v2[0],
    bucketKey: "vocabulary",
    gradeKey: "g6",
    slot: "action",
  });
  if (!a5 || !String(a5).includes("מילים באנגלית")) throw new Error("E-05 vocabulary g6 action expected from routing winner");

  const g1 = orderEnglishTaxonomyCandidates(
    ["E-02", "E-04"],
    [{ kind: "tense" }],
    { bucketKey: "grammar" }
  );
  assert.equal(g1[0], "E-02");
  const g2 = orderEnglishTaxonomyCandidates(
    ["E-02", "E-04"],
    [{ patternFamily: "sentence_structure" }],
    { bucketKey: "grammar" }
  );
  assert.equal(g2[0], "E-04");
  orderEnglishTaxonomyCandidates(["E-01", "E-05"], [], { bucketKey: "vocabulary" });
  const amb = resolveGradeAwareParentRecommendationHe({
    subjectId: "english",
    taxonomyId: "E-01",
    bucketKey: "vocabulary",
    gradeKey: "g4",
    slot: "action",
  });
  if (!amb) throw new Error("ambiguous bridge order should still resolve E-01 vocabulary g4");
}

// —— 11–12. Math / geometry ordering helpers unchanged (smoke) ——
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
  const out = orderEnglishTaxonomyCandidates(
    ["E-05", "E-01"],
    [{ conceptTag: "vocabulary", params: { kind: "picture_match" } }],
    { bucketKey: "vocabulary" }
  );
  assert.deepEqual(out, ["E-01", "E-05"], "E-01 should lead when vocab-basic evidence wins regardless of input order");
}

console.log("parent-report-grade-aware-english-routing-selftest: ok");
