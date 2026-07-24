# Decision Engine P4 - Professional Calibration

Date: 2026-07-24  
Status: complete, ready for upload approval  
Authority: `DecisionCalibrationContractV1` + `ActionDecisionContractV2`

## Outcome

The final professional calibration is implemented as one authoritative contract:

- Contract: `utils/action-decision-contract/decision-calibration-contract-v1.js`
- Version: `1.0.0`
- Action selector: `utils/action-decision-contract/action-decision-contract-v2.js`
- Canonical authority remains the only source allowed to authorize intervention.
- Calibration may cap or lower intensity; it cannot open intervention, raise intensity above the canonical cap, or create a target.
- Every decision is temporary and includes creation time, expiry, an evidence snapshot, reevaluation conditions, previous action and rollback behavior.

The existing coverage baseline remains unchanged:

- 79 topics total.
- 72 regular topics with raw-to-action proof.
- 7 mixed topics with safe fallback.
- 0 unsupported, failed or cross-topic targets.
- No taxonomy or producer was reopened during P4.

## RI policy

- RI0: observation, verification, monitoring or maintaining the current path.
- RI1: a short and limited adjustment.
- RI2: a verified, focused intervention.
- RI3: reserved by canonical authority for strong independent recurrence. No P4 action policy can independently create RI3.

The final professional caps are:

- RI0: `collect_more_evidence`, `give_probe_questions`, `maintain`, `monitor_before_escalation`.
- RI1: `remove_timer`, `advance_cautiously`.
- RI2: `practice_more`, `targeted_practice`, `strengthen_prerequisite`, `reduce_reading_load`, `guided_to_independent_transition`.

## Calibrated actions

### `collect_more_evidence`

- Allowed for thin, missing, uncertain or conflicting evidence.
- Blocked when there is no practice activity at all.
- Minimum: 0 wrong events, 0 sessions.
- Maximum: RI0.
- Reevaluation: after 4 activities or 72 hours.
- Transition: sufficient independent evidence or a testable probe hypothesis.

### `give_probe_questions`

- Allowed for probe-only/diagnose-only authority or an unconfirmed candidate pattern.
- Probe must be independent and remain at the content grade.
- Minimum: 1 wrong event, 1 session.
- Maximum: RI0.
- Reevaluation: after 3 activities or 48 hours.
- Transition: hypothesis confirmed or rejected.

### `practice_more`

- Same topic and same grade only; no automatic subskill claim.
- Blocked by above-grade caveat, strong independent mastery or recent improvement.
- Minimum: 2 wrong events, 1 session.
- Maximum: RI2.
- Reevaluation: after 5 activities or 120 hours.
- Improvement downgrades the action to monitoring.

### `targeted_practice`

- Safe subskill only when independently supported; otherwise topic-level focus.
- Blocked for guided-only, same-session-only, topic-level subskill claims or recent improvement.
- Minimum: 3 wrong events across 2 sessions.
- Maximum: RI2.
- Reevaluation: after 6 activities or 168 hours.
- Target can never cross the selected topic.

### `strengthen_prerequisite`

- Exact prerequisite requires a registered curriculum entity.
- Grade-foundation evidence remains a limited foundation-area review and is never represented as an exact skill.
- Blocked for above-grade content, strong independent mastery or missing foundation evidence.
- Minimum: 3 wrong events across 2 sessions.
- Maximum: RI2.
- Reevaluation: after 6 activities or 168 hours.

### `remove_timer`

- Requires timing evidence; slow and accurate work blocks the action.
- Content and target remain unchanged.
- Minimum: 2 wrong events, 1 session.
- Maximum: RI1.
- Reevaluation: after 4 activities or 72 hours.
- Standard timing returns when accuracy stabilizes or the timing hypothesis is rejected.

### `reduce_reading_load`

- Requires reading-load evidence.
- Presentation may be chunked; the learning goal and content level remain unchanged.
- Minimum: 2 wrong events, 1 session.
- Maximum: RI2.
- Reevaluation: after 4 activities or 96 hours.

### `guided_to_independent_transition`

- Requires guided success plus an independent gap.
- Assistance fades in bounded stages: guided, reduced guidance, independent.
- Minimum: 1 wrong event, 1 session.
- Maximum: RI2.
- Reevaluation: after 4 activities or 96 hours.

### `maintain`

