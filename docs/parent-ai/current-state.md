# Parent AI — Phase A: Current State Audit

**Status:** Audit only. No product/runtime code, UI, API routes, or banks/taxonomies/diagnostics/planner logic were touched in this phase. Phase B–H are not approved.

**Scope of this document:** verify the current repo state of the Parent AI surfaces and the Parent Copilot Q&A subsystem; map dependencies for short report, detailed report, PDF, narrative safety, diagnostic engine, adaptive planner, question metadata/banks, and student history; identify asymmetries and twin-file drift; classify each module as reuse / extend / freeze / leave-alone; and confirm the freeze list for student-facing AI.

**Locked decisions for subsequent phases (per user, Phase A approval):**

- Reuse [`utils/parent-copilot/*`](../../utils/parent-copilot) as the Parent AI Assistant foundation. Do not rebuild from scratch.
- PDF includes only the deterministic Parent AI summary insight at first. Interactive Q&A is excluded from PDF.
- Short-report Q&A panel will be enabled behind a flag in future phases (default off).
- No changes to question banks, taxonomies, diagnostic decisions, or planner logic.
- No changes to student-facing UI; no new AI surface inside `*-master.js`.
- Product UI/content remains Hebrew. Code and documentation may be English.

---

## 1. Parent AI modules that already exist

The "summary insight" Parent AI bundle (single Hebrew sentence, validator-gated) is implemented as three files plus two dedicated test scripts. All three files are intact and currently in use.

| File | Purpose | Key exports |
|------|---------|-------------|
| [`utils/parent-report-ai/parent-report-ai-explainer.js`](../../utils/parent-report-ai/parent-report-ai-explainer.js) | Builds strict-allowlist input, deterministic Hebrew narrative, optional OpenAI completion (`{ "text": "..." }`), validates output. System prompt forbids internal jargon (planner / diagnostics / metadata / numbers). Falls back deterministically on any LLM error. | `buildStrictParentReportAIInput`, `getDeterministicParentReportExplanation`, `buildParentReportAIExplanation`, `recommendedNextStepHeFromPlannerAction` |
| [`utils/parent-report-ai/parent-report-ai-adapter.js`](../../utils/parent-report-ai/parent-report-ai-adapter.js) | Adapter from `generateParentReportV2` snapshot to allowlisted explainer input. Calls the explainer and returns `{ parentAiExplanation }`. | `buildStrictParentReportAIInputFromParentReportV2`, `enrichParentReportWithParentAi` |
| [`lib/parent-report-ai/parent-report-ai-validate.js`](../../lib/parent-report-ai/parent-report-ai-validate.js) | Single-line Hebrew-safe validation: length cap, Hebrew ratio, no digits/markdown/emoji; blocks internal/medical/blame/scary/promise/forbidden-engine fragments; optional `validateParentNarrativeSafety` against a minimal engine snapshot. | `PARENT_REPORT_AI_DEFAULT_MAX_LEN`, `PARENT_REPORT_AI_INTERNAL_LEAK_RES`, `validateParentReportAIText`, `parentReportAiInputToNarrativeEngineSnapshot` |

Test scripts already wired into [`package.json`](../../package.json):

- `npm run test:parent-report-ai:scenario-simulator` → [`scripts/parent-report-ai-scenario-simulator.mjs`](../../scripts/parent-report-ai-scenario-simulator.mjs). Scenario matrix; outputs to [`reports/parent-report-ai/scenario-simulator.json`](../../reports/parent-report-ai/scenario-simulator.json) and `.md`.
- `npm run test:parent-report-ai:integration` → [`scripts/parent-report-ai-integration.mjs`](../../scripts/parent-report-ai-integration.mjs). Adapter / wiring assertions, including "no API key → deterministic", unsafe Hebrew rejected, mocked LLM emitting leaks falls back to deterministic, narrative-guard rejects overconfident text on thin snapshot.

Adjacent helpers used **upstream** of Parent AI (not in the AI bundle itself, but on the report payload it consumes):

- [`utils/parent-report-diagnostic-restraint.js`](../../utils/parent-report-diagnostic-restraint.js) — `computeDiagnosticRestraint`, lowers conclusion strength under thin / contradictory / unstable evidence.
- [`utils/parent-report-ui-explain-he.js`](../../utils/parent-report-ui-explain-he.js) — Hebrew label / sanitization layer; not generative.
- [`utils/parent-report-root-cause.js`](../../utils/parent-report-root-cause.js) — `estimateRowRootCause`, restraint-aware bucket + Hebrew label.
- [`components/ParentReportImportantDisclaimer.js`](../../components/ParentReportImportantDisclaimer.js) — static "not a clinical diagnosis" notice.

---

## 2. Parent Copilot modules that already exist

[`utils/parent-copilot/`](../../utils/parent-copilot) contains a comprehensive parent-facing Q&A subsystem (27 source files plus README), already mounted in both detailed-report pages via [`components/parent-copilot/parent-copilot-shell.jsx`](../../components/parent-copilot/parent-copilot-shell.jsx).

Public entry points (in [`utils/parent-copilot/index.js`](../../utils/parent-copilot/index.js)):

- `runParentCopilotTurn(input)` — synchronous, **deterministic only**. `generationPath: "deterministic"` always.
- `runParentCopilotTurnAsync(input)` — runs the same deterministic core, then **optionally** overlays a grounded LLM draft if and only if rollout gates pass and the draft passes guardrails. Always falls back to deterministic on any failure.

Module map:

| File | Role |
|------|------|
| [`utils/parent-copilot/index.js`](../../utils/parent-copilot/index.js) | Public entry. `runParentCopilotTurn` (sync), `runParentCopilotTurnAsync` (async). |
| [`utils/parent-copilot/truth-packet-v1.js`](../../utils/parent-copilot/truth-packet-v1.js) | Builds canonical `TruthPacketV1` from report payload + scope (single source of grounding). |
| [`utils/parent-copilot/scope-resolver.js`](../../utils/parent-copilot/scope-resolver.js) | Resolves the scope (subject/topic/global) referenced by the parent's utterance. |
| [`utils/parent-copilot/intent-resolver.js`](../../utils/parent-copilot/intent-resolver.js) | Maps utterance to a canonical intent. |
| [`utils/parent-copilot/stage-a-freeform-interpretation.js`](../../utils/parent-copilot/stage-a-freeform-interpretation.js) | First-pass freeform Hebrew interpretation. |
| [`utils/parent-copilot/conversation-planner.js`](../../utils/parent-copilot/conversation-planner.js) | Plans answer block sequence from `TruthPacketV1` + intent. |
| [`utils/parent-copilot/answer-composer.js`](../../utils/parent-copilot/answer-composer.js) | Deterministic compose of answer draft from contract slots; clinical-boundary draft. |
| [`utils/parent-copilot/answer-compaction.js`](../../utils/parent-copilot/answer-compaction.js) | Compacts blocks within scope-aware caps. |
| [`utils/parent-copilot/semantic-question-class.js`](../../utils/parent-copilot/semantic-question-class.js) | Detects aggregate / vague-summary / recommendation-action question classes. |
| [`utils/parent-copilot/semantic-aggregate-answers.js`](../../utils/parent-copilot/semantic-aggregate-answers.js) | Aggregate answer drafts (e.g., multi-subject summaries). |
| [`utils/parent-copilot/conversational-reply-class-he.js`](../../utils/parent-copilot/conversational-reply-class-he.js) | Reply class detection for Hebrew. |
| [`utils/parent-copilot/short-followup-composer.js`](../../utils/parent-copilot/short-followup-composer.js) | Short follow-up early-exit drafts. |
| [`utils/parent-copilot/comparison-practical-continuity.js`](../../utils/parent-copilot/comparison-practical-continuity.js) | Practical-continuity follow-ups (subject vs subject, etc.). |
| [`utils/parent-copilot/followup-engine.js`](../../utils/parent-copilot/followup-engine.js) | Selects a follow-up question/family within allowed families. |
| [`utils/parent-copilot/direct-answer-openers.js`](../../utils/parent-copilot/direct-answer-openers.js) | Hebrew opener templates. |
| [`utils/parent-copilot/parent-coaching-packs.js`](../../utils/parent-copilot/parent-coaching-packs.js) | Pre-approved coaching text packs. |
| [`utils/parent-copilot/utterance-normalize-he.js`](../../utils/parent-copilot/utterance-normalize-he.js) | Hebrew utterance normalization. |
| [`utils/parent-copilot/render-adapter.js`](../../utils/parent-copilot/render-adapter.js) | Builds `Resolved` / `Clarification` parent-copilot responses + `quickActions`. |
| [`utils/parent-copilot/contract-reader.js`](../../utils/parent-copilot/contract-reader.js) | `readContractsSliceForScope`, `getIntelligenceSignals`. |
| [`utils/parent-copilot/guardrail-validator.js`](../../utils/parent-copilot/guardrail-validator.js) | `validateAnswerDraft`, `validateParentCopilotResponseV1`; `FORBIDDEN_PARENT_SURFACE_TOKENS`; clinical regex sets. |
| [`utils/parent-copilot/fallback-templates.js`](../../utils/parent-copilot/fallback-templates.js) | `buildDeterministicFallbackAnswer` for validator failures. |
| [`utils/parent-copilot/llm-orchestrator.js`](../../utils/parent-copilot/llm-orchestrator.js) | Optional grounded LLM call + strict draft validation; honors rollout gates. |
| [`utils/parent-copilot/rollout-gates.js`](../../utils/parent-copilot/rollout-gates.js) | `getLlmGateDecision`, KPI gate (`evaluateKpiGate`, `readKpiThresholds`). |
| [`utils/parent-copilot/session-memory.js`](../../utils/parent-copilot/session-memory.js) | Per-session conversation state and deltas. |
| [`utils/parent-copilot/turn-telemetry.js`](../../utils/parent-copilot/turn-telemetry.js) | `buildTurnTelemetry` per turn. |
| [`utils/parent-copilot/telemetry-store.js`](../../utils/parent-copilot/telemetry-store.js) | `appendTurnTelemetryTrace` (best-effort persistence). |
| [`utils/parent-copilot/telemetry-contract-v1.js`](../../utils/parent-copilot/telemetry-contract-v1.js) | Telemetry shape contract. |
| [`utils/parent-copilot/README.md`](../../utils/parent-copilot/README.md) | Authoritative behavior doc (deterministic-first, gates, fallback, `generationPath`). |

UI:

- [`components/parent-copilot/parent-copilot-shell.jsx`](../../components/parent-copilot/parent-copilot-shell.jsx) — wraps the panel; receives `payload` + optional `selectedContextRef`.
- [`components/parent-copilot/parent-copilot-panel.jsx`](../../components/parent-copilot/parent-copilot-panel.jsx) — the parent-facing panel.
- [`components/parent-copilot/parent-copilot-quick-actions.jsx`](../../components/parent-copilot/parent-copilot-quick-actions.jsx) — quick-action chips.

