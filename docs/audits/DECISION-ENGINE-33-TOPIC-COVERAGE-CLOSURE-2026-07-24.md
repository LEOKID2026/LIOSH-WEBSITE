# Decision Engine — 33 Topic Coverage Closure

Date: 2026-07-24  
Scope: engine, generators, classifiers, taxonomy, recurrence and action contract only.  
Excluded: UI, demo, API presentation, parent-facing wording, deployment.

## Executive result

The 33 regular topics that P3B classified as `unsupported` now have real question-to-action proofs. The final 79-topic matrix is:

- `topics.total = 79`
- `topics.rawToActionPassed = 72`
- `topics.mixedSafeFallback = 7`
- `topics.explicitlyUnsupported = 0`
- `topics.failed = 0`
- `topics.unexplainedUnsupported = 0`
- wrong-topic: `79/79`
- grade-evidenced: `78/79`
- cross-topic targets in the new closure set: `0`

The authoritative per-topic evidence artifact is:

`artifacts/qa/decision-engine-p3b/33-topic-coverage-closure.json`

It contains, for every topic, the source file, generator/bank, question ID or generator parameters, complete visible prompt, reconstructable question structure, actual selected wrong answer, produced tag, selected taxonomy, recurrence object, canonical state, final action, final target, blocked alternatives, wrong-topic result, grade-relation safety result and random-error result.

## Before and after

| Subject | Topic | Before | After | Rule | Runtime producer |
|---|---|---:|---:|---|---|
| math | compare | unsupported | passed | M-11 | math generator + relation distractor |
| math | scale | unsupported | passed | M-12 | math generator + scale-operation distractor |
| math | division | unsupported | passed | M-13 | math generator + multiply-instead-of-divide transformation |
| math | division_with_remainder | unsupported | passed | M-14 | math generator + quotient/remainder distractor |
| math | decimals | unsupported | passed | M-15 | math generator + decimal-point shift transformation |
| math | sequences | unsupported | passed | M-16 | math generator + sequence-step near-miss |
| math | percentages | unsupported | passed | M-17 | math generator + percent/base distractor |
| math | ratio | unsupported | passed | M-18 | math generator + ratio-order distractor |
| math | equations | unsupported | passed | M-19 | math generator + wrong inverse-operation transformation |
| math | order_of_operations | unsupported | passed | M-20 | math generator + explicit precedence transformation |
| math | divisibility | unsupported | passed | M-21 | math generator + opposite divisibility result |
| math | prime_composite | unsupported | passed | M-22 | math generator + prime/composite confusion |
| math | powers | unsupported | passed | M-23 | math generator + base×exponent transformation |
| math | zero_one_properties | unsupported | passed | M-24 | math generator + identity-property distractor |
| math | estimation | unsupported | passed | M-25 | math generator + exact/estimate confusion |
| math | factors_multiples | unsupported | passed | M-26 | math generator + smaller-input-as-GCD transformation |
| geometry | quadrilaterals | unsupported | passed | G-01 | geometry generator, classified wrong shape |
| geometry | perimeter | unsupported | passed | G-06 | geometry generator, wrong formula selection |
| geometry | parallel_perpendicular | unsupported | passed | G-01 | conceptual/procedural geometry generator |
| geometry | triangles | unsupported | passed | G-01 | geometry generator, wrong triangle property |
| geometry | rotation | unsupported | passed | G-04 | geometry generator, transformation error |
| geometry | diagonal | unsupported | passed | G-01 | geometry generator, diagonal-property error |
| geometry | heights | unsupported | passed | G-03 | geometry generator, height/formula error |
| geometry | tiling | unsupported | passed | G-02 | conceptual geometry, angle-around-point error |
| geometry | circles | unsupported | passed | G-06 | geometry generator, circle formula selection |
| geometry | solids | unsupported | passed | G-01 | conceptual geometry, solid-property error |
| geometry | pythagoras | unsupported | passed | G-09 | geometry generator, dedicated Pythagorean-relation error |
| english | sentence | unsupported | passed | E-06 | canonical `sentences` runtime generator |
| english | listening | unsupported | passed | E-08 | canonical `phonics` runtime generator |
| hebrew | reading | unsupported | passed | H-04 | distinct `reading` row in Hebrew rich bank |
| science | plants | unsupported | passed | S-01 | `SCIENCE_QUESTIONS:plants_2` |
| science | environment | unsupported | passed | S-07 | `SCIENCE_QUESTIONS:env_2` |
| history | hasmonaeans | unsupported | passed | HI-06 | real Hasmonaean-institutions row from G6 history bank |

