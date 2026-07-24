# Decision Engine - Production Integration

Date: 2026-07-24  
Status: implementation and focused verification complete  
Action authority: `ActionDecisionContractV2`

## Outcome

ADC V2 is now the sole student learning-path action authority from decision selection through API delivery, session execution and parent-safe reporting.

- All 11 actions produce bounded runtime behavior.
- All seven subject masters consume the same authoritative ADC V2 endpoint and executor.
- The old adaptive planner is a one-way display compatibility mirror only.
- The old planner action endpoint is retired with HTTP 410 and cannot compute a recommendation.
- Parent insights and home recommendations are generated from the same ADC V2 action.
- Client storage persists only execution progress, never a trusted action contract.
- Expiry, activity limits, reevaluation and rollback are enforced.
- No new feature flag, shadow mode, kill switch or parallel action engine was introduced.

The 79-topic baseline remains 72 regular raw-to-action passes, 7 mixed safe fallbacks, and zero unsupported, failed or cross-topic targets.

## Runtime architecture

The production path is:

`real evidence -> DE2/V3/LPD signals -> canonical state -> ActionDecisionContractV2 -> validated public projection -> useStudentActionDecision -> action-decision-executor -> existing subject master loop`

Key runtime components:

- `lib/learning/action-decision-executor.js`: pure bounded executor for all 11 actions.
- `hooks/useStudentActionDecision.js`: fetches the server contract, binds execution progress and returns runtime directives.
- `lib/learning/diagnostic-state-persistence.js`: persists only activity count, reevaluation state and decision timestamp.
- `components/learning/StudentQuestionDisplay.jsx`: applies presentation-only reading-load chunking while preserving wording and learning goals.

The client cannot restore an action or intensity from local storage. A fresh server ADC V2 contract is required before any directive becomes active.

## Action-to-executor mapping

### `collect_more_evidence`

- Keeps current topic, grade and normal question flow.
- Adds only the bounded remaining activity window from ADC expiry.
- Holds adaptive escalation.
- Returns to the standard path after expiry or sufficient new evidence.

### `give_probe_questions`

- Uses independent probe mode.
- Uses the safe taxonomy producer `probeKind` when a validated subskill exists.
- Otherwise remains an independent current-topic probe.
- Hides optional guidance and holds escalation.
- Reverts when the hypothesis is confirmed, rejected or expired.

### `practice_more`

- Adds bounded questions in the same topic and grade.
- Does not create a subskill.
- Normal internal difficulty remains allowed within the current route.

### `targeted_practice`

- Uses subskill focus only when ADC contains a safe subskill target.
- Resolves generator preference from the authoritative taxonomy producer registry.
- Falls back to topic focus when subskill precision is unavailable.
- Never switches to another target topic.

### `strengthen_prerequisite`

- Exact skill execution is accepted only with validated `exact_skill` precision.
- Public API projection resolves its registered prerequisite topic.
- Grade-foundation evidence lowers difficulty by one bounded step in the same topic.
- Further escalation is held until reevaluation.
- Grade fallback is never represented or displayed as an exact skill.

### `remove_timer`

- Disables challenge/speed countdown in every subject master.
- Leaves subject, topic, grade and learning target unchanged.
- Restores standard timing at expiry or after reevaluation.

### `reduce_reading_load`

- Uses `concise_chunked` presentation in the shared question component.
- Splits long verbal passages by sentence, or by clause when needed.
- Does not rewrite the question, lower content level or change the learning goal.

### `guided_to_independent_transition`

- Fades session guidance through guided, reduced-guidance and independent stages according to activity progress.
- Optional step-by-step controls are removed in the independent stage.
- Content, grade and target remain unchanged.

### `maintain`

- Holds the current topic and difficulty.
- Suppresses corrective routing and adaptive escalation.
- Continues the existing learning path until reevaluation.

### `monitor_before_escalation`

- Keeps the current route unchanged.
- Persists the temporary hypothesis only as execution progress.
- Suppresses escalation until new independent evidence arrives.

### `advance_cautiously`

- Advances exactly one difficulty step.
- Holds further internal adaptive escalation for the decision window.
- Preserves rollback to the previous path.

## Subject-master integration