Rollout / KPI gates already documented in [`docs/PARENT_COPILOT_ROLLOUT.md`](../PARENT_COPILOT_ROLLOUT.md):

- Stage: `PARENT_COPILOT_ROLLOUT_STAGE` ∈ {`internal`, `beta`, `full`}.
- LLM enable: `PARENT_COPILOT_LLM_ENABLED`, `PARENT_COPILOT_LLM_EXPERIMENT`.
- Kill switch: `PARENT_COPILOT_FORCE_DETERMINISTIC`.
- KPI thresholds: `PARENT_COPILOT_KPI_MIN_FLUENCY`, `PARENT_COPILOT_KPI_MIN_GROUNDEDNESS`, `PARENT_COPILOT_KPI_MAX_GENERICNESS`, `PARENT_COPILOT_KPI_MAX_FALLBACK_RATE`, `PARENT_COPILOT_KPI_MIN_CLARIFICATION_SUCCESS`.
- LLM provider: `PARENT_COPILOT_LLM_API_KEY`, `PARENT_COPILOT_LLM_BASE_URL`, `PARENT_COPILOT_LLM_MODEL`, `PARENT_COPILOT_LLM_TIMEOUT_MS`.

Existing test scripts (selected; full set under [`package.json`](../../package.json) `test:parent-copilot-*`):

- `test:parent-copilot-phaseA` / `phaseB` / `phaseC`
- `test:parent-copilot-phase4` (truth path), `phase5` (validator), `phase6` (Hebrew robustness)
- `test:parent-copilot-async-llm-gate`
- `test:parent-copilot-executive-answer-safe-matrix`, `executive-answer-quality`, `answer-quality-conversation`
- `test:parent-copilot-classifier-edge-matrix`, `scope-collision`, `semantic-nearmiss`, `short-noisy-phrasing`, `freeform-hebrew`, `stage-a-paraphrase`, `stage-b-scope`, `reply-class-paraphrase`
- `test:parent-copilot-recommendation-semantic`, `parent-language-semantic`, `comparison-continuity-behavior`, `question-class-behavior`, `broad-report-routing`
- `test:parent-copilot-parent-render`, `product-behavior`, `observability-contract`, `telemetry-trace`

---

## 3. Should `utils/parent-copilot/*` be reused as the Parent AI Assistant foundation?

**Yes. Reuse confirmed.**

Rationale:

- Already implements all Q&A primitives required by the product brief: deterministic-first composition, clinical-boundary safety, scope/intent resolution, contract-grounded blocks, fallback templates, telemetry, and a gated LLM overlay with rollout + KPI controls.
- Already mounted in both detailed-report pages (`.js` and `.renderable.jsx`) via `ParentCopilotShell`.
- Has 25+ existing test suites covering classifier edges, scope collisions, paraphrases, observability contracts, async LLM gating, validator behavior, and Hebrew robustness.
- Rebuilding would duplicate guardrail logic and telemetry contracts already covered by passing suites.

Treatment going forward:

- The Q&A subsystem is the Parent Copilot in [`utils/parent-copilot/`](../../utils/parent-copilot).
- The summary insight is the Parent AI explainer in [`utils/parent-report-ai/`](../../utils/parent-report-ai) + validator in [`lib/parent-report-ai/`](../../lib/parent-report-ai).
- In Phase B both surfaces should derive from the same `TruthPacketV1` projection so wording cannot drift between them.

---

## 4. Power Map — what currently powers each surface

### 4.1 Short parent report

- Page: [`pages/learning/parent-report.js`](../../pages/learning/parent-report.js).
- Report builder: `generateParentReportV2` from [`utils/parent-report-v2.js`](../../utils/parent-report-v2.js).
- Detailed payload also fetched (for short contract preview): `generateDetailedParentReport` from [`utils/detailed-parent-report.js`](../../utils/detailed-parent-report.js).
- AI summary insight: `enrichParentReportWithParentAi` from [`utils/parent-report-ai/parent-report-ai-adapter.js`](../../utils/parent-report-ai/parent-report-ai-adapter.js); rendered as `report.parentAiExplanation.text` under the heading "תובנה להורה".
  - Imports: [`pages/learning/parent-report.js`](../../pages/learning/parent-report.js) line 8.
  - Invocation: `pages/learning/parent-report.js` line 819 (inside an effect guarding `"parentAiExplanation" in report`).
  - Render: `pages/learning/parent-report.js` lines 1659–1662.
- Short contract preview: [`components/parent-report-short-contract-preview.jsx`](../../components/parent-report-short-contract-preview.jsx) using `shortContractTop` from the detailed payload.
- Hebrew sanitization layer: [`utils/parent-report-ui-explain-he.js`](../../utils/parent-report-ui-explain-he.js), [`utils/parent-report-language/`](../../utils/parent-report-language).
- Disclaimer: [`components/ParentReportImportantDisclaimer.js`](../../components/ParentReportImportantDisclaimer.js).
- **No `ParentCopilotShell` mounted on this page.**

### 4.2 Detailed parent report