- Used for stable mastery or strong independent success.
- No corrective practice and no adaptive escalation.
- Minimum: 1 session.
- Maximum: RI0.
- Reevaluation: after 8 activities or 336 hours.

### `monitor_before_escalation`

- Preferred for recent improvement, above-grade caveat, conflicting evidence or stale patterns.
- No path change and no escalation without new evidence.
- Minimum: 1 wrong event, 1 session.
- Maximum: RI0.
- Reevaluation: after 4 activities or 96 hours.

### `advance_cautiously`

- Requires strong independent mastery and canonical expand authority.
- Blocked by guided-only evidence, grade caveat, contradiction or an active gap.
- One level step only; further adaptive escalation is held until reevaluation.
- Minimum: 2 sessions.
- Maximum: RI1.
- Reevaluation: after 4 activities or 96 hours.
- Rollback: one step to the previous path.

## Safety and professional rules

- A single error never creates a recurring pattern.
- Same-session recurrence cannot create a subskill claim.
- Guided-only evidence cannot establish independent difficulty.
- Positive trend lowers intensity or changes the action to monitoring.
- Strong independent success blocks unnecessary foundation review.
- Above-grade errors cannot create a foundation weakness.
- Topic-level evidence cannot create a subskill target.
- Grade-foundation fallback cannot become an exact prerequisite.
- Missing timing evidence blocks timer removal.
- Missing reading-load evidence blocks reading adaptation.
- No permanent child labels, clinical claims or emotional diagnoses are produced.

## Benchmark

`tests/learning/decision-calibration-benchmark-p4.test.mjs` defines 50 pre-authorized scenarios across all subjects, young and older grades, and the required evidence states:

- Single error, repeated pattern, disappeared pattern, improvement and decline.
- Slow/accurate and fast/inaccurate behavior.
- Guided-only success and guided success with independent failure.
- Above-grade content and foundation weakness.
- Conflicting or limited evidence.
- Mastery with an incidental error.
- Safe/unsafe subskill.
- Exact prerequisite and grade-foundation fallback.
- Reading load, timing pressure and mixed-topic safety.

For every scenario the benchmark asserts expected authorization, action, allowed alternative, forbidden actions, RI cap, target precision and reason.

Result:

- 50/50 scenario decisions matched.
- 0 forbidden actions.
- 100% expected authorization.
- 100% RI-cap compliance.

## Counterfactual proofs

The focused benchmark proves:

- Removing recurrence lowers action specificity.
- Guided-only evidence does not raise specificity.
- Positive trend prevents escalation.
- Above-grade content does not create a foundation claim.
- Missing prerequisite evidence blocks `strengthen_prerequisite`.
- Missing timing evidence blocks `remove_timer`.
- Missing reading-load evidence blocks `reduce_reading_load`.

## Defects corrected during calibration

- `practice_more` was initially capped at RI1, conflicting with the established P2 RI1/RI2 differential. The professional cap was corrected to RI2 while preserving canonical authority.
- Lifecycle timestamps initially used `Date.now()` inside repeated deterministic test paths. The report window timestamp is now propagated into EDC/ADC construction, restoring deterministic output.
- Engine determinism returned to 846/846 after the timestamp correction.
- Expired decisions now roll back and parent-facing output explicitly withholds stale adaptations.

## Verification

- Calibration and P4 integration suite: 25/25 top-level tests passed.
- Full engine audit: 846/846 assertions passed, 57/57 branches covered.
- P0-P3B acceptance: 105/105 top-level tests passed (93 core plus 12 coverage/semantic artifact tests).
- P3B artifact audit: 878/878 assertions passed.
- Semantic 79-topic closure: 72 passed, 7 mixed safe fallback, 0 unsupported/failed/cross-topic.
- Metadata QA: 0 blocking issues; gate `pass_with_advisory`.

## Product files

- `utils/action-decision-contract/decision-calibration-contract-v1.js`
- `utils/action-decision-contract/action-decision-contract-v2.js`
- `utils/learning-pattern-decision/index.js`
- `utils/learning-pattern-decision/build-learning-pattern-decision.js`
- `utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js`
- `tests/learning/decision-calibration-benchmark-p4.test.mjs`

## Remaining gaps

No professional calibration blocker remains. Topic-level probes and targeted practice intentionally remain topic-level when no safe subskill producer exists; this is a safety behavior, not a missing action.

No commit, push or deployment was performed.
