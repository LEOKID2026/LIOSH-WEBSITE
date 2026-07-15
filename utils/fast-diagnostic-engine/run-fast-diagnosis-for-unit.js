/**
 * Fast Educational Diagnosis — deterministic hypotheses from small samples.
 */
import { normalizeParentFacingHe } from "../parent-report-language/index.js";
import { shortReportDiagnosticsParentVisibleHe } from "../parent-report-ui-explain-he.js";
import { inferNormalizedTags, isHighInformationMisconceptionTag } from "./infer-tags.js";
import { TAG_LABEL_HE, tagsSummaryHe } from "./parent-copy-he.js";
import { resolveProbeHintFromMap } from "./probe-map-he.js";

function safeNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function stripInternalTokensHe(s) {
  let t = String(s || "");
  t = t.replace(/\bP[1-4]\b/g, "");
  t = t.replace(/::/g, " ");
  t = t.replace(/\bdc:/gi, "");
  t = t.replace(/\bfd:[a-z0-9_:+-]+\b/gi, "");
  return normalizeParentFacingHe(shortReportDiagnosticsParentVisibleHe(t.replace(/\s{2,}/g, " ").trim()));
}

/**
 * @param {object} params
 * @param {Record<string, unknown>} params.unit — diagnosticEngineV2 unit
 * @param {import("../mistake-event.js").MistakeEventV1[]} params.events - filtered row events
 * @param {Record<string, unknown>} params.row
 */
export function runFastDiagnosisForUnit({ unit, events, row }) {
  const subjectId = String(unit?.subjectId || "");
  const topicId = String(unit?.bucketKey || "").trim();
  const topicName = String(unit?.displayName || topicId || "").trim() || "הנושא";
  const wrongs = Array.isArray(events) ? events.filter((e) => e && !e.isCorrect) : [];
  const w = wrongs.length;
  const q = safeNumber(row?.questions);
  const sampleSize = q > 0 ? q : Math.max(w, Array.isArray(events) ? events.length : 0);

  /** @type {Record<string, number>} */
  const tagHistogram = {};
  for (const ev of wrongs) {
    for (const tag of inferNormalizedTags(ev, subjectId)) {
      tagHistogram[tag] = (tagHistogram[tag] || 0) + 1;
    }
  }

  let dominantTag = null;
  let dominantCount = 0;
  for (const [t, c] of Object.entries(tagHistogram)) {
    if (c > dominantCount) {
      dominantCount = c;
      dominantTag = t;
    }
  }

  const distinctTags = Object.keys(tagHistogram).length;
  const highInfo = dominantTag ? isHighInformationMisconceptionTag(dominantTag) : false;
  const ratio = w > 0 && dominantTag ? dominantCount / w : 0;

  /** @type {"early_signal"|"working_hypothesis"|"stable_diagnosis"|"insufficient_signal"} */
  let diagnosisStage = "insufficient_signal";
  /** @type {"low"|"low_medium"|"medium"|"high"} */
  let confidence = "low";

  if (w === 0) {
    diagnosisStage = "insufficient_signal";
    confidence = q > 0 ? "low" : "low";
  } else if (!dominantTag && w <= 3) {
    diagnosisStage = "insufficient_signal";
    confidence = "low";
  } else if (w >= 1 && w <= 3) {
    diagnosisStage = "early_signal";
    confidence = highInfo ? "low_medium" : dominantTag ? "low_medium" : "low";
  } else if (w >= 4 && w <= 6) {
    if (dominantTag && dominantCount >= 2) {
      diagnosisStage = "working_hypothesis";
      confidence = "medium";
    } else {
      diagnosisStage = dominantTag ? "early_signal" : "insufficient_signal";
      confidence = dominantTag ? "low_medium" : "low";
    }
  } else if (w >= 7) {
    if (dominantTag && ratio >= 0.5 && distinctTags <= 3) {
      diagnosisStage = "stable_diagnosis";
      confidence = ratio >= 0.65 ? "high" : "medium";
    } else if (dominantTag && dominantCount >= 3) {
      diagnosisStage = "working_hypothesis";
      confidence = "medium";
    } else {
      diagnosisStage = "working_hypothesis";
      confidence = "low_medium";
    }
  }

  const suspectedErrorTags = Object.keys(tagHistogram).sort((a, b) => tagHistogram[b] - tagHistogram[a]).slice(0, 8);

  const hypothesisId = dominantTag
    ? `fd_${diagnosisStage}_${dominantTag}`
    : `fd_${diagnosisStage}_general`;

  const hypothesisHe = buildHypothesisHe({
    diagnosisStage,
    topicName,
    dominantTag,
    w,
    ratio,
    suspectedErrorTags,
  });

  const evidence = buildEvidenceLinesHe({
    topicName,
    w,
    q,
    dominantTag,
    dominantCount,
    suspectedErrorTags,
  });

  const nextProbe = buildNextProbe({
    diagnosisStage,
    topicName,
    dominantTag,
    subjectId,
    w,
    wrongs,
  });

  let parentSafeTextHe = buildParentSafeHe({
    diagnosisStage,
    topicName,
    hypothesisHe,
    w,
    q,
    suspectedErrorTags,
    nextProbe,
  });
  parentSafeTextHe = stripInternalTokensHe(parentSafeTextHe);

  return {
    topicId,
    topicName: stripInternalTokensHe(topicName),
    subjectId,
    sampleSize,
    diagnosisStage,
    hypothesisId,
    hypothesisHe: stripInternalTokensHe(hypothesisHe),
    confidence,
    evidence,
    suspectedErrorTags,
    nextProbe,
    parentSafeTextHe,
  };
}