- Pages: [`pages/learning/parent-report-detailed.js`](../../pages/learning/parent-report-detailed.js) and [`pages/learning/parent-report-detailed.renderable.jsx`](../../pages/learning/parent-report-detailed.renderable.jsx).
- Report builder: `generateDetailedParentReport` from [`utils/detailed-parent-report.js`](../../utils/detailed-parent-report.js).
- Hebrew narrative letters: [`utils/detailed-report-parent-letter-he.js`](../../utils/detailed-report-parent-letter-he.js) (`buildSubjectParentLetter`, `buildTopicRecommendationNarrative`).
- Surface components: [`components/parent-report-detailed-surface.jsx`](../../components/parent-report-detailed-surface.jsx) (`Bullets`, `ExecutiveSummarySection`, `SubjectPhase3Insights`, `SubjectSummaryBlock`, `TopicRecommendationExplainStrip`).
- Contract UI blocks: [`components/parent-report-contract-ui-blocks.jsx`](../../components/parent-report-contract-ui-blocks.jsx) (`ParentTopContractSummaryBlock`, `ParentSubjectContractSummaryBlock`) — **only imported by `.js`**, not by `.renderable.jsx` (see §6).
- Parent Copilot Q&A: [`components/parent-copilot/parent-copilot-shell.jsx`](../../components/parent-copilot/parent-copilot-shell.jsx) mounted with `payload`.
  - `.js` line 26 import, line 1198 mount.
  - `.renderable.jsx` line 22 import, line 1083 mount.
- **No `parentAiExplanation` summary insight mounted on either detailed page.**

### 4.3 PDF / export

- Live PDF QA: [`scripts/qa-parent-pdf-export.mjs`](../../scripts/qa-parent-pdf-export.mjs) — Playwright/Chromium driven; seeds localStorage; calls `page.pdf` with A4 + `printBackground` + `preferCSSPageSize`.
- Release gate: [`scripts/learning-simulator/run-pdf-export-gate.mjs`](../../scripts/learning-simulator/run-pdf-export-gate.mjs).
- Existing report-side PDF utility: `exportReportToPDF` from [`utils/math-report-generator.js`](../../utils/math-report-generator.js) (used in the short report page).
- Existing PDF QA artifacts under [`qa-visual-output/`](../../qa-visual-output) and [`reports/parent-report-learning-simulations/pdf/`](../../reports/parent-report-learning-simulations/pdf).
- **PDF currently includes neither the Parent AI summary insight nor the Q&A panel.** Phase C target is to include the summary insight only; Q&A stays out of PDF by policy.

### 4.4 Parent AI summary insight

- Producer: [`utils/parent-report-ai/parent-report-ai-explainer.js`](../../utils/parent-report-ai/parent-report-ai-explainer.js) (deterministic + optional LLM via `OPENAI_API_KEY` and `PARENT_REPORT_AI_EXPLAINER_*`).
- Adapter: [`utils/parent-report-ai/parent-report-ai-adapter.js`](../../utils/parent-report-ai/parent-report-ai-adapter.js).
- Validator: [`lib/parent-report-ai/parent-report-ai-validate.js`](../../lib/parent-report-ai/parent-report-ai-validate.js).
- Mounted only in short report today (see §4.1).

### 4.5 Parent Copilot / Q&A

- Engine: [`utils/parent-copilot/index.js`](../../utils/parent-copilot/index.js); see §2 for module map.
- Shell + panel + quick actions in [`components/parent-copilot/`](../../components/parent-copilot).
- Mounted only in detailed report today (both `.js` and `.renderable.jsx`).
- Rollout/KPI gates: [`docs/PARENT_COPILOT_ROLLOUT.md`](../PARENT_COPILOT_ROLLOUT.md).

### 4.6 Parent narrative safety guard

- Single-line summary text guard: [`lib/parent-report-ai/parent-report-ai-validate.js`](../../lib/parent-report-ai/parent-report-ai-validate.js) (`validateParentReportAIText`, `parentReportAiInputToNarrativeEngineSnapshot`).
- Q&A guardrails: [`utils/parent-copilot/guardrail-validator.js`](../../utils/parent-copilot/guardrail-validator.js) (`validateAnswerDraft`, `validateParentCopilotResponseV1`, `FORBIDDEN_PARENT_SURFACE_TOKENS`, clinical regex sets).
- Output normalization: [`utils/parent-report-language/parent-facing-normalize-he.js`](../../utils/parent-report-language/parent-facing-normalize-he.js).
- Static parent disclaimer: [`components/ParentReportImportantDisclaimer.js`](../../components/ParentReportImportantDisclaimer.js).

### 4.7 Diagnostic engine

- Canonical v2: [`utils/diagnostic-engine-v2/`](../../utils/diagnostic-engine-v2) — `index.js`, `run-diagnostic-engine-v2.js`, taxonomy registry + per-subject taxonomy files (`taxonomy-math.js`, `taxonomy-hebrew.js`, `taxonomy-english.js`, `taxonomy-science.js`, `taxonomy-geometry.js`, `taxonomy-moledet.js`), `topic-taxonomy-bridge.js`, `confidence-policy.js`, `priority-policy.js`, `recurrence.js`, `competing-hypotheses.js`, `probe-layer.js`, `intervention-layer.js`, `output-gating.js`, `strength-profile.js`, `human-boundaries.js`.
- Fast path: [`utils/fast-diagnostic-engine/`](../../utils/fast-diagnostic-engine).
- Professional enrichers: [`utils/learning-diagnostics/`](../../utils/learning-diagnostics) (mastery, reliability, cross-subject, misconception, probe, dependency, calibration, framework v1, professional engine output v1, question skill metadata v1).
- Wired by [`utils/parent-report-v2.js`](../../utils/parent-report-v2.js) (calls `runDiagnosticEngineV2` and the professional enrichers).
- Treat as **leave-alone** correctness core. Parent AI consumes outputs via the report payload only.