The shared ADC V2 hook and executor are wired into:

- Mathematics.
- Geometry.
- English.
- Hebrew.
- Science.
- History.
- Moledet-Geography.

Every master:

- Fetches the exact subject/topic decision.
- Accepts only canonical topic aliases.
- Never falls back to a different topic in the same subject.
- Applies timer, reading, guidance, level and escalation directives.
- Records one execution activity per accepted answer.
- Uses the existing generator/probe machinery where available.

Geometry, English, Hebrew and Moledet-Geography also consume safe generator `preferKind`. Science and History use fixed question banks and therefore execute safe current-topic probes without inventing a subskill generator.

## Consumer migration

The authoritative inventory is in:

`utils/action-decision-contract/decision-consumer-registry-v1.js`

Final states:

- Learning masters: `adc_v2`, runtime executors.
- Student action hook: `adc_v2`, server-contract consumer.
- Student action API: `adc_v2`, validated public projection.
- Topic EDC/LPD action selector: `adc_v2`, authoritative selection.
- Subject rollup: `adc_v2`, read-only rollup; no legacy fallback authority.
- Parent report insights, home actions and topic displays: `adc_v2`, parent-safe translation.
- Adaptive planner UI: `one_way_compatibility_mirror`.
- Legacy EDC `recommendedAction`: `one_way_compatibility_mirror` for serialization only.
- Old planner API: `removed`; HTTP 410, no action computation.
- Diagnostic V3 next step: `legacy_evidence_only`; bounded signal input that cannot authorize an action.
- Topic-next-step engine: `legacy_evidence_only`; diagnostic signal/copy fallback only.
- Teacher guidance: `separate_decision_domain`; teacher cohort/assignment decisions, not the student learning route.
- School guidance view: `separate_decision_domain`; teacher-guidance display only.
- System-intelligence recommendations: `separate_decision_domain`; platform feedback, not student route control.

There is no remaining product consumer that may replace ADC action, raise intensity, change target or bypass a block.

## Adaptive planner compatibility

`lib/learning-client/scheduleAdaptivePlannerRecommendation.js` no longer calls a planner decision endpoint and no longer checks a feature flag.

It fetches the authoritative ADC V2 decision and maps it one-way into the existing display vocabulary:

- Collect/monitor -> `pause_collect_more_data`.
- Probe -> `probe_skill`.
- Practice/targeted/mode adaptations -> `practice_current`.
- Prerequisite -> `review_prerequisite`.
- Maintain -> `maintain_skill`.
- Advance -> `advance_skill`.

The mirror cannot change action, intensity or target. The former `/api/learning/planner-recommendation` endpoint returns HTTP 410 and points to the ADC endpoint.

## API

Authoritative endpoint:

`GET /api/student/action-decisions`

Authentication:

- Requires an active student session.
- Returns 401 and clears an expired session cookie when unauthenticated.
- Uses private no-store caching headers.
- Builds the same detailed decision pipeline used by reporting.

Top-level response:

- `ok`
- `contractVersion`
- `decisions`
- `parentReport`
- `generatedAt`

Each decision exposes:

- `contractVersion`
- `action`
- `family`
- `intensity`
- `eligible`
- `intervention`
- `target`
- `deliveryMode`
- `evidenceBasis`
- `reasonCodes`
- safe `authorityTrace`
- `createdAt`
- `expiry`
- `reevaluation`
- `previousAction`
- `rollbackBehavior`

The projection validates ADC V2 before returning it. It omits blocked alternatives, raw evidence snapshots and unrestricted authority internals. The `parentReport` object is separate and contains only parent-safe state, observations and recommendations.

## Parent report integration

Parent copy is centralized in:

`utils/action-decision-contract/parent-action-decision-translations-he.js`

The mapper reads `actionDecisionContract.action` directly and produces four safe states:

- `insufficient_information`.
- `verification_needed`.
- `strengthening_needed`.
- `progress_or_mastery`.

Both `parentFacing.insights` and `parentFacing.homeRecommendations` are replaced together from the same ADC V2 priority decisions. The old server regex recommendation cannot override an engine-backed report.

The report displays:

