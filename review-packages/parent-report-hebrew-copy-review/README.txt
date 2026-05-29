Parent Report Hebrew Copy Pass — Review Package
Generated: 2026-05-29 08:13

SCOPE: Parent-facing Hebrew copy only (24 modified + 1 new file).
EXCLUDED: docs/teacher-live-classroom/* (unrelated working-tree change)

Files in package:
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

Untracked new file:
  - scripts/parent-report-hebrew-copy-guard.mjs

Wording review note:
  Prefer "בתקופה שנבחרה" or fuller parent sentences over bare "בתקופה".
  Example to review in detailed-report-parent-letter-he.js and similar:
    "עדיין אין מספיק שאלות בתקופה כדי לסכם מגמה אמינה."
  -> consider "בתקופה שנבחרה עדיין אין מספיק שאלות כדי לראות אם יש מגמה ברורה."

Confirmations (intended scope):
  - No engine logic / thresholds / scoring / calculations changed
  - No DB / API / auth / routes / data model changed
  - No teacher/school reports changed
  - No live-classroom/audio plan files in this package
