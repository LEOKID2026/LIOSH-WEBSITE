# Decision Engine P3 Implementation — 2026-07-23

## 1. Executive conclusion

P3 is implemented, but the taxonomy and target layer is not broad or precise enough to classify the combined engine as professional.

What is now proven:

- 59/59 declared active taxonomy rules have:
  - a registry row;
  - an evidence rule;
  - an active primary runtime producer declaration;
  - a real generator/bank positive case;
  - a real generator/bank negative case;
  - recurrence and falsification coverage.
- Every one of the seven engine subjects has a representative full raw-answer-to-action proof.
- A safe subskill target now requires a registered taxonomy entity and the P3 safety contract.
- A prerequisite target now declares precision, confidence, source, reason code, and entity validation.
- `contentGradeKey` is no longer emitted as though it were an exact prerequisite skill.
- Multi-candidate taxonomy state, target IDs, malformed metadata, guided-only evidence, mastery counter-evidence, disappeared patterns, wrong-topic leakage, and permutation invariance are covered by assertions.
- P0-P2 authority is preserved.

What is not proven:

- Full metadata coverage for any subject/topic/grade matrix.
- Raw-to-action proof for every mapped topic or every taxonomy rule.
- Exact prerequisite reachability from the real question metadata currently present in production banks.
- Grade-specific taxonomy falsification. Taxonomy rows do not declare grade constraints.
- A curriculum-backed cross-session recurrence policy across the taxonomy. Only M-02 currently requires two distinct days.
- Full alternate-tag producer coverage. Only 13/59 rules have active producer coverage for every required tag.
- Alignment between the explicit tag registry and the primary-producer authority. Forty-five primary tags are active only through fallback.
- Professional coverage merely because 59 rules are reachable. The 59 rules are reused over 79 broad topic buckets and many grade/mode cells.

Final classification:

> The engine has an operational, safety-gated taxonomy/action path, but taxonomy breadth, grade precision, prerequisite coverage, and real raw-to-action coverage remain insufficient for a professional decision engine.

## 2. Scope and authority

P3 changed engine internals and test/audit infrastructure only.

Not changed:

- UI;
- parent-facing wording;
- demo behavior;
- API presentation;
- React components;
- CSS;
- deployment configuration.

Authority remains:

```text
raw evidence
  → normalized mistake event
  → topic-scoped taxonomy candidates
  → evidence recurrence
  → taxonomy selection trace
  → unifiedDecisionContext
  → canonicalState authorization and RI cap
  → ActionDecisionContractV2 selection
```

`canonicalState` remains the sole authorization/intensity authority. `ActionDecisionContractV2` remains the sole selected-action authority.

Taxonomy, subskill, grade, V3, and prerequisite signals cannot:

- change `allowed=false` to true;
- raise `RI0`;
- open intervention from `withhold` or `probe_only`;
- exceed the canonical cap.

## 3. Root causes fixed

### 3.1 Multi-candidate state was lost after DE2

Root cause:

- DE2 selected the first matching taxonomy candidate.
- It did not expose all candidates, all matching candidates, or whether the winner was unique.
- `unifiedDecisionContext` reconstructed a one-item candidate list from the selected taxonomy ID.
- A genuinely ambiguous multi-candidate topic could therefore appear safe.

Fix:

- DE2 now emits `taxonomySelection`:
  - `candidateIdsRaw`;
  - `candidateIdsOrdered`;
  - `matchingCandidateIds`;
  - `disambiguationApplied`;
  - `disambiguationWinnerId`;
  - `conflict`.
- Selection remains deterministic.
- Subskill safety blocks unresolved multiple candidates regardless of recurrence volume.

### 3.2 Subskill safety allowed specificity without the complete P3 gate

Root cause:

- A strong technical candidate could become safe without an explicit recurrence-or-probe requirement.
- Guided-only evidence, above-grade mismatch, strong counter-evidence, stale/disappeared patterns, and old safety objects were not all rejected.

Fix:

- `SUBSKILL_SAFETY_CONTRACT_VERSION = 3`.
- A precomputed safety object is reused only when it is version 3.
- New blocking conditions:
  - `recurrence_or_probe_required`;
  - `insufficient_independent_evidence`;
  - `taxonomy_match_not_strong`;
  - `multi_candidate_unresolved`;
  - `above_grade_subskill_claim_blocked`;
  - `counter_evidence_strong`;
  - `pattern_not_recently_active`;
  - existing low-volume, mastery, general-bucket, metadata-fallback, and taxonomy thresholds.
- A probe-confirmed candidate may pass without independent recurrence only when probe evidence is explicit.

### 3.3 Action targets used a composite row key

Root cause:

- EDC passed `topicRowKey`, for example `subtraction\u0001practice\u0001g4\u0001medium`, into the action target.
- That string is a row scope, not a topic entity.

Fix:

- Action target selection now uses the canonical bucket/topic key.
- Full raw-pipeline target integrity tests verify that each representative topic target maps to the subject taxonomy bridge.

### 3.4 Subskill targets lacked a registered entity ID

Root cause:

- `target.subskill` was only a label.
- A label could not be checked for orphan status or subject ownership.

Fix:

- A subskill reinforcement target now includes `target.subskillId`.
- The ID is the registered taxonomy row ID backing the selected subskill.
- ADC validation rejects a subskill target if that ID does not exist.

### 3.5 `contentGradeKey` was represented as an exact prerequisite

Root cause:

- P2 used:

```text
v3.prerequisiteSkill || grade.contentGradeKey || topicKey
```

- A value such as `g2` could therefore occupy `target.prerequisite`, even though `g2` is not a skill.

Fix:

- Added a four-level prerequisite precision hierarchy.
- Added `target.prerequisiteDetail`.
- A grade key is provenance for a foundation area, never the prerequisite entity ID.
- Unregistered declared curriculum skills are retained in trace and downgraded explicitly.

### 3.6 Hebrew comprehension metadata was mapped to a procedural error

Root cause:

- Real H-04 evidence emits `reading_comprehension_error`.
- V3 recognized `reading_comprehension`, but not the active taxonomy tag with the `_error` suffix.
- It fell through to a procedural pattern.

Fix:

- Added exact V3 mappings for:
  - `reading_comprehension_error`;
  - `main_idea_error`;
  - `vocabulary_context_error`;
  - `vocabulary_meaning_error`;
  - `meaning_error`.
- Raw H-04 evidence now produces:

```text
reading_comprehension_issue
→ reduce_reading_load
```

within canonical authorization.

### 3.7 Malformed recurrence input threw an exception

Root cause:

- `evaluateEvidenceRecurrence` dereferenced `isCorrect` on `null`.

Fix:

- Non-object/null events are removed before recurrence evaluation.
- Malformed metadata now fails safely.

### 3.8 Existing metadata tags were neither active nor explicitly unsupported

Root cause:

- `passive_error`, `modal_error`, and `comparatives_error` occur in the English sentence bank.
- They are not active decision-taxonomy tags.
- The QA contract treated them only as unknown.

Fix:

- Added `UNSUPPORTED_EXPECTED_ERROR_TYPES`.
- These three values are recognized but explicitly not counted as active taxonomy.
- Eight scanned records contain one of these unsupported values.
- `tense_error`, which is an active E-02 evidence tag, is recognized as active metadata.

## 4. Full active taxonomy inventory

| Subject | Active rule IDs | Rule count | Mapped topic buckets |
|---|---|---:|---:|
| math | M-01…M-10 | 10 | 24 |
| geometry | G-01…G-08 | 8 | 18 |
| hebrew | H-01…H-08 | 8 | 8 |
| english | E-01…E-08 | 8 | 8 |
| science | S-01…S-08 | 8 | 8 |
| moledet-geography | MG-01…MG-08 | 8 | 7 |
| history | HI-01…HI-09 | 9 | 6 |
| total | 59 | 59 | 79 |

For each of the 59 rows, the generated inventory contains:

- subject;
- taxonomy ID;
- Hebrew topic and subskill labels;
- evidence source;
- required tags;
- primary producer module and file;
- producer active state;
- real runtime proof;
- active/reachable classification.

Machine-readable full inventory:

- `artifacts/qa/decision-engine-p3/p3-coverage-audit.json`

No declared active taxonomy rule is currently marked:

- unreachable;
- legacy;
- test-only;
- producer-missing.

