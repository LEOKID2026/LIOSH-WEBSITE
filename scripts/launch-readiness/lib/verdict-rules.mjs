/**
 * Launch Readiness — verdict rules (pure logic, no I/O).
 *
 * Input shape (per layer):
 *   { status: "pass" | "warn" | "fail" | "not_run" | "unknown",
 *     source: "path/to/source/or/null",
 *     summary: "human Hebrew one-liner",
 *     blockers: [{...}],
 *     warnings: [{...}] }
 *
 * Output shape:
 *   { status: "READY" | "NOT READY" | "BLOCKED" | "PARTIAL",
 *     verdictReason: "Hebrew one-liner",
 *     blockers: [...], warnings: [...],
 *     recommendedNextAction: "Hebrew one-liner" }
 *
 * Verdict rules (matches docs/LAUNCH_READINESS_QA_MASTER_PLAN.md section 6):
 *   - BLOCKED   : any P0 blocker present
 *   - NOT READY : >=1 P0 blocker AND nightly is partial/fail
 *   - PARTIAL   : 0 P0, AND (>=1 P1 warning OR >=1 core layer is not_run)
 *   - READY     : 0 P0, <=3 P1, all 4 MVP core layers pass, nightly pass
 *
 * Core layers (must be pass for READY):
 *   nightly, coverage, parentReportTruth, dataIntegrity
 */

export const CORE_LAYERS = [
  "nightly",
  "coverage",
  "parentReportTruth",
  "dataIntegrity",
];

export const ALL_LAYERS = [
  "nightly",
  "coverage",
  "parentReportTruth",
  "dataIntegrity",
  "diagnosticGroundTruth",
  "similarQuestions",
  "recommendation",
  "copilotTruth",
  "mobile",
  "crossDevicePersistence",
  "failureRecovery",
  "pdfExport",
  "questionQuality",
];

/**
 * Aggregate per-layer blockers/warnings into a single verdict.
 *
 * @param {Object} params
 * @param {Object<string, {status,source,summary,blockers?,warnings?}>} params.layers
 * @param {{runKind?: "full"|"filtered"|"unknown", isFullNightlyRun?: boolean, filterReason?: string|null}} [params.runMeta]
 *   Optional top-level metadata about the nightly run that fed this gate.
 *   When the nightly was a filtered/manual subset run, the verdict refuses to
 *   reach READY even if all checks happen to pass, and the recommended next
 *   action explicitly tells the operator to use a full nightly artifact.
 * @returns {{status, verdictReason, blockers, warnings, recommendedNextAction}}
 */