- What was observed.
- Whether evidence is limited or recurrent.
- The temporary recommended action.
- A clear statement that the action is temporary.
- When reevaluation occurs.

The parent layer does not display RI, taxonomy IDs, numeric confidence, raw reason codes or internal blocked alternatives. Topic-level targets do not display subskills. Grade-foundation review does not display an exact prerequisite.

Expired contracts produce an explicit insufficient-current-information state and cannot keep an adaptation active.

## Product files changed

Calibration and contracts:

- `utils/action-decision-contract/decision-calibration-contract-v1.js`
- `utils/action-decision-contract/action-decision-contract-v2.js`
- `utils/action-decision-contract/public-action-decision-v2.js`
- `utils/action-decision-contract/parent-action-decision-translations-he.js`
- `utils/action-decision-contract/decision-consumer-registry-v1.js`
- `utils/learning-pattern-decision/build-learning-pattern-decision.js`
- `utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js`
- `utils/learning-pattern-decision/build-subject-engine-decision-contract.js`
- `utils/learning-pattern-decision/apply-learning-pattern-decision.js`
- `utils/learning-pattern-decision/lpd-parent-facing-copy.js`
- `utils/learning-pattern-decision/index.js`

Runtime and persistence:

- `lib/learning/action-decision-executor.js`
- `hooks/useStudentActionDecision.js`
- `lib/learning/diagnostic-state-persistence.js`
- `lib/learning/diagnostic-state-master-helper.js`
- `lib/learning-client/studentLearningProfileClient.js`
- `lib/learning-client/scheduleAdaptivePlannerRecommendation.js`
- `components/learning/StudentQuestionDisplay.jsx`

Subject masters:

- `pages/learning/math-master.js`
- `pages/learning/geometry-master.js`
- `pages/learning/english-master.js`
- `pages/learning/hebrew-master.js`
- `pages/learning/science-master.js`
- `pages/learning/history-master.js`
- `pages/learning/moledet-geography-master.js`

API:

- `pages/api/student/action-decisions.js`
- `pages/api/learning/planner-recommendation.js`

Parent report:

- `utils/parent-report-engine-insights-he.js`
- `utils/detailed-parent-report.js`
- `pages/learning/parent-report.js`
- `pages/learning/parent-report-detailed.js`
- `pages/learning/parent-report-detailed.renderable.jsx`

Focused tests:

- `tests/learning/decision-calibration-benchmark-p4.test.mjs`
- `tests/learning/action-decision-executors-p4.test.mjs`
- `tests/learning/action-decision-consumer-migration-p4.test.mjs`
- `tests/learning/action-decision-subject-e2e-p4.test.mjs`

## Final verification results

- P0-P3B acceptance: 105/105 top-level tests passed (93 core plus 12 coverage/semantic artifact tests).
- Full engine audit: 846/846 assertions, 57/57 branches, 0 exceptions.
- P3B artifact audit: 878/878 assertions across 10,227 scenarios.
- P3C semantic closure: 13/13 top-level tests passed.
- Final topic matrix: 72 passed, 7 mixed safe fallback, 0 unsupported, 0 failed, 0 cross-topic.
- P4 benchmark/executor/consumer/subject suite: 25/25 top-level tests passed.
- Calibration benchmark: 50/50 scenario decisions, 0 forbidden actions, 100% authorization and RI-cap match.
- Seven real-evidence subject paths: 7/7 passed.
- All 11 executor paths: 11/11 passed.
- Parent and compatibility focused suite: 17/17 passed.
- Metadata QA: 0 blocking issues, 0 high-risk issues, gate `pass_with_advisory`.
- Route compilation smoke: all seven masters plus regular and detailed parent report returned HTTP 200.
- ADC endpoint unauthenticated check: expected HTTP 401.
- Retired planner endpoint check: expected HTTP 410.
- IDE diagnostics on changed files: 0 errors.

No broad Playwright run, screenshot sweep or oversized manual matrix was performed.

## Remaining gaps

No release-blocking integration gap remains.

The only intentional precision limit is that a topic without a validated subskill producer receives topic-level probing/practice. Science and History fixed-bank routes remain topic-level when no safe generator kind exists. This prevents invented specificity and is the required safe behavior.

No commit, push or deployment was performed.