### 4.8 Adaptive planner

- Core (deterministic): [`utils/adaptive-learning-planner/adaptive-planner.js`](../../utils/adaptive-learning-planner/adaptive-planner.js), `adaptive-planner-rules.js`, `adaptive-planner-input-adapter.js`, `adaptive-planner-runtime-bridge.js`, `adaptive-planner-metadata-context.js`, `adaptive-planner-contract.js`, `diagnostic-unit-skill-alignment.js`, `adaptive-planner-summary.js`, `adaptive-planner-fixtures.js`, `adaptive-planner-preview-pack.js`, `adaptive-planner-artifact-runner.js`.
- Student-facing AI explainer (FROZEN; see §8): [`utils/adaptive-learning-planner/adaptive-planner-ai-explainer.js`](../../utils/adaptive-learning-planner/adaptive-planner-ai-explainer.js).
- Student API: [`pages/api/learning/planner-recommendation.js`](../../pages/api/learning/planner-recommendation.js) — emits the deterministic recommendation; the optional `explanation` payload (lines ~146–178) is the student-facing AI explainer attachment and is part of the freeze.
- Student client transport: [`lib/learning-client/scheduleAdaptivePlannerRecommendation.js`](../../lib/learning-client/scheduleAdaptivePlannerRecommendation.js), [`lib/learning-client/learningActivityClient.js`](../../lib/learning-client/learningActivityClient.js).
- Student client view-model: [`lib/learning-client/adaptive-planner-recommendation-view-model.js`](../../lib/learning-client/adaptive-planner-recommendation-view-model.js), [`lib/learning-client/adaptive-planner-recommended-practice.js`](../../lib/learning-client/adaptive-planner-recommended-practice.js), [`lib/learning-client/adaptive-planner-explanation-validate.js`](../../lib/learning-client/adaptive-planner-explanation-validate.js).
- Student UI block: [`components/LearningPlannerRecommendationBlock.js`](../../components/LearningPlannerRecommendationBlock.js).
- Student master pages wiring planner + explainer block: [`pages/learning/hebrew-master.js`](../../pages/learning/hebrew-master.js), [`math-master.js`](../../pages/learning/math-master.js), [`english-master.js`](../../pages/learning/english-master.js), [`geometry-master.js`](../../pages/learning/geometry-master.js), [`science-master.js`](../../pages/learning/science-master.js), [`moledet-geography-master.js`](../../pages/learning/moledet-geography-master.js).
- Treat planner deterministic core as **leave-alone**. Treat student-facing AI explainer (the `explanation` branch + the matching block + view-model gating) as **frozen** (see §8).

### 4.9 Question metadata / banks

- Subject allowlist: math, geometry, hebrew, english, science, `moledet_geography` (defined in [`lib/learning-supabase/learning-activity.js`](../../lib/learning-supabase/learning-activity.js)).
- Banks/generators:
  - Science: [`data/science-questions.js`](../../data/science-questions.js), [`data/science-questions-phase3.js`](../../data/science-questions-phase3.js).
  - English: [`data/english-questions/`](../../data/english-questions).
  - Hebrew: [`data/hebrew-questions/`](../../data/hebrew-questions), [`utils/hebrew-question-generator.js`](../../utils/hebrew-question-generator.js), [`utils/hebrew-rich-question-bank.js`](../../utils/hebrew-rich-question-bank.js).
  - Geography / moledet: [`data/geography-questions/`](../../data/geography-questions), [`utils/moledet-geography-question-generator.js`](../../utils/moledet-geography-question-generator.js).
  - Math: [`utils/math-question-generator.js`](../../utils/math-question-generator.js).
  - Geometry: [`utils/geometry-question-generator.js`](../../utils/geometry-question-generator.js), [`utils/geometry-conceptual-bank.js`](../../utils/geometry-conceptual-bank.js).
- Metadata QA layer: [`utils/question-metadata-qa/`](../../utils/question-metadata-qa) (per-subject taxonomies, scanner, enrichment suggestions, gates).
- Curriculum / topic spine: [`data/curriculum-spine/v1/skills.json`](../../data/curriculum-spine/v1/skills.json), `data/*-curriculum.js`, `data/hebrew-g*-content-map.js`.
- Runtime skill tagging: [`utils/learning-diagnostics/question-skill-metadata-v1.js`](../../utils/learning-diagnostics/question-skill-metadata-v1.js).
- Planner metadata index snapshot: [`reports/adaptive-learning-planner/metadata-index-snapshot.json`](../../reports/adaptive-learning-planner/metadata-index-snapshot.json) (loaded by the planner API).
- Schema doc: [`docs/UNIFIED_QUESTION_SCHEMA.md`](../UNIFIED_QUESTION_SCHEMA.md).
- Treat all of the above as **leave-alone**. Parent AI must read summarized projections only and never write back.

### 4.10 Student history / Supabase report data

