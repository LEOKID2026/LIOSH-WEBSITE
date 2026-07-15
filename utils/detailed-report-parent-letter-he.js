/**
 * שכבת ניסוח להורה בלבד — דוח מקיף (תצוגה בלבד).
 * קצר, חד, בלי שכבות משנה — ללא שינוי שדות payload מהמנוע.
 */

import { pickVariant } from "./parent-report-language/variants.js";
import {
  normalizeParentFacingHe,
  normalizeSubjectParentLetterHe,
} from "./parent-report-language/parent-facing-normalize-he.js";
import { parentFacingWeaknessPracticePhraseHe } from "./diagnostic-labels-he.js";
import {
  buildNarrativeContractV1,
  narrativeSectionTextHe,
} from "./contracts/narrative-contract-v1.js";
import {
  findClearWeakTopicInSubject,
  isClearWeakSubjectVolume,
  subjectClearWeakClosingHe,
  subjectClearWeakOpeningHe,
} from "./learning-pattern-decision/subject-clear-weak-topic.js";
import {
  buildSubjectEngineSummaryOpeningHe,
  findStrongestEngineDecisionInSubject,
} from "./learning-pattern-decision/build-parent-report-engine-decision-contract.js";
import { findTopicRecommendationForPriority } from "./learning-pattern-decision/build-subject-engine-decision-contract.js";
import { resolveSubjectLetterOwnerCopyHe } from "./learning-pattern-decision/resolve-subject-owner-copy.js";
import { resolveNarrativeOwnerCopyHe } from "./learning-pattern-decision/resolve-topic-owner-copy.js";
import { SUBJECT_OWNER_COPY_TEMPLATE_IDS } from "./parent-report-language/parent-report-owner-copy-templates-he.js";
import {
  RENDER_SOURCE_SUBJECT_ENGINE,
  SP_SUBJECT_ENGINE_CONTRACT,
  readSubjectEngineContract,
} from "./learning-pattern-decision/engine-decision-codes.js";
import {
  gradeContextActionHe,
  gradeContextExplanationHe,
  gradeContextIsStrength,
  gradeContextNeedsSupport,
  suppressRegisteredGradeStrengthenCopy,
} from "./parent-report-language/grade-context-parent-he.js";

/** הסרת מירכאות צרפתיות / גוילמטים */
export function stripGuillemetsHe(s) {
  return String(s || "")
    .replace(/[\u00AB\u00BB«»]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTechnicalNoiseHe(text) {
  return String(text || "")
    .replace(/\(pf:[^)]*\)/gi, "")
    .replace(/\(k:[^)]*\)/gi, "")
    .replace(/\(to:[^)]*\)/gi, "")
    .replace(/\(st:[^)]*\)/gi, "")
    .replace(/\(ct:[^)]*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function displayTopicCoreHe(labelHe) {
  let t = stripGuillemetsHe(stripTechnicalNoiseHe(labelHe));
  t = t.replace(/^בנושא\s+/u, "").replace(/^הנושא\s+/u, "").trim();
  return t;
}

/**
 * ניסוח אחיד: "בנושא חיבור" או "בנושא של שטחים ויחידות שטח" (כשיש רווח בשם).
 */
export function displayTopicPhraseHe(labelHe) {
  const core = displayTopicCoreHe(labelHe);
  if (!core) return "";
  if (/\s/u.test(core)) return `בנושא של ${core}`;
  return `בנושא ${core}`;
}

/** תרגום והסרת ניסוח "הגדרות / משחק / כיתה" לשפה הורית ברורה */
export function rewriteParentRecommendationForDetailedHe(raw) {
  let s = stripGuillemetsHe(String(raw || ""));
  if (!s) return "";
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^על ([^,]+), (?:אחרי מה שנאסף בתקופה(?: שנבחרה)?|לפי התרגול שנאסף בתקופה שנבחרה):\s*/u, "ב$1: ");
  s = s.replace(/במשחק/g, "בתרגול");
  s = s.replace(/אם במשחק יש בחירת כיתה לפי נושא -/g, "אם ניתן להפריד רמת קושי לפי נושא -");
  s = s.replace(/אם אפשר לבחור כיתה נפרדת לפי נושא -/g, "אם ניתן להתאים רמת קושי נפרדת לפי נושא -");
  s = s.replace(
    /אם ניתן להתאים רמת קושי נפרדת לפי נושא - ב(.+?) כדאי כיתה אחת נמוכה יותר\. בשאר הנושאים לא חייבים לשנות\./u,
    "בנושא $1 מומלץ לנסות רמה או כיתה יותר נמוכה ואז להתקדם בהדרגה."
  );
  s = s.replace(
    /נשארים על אותה הגדרה ב(?:«|")?([^»"]+)(?:»|")?\s*\([^)]*\)/gu,
    "בנושא $1 מומלץ להמשיך כרגע באותה רמת קושי"
  );
  s = s.replace(/נשארים על אותה כיתה ורמה/g, "להמשיך באותה רמת קושי");
  s = s.replace(/לתת לילד/g, "לסייע לילד");
  s = s.replace(/ולבנות הצלחות קטנות/g, "ולבנות את הנושא בהדרגה עם הילד");
  s = s.replace(/נשארים על רמה [^ ו]+ ומתמקדים/g, "כדאי להישאר על אותה רמת קושי ולהתמקד");
  s = s.replace(/2–3 סשנים קצרים/g, "שני שלושה תרגולים קצרים");
  s = s.replace(/סשנים קצרים/g, "תרגולים קצרים");
  s = s.replace(/מפגשי תרגול קצרים/g, "תרגולים קצרים");
  s = s.replace(/מומלץ לעלות רמת קושי אחת רק בנושא הזה בתרגול/g, "מומלץ לעלות רמה רק בנושא הזה");
  s = s.replace(/מומלץ לעלות רמת קושי אחת רק בנושא הזה במשחק/g, "מומלץ לעלות רמה רק בנושא הזה בתרגול");
  s = s.replace(/מומלץ להקשות מעט רק בנושא הזה/g, "מומלץ לעלות רמה רק בנושא הזה");
  s = s.replace(/רק בנושא הזה במשחק/g, "רק בנושא הזה בתרגול");
  s = s.replace(
    /כדאי להתאמן עוד קצת ב(?:«|")?([^»"]+)(?:»|")? באותה רמה - ואז נחליט על צעד הבא\./gu,
    "מומלץ להמשיך בתרגול קצר בנושא $1 באותה רמת קושי, ולעכב שינוי עד שיש עקביות."
  );
  s = s.replace(/\s+/g, " ").trim();
  return stripGuillemetsHe(s);
}

