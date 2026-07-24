# Decision Engine P3B Coverage Closure

Date: 2026-07-23  
Scope: engine taxonomy, evidence, recurrence, prerequisites, metadata, and
raw-evidence-to-action only. No UI, parent-facing copy, demo, API presentation,
or wording changes were made.

## 1. Executive conclusion

P3B closes the **classification and safety-accounting requirement**, but it
does not claim universal professional coverage.

- All 79 topic rows are classified.
- 39 topics have a topic-specific real-producer raw→action proof.
- 7 `mixed` topics have an explicit safe-fallback proof.
- 33 topics are explicitly unsupported because no topic-specific real producer
  fixture currently proves the full path.
- No row is failed or unexplained.
- All 79 rows reject a real wrong-topic producer.
- 77/79 rows have grade availability derived from existing curriculum or
  generator maps. English `listening` and Hebrew `homophones` are explicitly
  unsupported topic mappings.

The engine can therefore expose only the 39 proven topic paths as active
topic-specific raw→action coverage. The 33 unsupported rows and 62 rows without
grade evidence remain visible coverage debt and are not counted as
capabilities.

## 2. Official P3 baseline count

The final official P3 baseline is:

- 36/36 top-level tests.
- 988/988 explicitly counted assertions.

The earlier 35/35 and 982/982 values were an intermediate run. The additional
producer-coverage test added one top-level test and six assertions. The P3
report and generated coverage summary now state the same official baseline.

P3B later added a same-session recurrence assertion to the evolving P3-focused
file. That post-baseline file now counts 989 assertions; it does not rewrite
the frozen official P3 baseline.

## 3. Raw→Action coverage

Before P3B:

- 7/79 representative topic proofs.
- 72 topic rows without a topic-specific full-path classification.

After P3B:

- 39/79 full topic-specific real-producer proofs.
- 7/79 mixed-topic safe-fallback proofs.
- 33/79 explicit unsupported classifications.
- 79/79 wrong-topic falsification proofs.
- 79/79 rows classified.
- 0 failed rows.
- 0 unexplained unsupported rows.

Every positive proof executes:

`real question/generator → wrong answer classifier → normalized mistake event
→ taxonomy → recurrence → unifiedDecisionContext → canonicalState
→ ActionDecisionContractV2`.

The real producer registry is intentionally narrower than the topic-taxonomy
bridge. A rule being attached to a topic does not count as proof that the
rule's real source question belongs to that topic.

### Coverage by subject

| Subject | Topics | Raw→Action proven | Mixed safe | Explicit unsupported | Grade-evidenced |
|---|---:|---:|---:|---:|---:|
| Math | 24 | 7 | 1 | 16 | 24 |
| Geometry | 18 | 6 | 1 | 11 | 18 |
| English | 8 | 5 | 1 | 2 | 7 |
| Hebrew | 8 | 6 | 1 | 1 | 7 |
| Science | 8 | 5 | 1 | 2 | 8 |
| History | 6 | 4 | 1 | 1 | 6 |
| Moledet/geography | 7 | 6 | 1 | 0 | 7 |
| **Total** | **79** | **39** | **7** | **33** | **77** |

The full 79-row topic/grade/source matrix is generated at:

`artifacts/qa/decision-engine-p3b/p3b-topic-grade-matrix.md`

The machine-readable proof traces are generated at:

`artifacts/qa/decision-engine-p3b/p3b-coverage-closure.json`

## 4. Grade × Topic matrix

The matrix records, for every topic:

- grades explicitly declared by scanned question banks;
- metadata source files;
- taxonomy candidates;
- raw→action status;
- wrong-topic status;
- grade-constraint status;
- proven and unproven modes.

Results:

- 77 topics have `curriculum_map_declared` grade evidence.
- English `listening` is unsupported because the inventory key maps to the
  runtime/curriculum topic `phonics`.
- Hebrew `homophones` is unsupported because it is absent from the live
  curriculum topic maps.
- No taxonomy rule has an invented grade constraint.
- Existing taxonomy rows still have no authoritative professional grade
  constraints, so there are zero rule-level wrong-grade obligations to execute.
- Declared topic availability is not misrepresented as proof that every attached
  taxonomy rule is professionally valid for every listed grade.