- Supabase tables (used by API routes): `learning_sessions`, `answers`, `students`, `student_access_codes`.
- Student APIs: [`pages/api/student/login.js`](../../pages/api/student/login.js), [`logout.js`](../../pages/api/student/logout.js), [`me.js`](../../pages/api/student/me.js), [`dev-add-coins.js`](../../pages/api/student/dev-add-coins.js).
- Learning APIs: [`pages/api/learning/session/start.js`](../../pages/api/learning/session/start.js), [`finish.js`](../../pages/api/learning/session/finish.js), [`answer.js`](../../pages/api/learning/answer.js).
- Parent rollup API: [`pages/api/parent/students/[studentId]/report-data.js`](../../pages/api/parent/students/%5BstudentId%5D/report-data.js).
- Adapter from Supabase rollup to parent-report input: [`lib/learning-supabase/report-data-adapter.js`](../../lib/learning-supabase/report-data-adapter.js) (`buildReportInputFromDbData`).
- Auth helpers: [`lib/learning-supabase/student-auth.js`](../../lib/learning-supabase/student-auth.js); body normalizers: [`lib/learning-supabase/learning-activity.js`](../../lib/learning-supabase/learning-activity.js).
- Learning Supabase env verification: `npm run verify:learning-supabase-env` (no dedicated health API route).
- Parent management APIs: [`pages/api/parent/create-student.js`](../../pages/api/parent/create-student.js), [`create-student-access-code.js`](../../pages/api/parent/create-student-access-code.js), [`list-students.js`](../../pages/api/parent/list-students.js), [`update-student.js`](../../pages/api/parent/update-student.js).
- Treat as **leave-alone** plumbing. Phase D may add a new parent-side API route for the copilot turn (separate file), but no semantics change to the existing routes.

---

## 5. Where short report and detailed report are currently asymmetric

| Surface | Summary insight (`parentAiExplanation`) | Parent Copilot (`ParentCopilotShell`) | Contract UI blocks |
|---------|------------------------------------------|----------------------------------------|--------------------|
| Short report — [`pages/learning/parent-report.js`](../../pages/learning/parent-report.js) | Present (heading "תובנה להורה", lines 819 / 1659–1662) | **Absent** | `ParentReportShortContractPreview` only |
| Detailed report — [`pages/learning/parent-report-detailed.js`](../../pages/learning/parent-report-detailed.js) | **Absent** | Present (line 26 import / line 1198 mount) | Present (`ParentTopContractSummaryBlock`, `ParentSubjectContractSummaryBlock`) |
| Detailed renderable — [`pages/learning/parent-report-detailed.renderable.jsx`](../../pages/learning/parent-report-detailed.renderable.jsx) | **Absent** | Present (line 22 import / line 1083 mount) | **Absent** |

Implications for future phases:

- The brief's product goal that Parent AI "explains the child's report to the parent" is satisfied **only** in the short report today.
- The brief's product goal that Parent AI "answers parent questions about the child's learning state" is reachable **only** from the detailed report today.
- Parity is the Phase C (summary insight everywhere) and Phase D (Q&A everywhere, gated) target.

---

## 6. Drift between `parent-report-detailed.js` and `parent-report-detailed.renderable.jsx`

The two files are intended as twins. Today they have a real, substantive divergence that **does** matter for Phase C.

| Item | `.js` | `.renderable.jsx` |
|------|-------|--------------------|
| `import ParentCopilotShell` | line 26 | line 22 |
| `<ParentCopilotShell payload={payload} />` mount | line 1198 | line 1083 |
| `import { ParentTopContractSummaryBlock, ParentSubjectContractSummaryBlock } from "../../components/parent-report-contract-ui-blocks.jsx"` | line 22–23 (present) | **Absent** |
| Use of contract summary blocks in the rendered tree | Present | **Absent** |
| Other shared imports (`generateDetailedParentReport`, `buildSubjectParentLetter`, `buildTopicRecommendationNarrative`, `Bullets`, `ExecutiveSummarySection`, `SubjectPhase3Insights`, `SubjectSummaryBlock`, `TopicRecommendationExplainStrip`, `normalizeExecutiveSummary`, `PARENT_BULLETS_EMPTY_WITH_VOLUME_HE`, disclaimer, layout, viewport hook) | Present | Present |

Why this matters for Phase C (summary insight):

- If we add a `<ParentReportInsight />` only to `.js`, the renderable / SSR / PDF render pass that uses `.renderable.jsx` will not include the insight.
- If we add it to `.renderable.jsx` only, the live page will not include it.
- Phase C must add the insight to **both** files in the same change to avoid a new asymmetry on top of the current contract-blocks asymmetry.

Recommended Phase A guidance for future phases (no edits now):

- Treat the two files as a synchronized pair: any visible block added to one must be added to the other.
- Do not attempt to retrofit the contract UI blocks into `.renderable.jsx` as part of Phase C; that is out of scope. It is sufficient to document the pre-existing divergence and add the summary insight identically to both.

---

## 7. Reuse / Extend / Freeze / Leave-alone classification

Modules touching Parent AI surfaces, with the recommended treatment for Phases B–H. **No code changes in Phase A.**