## Changes by domain

### Math

Sixteen topic-level taxonomy rules, M-11 through M-26, are retained. Their producer no longer promotes the nearest numeric distractor. `deriveMathMisconceptionEvidence` applies a named transformation to the real question parameters, inserts that transformed result into the displayed MCQ, and tags only that option. If the current generated shape cannot support a defensible transformation, it receives no specific tag and the producer samples another real question.

The transformations are: reversed comparison relation; inverse scale operation; multiplication instead of division; changed remainder without quotient rebalancing; decimal-point shift; omitted sequence step; whole instead of percentage part; reversed ratio order; wrong inverse equation operation; left-to-right/ignored-parentheses operation order; negated divisibility classification; swapped prime/composite classification; base×exponent instead of exponentiation; wrong zero/one identity law; exact result instead of estimate; and smaller input assumed to be the GCD. Each artifact row stores `transformationId`, explanation and source parameters, and tests recompute the wrong answer from the source question.

These rules are deliberately marked `topicLevelOnly`. They can select topic practice after independent recurrence but cannot claim a narrower subskill without a separate probe. The topic bridge now maps the 16 topics to their own rule rather than to an adjacent rule such as place value, multiplication facts or omitted addends.

### Geometry

The existing geometry taxonomy was retained for rule-level detection, but subskill output is now separately gated by topic and selected-answer semantics:

- `triangles`, `parallel_perpendicular` and `solids` cannot inherit the G-01 rectangle/parallelogram subskill.
- `tiling` cannot inherit the G-02 protractor-reading subskill.
- circle formula selection cannot inherit the G-06 unit-conversion subskill.
- perimeter formula selection remains topic-level, while genuine `unit_error` evidence may use unit conversion.
- Pythagorean questions use dedicated G-09 evidence.

The generator now applies option-level evidence to conceptual questions as well as procedural questions. Secondary real tags for formula selection, diagonal, square perimeter and circle perimeter are registered as active producers. Random wrong options are not promoted through question-level `possibleErrorPatterns`.

### English

`sentence` is an inventory alias of the curriculum/runtime key `sentences`; the actual proof calls the `sentences` generator and receives a `sentence_structure_error`. E-06 remains the topic rule, but sentence-structure evidence is explicitly blocked from producing the unrelated `inference` subskill.

`listening` is the legacy request alias for the G1-G2 canonical `phonics` curriculum and runtime route. Its proof is now forced to a real `early_word_reading` CVC item, for example `cat` versus `bat`. Only a same-length, one-grapheme substitution receives `phonics_minimal_pair_error`; visual letter-name choices such as `N` versus `W` cannot activate E-08.

The sentence producer was corrected so the runtime emits the taxonomy tag claimed by E-06. It also preserves a non-target distractor for false-positive testing.

### Hebrew

`reading` and `comprehension` were not merged. Runtime and bank evidence show that they are distinct topics. The closure proof uses a real `topic: "reading"` rich-bank row with reading-comprehension evidence. This avoids using a comprehension fixture merely to make the reading row pass.

### Science

`plants` uses the real `plants_2` bank row and its selected `concept_confusion` distractor.

`environment` uses the real ecosystem-definition row `env_2`. Its `ecosystem_confusion` evidence supports topic-level environment practice, but is explicitly blocked from claiming the narrower `רשת מזון` subskill.

### History

`hasmonaeans` now uses the exact G6 row `hist_g6_hist_sub_hasmonaean_kingdom_easy_05`, which asks about the political/religious role of the priesthood. The previous founder-recall row is no longer used as evidence for institutions.

## Raw-to-action traces

Every row in the 33-topic artifact follows this verified path:

```text
real generated/bank question
→ selected real wrong option
→ classifyAnswerEvidence
→ normalized mistake event
→ topic bridge candidate
→ selected-answer taxonomy evidence
→ recurrence across independent sessions
→ unifiedDecisionContext
→ DE2 canonicalState = intervene
→ ActionDecisionContractV2
→ topic-safe final target
```