function buildHypothesisHe({ diagnosisStage, topicName, dominantTag, w, ratio, suspectedErrorTags }) {
  const tagLab = dominantTag ? TAG_LABEL_HE[dominantTag] || "" : "";
  const summary = tagsSummaryHe(suspectedErrorTags);
  if (diagnosisStage === "stable_diagnosis") {
    return normalizeParentFacingHe(
      `ב${topicName} נראה דפוס עקבי (${w} טעויות בטווח; ריכוז דומה של סוג הקושי). ${tagLab ? `מוקד: ${tagLab}.` : summary ? `מוקדים אפשריים: ${summary}.` : ""}`
    );
  }
  if (diagnosisStage === "working_hypothesis") {
    return normalizeParentFacingHe(
      `השערה ראשונית ב${topicName}: חוזרות על אותו סוג טעות - כדאי לאמת בהמשך עם עוד דוגמאות. ${tagLab ? `מוקד: ${tagLab}.` : ""}`
    );
  }
  if (diagnosisStage === "early_signal") {
    return normalizeParentFacingHe(
      `סימן ראשוני ב${topicName}${tagLab ? ` - נראה קשר ל${tagLab}` : summary ? ` - ${summary}` : ""}. מדובר בתמונה מוקדמת בלבד.`
    );
  }
  return normalizeParentFacingHe(
    `עדיין לא ניתן לבחור דפוס יציב ב${topicName} - נמשיך לאסוף תצפיות ממוקדות.${w > 0 ? ` (${w} טעויות בטווח)` : ""}`
  );
}

function buildEvidenceLinesHe({ topicName, w, q, dominantTag, dominantCount, suspectedErrorTags }) {
  const lines = [];
  if (q > 0) {
    lines.push(normalizeParentFacingHe(`בטווח: ${q} שאלות בסך הכל בנושא ${topicName}.`));
  }
  if (w > 0) {
    lines.push(normalizeParentFacingHe(`נתפסו ${w} טעויות רלוונטיות לשורה.`));
  }
  if (dominantTag && dominantCount > 0) {
    const lab = TAG_LABEL_HE[dominantTag] || "";
    if (lab) {
      lines.push(normalizeParentFacingHe(`הכי בולט בטעויות: ${lab} (${dominantCount} מקרים).`));
    }
  }
  if (suspectedErrorTags.length > 1) {
    const rest = tagsSummaryHe(suspectedErrorTags.slice(1));
    if (rest) lines.push(normalizeParentFacingHe(`גם מופיע: ${rest}.`));
  }
  if (!lines.length) {
    lines.push(normalizeParentFacingHe(`אין עדיין מספיק אירועי טעות מסווגים ל${topicName}.`));
  }
  return lines.slice(0, 6);
}