This is rule-level reachability only. It does not prove per-topic/per-grade completeness.

Producer status has two distinct layers:

| Producer classification | Rules |
|---|---:|
| primary tag explicitly active in `TAG_PRODUCER_REGISTRY` | 14 |
| primary tag active only through `RULE_PRIMARY_PRODUCER` fallback | 45 |
| full active coverage for every `requiredTags` entry | 13 |
| partial required-tag coverage | 46 |
| rules with no reachable required tag | 0 |
| distinct required tags without an active producer | 54 |

Consequently, `59/59 active reachable` means every rule has at least one proven primary route. It does not mean the complete tag vocabulary of every rule is active. For example, G-06 is reachable through `perimeter_area_confusion`, while its alternate `perimeter_formula_error` has no producer.

## 5. Producer-to-taxonomy reachability

Proven chain for all 59 active rules:

```text
real generator/bank question
→ real wrong answer
→ active answer classifier
→ detected misconception tag
→ normalized mistake event
→ evidence rule
→ recurrence
```

Additional full action chain is proven for seven representative rules:

```text
normalized mistake events
→ DE2 topic-scoped taxonomy
→ recurrence
→ canonicalState
→ unifiedDecisionContext
→ ActionDecisionContractV2
```

Rule-level producer distribution:

- numeric classifier: math and numeric geometry;
- MCQ option evidence: geometry, Hebrew, English, science, geography, history;
- typed classifiers: Hebrew and English spelling paths.

Primary producer invariant:

- 59/59 producer tags are included in their rule's `requiredTags`.

Registry qualification:

- 14/59 primary tags are explicitly active in the tag registry.
- 45/59 rely on `getTagProducer()` promoting the separately declared active primary producer.
- This is authority/documentation drift and is retained as an explicit coverage classification.

## 6. Subject/topic coverage matrix

Full 79-row matrix:

- `artifacts/qa/decision-engine-p3/p3-topic-coverage-matrix.md`

Coverage metrics:

| Metric | Result |
|---|---:|
| mapped topic buckets | 79 |
| topic buckets referencing active reachable rules | 79/79 |
| topic buckets with a producer path at rule level | 79/79 |
| topic buckets with full per-grade metadata proof | 0/79 |
| representative raw→action proofs | 7/79 (8.86%) |
| proven safe-subskill paths in the matrix | 7/79 (8.86%) |
| topic buckets with any scanned prerequisite metadata | 2/79 (2.53%) |
| unsupported/missing matrix cells | 77 |

Important distinction:

- `activeTaxonomy = 79/79` means every mapped topic points to one or more active rule IDs.
- It does not mean every question, grade, difficulty, and mode in that topic emits the required metadata.
- Therefore metadata coverage is classified `partial`, not `full`, across the matrix.

Question metadata scan:

| Metric | Result |
|---|---:|
| static question records scanned | 9,993 |
| static modules scanned | 17 |
| documented procedural generator sources | 4 |
| records with expected error metadata | 6,690 |
| records with an effective subskill field | 9,993 |
| records with prerequisite metadata | 12 |
| records missing prerequisite metadata | 9,981 |
| records with explicitly unsupported English tags | 8 |

The scanner's effective subskill field is metadata presence. It is not equivalent to a safe action target.

## 7. Representative raw-to-action proofs

| Rule | Subject/topic | Raw evidence result | Final action |
|---|---|---|---|
| M-09 | math/subtraction | repeated `add_instead_of_sub` | targeted subskill practice |
| G-02 | geometry/angles | repeated `angle_range_error` | targeted subskill practice |
| H-04 | hebrew/comprehension | repeated `reading_comprehension_error` | reduce reading load |
| E-03 | english/translation | repeated `translation_error` | targeted subskill practice |
| S-03 | science/body | repeated `body_system_confusion` | targeted subskill practice |
| MG-03 | moledet-geography/citizenship | repeated `citizenship_error` | targeted subskill practice |
| HI-03 | history/hellenism_jews | repeated `cause_effect_error` | targeted subskill practice |

Additional proofs:

- fast wrong M-09 evidence:

```text
guessing_or_unstable
→ remove_timer
→ RI1 within canonical RI3
```

- missing metadata:

```text
no taxonomy match
→ canonical probe_only
→ give_probe_questions
→ RI0
```

