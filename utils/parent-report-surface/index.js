export {
  PARENT_TOPIC_TIER,
  inferSurfaceEngineDecision,
  parentTopicTierFromUnit,
  parentTopicTierLabelHe,
  parentTopicTierSectionTitleHe,
  parentTopicTierPlacementKind,
  parentTopicTierShowsRecommendationCard,
  parentTopicTierUsesGuidanceSectionTitle,
  groupTopicRowsByParentTier,
} from "./parent-topic-tier.js";

export {
  sanitizeParentSurfaceTextHe,
  sanitizeParentSurfaceActionHe,
  isForbiddenParentSurfaceLabel,
  parentSubskillSurfaceLabelHe,
} from "./parent-surface-label-guard.js";

export {
  PARENT_SURFACE_ONCE_PHRASES,
  capAndDedupeParentSurfaceLines,
  parentSurfacePhraseAlreadyUsed,
  scrubRepeatedBoilerplateFromSnapshotHe,
} from "./parent-surface-dedupe.js";

export {
  buildParentSurfaceWhatToNoticeHe,
  buildParentSurfaceHomeActionsHe,
  resolveSubjectPrimaryParentActionHe,
  countSubjectsNeedingStrengthenFromUnits,
  parentFacingPatternSafeHe,
} from "./parent-surface-insights.js";