For all 16 math topics and all 11 geometry topics the final action is `targeted_practice`. Hebrew reading resolves to `reduce_reading_load`, which is the subject-appropriate action. The exact action and target for every generated run are stored in the JSON artifact.

No topic target crossed to a different topic. Math topic-level rules produced no subskill target. Guided-only and same-session variants produced no subskill target for all 33 topics.

## False-positive and false-negative evidence

The closure artifact and `topic-coverage-closure-p3c.test.mjs` prove:

- positive/near-miss producer: `33/33`
- random wrong option does not activate the topic rule: `33/33`
- same producer under a non-candidate topic is rejected: `33/33`
- coherent grade-relation safety preserves the same topic target: `33/33`
- guided-only scenario has no subskill claim: `33/33`
- same-session scenario has no subskill claim: `33/33`
- cross-topic final targets: `0`

The grade scenario is intentionally named `gradeRelationSafetyResult`. Its relation is derived from the actual content and registered grade keys. A `lower` relation proves grade-foundation fallback; a `higher` relation proves above-grade topic stability and suppression of unsafe specificity. Neither case claims taxonomy rejection by grade, because these taxonomy rows do not declare professional grade constraints.

The evidence matcher was tightened: selected-answer evidence is authoritative. A different selected distractor can no longer activate a rule merely because the question advertises that rule in `possibleErrorPatterns`.

## Product files changed

- `utils/math-question-generator.js`
- `utils/math-topic-diagnostic-evidence.js`
- `utils/geometry-question-generator.js`
- `utils/geometry-topic-diagnostic-evidence.js`
- `utils/english-question-generator.js`
- `data/science-questions.js`
- `data/history-questions/g6-generated.js`
- `utils/diagnostic-engine-v2/taxonomy-math-topic-coverage.js`
- `utils/diagnostic-engine-v2/taxonomy-registry.js`
- `utils/diagnostic-engine-v2/taxonomy-evidence-rules.js`
- `utils/diagnostic-engine-v2/topic-taxonomy-bridge.js`
- `lib/learning/taxonomy-rule-primary-producers.js`
- `lib/learning/taxonomy-tag-producer-registry.js`
- `lib/learning/misconception-adaptive-routing.js`
- `utils/subskill-candidate-safety.js`
- `utils/question-metadata-qa/question-metadata-taxonomy.js`

Audit and proof infrastructure:

- `lib/learning/p3b-topic-closure-producers.js`
- `tests/engine-decision-audit/p3-raw-evidence-harness.mjs`
- `scripts/decision-engine-33-topic-coverage-closure.mjs`
- `scripts/decision-engine-p3b-coverage-audit.mjs`
- `tests/learning/topic-coverage-closure-p3c.test.mjs`

## Verification

- P0-P3B closure regression: `105/105` tests passed.
- Full engine audit: `846/846` assertions passed.
- Expanded taxonomy: `76/76` rules have evidence, producer and real-runtime scenarios.
- P3 assertion accounting increased from the prior suite to `1091/1091`; no assertion was weakened.
- P3B artifact audit: `878/878` assertions passed.
- Metadata QA: `0` blocking issues; gate `pass_with_advisory`.
- Metadata coverage: `9,993/9,993` records classified, `invalidMetadata = 0`.

## Final 79-topic matrix

| Classification | Count |
|---|---:|
| raw-to-action passed | 72 |
| mixed safe fallback | 7 |
| explicitly unsupported | 0 |
| failed | 0 |
| unexplained unsupported | 0 |
| total | 79 |

The generated matrix is in:

`artifacts/qa/decision-engine-p3b/p3b-topic-grade-matrix.md`

## Remaining gaps

No regular topic remains unsupported.

The canonical `phonics` route now carries its real G1-G2 curriculum grade evidence. The only row without declared grade evidence is the separately tracked Hebrew `homophones` topic, which is absent from the current curriculum map. The strict grade-evidence count is therefore 78/79.

The metadata QA still reports non-blocking advisories in legacy banks. They do not create an unsupported regular topic and were not reclassified as coverage.

No commit, push or deployment was performed.