| Module / file | Treatment |
|---------------|-----------|
| [`utils/parent-report-ai/parent-report-ai-explainer.js`](../../utils/parent-report-ai/parent-report-ai-explainer.js) | **Reuse**. Keep deterministic + optional LLM path. |
| [`utils/parent-report-ai/parent-report-ai-adapter.js`](../../utils/parent-report-ai/parent-report-ai-adapter.js) | **Extend** in Phase B–C: derive the strict input from a unified Truth Packet; add a `enrichDetailedParentReportWithParentAi` for the detailed payload shape. |
| [`lib/parent-report-ai/parent-report-ai-validate.js`](../../lib/parent-report-ai/parent-report-ai-validate.js) | **Reuse**. |
| [`scripts/parent-report-ai-scenario-simulator.mjs`](../../scripts/parent-report-ai-scenario-simulator.mjs) | **Extend** in Phase F: add detailed/PDF scenarios. |
| [`scripts/parent-report-ai-integration.mjs`](../../scripts/parent-report-ai-integration.mjs) | **Extend** in Phase F: add detailed adapter + co-mount sanity. |
| [`utils/parent-copilot/`](../../utils/parent-copilot) (all 27 files) | **Reuse** as-is. Internals are stable and covered by 25+ suites. |
| [`components/parent-copilot/parent-copilot-shell.jsx`](../../components/parent-copilot/parent-copilot-shell.jsx) and panel/quick-actions | **Reuse** as-is. May be mounted on additional pages in Phase D (gated). |
| [`utils/contracts/parent-product-contract-v1.js`](../../utils/contracts/parent-product-contract-v1.js), [`utils/contracts/parent-report-contracts-v1.js`](../../utils/contracts/parent-report-contracts-v1.js) | **Leave alone**. Source of truth for both surfaces. |
| [`PARENT_REPORT_PRODUCT_ORACLE.md`](../../PARENT_REPORT_PRODUCT_ORACLE.md) | **Leave alone**. Authoritative product contract. |
| [`utils/parent-report-diagnostic-restraint.js`](../../utils/parent-report-diagnostic-restraint.js), [`utils/parent-report-ui-explain-he.js`](../../utils/parent-report-ui-explain-he.js), [`utils/parent-report-root-cause.js`](../../utils/parent-report-root-cause.js) | **Reuse** upstream of AI; no changes planned. |
| [`utils/parent-report-language/`](../../utils/parent-report-language) | **Reuse**. |
| [`utils/parent-report-v2.js`](../../utils/parent-report-v2.js), [`utils/detailed-parent-report.js`](../../utils/detailed-parent-report.js), [`utils/topic-next-step-engine.js`](../../utils/topic-next-step-engine.js) | **Leave alone**. AI consumes their outputs. |
| Diagnostic engines: [`utils/diagnostic-engine-v2/`](../../utils/diagnostic-engine-v2), [`utils/fast-diagnostic-engine/`](../../utils/fast-diagnostic-engine), [`utils/learning-diagnostics/`](../../utils/learning-diagnostics) | **Leave alone**. |
| Adaptive planner deterministic core ([`utils/adaptive-learning-planner/adaptive-planner.js`](../../utils/adaptive-learning-planner/adaptive-planner.js), rules, input-adapter, runtime-bridge, metadata-context, contract, summary, fixtures, preview-pack, artifact-runner, diagnostic-unit-skill-alignment) | **Leave alone**. |
| Question banks (`data/`, generators in `utils/`) | **Leave alone**. AI never writes. |
| Curriculum spine + per-subject taxonomies + question-metadata-qa | **Leave alone**. AI never writes. |
| Supabase + parent rollup + student auth + learning APIs | **Leave alone**. (Phase D may add a new file `pages/api/parent/copilot-turn.js`; no semantics change to existing routes.) |
| PDF gates: [`scripts/qa-parent-pdf-export.mjs`](../../scripts/qa-parent-pdf-export.mjs), [`scripts/learning-simulator/run-pdf-export-gate.mjs`](../../scripts/learning-simulator/run-pdf-export-gate.mjs) | **Extend** in Phase C to assert the summary insight; do not add Q&A to PDF. |
| Pages: [`pages/learning/parent-report.js`](../../pages/learning/parent-report.js) | **Reuse** with future Phase D additive change (mount Q&A behind a flag). |
| Pages: [`pages/learning/parent-report-detailed.js`](../../pages/learning/parent-report-detailed.js) and [`pages/learning/parent-report-detailed.renderable.jsx`](../../pages/learning/parent-report-detailed.renderable.jsx) | **Extend** in Phase C with a single shared `<ParentReportInsight />` block placed identically in both files. |
| Student-facing AI explainer (see §8) | **Freeze**. |

---

## 8. Confirmed freeze list (student-facing AI)

Confirmed frozen — keep working, **do not develop further, do not delete, do not refactor, do not extend**.

- **Student-facing AI explainer module**  
  [`utils/adaptive-learning-planner/adaptive-planner-ai-explainer.js`](../../utils/adaptive-learning-planner/adaptive-planner-ai-explainer.js) (server-side OpenAI call + deterministic Hebrew fallback aimed at the student).

- **Planner explanation payload for students** (the `explanation` branch only)  
  [`pages/api/learning/planner-recommendation.js`](../../pages/api/learning/planner-recommendation.js), the conditional block where `isAdaptivePlannerAIExplainerServerEnabled(process.env)` is true and `buildAdaptivePlannerAIExplanation` is called and attached to the response (lines ~146–178). The rest of the file (deterministic recommendation) is shared infrastructure and stays.

- **Student AI explanation display + gating**  
  - [`components/LearningPlannerRecommendationBlock.js`](../../components/LearningPlannerRecommendationBlock.js)
  - [`lib/learning-client/adaptive-planner-recommendation-view-model.js`](../../lib/learning-client/adaptive-planner-recommendation-view-model.js) (the `explanationText` merge/display gating)
  - [`lib/learning-client/adaptive-planner-explanation-validate.js`](../../lib/learning-client/adaptive-planner-explanation-validate.js)

