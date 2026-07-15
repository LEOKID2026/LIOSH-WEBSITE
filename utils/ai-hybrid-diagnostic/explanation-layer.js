import { stableJsonHash } from "./stable-json-hash.js";
import { NUMERIC_GATES } from "./constants.js";
import { validateExplanationOutput } from "./explanation-validator.js";

/**
 * @param {object} p
 * @param {object} p.snapshot v2AuthoritySnapshot
 * @param {object} p.ranking
 * @param {object} p.probeIntel
 * @param {object} p.gate
 */
export function buildHybridExplanations({ snapshot, ranking, probeIntel, gate, canonicalState }) {
  const taxonomyId = snapshot?.taxonomyId || snapshot?.diagnosis?.taxonomyId || "";
  const conf = String(snapshot?.confidence?.level || "");
  const g = snapshot?.outputGating || {};
  const cannot = !!g.cannotConcludeYet || !!canonicalState?.assessment?.cannotConcludeYet;
  const ambiguity = Number(ranking?.ambiguityScore);

  const canonicalFamily = canonicalState?.recommendation?.family;
  const canonicalUncertainty = canonicalState?.narrativeConstraints?.uncertaintyRequired;
  const requireUncertainty =
    canonicalUncertainty === true ||
    (Number.isFinite(ambiguity) && ambiguity >= NUMERIC_GATES.ambiguityUncertaintyLineThreshold) ||
    conf !== "high" ||
    cannot;

  const isProbeOnly = canonicalFamily === "probe_only" || canonicalFamily === "withhold";

  const evidenceRefs = [
    taxonomyId ? `taxonomy:${taxonomyId}` : "evidence:volume",
    "evidence:gating",
    ...(probeIntel?.suggestedProbeId ? [`evidence:probe:${probeIntel.suggestedProbeId}`] : []),
  ];

  const bundle = {
    snapshotHash: snapshot?.snapshotHash,
    rankingTop1: ranking?.top1Id || null,
    ambiguityScore: ranking?.ambiguityScore ?? null,
    probeId: probeIntel?.suggestedProbeId || null,
  };
  const inputBundleId = stableJsonHash(bundle);

  function templateParent() {
    if (cannot) {
      return "לפי מה שנאסף עד עכשיו, עדיין אין מספיק בסיס לקבוע כיוון ברור בנושא הזה.";
    }
    const base = taxonomyId
      ? `זוהה דפוס לימודי פעיל (${taxonomyId}) בהתאם לנתוני התרגול בטווח התאריכים. `
      : "לפי נתוני התרגול בטווח הזה, יש תמונת מצב ראשונית. ";
    const tail =
      gate.mode === "rank_only"
        ? "מידת הוודאות בינונית - כדאי לקרוא את ההסבר יחד עם המורה לפני החלטות."
        : "ניתן להשתמש בהמלצות הבדיקה כדי לצמצם אי ודאות.";
    return base + tail;
  }

  function templateTeacher() {
    if (cannot) {
      return "שער פלט: cannot-conclude. אין להסיק אבחנה חדה; להשתמש ב probe ובמעקב חוזר לפי מדיניות V2.";
    }
    return `V2 authority: taxonomy=${taxonomyId || "none"}, confidence=${conf}, mode=${gate.mode}, ambiguity=${(ambiguity ?? "").toString()}, suggestedProbe=${probeIntel?.suggestedProbeId || "none"}.`;
  }

  let textParent = templateParent();
  let textTeacher = templateTeacher();
  let outputStatus = /** @type {"ok"|"fallback"|"failed"} */ ("ok");
  let failureReason = "";

  if (isProbeOnly && !cannot && textParent.includes("דפוס לימודי פעיל")) {
    textParent =
      "לפי מה שנאסף עד עכשיו, עדיין אין מספיק בסיס לקבוע כיוון ברור בנושא הזה.";
    outputStatus = "fallback";
    failureReason = "probe_only_framed_as_success";
  }

  let validator = validateExplanationOutput({ text: textParent, requireUncertainty, evidenceRefs });
  if (!validator.overallPass) {
    textParent =
      "לפי מה שנאסף עד עכשיו, עדיין אין מספיק בסיס לקבוע כיוון ברור בנושא הזה.";
    outputStatus = "fallback";
    failureReason = validator.reasonCodes.join(";");
    validator = validateExplanationOutput({
      text: textParent,
      requireUncertainty: true,
      evidenceRefs: ["evidence:gating", "taxonomy:none"],
    });
  }

  const uncertaintyLine = requireUncertainty
    ? "מידת הוודאות: ייתכנו פרשנויות שונות - יש לשלב שיקול דעת מבוגר."
    : "מידת הוודאות גבוהה יחסית לפי שערי המערכת לטווח זה.";

  return {
    inputBundleId,
    explanationContract: {
      inputBundleId,
      outputStatus,
      validatorPass: validator.overallPass,
      failureReason,
    },
    parent: {
      audience: "parent",
      text: textParent,
      uncertaintyLine,
      evidenceRefs,
      boundaryCheck: validator.boundaryPass,
      hallucinationCheck: validator.evidenceLinkPass,
      status: outputStatus,
    },
    teacher: {
      audience: "teacher",
      text: textTeacher,
      uncertaintyLine,
      evidenceRefs,
      boundaryCheck: validator.boundaryPass,
      hallucinationCheck: validator.evidenceLinkPass,
      status: outputStatus,
    },
    validator,
  };
}
