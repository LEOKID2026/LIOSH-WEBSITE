/**
 * PARENT ENGINE DECISION CONTRACT — registry of engine decisions covered by a
 * representative-fixture audit (NOT a verified full mapping of every runtime path).
 *
 * This file is the ONE place that connects, for the decisions listed below:
 *
 *   engine decision → evidence requirement → LPD state → templateId → allowed/forbidden
 *   claims → supported surfaces → fallback policy → owner-approval status → provenance
 *
 * SCOPE LIMIT (read before trusting any "0" metric derived from this file): every
 * entry here was checked against exactly ONE synthetic, hand-picked fixture per
 * decisionKey (see the consumers below). This is a scoped regression sanity-check
 * over representative fixtures, not a scan of live production data and not proof
 * that no other runtime decision exists outside this list. Do not describe results
 * derived from this file as a "full mapping" or as covering "all" parent-visible
 * outputs — state the actual fixture count instead.
 *
 * It does not compute decisions and does not render Hebrew copy. It only describes,
 * for each `decisionKey` that the real engine/renderer code (see `sourceFile`/
 * `sourceFunction` below) can actually produce, what is legal to say about it.
 *
 * Consumers:
 *  - tests/learning/parent-output-final-closure-contract.test.mjs (CI gates, fixture-scoped)
 *  - scripts/parent-output-final-closure/build-golden-book.mjs (fixture audit + report)
 *
 * Editing rules:
 *  - Every decisionKey a render function can emit at runtime MUST have an entry here
 *    (checked by the CI gate "unmapped decision" - but only for the sampled fixtures;
 *    see the "unmappedDecisions" metric note in build-golden-book.mjs for why this
 *    cannot be reported as a real "0" without a genuine runtime scan).
 *  - Every entry here MUST be reachable at runtime unless `status: "disabled"`
 *    (checked by the CI gate "unreachable active decision").
 *  - `allowedClaims` / `forbiddenClaims` are enforced by regex scans over the actual
 *    rendered Hebrew text produced by the functions named in `sourceFunction`.
 *  - `ownerApprovalStatus: "owner_approved"` must only be used for wording that
 *    existed, verbatim or as an already-approved template, before this fixture audit,
 *    OR for wording explicitly supplied by the product owner as approved copy in a
 *    later product decision (see `speed_pressure_pattern` and `mixed_subject_profile`
 *    below, both upgraded from `owner_copy_required` to `owner_approved` once their
 *    product-owner-approved sentence was wired to every relevant surface as the single
 *    source of that decisionKey's text - see each entry's `fallbackPolicy` for what was
 *    unified and where). Any OTHER decisionKey whose current rendered text was newly
 *    authored or newly routed and NOT confirmed against a pre-existing or explicitly
 *    approved template must be `"owner_copy_required"` instead.
 */

/** @typedef {"topic"|"subject"} DecisionScope */

/** Claim vocabulary — matched against real rendered Hebrew text. */
export const CLAIM_REGEX = Object.freeze({
  repeated_pattern: /דפוס\s*חוזר/u,
  stability: /יציבות|יציב(ה|ות)?\s*(טובה|יחסית)/u,
  mastery: /שליטה\s*(טובה|חלקית)?/u,
  knowledge_gap: /קושי\s*ברור|נקודת\s*(חיזוק|ידע)|פער/u,
  attention: /קשב/u,
  fatigue: /עייפות|מתעייף/u,
  pressure: /(תחת\s*לחץ|לחץ\s*זמן|קשור\S*\s*ל(מהירות|לחץ))/u,
  improvement: /השתפר|שיפור/u,
  needs_strengthening: /כדאי\s*(לחזק|חיזוק)|חיזוק\s*ממוקד/u,
  speed: /מהירות/u,
});

/** Forbidden combinations that must never co-occur in one rendered text. */
export const FORBIDDEN_COOCCURRENCE = Object.freeze([
  { a: "repeated_pattern", b: "insufficient_data_phrase", pattern_b: /עדיין\s*מוקדם|אין\s*מספיק\s*נתונים|מעט\s*מדי\s*נתונים/u },
]);

/**
 * @typedef {{
 *   decisionKey: string,
 *   scope: DecisionScope,
 *   description: string,
 *   evidenceRequirement: string,
 *   allowedClaims: string[],
 *   forbiddenClaims: string[],
 *   requiredTemplateIds: string[],
 *   supportedSurfaces: string[],
 *   fallbackPolicy: string,
 *   ownerApprovalStatus: "owner_approved"|"engineering_grammar_fix"|"owner_copy_required"|"not_applicable",
 *   provenance: string,
 *   sourceFile: string,
 *   sourceFunction: string,
 *   status: "active"|"disabled",
 * }} DecisionContractEntry
 */

