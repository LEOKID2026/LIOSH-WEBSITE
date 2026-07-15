/**
 * Phase 7 — שכבת שורש סיבה סבירה לשורת נושא (v1).
 */

import { ROOT_CAUSE_LABEL_HE } from "./parent-report-ui-explain-he.js";

/**
 * @param {object} p
 * @param {ReturnType<import("./parent-report-diagnostic-restraint.js").computeDiagnosticRestraint>} p.restraint
 * @param {Record<string, unknown>} p.riskFlags
 * @param {Record<string, unknown>} p.trendDer
 * @param {Record<string, unknown>|null|undefined} p.behaviorProfile
 * @param {number} p.q
 * @param {number} p.accuracy
 * @param {number} p.wrongRatio
 * @param {string} p.behaviorType
 */
export function estimateRowRootCause(p) {
  const row = p.row || {};
  const { restraint, riskFlags, trendDer, behaviorProfile, q, accuracy, wrongRatio, behaviorType } = p;
  const level = restraint?.diagnosticRestraint?.level || "confirmed";

  /** @type {string[]} */
  const evidence = [];

  if (level === "insufficient" || restraint?.conclusionStrength === "withheld") {
    return {
      rootCause: "insufficient_evidence",
      rootCauseLabelHe: ROOT_CAUSE_LABEL_HE.insufficient_evidence,
      rootCauseConfidence: 0.25,
      rootCauseEvidence: ["נפח או איכות ראיות לא מאפשרים נעילה על מקור הקושי."],
      secondaryPossibleCause: null,
      rootCauseNarrativeHe:
        "עדיין אין בסיס מספיק כדי לומר במדויק מה מקור הקושי - עדיף תרגול קצר ומדיד לפני מסקנות.",
    };
  }

  const acc = Math.round(Number(accuracy) || 0);
  const wr = Number(wrongRatio) || 0;
  const modeKey = String(row?.modeKey || "").trim();

  /** @type {string|null} */
  let secondary = null;

  if (behaviorType === "careless_pattern") {
    evidence.push("פרופיל דומיננטי - דפוס רשלנות");
    if (riskFlags.speedOnlyRisk) secondary = "speed_pressure";
    return finalize("careless_execution", 0.66, evidence, secondary, acc, wr, q, trendDer, behaviorType);
  }

  if (behaviorType === "fragile_success" && (trendDer.fragileProgressPattern || riskFlags.hintDependenceRisk)) {
    evidence.push("הצלחה עם תלות או מגמה שבירה");
    return finalize("weak_independence", 0.63, evidence, "instruction_friction", acc, wr, q, trendDer, behaviorType);
  }

  if (behaviorType === "knowledge_gap" && riskFlags.strongKnowledgeGapEvidence && acc < 62 && q >= 10) {
    evidence.push("פער ידע עם דיוק נמוך ונפח טעויות תומך");
    return finalize("knowledge_gap", 0.74, evidence, secondary, acc, wr, q, trendDer, behaviorType);
  }

  if (riskFlags.speedOnlyRisk && behaviorType !== "speed_pressure") {
    evidence.push("דגל מהירות/מסלול ללא פער דיוק חמור");
    return finalize("speed_pressure", 0.72, evidence, secondary, acc, wr, q, trendDer, behaviorType);
  }

  if (behaviorType === "instruction_friction" || riskFlags.hintDependenceRisk) {
    evidence.push("תלות ברמזים או חיכוך הוראה");
    if (riskFlags.speedOnlyRisk) secondary = "speed_pressure";
    return finalize("instruction_friction", 0.68, evidence, secondary, acc, wr, q, trendDer, behaviorType);
  }

  if (behaviorType === "speed_pressure" || (modeKey === "speed" || modeKey === "marathon") && acc >= 52 && wr < 0.35) {
    evidence.push("מצב תרגול מהיר/מרתון עם דיוק בינוני ומעלה");
    return finalize("speed_pressure", 0.7, evidence, secondary, acc, wr, q, trendDer, behaviorType);
  }

  if (
    acc >= 68 &&
    wr > 0.12 &&
    wr < 0.35 &&
    q >= 10 &&
    behaviorType !== "fragile_success" &&
    behaviorType !== "knowledge_gap" &&
    behaviorType !== "instruction_friction"
  ) {
    evidence.push("טעויות «רשלניות» יחסית לרמת שליטה");
    return finalize("careless_execution", 0.62, evidence, secondary, acc, wr, q, trendDer, behaviorType);
  }

  if (
    trendDer.independenceDeteriorating &&
    (trendDer.positiveAccuracy || acc >= 75) &&
    (riskFlags.hintDependenceRisk || behaviorType === "fragile_success")
  ) {
    evidence.push("עצמאות יורדת לצד דיוק גבוה יחסית");
    return finalize("weak_independence", 0.65, evidence, "instruction_friction", acc, wr, q, trendDer, behaviorType);
  }

  if (q < 12 || restraint?.conclusionStrength === "tentative") {
    evidence.push("שלב מוקדם או ראיות בינוניות");
    return finalize("early_stage_instability", 0.55, evidence, null, acc, wr, q, trendDer, behaviorType);
  }

  if (restraint?.diagnosticRestraint?.level === "mixed") {
    evidence.push("אותות מנוגדים");
    return finalize(
      "mixed_signal",
      0.5,
      evidence,
      behaviorType !== "undetermined" ? behaviorType : null,
      acc,
      wr,
      q,
      trendDer,
      behaviorType
    );
  }

  if (behaviorType === "knowledge_gap") {
    evidence.push("פרופיל התנהגות מצביע על פער ידע");
    return finalize("knowledge_gap", 0.58, evidence, secondary, acc, wr, q, trendDer, behaviorType);
  }

  evidence.push("ללא נעילה ברורה - ברירת מחדל זהירה");
  return finalize("mixed_signal", 0.45, evidence, null, acc, wr, q, trendDer, behaviorType);
}