/**
 * @param {import("../mistake-event.js").MistakeEventV1[]} wrongs
 */
function dominantDiagnosticSkillIdFromWrongs(wrongs) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const e of wrongs) {
    const id = e?.diagnosticSkillId && String(e.diagnosticSkillId).trim();
    if (!id) continue;
    counts[id] = (counts[id] || 0) + 1;
  }
  let best = null;
  let n = 0;
  for (const [k, c] of Object.entries(counts)) {
    if (c > n) {
      best = k;
      n = c;
    }
  }
  return best;
}

/**
 * @param {object} p
 * @param {import("../mistake-event.js").MistakeEventV1[]} [p.wrongs]
 */
function buildNextProbe({ diagnosisStage, topicName, dominantTag, subjectId, w, wrongs }) {
  const skillDefault = stripInternalTokensHe(topicName);
  const domSkill = dominantDiagnosticSkillIdFromWrongs(Array.isArray(wrongs) ? wrongs : []);
  const mapped = resolveProbeHintFromMap({
    dominantTag: dominantTag || "",
    dominantDiagnosticSkillId: domSkill,
  });

  const tagLab = dominantTag ? TAG_LABEL_HE[dominantTag] || "" : "";
  let reasonHe = normalizeParentFacingHe(
    `לבדוק האם ${tagLab || "אותו סוג קושי"} חוזר כשמורידים רמזים ומאריכים קצת את זמן העבודה.`
  );
  if (diagnosisStage === "insufficient_signal") {
    reasonHe = normalizeParentFacingHe(
      `להריץ 2–3 שאלות קצרות באותו מושג בלי רמז, כדי לראות אם הטעות חוזרת בצורה יציבה.`
    );
  }
  let suggestedQuestionType = "same_topic_short_set";
  if (subjectId === "math" && dominantTag && dominantTag.includes("denom")) {
    suggestedQuestionType = "fraction_visual_same_denominator";
  } else if (subjectId === "english") {
    suggestedQuestionType = "short_text_same_skill";
  }

  let skill = skillDefault;
  if (mapped) {
    skill = stripInternalTokensHe(mapped.skill);
    reasonHe = normalizeParentFacingHe(mapped.reasonHe);
    suggestedQuestionType = mapped.suggestedQuestionType;
  }

  const priority = diagnosisStage === "stable_diagnosis" ? 1 : diagnosisStage === "working_hypothesis" ? 2 : 3;

  return {
    skill,
    reasonHe: stripInternalTokensHe(reasonHe),
    suggestedQuestionType,
    priority,
  };
}

function buildParentSafeHe({ diagnosisStage, topicName, hypothesisHe, w, q, suspectedErrorTags, nextProbe }) {
  const stagePhrase =
    diagnosisStage === "early_signal"
      ? "זהו סימן ראשוני בלבד - לא כיוון סופי."
      : diagnosisStage === "working_hypothesis"
        ? "זוהי השערת עבודה - כדאי לאמת בתרגול המשך."
        : diagnosisStage === "stable_diagnosis"
          ? "הדפוס נראה יציב יחסית לטווח הזה - עדיין כדאי לעקוב גם בהמשך."
          : "עדיין חסר אות חזק מספיק; נמשיך לאסוף תצפיות.";

  const tags = tagsSummaryHe(suspectedErrorTags.slice(0, 2));
  const base = `${hypothesisHe} ${stagePhrase}`;
  const probe = nextProbe?.reasonHe ? ` הצעה להמשך: ${nextProbe.reasonHe}` : "";
  const counts = q > 0 || w > 0 ? ` (שאלות בטווח: ${q || "-"}, טעויות נספרות: ${w})` : "";
  return normalizeParentFacingHe(`${base}${tags ? ` נושאי מיקוד אפשריים: ${tags}.` : ""}${probe}${counts}`);
}
