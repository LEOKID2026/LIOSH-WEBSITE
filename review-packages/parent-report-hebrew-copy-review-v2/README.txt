Parent Report Hebrew Copy Pass — Review Package v2
Generated: 2026-05-29 08:29

SCOPE
  24 modified tracked files + 1 new guard script (25 source files).
  Excludes unrelated working-tree changes (see below).

FILES IN PACKAGE (24)
  - components/parent-report-detailed-surface.jsx
  - pages/learning/parent-report.js
  - pages/learning/parent-report-detailed.js
  - pages/learning/parent-report-detailed.renderable.jsx
  - scripts/parent-report-hebrew-language-selftest.mjs
  - scripts/parent-report-hebrew-copy-guard.mjs
  - utils/contracts/narrative-contract-v1.js
  - utils/detailed-parent-report.js
  - utils/detailed-report-parent-letter-he.js
  - utils/learning-patterns-analysis.js
  - utils/parent-data-presence.js
  - utils/parent-report-ai/parent-report-ai-explainer.js
  - utils/parent-report-language/confidence-parent-he.js
  - utils/parent-report-language/forbidden-terms.js
  - utils/parent-report-language/parent-facing-normalize-he.js
  - utils/parent-report-language/short-report-v2-copy.js
  - utils/parent-report-language/subject-evidence-policy.js
  - utils/parent-report-language/v2-parent-copy.js
  - utils/parent-report-output-integrity/zero-evidence-policy-tests.js
  - utils/parent-report-row-diagnostics.js
  - utils/parent-report-ui-explain-he.js
  - utils/parent-report-v2.js
  - utils/topic-next-step-engine.js
  - utils/topic-next-step-phase2.js

UNTRACKED (repo root)
  - scripts/parent-report-hebrew-copy-guard.mjs (new; included in package)
  - review-packages/parent-report-hebrew-copy-review/ (prior package folder)
  - review-packages/parent-report-hebrew-copy-review.zip (prior package)
  - review-packages/parent-report-hebrew-copy-review-v2/ (this folder)

UNRELATED MODIFIED IN WORKING TREE (NOT in this ZIP)
  - docs/teacher-live-classroom/TEACHER_CONTROLLED_LIVE_AUDIO_CLASSROOM_FULL_PLAN.md
    (~450 line diff; live-classroom/audio plan — out of Hebrew copy scope)

REVIEW NOTE — phrases flagged for 1:1 replacement before further implementation
  Current package still contains parent-unfriendly / internal wording examples such as:
    רצף תמיכה, זיכרון המלצה, תלות יסוד, יסוד מול מקומי, לא מדרגים, לא מסכמים
  Primary location to inspect: utils/learning-patterns-analysis.js empty-state narratives
  (subjectMemoryNarrativeHe, subjectSequenceNarrativeHe, subjectOutcomeNarrativeHe,
   subjectDependencyNarrativeHe, subjectFoundationFirstPriorityHe, etc.)

ARTIFACTS IN THIS FOLDER
  - parent-report-hebrew-copy.patch (full scoped diff)
  - git-diff-name-only.txt
  - git-diff-stat.txt
  - untracked-files.txt
  - README.txt (this file)
  - mirrored source files under components/, pages/, scripts/, utils/

NO COMMIT / NO PUSH / NO DEPLOY