function takeFirstSentence(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  const cut = t.split(/(?<=[.!?])\s+/)[0];
  return cut && cut.length <= 200 ? cut : t.slice(0, 160).trim() + (t.length > 160 ? "…" : "");
}

function dedupeRowsByLabel(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows || []) {
    const k = String(r?.labelHe || "").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function topicDataSparse(sp) {
  const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
  if (!recs.length) return false;
  return recs.every((t) => t?.isEarlySignalOnly);
}

function majorRiskAny(sp) {
  const r = sp?.majorRiskFlagsAcrossRows;
  if (!r || typeof r !== "object") return false;
  return Object.values(r).some(Boolean);
}

/** משפט פתיחה אחד */
function buildSubjectOpeningLineHe(sp, lab) {
  const contract = readSubjectEngineContract(sp);
  if (contract?.blockedLegacySummary) {
    const ownerOpening = resolveSubjectLetterOwnerCopyHe(
      contract,
      String(contract.summarySlots?.openingTemplateId || SUBJECT_OWNER_COPY_TEMPLATE_IDS.OPENING),
      lab,
    );
    if (ownerOpening) return stripGuillemetsHe(ownerOpening);
  }

  if (contract?.blockedLegacySummary && contract.priorityTopics?.length) {
    const finding = String(contract.priorityTopics[0].parentSafeFinding || "").trim();
    if (finding) {
      return stripGuillemetsHe(
        buildSubjectEngineSummaryOpeningHe(lab, { contract: contract.priorityTopics[0] }),
      );
    }
  }

  const engineStrongest = findStrongestEngineDecisionInSubject(sp);
  const engineOpening = buildSubjectEngineSummaryOpeningHe(lab, engineStrongest);
  if (engineOpening) {
    return stripGuillemetsHe(engineOpening);
  }

  if (contract?.blockedLegacySummary) {
    return "";
  }

  const clearWeak = findClearWeakTopicInSubject(sp);
  if (clearWeak) {
    const topicCore = displayTopicCoreHe(clearWeak.label) || clearWeak.label;
    return stripGuillemetsHe(subjectClearWeakOpeningHe(lab, topicCore));
  }

  const w0 = sp?.topWeaknesses?.[0];
  const ex0 = sp?.excellence?.[0] || sp?.topStrengths?.[0];
  const imp0 = sp?.improving?.[0];
  const sparse = topicDataSparse(sp);
  const domRisk = String(sp?.dominantLearningRiskLabelHe || "").trim();
  const domSucc = String(sp?.dominantSuccessPatternLabelHe || "").trim();
  const mr = majorRiskAny(sp);
  const readiness = String(sp?.subjectConclusionReadiness || "").trim();
  const domRc = String(sp?.dominantRootCauseLabelHe || "").trim();
  const pri = String(sp?.subjectPriorityLevel || "").trim();
  const priReason = String(sp?.subjectPriorityReasonHe || "").trim();

  if (pri === "immediate" && priReason) {
    const t = [
      stripGuillemetsHe(`${priReason} כדאי לבחור משימה אחת השבוע ולדבוק בה.`),
      stripGuillemetsHe(`${priReason} עדיף צעד קטן וחוזר מאשר לנסות "לנסות לתקן הכול בבת אחת".`),
    ];
    return t[Math.abs(priReason.length + lab.length) % t.length];
  }
  if (pri === "monitor" && priReason) {
    const t = [
      stripGuillemetsHe(`${priReason} בשלב הזה עדיף להימנע מהחלטות גדולות בבית.`),
      stripGuillemetsHe(`${priReason} כדאי להמשיך בתרגול קצר לפני שקובעים כיוון ברור.`),
    ];
    return t[Math.abs((priReason + lab).length) % t.length];
  }
  if (pri === "maintain" && domSucc && ex0 && !mr) {
    const t = [
      stripGuillemetsHe(`ב${lab} אפשר לנוח קצת על הגז: ${domSucc} - מספיק שגרת תרגול קצרה.`),
      stripGuillemetsHe(`ב${lab} התמונה עקבית יחסית (${domSucc}) - אין חובה להוסיף עומס; מספיק לעקוב בעדינות.`),
    ];
    return t[Math.abs((domSucc + lab).length) % t.length];
  }

  if (readiness === "not_ready" && domRc) {
    if (w0 && isClearWeakSubjectVolume(w0.questions, w0.accuracy)) {
      const coreW = displayTopicCoreHe(w0.labelHe) || displayTopicPhraseHe(w0.labelHe);
      return stripGuillemetsHe(
        `ב${lab} נראית נקודת חיזוק ברורה ב${displayTopicPhraseHe(w0.labelHe) || coreW} - כדאי לחזק את הנושא בתרגול קצר.`,
      );
    }
    const templates = [
      `ב${lab} עדיין מוקדם לדעת בבירור מה קורה לפי התרגול - מה שכן בולט: ${domRc}. כדאי להמשיך עם תרגול קצר לפני שינוי מהותי.`,
      `ב${lab} המידע שנאסף בתקופה שנבחרה עדיין חלקי; הכיוון הסביר ביותר כרגע הוא ${domRc} - בלי לנעול תוכנית ארוכה.`,
    ];
    return stripGuillemetsHe(templates[Math.abs((lab + domRc).length) % templates.length]);
  }
  if (readiness === "partial" && domRc && w0) {
    return stripGuillemetsHe(
      `ב${lab} יש תמונה אמצעית: ${domRc} לצד ${displayTopicPhraseHe(w0.labelHe)} - כדאי לעקוב ולא לקבוע סופית עדיין.`
    );
  }

  if (domSucc && sp?.dominantSuccessPattern === "stable_mastery" && ex0 && !mr) {
    return stripGuillemetsHe(
      `ב${lab} נראית עקביות טובה (${domSucc}) ב ${displayTopicPhraseHe(ex0.labelHe)} - כדאי לשמור על קצב רגוע.`
    );
  }
  if (mr && ex0) {
    const acc = Math.round(Number(ex0.accuracy) || 0);
    return stripGuillemetsHe(
      `ב${lab} יש גם תחומים עם תוצאות טובות יחסית (למשל ${displayTopicPhraseHe(ex0.labelHe)}, כ ${acc}%) וגם נקודות שכדאי לשים לב אליהן - לא מסמנים עדיין את כל הנושא כיציב.`
    );
  }
  if (domRisk && domRisk !== "דל נתון" && w0) {
    const pre = sparse ? "עדיין מוקדם לסגור סופית, אבל " : "";
    return stripGuillemetsHe(
      `${pre}ב${lab} התמונה המרכזית נוגעת אל ${domRisk} לצד ${displayTopicPhraseHe(w0.labelHe)}.`
    );
  }

  if (!w0 && !ex0 && !imp0 && sp.summaryHe && String(sp.summaryHe).trim()) {
    return (
      takeFirstSentence(rewriteParentRecommendationForDetailedHe(sp.summaryHe)) ||
      takeFirstSentence(stripGuillemetsHe(sp.summaryHe))
    );
  }
  if (w0) {
    const coreW = displayTopicCoreHe(w0.labelHe) || displayTopicPhraseHe(w0.labelHe);
    const pre = sparse ? "עדיין מוקדם לקבוע בוודאות, אבל " : "";
    return stripGuillemetsHe(`${pre}הנושא הבולט כרגע ב${lab} הוא ${coreW}.`);
  }
  if (ex0) {
    const acc = Math.round(Number(ex0.accuracy) || 0);
    return stripGuillemetsHe(`ב${lab} יש אחיזה טובה ב ${displayTopicPhraseHe(ex0.labelHe)} (דיוק כ ${acc}%).`);
  }
  if (imp0) {
    const acc = Math.round(Number(imp0.accuracy) || 0);
    const pre = sparse ? "נראה ש" : "";
    return stripGuillemetsHe(`${pre}ב${lab} יש התקדמות חלקית ב ${displayTopicPhraseHe(imp0.labelHe)} (דיוק כ ${acc}%).`);
  }
  return stripGuillemetsHe(`עדיין מוקדם לסכם לגבי ${lab} - מעט מידע בתקופה שנבחרה.`);
}

/** משפט אבחנה אחד — ממזג חוזק/חולשה בלי בלוקים נפרדים */
function buildSubjectDiagnosisLineHe(sp, lab) {
  const contract = readSubjectEngineContract(sp);
  if (contract?.blockedLegacySummary) {
    const diagnosisTemplateId = String(
      contract.summarySlots?.diagnosisTemplateId ||
        (contract.priorityTopics?.length > 1
          ? SUBJECT_OWNER_COPY_TEMPLATE_IDS.DIAGNOSIS_1
          : SUBJECT_OWNER_COPY_TEMPLATE_IDS.DIAGNOSIS_0),
    ).trim();
    const ownerDiagnosis = resolveSubjectLetterOwnerCopyHe(contract, diagnosisTemplateId, lab);
    if (ownerDiagnosis) return stripGuillemetsHe(ownerDiagnosis);
    return "";
  }

  const w0 = sp?.topWeaknesses?.[0];
  const domRc = String(sp?.dominantRootCauseLabelHe || "").trim();
  const restraintLine = String(sp?.subjectDiagnosticRestraintHe || "").trim();
  if (domRc && restraintLine) {
    const variants = [
      stripGuillemetsHe(`מה שבולט כרגע: ${domRc}. ${restraintLine}`),
      stripGuillemetsHe(`מבט זהיר על ${lab}: ${domRc}. ${restraintLine}`),
    ];
    return variants[Math.abs(restraintLine.length) % variants.length];
  }
  const pool = dedupeRowsByLabel([
    ...(Array.isArray(sp.excellence) ? sp.excellence : []),
    ...(Array.isArray(sp.topStrengths) ? sp.topStrengths : []),
    ...(Array.isArray(sp.maintain) ? sp.maintain : []),
  ]);
  const s0 = pool[0];
  const imp0 = sp?.improving?.[0];
  const trendLine = takeFirstSentence(String(sp?.trendNarrativeHe || "").trim());
  const domRisk = String(sp?.dominantLearningRiskLabelHe || "").trim();
  const ibs = String(sp?.improvingButSupportedHe || "").trim();

  if (ibs) {
    return stripGuillemetsHe(ibs);
  }

  if (trendLine && domRisk && domRisk !== "דל נתון") {
    const base = stripGuillemetsHe(`${domRisk} - ${trendLine}`);
    if (w0 && s0) {
      return stripGuillemetsHe(
        `${base} לפי התרגול שנאסף בתקופה שנבחרה: ${displayTopicPhraseHe(s0.labelHe)} יש בסיס טוב; לעומת זאת ${displayTopicPhraseHe(w0.labelHe)} כדאי לתת חיזוק ממוקד.`
      );
    }
    if (w0) {
      const hint = parentFacingWeaknessPracticePhraseHe(w0.labelHe);
      const tail = hint
        ? ` כדאי לתרגל שוב ${hint} בכמה שאלות קצרות.`
        : " כדאי לתרגל את זה שוב בכמה שאלות קצרות.";
      return stripGuillemetsHe(`${base}${tail}`);
    }
    return base.length > 280 ? `${base.slice(0, 277)}…` : base;
  }

  if (w0 && s0) {
    const strong = (Number(w0.mistakeCount) || 0) >= 8;
    const tail = strong
      ? "שווה לחזק; הדפוס חוזר בעקביות."
      : "שווה לחזק - וכדאי להמשיך לעקוב בלי למהר לקבוע כיוון סופי.";
    return stripGuillemetsHe(
      `לפי התרגול שנאסף בתקופה שנבחרה: ${displayTopicPhraseHe(s0.labelHe)} יש בסיס טוב; לעומת זאת ${displayTopicPhraseHe(w0.labelHe)} ${tail}`
    );
  }
  if (w0) {
    const ws =
      (Number(w0.mistakeCount) || 0) >= 8
        ? "חזרה עקבית - כדאי לשים על זה דגש"
        : "עדיין לא ברור אם זה דפוס ארוך";
    return stripGuillemetsHe(`המיקוד המעשי כרגע: ${displayTopicPhraseHe(w0.labelHe)} - ${ws}.`);
  }
  if (s0) {
    return stripGuillemetsHe(`הכיוון החזק: ${displayTopicPhraseHe(s0.labelHe)} - שווה לשמר עליו עם תרגול קצר עד שהכיוון מתבהר.`);
  }
  if (imp0 && !w0) {
    return stripGuillemetsHe(`יש תנועה ${displayTopicPhraseHe(imp0.labelHe)} - כדאי להמשיך בתרגול קצר ולא לקפוץ רמה מהר.`);
  }
  return stripGuillemetsHe("התמונה עדיין חלקית - עוד קצת תרגול יבהיר את הכיוון.");
}

function buildSubjectHomeLineHe(sp, lab) {
  const contract = readSubjectEngineContract(sp);
  if (contract?.blockedLegacySummary) {
    const homeTemplateId = String(
      contract.summarySlots?.homeActionTemplateId || SUBJECT_OWNER_COPY_TEMPLATE_IDS.HOME_ACTION,
    ).trim();
    const ownerHome = resolveSubjectLetterOwnerCopyHe(contract, homeTemplateId, lab);
    if (ownerHome) return stripGuillemetsHe(ownerHome);
  }

  if (contract?.blockedLegacySummary && contract.priorityTopics?.[0]) {
    const tr = findTopicRecommendationForPriority(sp, contract.priorityTopics[0].topicKey);
    if (tr?.recommendedNextStep) {
      return stripGuillemetsHe(rewriteParentRecommendationForDetailedHe(String(tr.recommendedNextStep)));
    }
    if (tr?.doNowHe) {
      return stripGuillemetsHe(rewriteParentRecommendationForDetailedHe(String(tr.doNowHe)));
    }
    if (tr?.recommendedStepLabelHe) {
      return stripGuillemetsHe(rewriteParentRecommendationForDetailedHe(String(tr.recommendedStepLabelHe)));
    }
  }

  // Same legacy-blocking guard as buildSubjectDiagnosisLineHe/buildSubjectClosingLineHe:
  // once the engine contract has blocked the legacy summary, an unmatched home-action
  // template must render empty — never fall through to the engine-unaware legacy fields
  // below (sp.recommendedHomeMethodHe / subjectImmediateActionHe / parentActionHe), which
  // have no awareness of decisions like speed_check_only_subject and could reintroduce a
  // knowledge-gap-flavored recommendation for a topic that was only flagged for speed.
  if (contract?.blockedLegacySummary) return "";

  const homeDiag = sp?.recommendedHomeMethodHe && String(sp.recommendedHomeMethodHe).trim();
  if (homeDiag) return stripGuillemetsHe(rewriteParentRecommendationForDetailedHe(homeDiag));
  const imm = sp?.subjectImmediateActionHe && String(sp.subjectImmediateActionHe).trim();
  if (imm) return stripGuillemetsHe(rewriteParentRecommendationForDetailedHe(imm));
  const raw = sp?.parentActionHe && String(sp.parentActionHe).trim();
  if (raw) return rewriteParentRecommendationForDetailedHe(raw);
  return stripGuillemetsHe(`ב${lab}: פעמיים בשבוע תרגול קצר, עם דגש על קריאת המשימה לפני התשובה.`);
}

function buildSubjectClosingLineHe(sp, lab) {
  const contract = readSubjectEngineContract(sp);
  if (contract?.blockedLegacySummary) {
    const closingTemplateId = String(
      contract.summarySlots?.closingTemplateId || SUBJECT_OWNER_COPY_TEMPLATE_IDS.CLOSING,
    ).trim();
    const ownerClosing = resolveSubjectLetterOwnerCopyHe(contract, closingTemplateId, lab);
    if (ownerClosing) return stripGuillemetsHe(ownerClosing);
    return "";
  }

  const conf = String(sp?.confidenceSummaryHe || "").trim();
  const wnt = String(sp?.whatNotToDoHe || "").trim();
  const g = sp?.nextWeekGoalHe && String(sp.nextWeekGoalHe).trim();
  const doNow = String(sp?.subjectDoNowHe || "").trim();
  const avoidNow = String(sp?.subjectAvoidNowHe || "").trim();
  const memN = String(sp?.subjectMemoryNarrativeHe || "").trim();
  const parts = [];
  if (conf) parts.push(takeFirstSentence(conf));
  if (g) {
    let c = takeFirstSentence(rewriteParentRecommendationForDetailedHe(g));
    if (!c) c = takeFirstSentence(stripGuillemetsHe(g));
    if (c && !/[.!?]$/.test(c)) c += ".";
    parts.push(c);
  }
  if (wnt) parts.push(takeFirstSentence(wnt));
  if (doNow) {
    const d1 = takeFirstSentence(doNow);
    const dup =
      parts.some((p) => p.includes(d1.slice(0, Math.min(18, d1.length)))) ||
      (wnt && wnt.includes(d1.slice(0, Math.min(18, d1.length))));
    if (!dup) parts.push(d1);
  }
  if (avoidNow) {
    const a1 = takeFirstSentence(avoidNow);
    const dup =
      parts.some((p) => p.includes(a1.slice(0, Math.min(18, a1.length)))) ||
      (wnt && wnt.includes(a1.slice(0, Math.min(18, a1.length))));
    if (!dup) parts.push(a1);
  }
  if (memN) {
    const m1 = takeFirstSentence(memN);
    const dup = parts.some((p) => p.includes(m1.slice(0, Math.min(16, m1.length))));
    if (!dup && m1.length > 20) parts.push(m1);
  }
  if (parts.length) return stripGuillemetsHe(parts.join(" "));
  return stripGuillemetsHe(`ב${lab} עדיף עקביות בתרגולים קצרים מאשר מפגש ארוך אחד.`);
}

function collectTopicNarrativeContracts(sp) {
  const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
  return list
    .map((tr) => tr?.contractsV1?.narrative)
    .filter((x) => x && typeof x === "object");
}

function applySubjectNarrativeGuardrails(sp, letter) {
  if (readSubjectEngineContract(sp)?.blockedLegacySummary) {
    return letter;
  }

  const clearWeak = findClearWeakTopicInSubject(sp);
  if (clearWeak) {
    const lab = sp?.subjectLabelHe || "המקצוע";
    const topicCore = displayTopicCoreHe(clearWeak.label) || clearWeak.label;
    return {
      ...letter,
      opening: stripGuillemetsHe(subjectClearWeakOpeningHe(lab, topicCore)),
      closing: stripGuillemetsHe(subjectClearWeakClosingHe(lab, topicCore)),
    };
  }

  const contracts = collectTopicNarrativeContracts(sp);
  if (!contracts.length) return letter;
  const hasStrictRestraint = contracts.some((c) => String(c.wordingEnvelope) === "WE0" || String(c.wordingEnvelope) === "WE1");
  if (!hasStrictRestraint) return letter;
  const lab = sp?.subjectLabelHe || "המקצוע";
  return {
    ...letter,
    opening: `ב${lab} עדיין אין תמונה מספיק ברורה. כדאי להמשיך עם תרגול קצר ולבדוק שוב אחרי עוד כמה תרגולים.`,
    diagnosisHe: letter.diagnosisHe,
    homeAction: letter.homeAction || `ב${lab} מומלץ להתמקד בצעד קצר אחד ולא להרחיב עומס.`,
    closing: `עדיין מוקדם לדעת אם הכיוון יציב ב${lab}; נמשיך לעקוב בשבועות הקרובים ונעדכן בהתאם.`,
  };
}

/** @param {Record<string, unknown>|null|undefined} topic */
function topicLetterSlotFromPriorityTopic(topic) {
  if (!topic || typeof topic !== "object") return null;
  const raw = String(topic.topicLabelKey || topic.displayName || topic.topicName || "").trim();
  const core = displayTopicCoreHe(raw) || raw.replace(/^[^-]+-\s*/, "").trim();
  if (!core) return null;
  const patternRaw = topic.detectedPattern ? String(topic.detectedPattern).trim() : "";
  return {
    topic: core,
    questions: Number(topic.questions) || 0,
    accuracy: Math.round(Number(topic.accuracy) || 0),
    pattern: patternRaw || null,
  };
}

/** @param {Record<string, unknown>|null|undefined} sp */
function collectSubjectLetterTopicSlots(sp) {
  const contract = readSubjectEngineContract(sp);
  if (contract?.priorityTopics?.length) {
    return contract.priorityTopics
      .map((t) => topicLetterSlotFromPriorityTopic(t))
      .filter(Boolean);
  }

  /** @type {{ topic: string, questions: number, accuracy: number, pattern: string|null }[]} */
  const out = [];
  const seen = new Set();
  const pushRow = (row) => {
    if (!row?.topic || seen.has(row.topic)) return;
    seen.add(row.topic);
    out.push(row);
  };

  for (const tr of Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : []) {
    const name = String(tr?.narrativeTitleHe || tr?.displayName || "").trim();
    const q = Number(tr?.questions) || 0;
    if (!name || q <= 0) continue;
    const pattern =
      tr?.detectedPattern != null
        ? String(tr.detectedPattern).trim()
        : tr?.taxonomy?.patternHe
          ? String(tr.taxonomy.patternHe).trim()
          : null;
    pushRow({
      topic: displayTopicCoreHe(name) || name.replace(/^[^-]+-\s*/, "").trim(),
      questions: q,
      accuracy: Math.round(Number(tr?.accuracy) || 0),
      pattern: pattern || null,
    });
  }

  for (const w of Array.isArray(sp?.topWeaknesses) ? sp.topWeaknesses : []) {
    const name = String(w?.labelHe || w?.displayName || "").trim();
    const q = Number(w?.questions) || 0;
    if (!name || q <= 0) continue;
    pushRow({
      topic: displayTopicCoreHe(name) || name.replace(/^[^-]+-\s*/, "").trim(),
      questions: q,
      accuracy: Math.round(Number(w?.accuracy) || 0),
      pattern: null,
    });
  }

  return out;
}

/**
 * מכתב מקצוע קצר — שלב ביצוע 1 (דוח מקיף בלבד, תצוגה).
 * @param {Record<string, unknown>|null|undefined} sp
 */
export function buildSubjectParentLetterDetailedPhase1(sp) {
  const lab = String(sp?.subjectLabelHe || "המקצוע").trim();
  const subjQ = Number(sp?.subjectQuestionCount) || 0;
  const emptyTail = { diagnosisHe: "", homeAction: "", closing: "", goingWell: "", fragile: "", reliabilityNoteHe: null };

  if (subjQ < 5) {
    return {
      ...emptyTail,
      opening: `יש מעט תרגול ב${lab} בתקופה הזאת, ולכן עדיין אי אפשר להסיק מסקנה רחבה. אפשר להמשיך בתרגול קצר ולבדוק אם הכיוון נשמר אחרי עוד שאלות.`,
    };
  }

  const slots = collectSubjectLetterTopicSlots(sp);
  if (!slots.length) {
    return {
      ...emptyTail,
      opening: `יש תרגול ב${lab}, אבל עדיין אין מספיק פירוט לפי נושא כדי להציג מסקנה מדויקת. כדאי להמשיך בתרגול קצר, ובדוח הבא יהיה קל יותר לראות מה חוזר.`,
    };
  }

  if (slots.length >= 2) {
    const t0 = slots[0];
    const t1 = slots[1];
    let opening = `ב${lab} כדאי להתמקד קודם ב${t0.topic}. נפתרו ${t0.questions} שאלות, והדיוק הוא ${t0.accuracy}%.`;
    opening += ` נושא נוסף שכדאי לשים לב אליו הוא ${t1.topic}, עם ${t1.questions} שאלות ודיוק של ${t1.accuracy}%.`;
    if (t0.pattern) opening += ` הדפוס המרכזי שנראה: ${t0.pattern}.`;
    return { ...emptyTail, opening };
  }

  const t0 = slots[0];
  let opening = `ב${lab} כדאי להתמקד כרגע ב${t0.topic}. נפתרו ${t0.questions} שאלות, והדיוק הוא ${t0.accuracy}%.`;
  if (t0.pattern) opening += ` הדפוס המרכזי שנראה: ${t0.pattern}.`;
  return { ...emptyTail, opening };
}

export function buildSubjectParentLetterCompact(sp) {
  const full = buildSubjectParentLetter(sp, { compact: true });
  const lead = [full.opening, full.diagnosisHe].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const leadMax = lead.length > 240 ? `${lead.slice(0, 237)}…` : lead;
  return {
    opening: leadMax,
    middle: null,
    homeAction: full.homeAction,
    closing: full.closing,
  };
}

export function buildSubjectParentLetter(sp, opts = {}) {
  const compact = !!opts.compact;
  const lab = sp.subjectLabelHe || "המקצוע";
  const opening = buildSubjectOpeningLineHe(sp, lab);
  let diagnosisHe = buildSubjectDiagnosisLineHe(sp, lab);
  if (compact && diagnosisHe.length > 200) {
    diagnosisHe = `${diagnosisHe.slice(0, 197)}…`;
  }
  const homeAction = buildSubjectHomeLineHe(sp, lab);
  const closing = buildSubjectClosingLineHe(sp, lab);

  const base = {
    opening: normalizeParentFacingHe(stripGuillemetsHe(opening)),
    diagnosisHe: normalizeParentFacingHe(stripGuillemetsHe(diagnosisHe)),
    homeAction: normalizeParentFacingHe(String(homeAction || "")),
    closing: normalizeParentFacingHe(stripGuillemetsHe(closing)),
    /** תאימות לאחור — ריקים */
    goingWell: "",
    fragile: "",
    reliabilityNoteHe: null,
  };
  const contract = readSubjectEngineContract(sp);
  if (contract && typeof contract === "object") {
    base[SP_SUBJECT_ENGINE_CONTRACT] = contract;
    base.renderSource = contract.summarySlots?.renderSource || RENDER_SOURCE_SUBJECT_ENGINE;
    base.summarySlots = contract.summarySlots || null;
  }
  return normalizeSubjectParentLetterHe(applySubjectNarrativeGuardrails(sp, base));
}

export function buildTopicRecommendationNarrative(tr) {
  const gradeRelation = String(tr?.gradeRelation || tr?.rowIdentityV1?.gradeRelation || "").trim();
  const hasCanonicalNarrative = !!(tr?.contractsV1?.narrative && typeof tr.contractsV1.narrative === "object");
  const canonicalNarrative = hasCanonicalNarrative
    ? tr.contractsV1.narrative
    : buildNarrativeContractV1({
        ...tr,
        subjectId: tr?.subjectId,
        topicKey: tr?.topicKey || tr?.topicRowKey,
      });
  const summarySlot = narrativeSectionTextHe("summary", canonicalNarrative);
  const findingSlot = narrativeSectionTextHe("finding", canonicalNarrative);
  const recommendationSlot = narrativeSectionTextHe("recommendation", canonicalNarrative);
  const limitationsSlot = narrativeSectionTextHe("limitations", canonicalNarrative);
  const nameRaw = String(tr?.displayName || "הנושא").trim();
  const core = displayTopicCoreHe(nameRaw) || stripGuillemetsHe(nameRaw);
  const q = Number(tr?.questions) || 0;
  const acc = Math.round(Number(tr?.accuracy) || 0);
  const m = Number(tr?.mistakeEventCount) || 0;
  const step = String(tr?.recommendedNextStep || "").trim();
  const statsLine =
    q > 0
      ? `היו ${q} שאלות, עם דיוק של כ ${acc}%${m > 0 ? ` ו ${m} טעויות מצטברות` : ""}.`
      : "בתקופה שנבחרה עדיין אין מספיק שאלות כדי לראות אם יש מגמה ברורה.";
  let snap = q > 0 ? `ב${core} ${statsLine}` : `ב${core} ${statsLine}`;
  if (q > 0 && !suppressRegisteredGradeStrengthenCopy(gradeRelation)) {
    const stepOpeners =
      step === "remediate_same_level"
        ? [
            `ב${core} התמונה מצביעה על צורך בחיזוק: ${statsLine}`,
            `ב${core} כרגע עדיף לעצור לחיזוק ממוקד: ${statsLine}`,
          ]
        : [
            `ב${core} כרגע הכיוון זהיר יותר: ${statsLine}`,
            `ב${core} בשלב זה כדאי לאסוף עוד תרגול קצר לפני החלטה רחבה: ${statsLine}`,
          ];
    snap = stepOpeners[Math.abs(q + m + core.length) % stepOpeners.length];
  }
  const early = !!tr?.isEarlySignalOnly || tr?.dataSufficiencyLevel === "low" || tr?.evidenceStrength === "low";
  if (early && q > 0 && q < 12) {
    snap = `ב${core} התמונה עדיין בראשית דרך: ${statsLine}`;
  }
  const cs = String(tr?.conclusionStrength || "").trim();
  const rc = String(tr?.rootCauseLabelHe || "").trim();
  if (cs === "withheld" || cs === "tentative") {
    const alt = [
      `בשלב הזה לא קובעים סופית לגבי ${core}. ${statsLine}${rc ? ` הכיוון הסביר כרגע: ${rc}.` : ""}`,
      q >= 20 && acc >= 85
        ? `ב${core} נראים ביצועים טובים לאורך התקופה. ${statsLine} עדיין מוקדם לקבוע כיוון חד משמעי.${rc ? ` מה שנראה סביר עכשיו: ${rc}.` : ""}`
        : `ב${core} הנתון עדיין חלקי. ${statsLine}${rc ? ` מה שכדאי לעקוב אחריו כרגע: ${rc}.` : ""}`,
    ];
    snap = stripGuillemetsHe(pickVariant(`${core}|${q}|${acc}`, alt));
  } else if (rc) {
    snap = stripGuillemetsHe(`${snap} נקודה שכדאי לשים עליה לב: ${rc}.`);
  }
  if (q === 0 && !rc) {
    const altNoData = [
      `ב${core} עדיין חסר קצב תרגול בסיסי כדי לקבוע כיוון ברור.`,
      `ב${core} בשלב זה עדיין חסרים נתוני תרגול, ולכן נשארים עם ניסוח זהיר.`,
    ];
    snap = altNoData[Math.abs(core.length) % altNoData.length];
  }
  const reasoning = String(tr?.recommendationReasoningHe || "").trim();
  const homeRaw = tr?.recommendedParentActionHe ? String(tr.recommendedParentActionHe).trim() : "";
  const homeLine = rewriteParentRecommendationForDetailedHe(homeRaw);
  const whyHold = String(tr?.whyNotAStrongerConclusionHe || "").trim();
  const homeAug =
    reasoning && q >= 10
      ? `${homeLine} ${takeFirstSentence(reasoning)}`
      : homeLine;
  const snapshotFromContract = [summarySlot, findingSlot].filter(Boolean).join(" ");
  let homeFromContract = hasCanonicalNarrative ? recommendationSlot || "" : recommendationSlot || homeAug;
  const ownerSnapshot = resolveNarrativeOwnerCopyHe(tr, "snapshot");
  const ownerCaution = resolveNarrativeOwnerCopyHe(tr, "cautionLineHe");
  let snapshotOut = ownerSnapshot || snapshotFromContract || snap;

  if (suppressRegisteredGradeStrengthenCopy(gradeRelation)) {
    const needsSupport = gradeContextNeedsSupport(gradeRelation, acc);
    const isStrength = gradeContextIsStrength(gradeRelation, acc, q);
    const expl = gradeContextExplanationHe({ gradeRelation, isStrength, needsSupport });
    const action = gradeContextActionHe({ gradeRelation, isStrength, needsSupport });
    if (expl) snapshotOut = q > 0 ? `ב${core} ${expl}` : expl;
    if (action) homeFromContract = action;
  }

  const cautionFromContract =
    ownerCaution || limitationsSlot || (whyHold ? stripGuillemetsHe(takeFirstSentence(whyHold)) : "");
  return {
    snapshot: normalizeParentFacingHe(stripGuillemetsHe(snapshotOut)),
    homeLine: normalizeParentFacingHe(stripGuillemetsHe(homeFromContract)),
    cautionLineHe: cautionFromContract ? normalizeParentFacingHe(stripGuillemetsHe(cautionFromContract)) : "",
  };
}

/** Phase 10–11 — שורות קצרות לניסוח הורי (ממופות מ parent-report-ui-explain-he) */
export {
  responseToInterventionLineHe,
  supportAdjustmentLineHe,
  freshnessLineHe,
  recalibrationLineHe,
  supportSequenceLineHe,
  repetitionRiskLineHe,
  fatigueRiskLineHe,
  releaseReadinessLineHe,
  sequenceActionLineHe,
  topicRepetitionFatigueCompactLineHe,
  topicSupportSequenceOrReleaseLineHe,
  recommendationMemoryLineHe,
  outcomeTrackingLineHe,
  continuationDecisionLineHe,
  carryoverLineHe,
  freshEvidenceNeedLineHe,
  gateStateLineHe,
  decisionFocusLineHe,
  evidenceTargetLineHe,
  releaseGateLineHe,
  pivotTriggerLineHe,
  recheckTriggerLineHe,
  gateTriggerCompactLineHe,
  dependencyStateLineHe,
  foundationPriorityLineHe,
  interventionOrderingLineHe,
  foundationBeforeExpansionLineHe,
  downstreamSymptomLineHe,
  topicFreshnessUnifiedLineHe,
  topicGatesEvidenceDecisionCompactLineHe,
  topicFoundationDependencyCompactLineHe,
  topicMemoryOutcomeContinuationCompactLineHe,
  topicSequencingRepeatCompactLineHe,
  topicSupportFlowUnifiedLineHe,
} from "./parent-report-ui-explain-he.js";