- guided-only evidence:

```text
not independent recurrence
→ no safe subskill
→ no intervention
```

- controlled registered prerequisite:

```text
M-01
→ exact_skill
→ high confidence
→ entityValidated=true
```

The last case is a controlled engine-contract proof. It is not evidence that current production question banks broadly emit taxonomy-row prerequisite IDs.

## 8. Subskill safety contract

Safe targeting requires:

1. technical candidate exists;
2. candidate taxonomy ID exists;
3. taxonomy match is strong;
4. sufficient question count;
5. sufficient wrong-event count;
6. recurrence or explicit probe confirmation;
7. enough independent evidence unless probe-confirmed;
8. no unresolved multiple candidates;
9. no mastery control;
10. no strong counter-evidence;
11. no above-grade claim mismatch;
12. no stale/disappeared-pattern marker;
13. no taxonomy-only fallback metadata;
14. no general/mixed bucket.

Tested:

- one candidate without recurrence;
- single-session recurrence;
- cross-session recurrence;
- probe-confirmed guided evidence;
- guided-only non-probe evidence;
- partial/taxonomy-only metadata;
- competing subskills;
- mastery counter-evidence;
- disappeared pattern;
- above-grade mismatch;
- safe target versus topic-level/no-target fallback.

Current limitation:

- Single-session recurrence can satisfy most taxonomy rows.
- Only M-02 declares `minDistinctDays: 2`.
- The other 58 rows do not have a curriculum-backed cross-session requirement.
- P3 did not invent or globally increase thresholds without professional justification.

## 9. Prerequisite precision

New hierarchy:

| Precision | Entity | Confidence | Required source |
|---|---|---|---|
| `exact_skill` | registered taxonomy skill entity | high | explicit registered ID |
| `exact_topic` | mapped topic entity | medium | explicit prerequisite topic |
| `grade_foundation_area` | current topic + lower content grade provenance | medium | lower-grade foundation evidence |
| `generic_foundation_review` | current topic foundation area | low | foundation risk without precise mapping |

Each target includes:

- `id`;
- `label`;
- `precision`;
- `entityType`;
- `confidence`;
- `reasonCode`;
- `source`;
- `entityValidated`;
- unsupported declared IDs when fallback was required.

Examples:

- registered `M-01` → `exact_skill`;
- lower-grade `g2` evidence without mapping → topic foundation area, not prerequisite `"g2"`;
- real curriculum ID such as `sci_body_fact_recall`, when not registered in the action entity registry → explicit `declared_skill_unregistered_grade_fallback`.

Production coverage:

- only 12/9,993 scanned question records declare prerequisite metadata;
- only two topic buckets have any such metadata;
- exact production metadata-to-action reachability remains unproven;
- this is the largest P3 precision gap.

## 10. False-positive and false-negative audit

### Passed

- 59/59 real producer positives classify the expected tag.
- 59/59 real producer negatives do not classify the target tag.
- 59/59 wrong-topic full pipeline cases reject the original rule.
- 590 synthetic runtime/falsification fixtures execute across the 59 rules.
- insufficient volume does not confirm recurrence.
- random/missing metadata does not create a specific subskill.
- unknown patterns fall back safely.
- topic/subject candidate scoping prevents cross-subject rule leakage.
- evidence order reversal preserves taxonomy and action.
- conflicting candidates remain unsafe unless a unique matching candidate is proven.

### Remaining false-positive risks

1. Grade:
   - taxonomy rows declare no `gradeKeys`, `minGrade`, or `maxGrade`;
   - wrong-grade falsification is therefore unavailable;
   - the same rule may match wherever its broad topic mapping is available.

2. Single-session recurrence:
   - 58 rules permit a same-session recurrence path;
   - this may overstate persistence.

3. Broad tags:
   - tags such as concept confusion are reused across content;
   - topic scoping prevents direct subject leakage, but does not prove fine-grained curricular uniqueness.

4. Rule-to-topic reuse:
   - one active rule can be mapped to multiple topic buckets;
   - producer reachability for the rule does not prove producer coverage in every mapped bucket.