function finalize(
  rootCause,
  rootCauseConfidence,
  rootCauseEvidence,
  secondaryPossibleCause,
  acc,
  wr,
  q,
  trendDer,
  behaviorType
) {
  const label = ROOT_CAUSE_LABEL_HE[rootCause] || rootCause;
  const nar = buildNarrativeHe(rootCause, acc, wr, q, trendDer, behaviorType);
  return {
    rootCause,
    rootCauseLabelHe: label,
    rootCauseConfidence,
    rootCauseEvidence,
    secondaryPossibleCause,
    rootCauseNarrativeHe: nar,
  };
}

function buildNarrativeHe(rootCause, acc, wr, q, trendDer, behaviorType) {
  const parts = [];
  if (rootCause === "speed_pressure") {
    parts.push("נראה שהקושי נוגע בעיקר למסלול מהיר או לחץ זמן - לא בהכרח לחוסר הבנה עמוק.");
  } else if (rootCause === "instruction_friction") {
    parts.push("הדפוס תואם קריאת משימה ותלות ברמזים יותר מאשר לפער ידע מלא.");
  } else if (rootCause === "knowledge_gap") {
    parts.push("הנתונים תומכים בפער ידע ממוקד לצד דיוק נמוך יחסית בנפח סביר.");
  } else if (rootCause === "careless_execution") {
    parts.push("יש סימנים לרשלנות ביצוע לצד שליטה סבירה - כדאי לייצב דיוק לפני הורדת רמה.");
  } else if (rootCause === "weak_independence") {
    parts.push("העצמאות בפתרון נמוכה יחסית לעומת הדיוק - חשוב לבנות עצמאות לפני קפיצת רמה.");
  } else if (rootCause === "early_stage_instability") {
    parts.push("עדיין מוקדם בטווח - התמונה עלולה להתייצב אחרי עוד תרגול קצר ועקבי.");
  } else if (rootCause === "mixed_signal") {
    parts.push("כמה אותות מצביעים לכיוונים שונים - לא ננעלים על הסבר יחיד בשלב זה.");
  } else {
    parts.push("אין עדיין דיוק מספיק בנתונים כדי לתאר את מקור הקושי במילים חדות.");
  }
  parts.push(`(דיוק ${acc}%, טעויות יחסיות ${Math.round(wr * 100)}%, ${q} שאלות; פרופיל ${behaviorType})`);
  if (trendDer?.unclearTrend) parts.push("מגמת דיוק לא חדה - שומרים על ניסוח זהיר.");
  return parts.join(" ");
}