Mode proof is similarly conservative: `practice` is proven by the raw harness.
Other modes remain explicitly unproven even when the eligibility contract knows
how to classify them.

## 5. Producer authority and orphan tags

`RULE_PRIMARY_PRODUCER` is now compiled into
`TAG_PRODUCER_REGISTRY` once. `getTagProducer()` no longer applies a second
fallback authority.

Producer results:

- 59/59 rules have their primary producer in the authoritative registry.
- 45 rules moved from parallel fallback-only authority to the unified registry.
- 0 active rules lack a primary producer.
- 134 distinct required tags were classified.
- 80 required tags have an active producer.
- 54 required tags are explicitly `unsupported_unproduced`.
- 0 required tags remain unclassified.
- 0 tags were removed from `requiredTags`.

Unsupported required tags cannot activate `eventMatchesEvidenceRule`; merely
injecting such a tag into an event no longer creates a taxonomy match.

This preserves the semantic distinction between:

- active producer-backed taxonomy input;
- declared but unsupported legacy/alternate input.

## 6. Uniform evidence eligibility contract

`DIAGNOSTIC_EVIDENCE_ELIGIBILITY_VERSION = 1` is the authoritative event-level
contract used by:

- DE2 row filtering and recurrence;
- V3 evidence contracts;
- LPD pattern partition;
- `unifiedDecisionContext`;
- subskill safety.

The contract distinguishes:

- diagnostic eligibility;
- independent recurrence eligibility;
- competitive speed-pressure eligibility;
- guided support-only evidence.

Independent recurrence requires a diagnostic-independent category, no hints,
and no step-by-step exposure. Guided, hinted, review, book, discussion,
competitive, and unclassified evidence cannot independently establish a
misconception recurrence.

Differential tests cover practice, quiz, homework, hinted practice,
step-by-step, learning, guided retry, speed, and missing mode. DE2 and LPD
return the same independent-recurrence result for every case. V3 exposes the
same contract and assigns zero diagnostic weight to non-diagnostic evidence.

## 7. Recurrence policy

All 59 taxonomy rules now have a declared recurrence policy.

| Family | Rules | Existing basis | Subskill session rule |
|---|---:|---|---|
| `cross_day_recurrence` | 1 | Existing `minDistinctDays` | At least 2 sessions and 2 days |
| `multi_pattern_cross_session` | 2 | Existing `minDistinctPatternFamilies` | At least 2 sessions |
| `standard_cross_session` | 56 | Existing `minWrong` | At least 2 sessions |

For all families:

- minimum wrong-event count is inherited from the taxonomy row, with the
  existing safety floor of 3;
- recent activity is required for a subskill target;
- same-session recurrence stays topic-level;
- a disappeared pattern stays topic-level;
- mastery or strong counter-evidence blocks a subskill target.

The two-session requirement is not a new claim that two sessions prove a
professional diagnosis. It is the minimum definitional condition for any
cross-session subskill claim. Rules without that evidence remain topic-level.

## 8. Prerequisite coverage

A separate curriculum-skill entity registry now contains eight validated
entities: the four prerequisite targets below and the four dependent skills
that declare those relationships.

- `sci_body_fact_recall`;
- `he_comp_explicit_detail`;
- `geo_pv_area_vs_perimeter`;
- `tri_sum_180`.

Four validated prerequisite relations cover all 12 existing declarations.

Results:

- 12/12 existing declarations point to registered curriculum entities.
- 12/12 resolve as `exact_skill` when passed to prerequisite precision.
- 12/12 real top-level bank declarations propagate through answer-time mistake
  extraction, normalized events, and V3.
- A real science-bank declaration reaches ActionDecisionContractV2 as an exact
  registered curriculum-skill target.
- 0 applicable scanned records are missing the registered prerequisite.
- 9,981 records are `prerequisite_not_applicable`.
- Grade keys and taxonomy rule IDs are rejected as exact prerequisite skills.
- Grade-foundation fallback remains `grade_foundation_area`, never
  `exact_skill`.

Applicability is subskill-specific. For example, an area/perimeter prerequisite
applies to the two declared rectangle-planning subskills, not automatically to
every question sharing a broad skill identifier.