5. Evidence partition divergence:
   - DE2 scopes evidence through `filterMistakesForRow`;
   - LPD scopes evidence through `partitionPatternEligibleMistakes`;
   - LPD applies activity eligibility exclusions that the DE2 row filter does not apply identically;
   - the same raw evidence can therefore participate in DE2 taxonomy matching but be excluded from the unified LPD pattern partition.

6. Broad substring matching:
   - `eventMatchesEvidenceRule` permits substring matching through `patternFamily` and `conceptTag`;
   - shared values such as `concept_confusion`, `unit_error`, and `sentence_structure_error` make topic/subject scoping safety-critical.

### Remaining false-negative risks

1. 3,303 records lack expected error metadata.
2. 9,981 records lack prerequisite metadata.
3. `passive_error`, `modal_error`, and `comparatives_error` are explicitly unsupported.
4. Real curriculum prerequisite IDs are not yet registered as exact ADC entities.
5. Per-grade and per-mode raw-action proof is incomplete.
6. Forty-six rules have at least one required alternate tag without an active producer.
7. `perimeter_formula_error` is an explicit G-06 orphan tag.
8. Fast-diagnostic `infer-tags.js` uses parallel values that are not fully aligned with DE2 evidence-rule tags.

## 11. Orphan and integrity audit

Results:

| Check | Result |
|---|---:|
| mapped taxonomy IDs missing registry row | 0 |
| registry taxonomy IDs missing topic mapping | 0 |
| scanner-invalid subskill records | 0 |
| scanner-invalid prerequisite records | 0 |
| representative ADC target errors | 0 |

Action target validation now rejects:

- unregistered subskill IDs;
- missing prerequisite target;
- invalid prerequisite precision;
- exact prerequisite IDs not present in the registered taxonomy entity set;
- grade fallback represented as an exact skill.

## 12. Files and functions changed

### Product engine

- `utils/subskill-candidate-safety.js`
  - `assessSubskillCandidateSafety`
  - safety contract v3 and new gates.
- `utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js`
  - emits complete taxonomy selection/disambiguation trace.
- `utils/diagnostic-engine-v2/evidence-recurrence.js`
  - malformed-event safe filtering.
- `utils/diagnostic-engine-v2/topic-taxonomy-bridge.js`
  - read-only subject/topic taxonomy inventory.
- `utils/parent-report-engine-taxonomy-bridge.js`
  - passes counter-evidence into subskill safety.
- `utils/learning-pattern-decision/build-unified-decision-context.js`
  - independent/probe evidence, prerequisite signal, safety v3 consumption.
- `utils/learning-pattern-decision/build-learning-pattern-decision.js`
  - passes evidence partition counts.
- `utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js`
  - canonical topic target instead of composite row key.
- `utils/action-decision-contract/action-decision-contract-v2.js`
  - registered subskill targets and structured prerequisite detail.
- `utils/action-decision-contract/prerequisite-precision.js`
  - new prerequisite precision resolver and validator.
- `utils/diagnostic-engine-v3/error-types-v3.js`
  - subject-correct reading/vocabulary tag mapping.
- `utils/question-metadata-qa/question-metadata-taxonomy.js`
  - active `tense_error` recognition and explicit unsupported tags.

### Audit/test infrastructure

- `lib/learning/taxonomy-coverage-matrix.js`
- `tests/engine-decision-audit/p3-raw-evidence-harness.mjs`
- `tests/learning/taxonomy-targeting-p3.test.mjs`
- `scripts/decision-engine-p3-coverage-audit.mjs`
- focused compatibility fixture updates in the P0-P2 audit suites.

### Generated evidence

- `artifacts/qa/decision-engine-p3/p3-coverage-audit.json`
- `artifacts/qa/decision-engine-p3/p3-topic-coverage-matrix.md`
- `reports/question-metadata-qa/*`

## 13. Verification

### Required baseline

| Suite | Result |
|---|---:|
| P2 expanded audit | 846/846 assertions |
| P2 audit scenarios | 162 |
| original pipeline scenarios | 81/81 |
| audit logical branches | 57/57 |
| existing relevant engine baseline | 271/271 |
| P0 focused | 5/5 |
| P1 focused | 13/13 |
| P2 focused | 21/21 |
| intelligence self-test | pass |

### P3