- **Student AI simulators / dev scripts**  
  - [`scripts/adaptive-planner-ai-explainer.mjs`](../../scripts/adaptive-planner-ai-explainer.mjs)
  - [`scripts/adaptive-planner-scenario-simulator.mjs`](../../scripts/adaptive-planner-scenario-simulator.mjs) (when run with `ADAPTIVE_PLANNER_SCENARIO_SIMULATOR_USE_AI` it exercises the same student explainer path)
  - The matching `package.json` entries `test:adaptive-planner:ai-explainer`, `test:adaptive-planner:scenario-simulator`.

- **No new AI surface inside `*-master.js` pages**  
  [`pages/learning/hebrew-master.js`](../../pages/learning/hebrew-master.js), [`math-master.js`](../../pages/learning/math-master.js), [`english-master.js`](../../pages/learning/english-master.js), [`geometry-master.js`](../../pages/learning/geometry-master.js), [`science-master.js`](../../pages/learning/science-master.js), [`moledet-geography-master.js`](../../pages/learning/moledet-geography-master.js) — current planner-explainer wiring stays as-is; **no new AI components, prompts, or chat surfaces** may be added here.

Out of scope for the freeze list (still student-side, but **not** the LLM explainer surface):

- Dev-only student simulator: [`pages/learning/dev-student-simulator.js`](../../pages/learning/dev-student-simulator.js), [`utils/dev-student-simulator/`](../../utils/dev-student-simulator), [`pages/api/dev-student-simulator/`](../../pages/api/dev-student-simulator). Internal tooling; no parent-AI overlap; no change planned.
- Static pedagogy (e.g., [`utils/hebrew-explainations.js`](../../utils/hebrew-explainations.js)): not AI-generated; not part of this freeze.

---

## 9. Decisions locked for next phases

- **Phase B (Unified Context Builder, not yet approved):** Both the summary insight and the Parent Copilot Q&A must derive from the same canonical `TruthPacketV1`. The adapter [`utils/parent-report-ai/parent-report-ai-adapter.js`](../../utils/parent-report-ai/parent-report-ai-adapter.js) will derive its strict input from that packet.
- **Phase C (Summary insight on detailed + PDF, not yet approved):** Add a single shared component for the summary insight; mount it identically in both detailed-report twins; extend [`scripts/qa-parent-pdf-export.mjs`](../../scripts/qa-parent-pdf-export.mjs) and [`scripts/learning-simulator/run-pdf-export-gate.mjs`](../../scripts/learning-simulator/run-pdf-export-gate.mjs) to assert presence and validator pass. PDF will not include interactive Q&A.
- **Phase D (Q&A on short report + server endpoint, not yet approved):** Mount `ParentCopilotShell` on the short report **behind a flag** (default off) and add a new `pages/api/parent/copilot-turn.js` that runs `runParentCopilotTurnAsync` server-side with the existing parent-auth check used by [`pages/api/parent/students/[studentId]/report-data.js`](../../pages/api/parent/students/%5BstudentId%5D/report-data.js).
- **Phase E (External-question handling, not yet approved):** Tier-1 deterministic topic classifier reading existing taxonomies (no taxonomy edits); Tier-2 generic concept fallback with explicit "no evidence about your child on this topic" prefix. Practice ideas labeled "תרגול כללי" written to a review queue under `reports/parent-ai/practice-suggestions/` only. No bank or taxonomy mutation.
- **Phase F (Simulator expansion, not yet approved):** Add `parent-ai-assistant-qa-simulator`, `parent-ai-external-question-simulator`, `parent-ai-bad-prompt-simulator`. Reuse existing `test:parent-copilot-*` and `test:parent-report-ai:*` suites; do not run the full learning-simulator orchestrator after each small change.
- **Phase G (Feedback loop, not yet approved):** New aggregator script `scripts/parent-ai-feedback-aggregate.mjs` over [`utils/parent-copilot/telemetry-store.js`](../../utils/parent-copilot/telemetry-store.js) producing human-review-only reports under `reports/parent-ai/feedback/` and `reports/parent-ai/improvement-suggestions/`. **Never auto-modifies banks, taxonomies, contracts, or rendered text.**
- **Phase H (Final QA, not yet approved):** Focused suites + build + PDF gate + new parent-AI simulators + the parent-copilot suites + one orchestrator pass — once, at the end.

---

## 10. Risks / notes for next phases

- **Twin-file drift** (§6) is the highest-impact issue we should not make worse. Phase C must touch `.js` and `.renderable.jsx` together.
- **Asymmetry trap**: today the only place a parent sees the summary insight is the short report; the only place they can ask follow-up questions is the detailed report. Until Phase D is shipped, parents who land on the short report cannot ask "why this recommendation?" without navigating away. Until Phase C is shipped, parents on the detailed report do not see the one-line "תובנה להורה" anywhere.
- **PDF and Q&A** are mutually incompatible: keep PDF deterministic and insight-only, as decided.
- **External questions (Phase E)** introduce the only new free-text classification surface in this plan; risk is highest there. Do not start it before Phases B–D are accepted.
- **Telemetry hygiene**: existing `appendTurnTelemetryTrace` records `utteranceLength`, not the utterance itself. The Phase G aggregator must preserve that property; no PII may land in `reports/parent-ai/**`.
- **No production mutations from AI**: the system must end the project with zero code paths through which the AI can edit banks, taxonomies, diagnostic decisions, or planner contracts. The existing freeze plus the Phase E review-queue design preserve this property.

---

## 11. Phase A sign-off

- Audit performed: yes.
- Files touched in product/runtime: zero.
- New files created in this phase: this document only (`docs/parent-ai/current-state.md`).
- Decision: Phase A complete. Awaiting explicit approval before Phase B.