## 9. Metadata completeness

All 9,993 scanned records are classified. These are overlapping quality
dimensions, not mutually exclusive buckets.

| Dimension | Records |
|---|---:|
| Metadata complete | 1,914 |
| Topic-level only | 971 |
| Pattern missing | 3,303 |
| Subskill missing | 0 |
| Prerequisite not applicable | 9,981 |
| Prerequisite complete where applicable | 12 |
| Prerequisite missing where applicable | 0 |
| Unsupported expected-error tag | 8 |
| Invalid metadata | 0 |

The eight unsupported-tag records contain:

- `passive_error`: 3;
- `modal_error`: 3;
- `comparatives_error`: 2.

They remain recognized metadata but are not counted as active taxonomy
capability.

## 10. Cognitive-level QA investigation

The two `evaluation` values were attached to:

- a third-conditional fill-in-the-blank;
- an indirect-question backshift fill-in-the-blank.

Neither question asks the learner to judge a claim against criteria, defend a
position, or evaluate alternatives. Both require analyzing grammatical
structure and selecting the valid form. Therefore `evaluation` was incorrect
question metadata, not a missing valid enum value. Both records were corrected
to `analysis`.

Final metadata QA:

- parsed records: 9,993;
- load errors: 0;
- blocking issues: 0;
- gate decision: `pass_with_advisory`;
- advisory issues: 36,937.

The advisory count remains high because most banks still lack dense optional
professional metadata. It is not presented as full metadata coverage.

## 11. Test and audit results

Final focused Node run:

- 97/97 top-level tests passed;
- includes P0, P1, P2, P3, P3B, EDC, and mixed-evidence coverage.

Dedicated P3B tests:

- 20/20 top-level tests passed.

P3B coverage audit:

- scenarios/records inspected: 10,206;
- assertions: 771/771;
- logical branches: 13/13;
- failed assertions: 0.

Full engine audit:

- scenarios: 162;
- assertions: 846/846;
- logical branches: 57/57;
- exceptions: 0.

Metadata QA:

- blockers: 0;
- load errors: 0.

Required falsifications are green:

- wrong topic for 79/79 rows;
- deterministic producer and action under evidence permutation;
- guided-only evidence cannot establish independent recurrence;
- same-session evidence cannot establish a cross-session subskill claim;
- stale and counter-evidenced patterns cannot remain active subskill targets;
- unsupported required tags cannot activate taxonomy;
- exact prerequisites always point to registered curriculum entities;
- mixed topics do not produce subskill claims.

## 12. Regressions and authority

No regression was found in:

- canonicalState authority;
- RI0/RI1/RI2 intensity caps;
- P0 recommendation normalization;
- P1 signal reconciliation;
- P2 ActionDecisionContractV2 reachability;
- DE2/V3/LPD/EDC integration;
- guided-evidence blocking;
- mixed-topic specificity blocking;
- deterministic taxonomy/action selection.

No UI, parent-facing, demo, API-presentation, or wording file was changed.

## 13. Remaining explicit coverage gaps

These gaps are not counted as active capability:

- 33 topics lack a topic-specific real-producer raw→action proof.
- Two topics lack a valid same-topic curriculum grade mapping.
- All 79 rows still lack rule-level professional grade constraints.
- Non-`practice` modes are classified by the eligibility contract but do not
  have per-topic raw→action proof.
- 54 required alternate tags remain unsupported.
- 8 question records use recognized but unsupported tags.
- 3,303 records lack error-pattern metadata.
- Only 1,914/9,993 records meet the current complete-metadata definition.
- No production-labeled precision/recall or false-positive/false-negative rate
  exists.

P3B is closed because every row and tag is now proven or explicitly classified,
not because these gaps disappeared.

## 14. P4-only gaps

P4 may address:

- confidence and action-intensity calibration;
- longitudinal outcome validation;
- explanation/counterfactual trace quality;
- human-review escalation policy;
- remaining legacy-consumer migration.

P4 must not relabel the 33 unsupported topics, two unsupported grade-topic
rows, or 54
unsupported tags as active capabilities. Expanding those requires new real
content producers, curriculum evidence, and topic/grade proofs, followed by a
new coverage audit.