| Suite | Result |
|---|---:|
| P3 top-level tests | 36/36 |
| P3 explicitly counted assertions | 988/988 |
| real runtime taxonomy E2E | 178/178 |
| real rules with positive proof | 59/59 |
| real rules with negative proof | 59/59 |
| wrong-topic falsification | 59/59 |
| synthetic taxonomy fixtures | 590 |
| representative raw→action | 7/7 |
| coverage inventory generation | pass |
| action target orphan scan | 0 errors |
| lint diagnostics | 0 |
| P3-file whitespace check | pass |

The official final P3 baseline is **36/36 top-level tests and 988/988
explicit assertions**. The earlier summary values `35/35` and `982/982`
were an intermediate run before the producer-coverage classification test
and its six assertions were added; those values are superseded.

No assertion was weakened and no snapshot was updated to conceal a change.

### Metadata QA gate

Final metadata QA result:

- parsed: 9,993;
- load errors: 0;
- previous blocking issues at start of P3 run: 15;
- final blocking issues: 2;
- remaining blockers: two `invalid_cognitive_level` values (`evaluation`) in English sentence metadata;
- advisory issues: 36,937.

The two remaining blockers were present before P3. They were not changed to `analysis` merely to make the gate green because P3 had no professional basis to collapse the cognitive taxonomy.

Therefore:

- engine regression suites are green;
- metadata QA remains red for two documented, non-P3 cognitive metadata issues.

## 14. Regressions

No regression was found in:

- P0 authority;
- P1 signal reconciliation;
- P2 action reachability;
- DE2;
- V3;
- LPD;
- EDC;
- subject decision aggregation;
- timing/trend/assistance;
- taxonomy/evidence baseline;
- intelligence self-test.

The metadata QA failure is not a P3 regression. P3 reduced its blocking count from 15 to 2 by distinguishing active and explicitly unsupported metadata tags.

## 15. Items not fully examined or not proven

- Every generated procedural question instance across every random generator branch.
- Every subject/topic/grade/difficulty/mode raw-action combination.
- Longitudinal persistence against real production histories.
- Curriculum validity of taxonomy Hebrew labels and interventions.
- Human-reviewed prerequisite graph correctness.
- Whether single-session recurrence is pedagogically sufficient for each of the 58 rows without a distinct-day requirement.
- Outcome effectiveness after the selected action.
- Calibration against teacher judgments or external labeled datasets.
- Recall/precision rates from production telemetry.

## 16. Remaining work before a professional classification

Coverage debt:

1. Add curriculum-approved grade constraints to taxonomy rows.
2. Register real curriculum skill entities separately from taxonomy rule IDs.
3. Connect the 12 current real prerequisite declarations and expand prerequisite authoring.
4. Prove raw-to-action for all 79 topic buckets, then per grade/mode where supported.
5. Resolve the 77 missing/unsupported matrix cells.
6. Decide recurrence distribution per taxonomy family with professional justification.
7. Add production-labeled false-positive/false-negative evaluation.
8. Reconcile `TAG_PRODUCER_REGISTRY` with primary-producer authority and either implement or explicitly retire the 54 orphan alternate tags.
9. Unify the DE2 and LPD evidence partition contract.

P4:

- improve explanation and counterfactual trace quality;
- calibrate confidence and action intensity;
- explain why the selected action won over blocked alternatives;
- add longitudinal outcome validation;
- complete legacy-consumer migration;
- evaluate human-review escalation only after an explicit authority policy exists.

P4 must not be used to hide the remaining P3 coverage debt.

## 17. Final answer

Taxonomy rule plumbing is now real and testable: 59/59 active rules reach from real producer evidence, safety is stricter, targets are registered, and representative raw-to-action paths work across all seven subjects.

That is not full professional coverage.

The decisive evidence is:

- 0/79 topic cells have full per-grade metadata proof;
- only 7/79 have representative raw-to-action proof;
- only 12/9,993 question records declare prerequisites;
- exact production prerequisite-to-action reachability is not proven;
- taxonomy has no grade constraints;
- 58/59 rules lack a cross-day requirement.
- 45/59 primary tags depend on producer-registry fallback, and 46/59 rules have partial alternate-tag coverage.

The engine is safer and more precise after P3, but its taxonomy and targeting remain partial.
