export { pickVariant } from "./variants.js";
export {
  FORBIDDEN_PARENT_REPORT_SUBSTRINGS,
  PARENT_READABILITY_LEAK_SUBSTRINGS,
  findForbiddenSubstringsInString,
  findReadabilityLeakSubstringsInString,
  scanValueForForbidden,
} from "./forbidden-terms.js";
export { confidenceLevelParentSummaryHe } from "./confidence-parent-he.js";
export { priorityLevelParentLabelHe } from "./priority-parent-he.js";
export {
  executiveV2HomeFocusHe,
  executiveV2MajorTrendsLinesHe,
  executiveV2MixedSignalNoticeHe,
  executiveV2OverallConfidenceHe,
  executiveV2EvidenceBalanceHe,
  executiveV2CautionNoteHe,
  executiveV2ReportReadinessHe,
  homePlanV2EmptyFallbackHe,
  nextPeriodGoalsV2EmptyFallbackHe,
  crossSubjectV2BulletsHe,
  crossSubjectV2DataQualityNoteHe,
  subjectV2TrendNarrativeHighPriorityHe,
  subjectV2TrendNarrativeStableHe,
  subjectV2RecalibrationNeedYesHe,
  subjectV2RecalibrationNeedNoHe,
  SUBJECT_V2_RECALIBRATION_NEED_NO_HE,
  topicRecommendationV2CautionGatedHe,
  subjectV2ConfidenceSummaryHe,
} from "./v2-parent-copy.js";
export { SUBJECT_PHASE3_ROW_LABEL_HE } from "./surface-row-labels-he.js";
export { diagnosticPrimarySourceParentLabelHe } from "./short-report-source-label-he.js";
export { normalizePedagogyForParentReportHe } from "./pedagogy-glossary-he.js";
export {
  normalizeParentFacingHe,
  normalizeExecutiveTrendLineHe,
  normalizeExecutiveTrendLinesHe,
  normalizeSubjectParentLetterHe,
  glossTopicRecommendationHeFields,
} from "./parent-facing-normalize-he.js";
export {
  formatParentReportLabelHe,
  formatParentReportSubjectHe,
  formatParentReportTopicHe,
  formatParentReportStatusHe,
  formatParentReportSourceHe,
  formatParentReportModeHe,
  formatParentReportActivitySourceHe,
  formatParentReportActivityDisplayLabelHe,
  formatParentReportEvidenceHe,
  formatParentReportLevelHe,
  formatParentReportGradeHe,
  findParentReportEnglishEnumLeaks,
  PARENT_REPORT_FORBIDDEN_ENGLISH_ENUMS,
  PARENT_REPORT_SUBJECT_LABELS_HE,
  PARENT_REPORT_MODE_LABELS_HE,
} from "./parent-report-display-labels.he.js";
export {
  insufficientSubjectQuestionsLineHe,
  tierStableStrengthHe,
  tierWeaknessRecurringHe,
  tierWeaknessSupportHe,
  evidenceExampleTitleFallbackHe,
  evidenceExampleBodyFallbackHe,
  v2SubjectMemoryPartialEvidenceHe,
  v2SubjectDiagnosticRestraintHe,
  v2ShortOverviewCannotConcludeHe,
} from "./short-report-v2-copy.js";
export {
  withholdSummaryCopyHe,
  withholdConfidenceSummaryFallbackHe,
  isGenericCautiousPracticeLineHe,
  GENERIC_CAUTIOUS_SUBJECT_LINE_HE,
  GENERIC_CAUTIOUS_TOPIC_LINE_HE,
  unitsSuggestInstability,
} from "./subject-withhold-summary-he.js";
export { GRADE_AWARE_RECOMMENDATION_TEMPLATES } from "./grade-aware-recommendation-templates.js";
export { resolveGradeAwareParentRecommendationHe } from "./grade-aware-recommendation-resolver.js";
export {
  taxonomyDiagnosticExplanationLookupKey,
  v2UnitTaxonomyId,
  resolveLookupKeyFromV2Unit,
  getParentDiagnosticExplanationEntry,
  resolveApprovedParentDiagnosticExplanationV1,
  buildParentDiagnosticExplanationV1FromV2Unit,
  parentDiagnosticExplanationCatalogForTests,
  mathTaxonomyExplanationIdsForTests,
  geometryTaxonomyExplanationIdsForTests,
  hebrewSubjectTaxonomyExplanationIdsForTests,
  englishSubjectTaxonomyExplanationIdsForTests,
  scienceSubjectTaxonomyExplanationIdsForTests,
  moledetGeographyTaxonomyExplanationIdsForTests,
} from "./parent-diagnostic-explanations-he.js";
export {
  M10_ENGINE_PATTERN_HE,
  M10_PARENT_PATTERN_LABELS,
  isM10ThinOrUnclearEvidence,
  parentFacingM10PatternLabelHe,
  parentFacingPatternLabelHe,
  parentFacingDiagnosisSnippetHe,
  findM10EnginePatternLeaksInValue,
  sanitizeDiagnosticEngineV2ForParentFacing,
} from "./parent-facing-pattern-label-he.js";
export {
  SUBJECT_VALID_MIN_QUESTIONS,
  SUBJECT_EVIDENCE_TIER,
  ZERO_EVIDENCE_FORBIDDEN_RE,
  classifySubjectEvidenceTier,
  zeroEvidenceSubjectLineHe,
  thinEvidenceSubjectLineHe,
  buildSubjectEvidenceCoverageLines,
  practicedSubjectsSummaryLineHe,
  notPracticedSubjectsSummaryLineHe,
  zeroEvidenceSubjectCopilotHe,
  textViolatesZeroEvidencePolicy,
  filterInsightLinesForUnpracticedSubjects,
} from "./subject-evidence-policy.js";