export const PARENT_SURFACES = Object.freeze([
  "shortReport",
  "detailedReport",
  "lpdExplain",
  "subjectSummary",
  "parentLetter",
  "parentLetterCompact",
  "gradeAwareRecommendation",
]);

/**
 * Surfaces that this fixture audit (build-golden-book.mjs) does NOT independently
 * re-render through their own dedicated renderer function — it only checks the shared
 * source string (e.g. `engineDecisionContract.parentSafeFinding`) that these surfaces
 * are documented to reuse. A `supportedSurfaces` entry that includes one of these two
 * values is a statement of DESIGN INTENT from reading the source code, not a verified
 * "this surface was rendered and checked" claim. Any report generated from this
 * contract MUST mark these two surfaces as "not independently verified", never as
 * "passed".
 */
export const NOT_INDEPENDENTLY_VERIFIED_SURFACES = Object.freeze([
  "parentLetterCompact",
  "gradeAwareRecommendation",
]);

/** @type {DecisionContractEntry[]} */
export const PARENT_ENGINE_DECISION_CONTRACT_V2 = Object.freeze([
  // ---------------------------------------------------------------- TOPIC ENGINE DECISIONS
  {
    decisionKey: "clear_topic_gap",
    scope: "topic",
    description: "Clear, well-evidenced knowledge gap in one topic.",
    evidenceRequirement: "q>=5 and low accuracy (engine accuracy band = clear_gap) OR canonicalState.actionState in {intervene, probe_only-with-low-acc}.",
    allowedClaims: ["knowledge_gap", "needs_strengthening"],
    forbiddenClaims: ["mastery", "stability", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["clear_topic_gap"],
    supportedSurfaces: ["shortReport", "detailedReport", "lpdExplain", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "none - always has grounded parentSafeFinding when q>0",
    ownerApprovalStatus: "owner_approved",
    provenance: "engineDecisionContract.parentSafeFinding",
    sourceFile: "utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js",
    sourceFunction: "buildParentSafeFindingFromEngine",
    status: "active",
  },
  {
    decisionKey: "topic_needs_strengthening",
    scope: "topic",
    description: "Moderate difficulty in one topic - needs focused practice, not yet a clear gap.",
    evidenceRequirement: "engine accuracy band = needs_strengthening (moderate accuracy, adequate q).",
    allowedClaims: ["needs_strengthening"],
    forbiddenClaims: ["mastery", "stability", "attention", "fatigue", "pressure", "repeated_pattern"],
    requiredTemplateIds: ["topic_needs_strengthening"],
    supportedSurfaces: ["shortReport", "detailedReport", "lpdExplain", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "none",
    ownerApprovalStatus: "owner_approved",
    provenance: "engineDecisionContract.parentSafeFinding",
    sourceFile: "utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js",
    sourceFunction: "buildParentSafeFindingFromEngine",
    status: "active",
  },
  {
    decisionKey: "speed_pressure_pattern",
    scope: "topic",
    description:
      "Set by buildEngineDiagnosticDecision's speed_only_no_gap guardrail when riskFlags.speedOnlyRisk===true, " +
      "modeKey==='speed' (literal string match; 'marathon' is NOT covered by this override even though it IS " +
      "covered by the speedOnlyRisk flag itself), and accuracyBand!=='clear_gap'. IMPORTANT - verified by " +
      "direct code inspection: there is NO comparison anywhere in this pipeline between the child's speed-mode " +
      "performance and their performance in a non-speed/regular mode on the same topic. speedOnlyRisk itself is " +
      "`behaviorType==='speed_pressure' || (mode is speed/marathon && acc>=55 && wrongRatio<0.32)` " +
      "(topic-next-step-phase2.js buildPhase2RiskFlags) - a same-session accuracy/wrong-ratio heuristic, not " +
      "evidence that the underlying knowledge is intact. The guardrail's own documented rule " +
      "('speed_only_no_gap': 'do not infer knowledge_gap') is a confidence-downgrade rule, not a positive " +
      "'proven speed-only' classification. If accuracyBand IS 'clear_gap' (very low accuracy), this guardrail " +
      "never fires and the topic resolves to clear_topic_gap instead - clear_topic_gap always wins when the " +
      "accuracy signal itself is that low, by construction of buildEngineDiagnosticDecision (not by a separate " +
      "override added in this fix).",
    evidenceRequirement: "computeAccuracyBand = needs_strengthening AND modeKey==='speed' (exact match) AND riskFlags.speedOnlyRisk=true (see buildEngineDiagnosticDecision + buildPhase2RiskFlags). No cross-mode comparison is performed.",
    allowedClaims: ["speed", "needs_strengthening"],
    forbiddenClaims: ["knowledge_gap", "mastery", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["speed_pressure_pattern"],
    supportedSurfaces: ["shortReport", "detailedReport", "subjectSummary"],
    fallbackPolicy:
      "FIXED (product decision applied): all parent-facing renderers for this decisionKey now call the ONE " +
      "canonical sentence builder, buildSpeedPressurePatternFindingHe (utils/learning-pattern-decision/" +
      "normalize-parent-practice-metrics.js) - (1) build-parent-report-engine-decision-contract.js's " +
      "buildParentSafeFindingFromEngine (topic parentSafeFinding, feeds shortReport/detailedReport/" +
      "subjectSummary), and (2) engine-decision-parent-copy-he.js's buildDiagnosticBodyByDecision (feeds " +
      "buildEngineDecisionParentTopicCopyHe - screen/PDF/insights). The same file's competitiveModeContextHe " +
      "addendum is now suppressed specifically when engineDecision==='speed_pressure_pattern' so the canonical " +
      "sentence is never doubled up with a second, differently-worded speed remark on the same surface. The " +
      "approved sentence never claims the problem IS speed and never claims a knowledge gap is proven or ruled " +
      "out - it only reports the wrong/question counts and recommends checking the topic untimed. The separate, " +
      "LPD-level competitiveBucketOnly sentence in build-parent-visible-finding.js is a DIFFERENT signal (not " +
      "keyed off this decisionKey) and is out of scope for this fix; it remains a documented, pre-existing, " +
      "independent gap. At the subject level, this decisionKey is now excluded from gaps.length entirely (see " +
      "build-subject-engine-decision-contract.js isActionableGapTopic/actionableCandidates) - it can never by " +
      "itself produce multiple_topic_gaps or focused_strengthening_needed, and is tracked separately via the " +
      "subject contract's speedCheckTopics field.",
    ownerApprovalStatus: "owner_approved",
    provenance:
      "engineDecisionContract.parentSafeFinding via buildSpeedPressurePatternFindingHe (single canonical source, " +
      "shared verbatim with engine-decision-parent-copy-he.js)",
    sourceFile: "utils/learning-pattern-decision/normalize-parent-practice-metrics.js",
    sourceFunction: "buildSpeedPressurePatternFindingHe",
    status: "active",
  },
  {
    decisionKey: "partial_stable",
    scope: "topic",
    description: "Decent, but not yet fully mastered, accuracy - partial stability.",
    evidenceRequirement: "engine accuracy band = partial_good, adequate q.",
    allowedClaims: ["needs_strengthening"],
    forbiddenClaims: ["mastery", "knowledge_gap", "attention", "fatigue", "pressure", "repeated_pattern"],
    requiredTemplateIds: ["partial_stable"],
    supportedSurfaces: ["shortReport", "detailedReport", "lpdExplain", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "none",
    ownerApprovalStatus: "owner_approved",
    provenance: "engineDecisionContract.parentSafeFinding",
    sourceFile: "utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js",
    sourceFunction: "buildParentSafeFindingFromEngine",
    status: "active",
  },
  {
    decisionKey: "mastery_stable",
    scope: "topic",
    description: "High, stable accuracy over adequate volume - mastery.",
    evidenceRequirement: "q>=10 and accuracy>=90 (or engine mastery band).",
    allowedClaims: ["mastery", "stability"],
    forbiddenClaims: ["knowledge_gap", "needs_strengthening", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["mastery_stable"],
    supportedSurfaces: ["shortReport", "detailedReport", "lpdExplain", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "none",
    ownerApprovalStatus: "owner_approved",
    provenance: "engineDecisionContract.parentSafeFinding",
    sourceFile: "utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js",
    sourceFunction: "buildParentSafeFindingFromEngine",
    status: "active",
  },
  {
    decisionKey: "early_direction_only",
    scope: "topic",
    description: "Some practice, but not enough to call a direction yet (more than initial_data, less than a full evidence threshold).",
    evidenceRequirement: "q between ~3 and the moderate-evidence threshold; no strong pattern detected.",
    allowedClaims: [],
    forbiddenClaims: ["mastery", "stability", "knowledge_gap", "repeated_pattern", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["early_direction_only"],
    supportedSurfaces: ["shortReport", "detailedReport", "lpdExplain", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "empty string when q>4 (no text is safer than a guess)",
    ownerApprovalStatus: "owner_approved",
    provenance: "engineDecisionContract.parentSafeFinding",
    sourceFile: "utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js",
    sourceFunction: "buildParentSafeFindingFromEngine",
    status: "active",
  },
  {
    decisionKey: "insufficient_data",
    scope: "topic",
    description: "Too little practice (q<=4, or engine explicitly withholds) to say anything about a pattern.",
    evidenceRequirement: "q<=4, or explicit engine withhold.",
    allowedClaims: [],
    forbiddenClaims: ["mastery", "stability", "knowledge_gap", "repeated_pattern", "needs_strengthening", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["insufficient_data", "initial_topic_data"],
    supportedSurfaces: ["shortReport", "detailedReport", "lpdExplain", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "explicit low-evidence sentence only; never a strengthening claim",
    ownerApprovalStatus: "owner_approved",
    provenance: "engineDecisionContract.parentSafeFinding / build-parent-visible-finding.js initial_topic_data",
    sourceFile: "utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js",
    sourceFunction: "buildParentSafeFindingFromEngine",
    status: "active",
  },

  // ---------------------------------------------------------------- LPD TOPIC STATUS (disambiguated)
  {
    decisionKey: "lpd_insufficient_no_pattern",
    scope: "topic",
    description:
      "LPD topicStatus='no_clear_pattern' with NO usable evidence of difficulty (templateId='no_clear_pattern'). " +
      "Genuinely 'not enough signal yet' - must map to insufficient_data/watch semantics, never to a strengthening claim.",
    evidenceRequirement: "topicStatus === 'no_clear_pattern' AND NOT(q>=5 AND wrong>=2 AND accuracy<70)",
    allowedClaims: [],
    forbiddenClaims: ["repeated_pattern", "needs_strengthening", "mastery", "stability", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["no_clear_pattern"],
    supportedSurfaces: ["detailedReport", "lpdExplain"],
    fallbackPolicy: "empty parentVisibleFinding (no_parent_text wording level) - silence is correct here",
    ownerApprovalStatus: "owner_approved",
    provenance: "learningPatternDecision.parentVisibleFinding / build-parent-visible-finding.js",
    sourceFile: "utils/learning-pattern-decision/build-parent-visible-finding.js",
    sourceFunction: "buildParentVisibleFinding",
    status: "active",
  },
  {
    decisionKey: "lpd_difficulty_no_specific_pattern",
    scope: "topic",
    description:
      "LPD topicStatus='no_clear_pattern' but WITH sufficient volume evidence of difficulty (q>=5, wrong>=2, " +
      "accuracy<70) and no single identifiable misconception (templateId='no_clear_pattern_difficulty_fallback'). " +
      "This is evidence-backed ('difficulty observed') and is a DISTINCT decisionKey from " +
      "lpd_insufficient_no_pattern precisely so the two are never conflated by a shared 'no_clear_pattern' label.",
    evidenceRequirement: "topicStatus === 'no_clear_pattern' AND q>=5 AND wrong>=2 AND accuracy<70",
    allowedClaims: ["needs_strengthening"],
    forbiddenClaims: ["repeated_pattern", "mastery", "stability", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["no_clear_pattern_difficulty_fallback"],
    supportedSurfaces: ["detailedReport", "lpdExplain"],
    fallbackPolicy: "none - always renders the grounded 'כמה/הרבה טעויות' + strengthening sentence",
    ownerApprovalStatus: "owner_approved",
    provenance: "learningPatternDecision.parentVisibleFinding / build-parent-visible-finding.js",
    sourceFile: "utils/learning-pattern-decision/build-parent-visible-finding.js",
    sourceFunction: "buildParentVisibleFinding",
    status: "active",
  },
  {
    decisionKey: "lpd_mixed",
    scope: "topic",
    description: "Both a positive-dominance signal and a repeated-mistake signal detected in the same topic window.",
    evidenceRequirement: "hasPositiveDominance && hasRepeated && wrong>=1 (resolveTopicFinding hasMixed branch).",
    allowedClaims: ["needs_strengthening"],
    forbiddenClaims: ["mastery", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["mixed"],
    supportedSurfaces: ["detailedReport", "lpdExplain"],
    fallbackPolicy: "none",
    ownerApprovalStatus: "owner_approved",
    provenance: "learningPatternDecision.parentVisibleFinding",
    sourceFile: "utils/learning-pattern-decision/build-parent-visible-finding.js",
    sourceFunction: "buildParentVisibleFinding",
    status: "active",
  },
  {
    decisionKey: "lpd_difficulty_repeated",
    scope: "topic",
    description: "A specific, named, repeated mistake pattern with enough evidence to state it as such.",
    evidenceRequirement: "topicStatus==='difficulty_repeated' AND canUseRepeatedWording AND a usable, non-blocked pattern label.",
    allowedClaims: ["repeated_pattern", "needs_strengthening"],
    forbiddenClaims: ["mastery", "stability", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["difficulty_repeated", "difficulty_repeated_generic"],
    supportedSurfaces: ["detailedReport", "lpdExplain", "shortReport"],
    fallbackPolicy: "falls to difficulty_observed template if the label is blocked/unusable (never asserts 'דפוס חוזר' with no real label)",
    ownerApprovalStatus: "owner_approved",
    provenance: "learningPatternDecision.parentVisibleFinding",
    sourceFile: "utils/learning-pattern-decision/build-parent-visible-finding.js",
    sourceFunction: "buildParentVisibleFinding",
    status: "active",
  },

  // ---------------------------------------------------------------- SUBJECT-LEVEL DECISIONS
  {
    decisionKey: "multiple_topic_gaps",
    scope: "subject",
    description: "Two or more actionable-gap topics in this subject.",
    evidenceRequirement: "priorityTopics filtered by isActionableGapTopic has length>=2.",
    allowedClaims: ["knowledge_gap", "needs_strengthening"],
    forbiddenClaims: ["mastery", "stability"],
    requiredTemplateIds: ["SUBJECT_OPENING_PRIORITY_TOPIC_0", "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_0", "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_1"],
    supportedSurfaces: ["shortReport", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "falls back to priorityTopics[0].parentSafeFinding if owner template returns empty",
    ownerApprovalStatus: "owner_approved",
    provenance: "subjectEngineDecisionContract.subjectDecision",
    sourceFile: "utils/learning-pattern-decision/build-subject-engine-decision-contract.js",
    sourceFunction: "deriveSubjectDecision",
    status: "active",
  },
  {
    decisionKey: "focused_strengthening_needed",
    scope: "subject",
    description: "Exactly one actionable-gap topic in this subject.",
    evidenceRequirement: "priorityTopics filtered by isActionableGapTopic has length===1.",
    allowedClaims: ["knowledge_gap", "needs_strengthening"],
    forbiddenClaims: ["mastery", "stability"],
    requiredTemplateIds: ["SUBJECT_OPENING_PRIORITY_TOPIC_0"],
    supportedSurfaces: ["shortReport", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "falls back to priorityTopics[0].parentSafeFinding if owner template returns empty",
    ownerApprovalStatus: "owner_approved",
    provenance: "subjectEngineDecisionContract.subjectDecision",
    sourceFile: "utils/learning-pattern-decision/build-subject-engine-decision-contract.js",
    sourceFunction: "deriveSubjectDecision",
    status: "active",
  },
  {
    decisionKey: "mixed_subject_profile",
    scope: "subject",
    description:
      "Exactly ONE actionable-gap topic AND at least one stable topic in the same subject - a genuinely " +
      "distinct, more informative state than 'all gaps' (multiple_topic_gaps, gaps.length>=2) or 'all stable' " +
      "(subject_strength_stable, gaps.length===0) alone. Two or more gap topics are ALWAYS multiple_topic_gaps, " +
      "even when stable topics also exist - mixed_subject_profile never applies to more than one gap.",
    evidenceRequirement: "gaps.length===1 AND stable.length>=1 (exact match - see deriveSubjectDecision).",
    allowedClaims: ["knowledge_gap", "needs_strengthening"],
    forbiddenClaims: ["mastery"],
    requiredTemplateIds: ["SUBJECT_OPENING_PRIORITY_TOPIC_0"],
    supportedSurfaces: ["shortReport", "subjectSummary"],
    fallbackPolicy:
      "FIXED (product decision applied): deriveSubjectDecision() now routes strictly by exact gaps/stable counts " +
      "- gaps.length===1 && stable.length>=1 => mixed_subject_profile; gaps.length>=2 => multiple_topic_gaps " +
      "(regardless of stable.length); gaps.length===1 && stable.length===0 => focused_strengthening_needed; " +
      "gaps.length===0 && stable.length>=1 => subject_strength_stable. renderSubjectOpeningPriorityTopic0 now " +
      "has a DEDICATED mixed_subject_profile branch using the product-owner-approved singular sentence ('ב" +
      "{subjectName} נראית יציבות בחלק מהנושאים, ולצדה נושא אחד שכדאי לחזק. מומלץ להתחיל ב" +
      "{priorityTopicName}.') instead of reusing the multiple_topic_gaps plural sentence - the plural " +
      "'בולטים כמה נושאים' wording is no longer reachable for this decisionKey because gaps.length is always " +
      "exactly 1 when this decision is chosen. Corrected on follow-up review from an earlier approved draft " +
      "('...יש נושאים שבהם נראית יציבות טובה...') that was itself imprecise when stable.length===1 (a single " +
      "stable topic is not 'נושאים', plural) - the sentence never counts stable topics, so the wording must not " +
      "imply plurality of the stable side either.",
    ownerApprovalStatus: "owner_approved",
    provenance:
      "subjectEngineDecisionContract.subjectDecision (decision routing) + " +
      "parent-report-owner-copy-templates-he.js renderSubjectOpeningPriorityTopic0 (dedicated singular-topic " +
      "sentence, product-owner-approved)",
    sourceFile: "utils/learning-pattern-decision/build-subject-engine-decision-contract.js",
    sourceFunction: "deriveSubjectDecision",
    status: "active",
  },
  {
    decisionKey: "subject_strength_stable",
    scope: "subject",
    description: "No actionable gaps; at least one stable topic.",
    evidenceRequirement: "gaps.length===0 AND stable.length>=1.",
    allowedClaims: ["mastery", "stability"],
    forbiddenClaims: ["knowledge_gap", "needs_strengthening"],
    requiredTemplateIds: ["SUBJECT_CLOSING_ENGINE_CONTRACT"],
    supportedSurfaces: ["shortReport", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "resolveSubjectSummaryTextFromEngineContract returns null when blockedLegacySummary is false - legacy short-report copy takes over",
    ownerApprovalStatus: "owner_approved",
    provenance: "subjectEngineDecisionContract.subjectDecision",
    sourceFile: "utils/learning-pattern-decision/build-subject-engine-decision-contract.js",
    sourceFunction: "deriveSubjectDecision",
    status: "active",
  },
  {
    decisionKey: "speed_check_only_subject",
    scope: "subject",
    description:
      "No actionable-gap topic and no stable topic in this subject - the ONLY thing to report is one or more " +
      "topics flagged purely by the speed_pressure_pattern guardrail (mistakes occurred during fast/timed " +
      "practice; accuracyBand was not clear_gap). This is deliberately NOT the same bucket as " +
      "insufficient_subject_data: there IS real, sufficient practice data on a real topic - it is just not " +
      "evidence of a knowledge gap. Before this decision existed, this exact state (0 gaps, 0 stable, >=1 " +
      "speedCheckTopics) fell through to insufficient_subject_data, and legacy (engine-unaware) subject-summary " +
      "/ parent-letter fallback paths (e.g. findClearWeakTopicInSubject, which only checks accuracy/volume) " +
      "then overrode that with 'נראית נקודת חיזוק ברורה' (a CLEAR, definite knowledge-gap claim) - the exact " +
      "opposite of what speed_pressure_pattern is allowed to claim at the topic level.",
    evidenceRequirement: "gaps.length===0 AND stable.length===0 AND speedCheckTopics.length>=1 (exact match - see deriveSubjectDecision).",
    allowedClaims: ["speed"],
    forbiddenClaims: ["knowledge_gap", "needs_strengthening", "mastery", "stability", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["SUBJECT_OPENING_PRIORITY_TOPIC_0"],
    supportedSurfaces: ["shortReport", "detailedReport", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy:
      "blockedLegacySummary is now also set true for this decisionKey when the priority speed topic has " +
      "evidenceStrength>=supported OR questions>=20 (same threshold already used for actionable-gap topics) - " +
      "this blocks ALL FOUR parent-letter line builders (opening/diagnosis/home/closing) from falling through " +
      "to the legacy, engine-unaware heuristics. renderSubjectOpeningPriorityTopic0 has a dedicated " +
      "speed_check_only_subject branch using a new dedicated slot (prioritySpeedTopic0, built from the subject " +
      "contract's new prioritySpeedTopic field - the single highest-priority speedCheckTopics entry by the " +
      "existing sortPriorityTopics order, never plural 'נושא אחד' wording). Diagnosis/home/closing all render " +
      "empty for this decisionKey (no owner template registered for them) rather than any legacy text - " +
      "buildSubjectHomeLineHe now has the same 'return \"\" when blockedLegacySummary and no owner template' " +
      "guard already used by buildSubjectDiagnosisLineHe/buildSubjectClosingLineHe, closing a gap where it was " +
      "previously missing.",
    ownerApprovalStatus: "owner_approved",
    provenance:
      "subjectEngineDecisionContract.subjectDecision (decision routing) + " +
      "parent-report-owner-copy-templates-he.js renderSubjectOpeningPriorityTopic0 (dedicated sentence, " +
      "product-owner-approved)",
    sourceFile: "utils/learning-pattern-decision/build-subject-engine-decision-contract.js",
    sourceFunction: "deriveSubjectDecision",
    status: "active",
  },
  {
    decisionKey: "insufficient_subject_data",
    scope: "subject",
    description: "No topics with usable evidence in this subject yet.",
    evidenceRequirement:
      "allTopics.length===0 OR (gaps.length===0 AND stable.length===0 AND speedCheckTopics.length===0) - the " +
      "speedCheckTopics.length>=1 case is now routed to speed_check_only_subject instead (see that entry).",
    allowedClaims: [],
    forbiddenClaims: ["knowledge_gap", "needs_strengthening", "mastery", "stability"],
    requiredTemplateIds: ["insufficient_data_withhold"],
    supportedSurfaces: ["shortReport", "subjectSummary", "parentLetter", "parentLetterCompact"],
    fallbackPolicy: "resolveSubjectSummaryTextFromEngineContract returns null (blockedLegacySummary is always false here) - legacy withhold copy takes over",
    ownerApprovalStatus: "owner_approved",
    provenance: "subjectEngineDecisionContract.subjectDecision",
    sourceFile: "utils/learning-pattern-decision/build-subject-engine-decision-contract.js",
    sourceFunction: "deriveSubjectDecision",
    status: "active",
  },

  // ---------------------------------------------------------------- NARRATIVE WORDING ENVELOPES (WE0-WE4)
  {
    decisionKey: "narrative_we0",
    scope: "topic",
    description: "Cannot conclude yet / insufficient readiness or confidence - most cautious envelope.",
    evidenceRequirement: "cannotConcludeYet OR readiness==='insufficient' OR confidenceBand==='low' (below moderate-evidence threshold).",
    allowedClaims: [],
    forbiddenClaims: ["mastery", "stability", "knowledge_gap", "repeated_pattern", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["NARRATIVE_WE0_snapshot", "NARRATIVE_WE0_cautionLineHe"],
    supportedSurfaces: ["detailedReport", "parentLetter"],
    fallbackPolicy: "mandatory hedge required by validateNarrativeContractV1",
    ownerApprovalStatus: "owner_approved",
    provenance: "narrativeContract.textSlots (WE0)",
    sourceFile: "utils/contracts/narrative-contract-v1.js",
    sourceFunction: "buildNarrativeContractV1",
    status: "active",
  },
  {
    decisionKey: "narrative_we1",
    scope: "topic",
    description: "Early signal only - first direction forming, still needs more practice.",
    evidenceRequirement: "readiness==='forming' or decisionTier<=1, or moderate-volume band with low accuracy.",
    allowedClaims: ["needs_strengthening"],
    forbiddenClaims: ["mastery", "stability", "repeated_pattern", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["NARRATIVE_WE1_snapshot", "NARRATIVE_WE1_cautionLineHe"],
    supportedSurfaces: ["detailedReport", "parentLetter"],
    fallbackPolicy: "mandatory hedge required",
    ownerApprovalStatus: "owner_approved",
    provenance: "narrativeContract.textSlots (WE1)",
    sourceFile: "utils/contracts/narrative-contract-v1.js",
    sourceFunction: "buildNarrativeContractV1",
    status: "active",
  },
  {
    decisionKey: "narrative_we2",
    scope: "topic",
    description: "Reasonable working direction; wants to see it repeat before calling it stable.",
    evidenceRequirement: "decisionTier<=2 or confidenceBand==='medium', accuracy in the mid band.",
    allowedClaims: ["needs_strengthening"],
    forbiddenClaims: ["mastery", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["NARRATIVE_WE2_snapshot", "NARRATIVE_WE2_cautionLineHe"],
    supportedSurfaces: ["detailedReport", "parentLetter"],
    fallbackPolicy: "light hedge",
    ownerApprovalStatus: "owner_approved",
    provenance: "narrativeContract.textSlots (WE2)",
    sourceFile: "utils/contracts/narrative-contract-v1.js",
    sourceFunction: "buildNarrativeContractV1",
    status: "active",
  },
  {
    decisionKey: "narrative_we3",
    scope: "topic",
    description: "Direction looks stable across the period; keep up routine practice.",
    evidenceRequirement: "confidenceBand==='high' AND decisionTier>=2 AND accuracy>=70 (moderate/high volume band).",
    allowedClaims: ["stability"],
    forbiddenClaims: ["mastery", "attention", "fatigue", "pressure"],
    requiredTemplateIds: ["NARRATIVE_WE3_snapshot"],
    supportedSurfaces: ["detailedReport", "parentLetter"],
    fallbackPolicy: "light hedge",
    ownerApprovalStatus: "owner_approved",
    provenance: "narrativeContract.textSlots (WE3)",
    sourceFile: "utils/contracts/narrative-contract-v1.js",
    sourceFunction: "buildNarrativeContractV1",
    status: "active",
  },
  {
    decisionKey: "narrative_we4",
    scope: "topic",
    description: "Highest-confidence stable/mastery envelope - eligible for a graduated recommendation step.",
    evidenceRequirement: "eligible && readiness==='ready' && confidenceBand==='high' && accuracy>=78 (high volume) or equivalent moderate-volume gate.",
    allowedClaims: ["stability", "mastery"],
    forbiddenClaims: ["attention", "fatigue", "pressure", "knowledge_gap"],
    requiredTemplateIds: ["NARRATIVE_WE4_snapshot"],
    supportedSurfaces: ["detailedReport", "parentLetter"],
    fallbackPolicy:
      "FIXED (this closure): buildInterpretationSlot's WE4 branch previously included two variants that " +
      "asserted attention/fatigue/pressure ('קשב', 'עייפות', 'לחץ') with zero corresponding evidence input " +
      "anywhere in the narrative contract (no attention/fatigue/pressure signal is computed above). Removed " +
      "both; kept only the variant whose claim (stability over time) matches the actual evidence gate.",
    ownerApprovalStatus: "engineering_grammar_fix",
    provenance: "narrativeContract.textSlots (WE4)",
    sourceFile: "utils/contracts/narrative-contract-v1.js",
    sourceFunction: "buildNarrativeContractV1",
    status: "active",
  },
]);

/** @param {string} decisionKey */
export function findDecisionContractEntry(decisionKey) {
  const key = String(decisionKey || "").trim();
  return PARENT_ENGINE_DECISION_CONTRACT_V2.find((e) => e.decisionKey === key) || null;
}

export function activeDecisionKeys() {
  return PARENT_ENGINE_DECISION_CONTRACT_V2.filter((e) => e.status === "active").map((e) => e.decisionKey);
}

/**
 * Scan a rendered Hebrew string for claims and flag any claim not in `allowedClaims`
 * for the given decisionKey. Returns [] when clean.
 * @param {string} decisionKey
 * @param {string} text
 */
export function findUnsupportedClaims(decisionKey, text) {
  const entry = findDecisionContractEntry(decisionKey);
  const t = String(text || "");
  if (!entry || !t) return [];
  const violations = [];
  for (const claim of entry.forbiddenClaims) {
    const re = CLAIM_REGEX[claim];
    if (re && re.test(t)) violations.push(claim);
  }
  return violations;
}

/**
 * @param {string} text
 * @returns {boolean} true if text asserts BOTH a repeated pattern and an insufficient-data hedge.
 */
export function hasRepeatedVsInsufficientContradiction(text) {
  const t = String(text || "");
  if (!CLAIM_REGEX.repeated_pattern.test(t)) return false;
  return FORBIDDEN_COOCCURRENCE[0].pattern_b.test(t);
}

/** Hebrew grammar guard: catches "<digit> שאלות/שגיאות/שגויות/תשובות" where digit===1. */
export const HEBREW_SINGULAR_VIOLATION_RE = /\b1\s*(שאלות|שגיאות|שגויות|תשובות\s*נכונות|תשובות\s*שגויות|נושאים)\b/u;

/** Technical/English identifiers that must never leak into parent-visible text. */
export const TECHNICAL_LEAK_RE =
  /\b(clear_topic_gap|topic_needs_strengthening|partial_stable|mastery_stable|early_direction_only|insufficient_data|speed_pressure_pattern|no_clear_pattern|mixed_subject_profile|multiple_topic_gaps|engineDecision|templateId|WE[0-4]|safeSubskill|taxonomyId|fallback)\b/;