export function computeVerdict({ layers, runMeta = null }) {
  const blockers = [];
  const warnings = [];

  for (const layerName of ALL_LAYERS) {
    const layer = layers[layerName] || { status: "not_run" };
    for (const b of layer.blockers || []) blockers.push({ ...b, layer: layerName });
    for (const w of layer.warnings || []) warnings.push({ ...w, layer: layerName });
  }

  const nightly = layers.nightly || { status: "not_run" };
  const nightlyPartialOrFail =
    nightly.status === "fail" || nightly.status === "warn";

  const corePassCount = CORE_LAYERS.filter(
    (k) => (layers[k] || {}).status === "pass"
  ).length;
  const coreNotRun = CORE_LAYERS.filter(
    (k) => (layers[k] || {}).status === "not_run"
  );

  // --- BLOCKED: any P0 blocker ---
  if (blockers.length > 0 && !nightlyPartialOrFail) {
    return {
      status: "BLOCKED",
      verdictReason: `נמצאו ${blockers.length} חוסמי P0 פתוחים — לא ניתן להעלות לפרודקשן.`,
      blockers,
      warnings,
      recommendedNextAction: `תקן את כל ה-P0 ברשימת blockers לפני הריצה הבאה. הראשון: ${
        blockers[0]?.detail || "(ראה רשימה)"
      }`,
    };
  }

  // --- NOT READY: P0 blocker(s) + nightly partial/fail ---
  if (blockers.length > 0 && nightlyPartialOrFail) {
    return {
      status: "NOT READY",
      verdictReason: `ה-nightly לא עבר במלואו (${nightly.status}) ויש ${blockers.length} חוסמי P0 — נדרש תיקון לפני מועד ההשקה.`,
      blockers,
      warnings,
      recommendedNextAction: `תקן את ה-P0 הראשון: ${
        blockers[0]?.detail || "(ראה רשימה)"
      } ולוודא שה-nightly הבא עובר במלואו.`,
    };
  }

  // --- READY: 0 P0, <=3 P1, all core pass, AND nightly was a full readiness run ---
  // E1.1: refuse READY when the nightly artifact came from a filtered/manual
  // subset run, even if everything in that subset happened to pass.
  const nightlyIsFull = runMeta ? runMeta.isFullNightlyRun === true : true;
  if (
    blockers.length === 0 &&
    warnings.length <= 3 &&
    corePassCount === CORE_LAYERS.length &&
    nightly.status === "pass" &&
    nightlyIsFull
  ) {
    return {
      status: "READY",
      verdictReason: `כל ${CORE_LAYERS.length} שכבות הליבה passed, 0 חוסמים, ${warnings.length} אזהרות מקובלות.`,
      blockers,
      warnings,
      recommendedNextAction:
        "ניתן להעלות לפרודקשן בהדרגה. ממליץ להמשיך nightly למשך 7 ימים רצופים לפני release ציבורי.",
    };
  }

  // --- PARTIAL: everything else ---
  const reasonParts = [];
  const filtered = runMeta && runMeta.runKind === "filtered";
  if (filtered) {
    reasonParts.push(
      `ריצת ה-nightly המקור היא ממוקדת/מסוננת (runKind=filtered) ולכן אינה readiness מלאה`
    );
  }
  if (coreNotRun.length > 0) {
    reasonParts.push(
      `${coreNotRun.length} שכבות ליבה עוד לא מחוברות (${coreNotRun.join(", ")})`
    );
  }
  if (warnings.length > 0) {
    reasonParts.push(`${warnings.length} אזהרות פתוחות`);
  }
  if (nightly.status === "not_run") {
    reasonParts.push("ריצת nightly חסרה לתאריך זה");
  }
  if (reasonParts.length === 0) {
    reasonParts.push("מצב ביניים — אין חוסמים אך עוד אין כיסוי מלא");
  }

  // Pick recommended next action: a filtered run takes priority because
  // without a full nightly artifact we literally cannot judge readiness.
  let recommendedNextAction;
  if (filtered) {
    recommendedNextAction =
      "הרץ ריצת nightly מלאה (כל 12 הפרסונות, ללא --students) ואז הרץ שוב את ה-gate. אסור להכריז על READY על בסיס ריצה ממוקדת.";
  } else if (coreNotRun.length > 0) {
    recommendedNextAction = `המשך ל-E${
      CORE_LAYERS.indexOf(coreNotRun[0]) + 1
    } כדי לחבר את שכבת ${coreNotRun[0]}.`;
  } else if (warnings.length > 0) {
    recommendedNextAction = `סקור את האזהרות וטפל ב-${
      warnings[0]?.detail || "הראשונה"
    } תחילה.`;
  } else {
    recommendedNextAction =
      "המשך לעקוב אחר ה-gate על ריצות nightly עוקבות.";
  }

  return {
    status: "PARTIAL",
    verdictReason: reasonParts.join("; ") + ".",
    blockers,
    warnings,
    recommendedNextAction,
  };
}

/**
 * Helper: classify a layer status from boolean signals.
 * Used by layer-specific aggregators in lib/aggregator.mjs.
 */
export function statusFromSignals({ hasBlocker, hasWarning, hasData }) {
  if (!hasData) return "not_run";
  if (hasBlocker) return "fail";
  if (hasWarning) return "warn";
  return "pass";
}
