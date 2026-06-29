/**
 * Report-row-first Hebrew subject/topic resolution for Parent Copilot.
 * Matches parent utterances against actual payload rows (display labels + subject labels).
 */

import { listTopicRowsForClassifier } from "../parent-ai-topic-classifier/classifier.js";
import { SUBJECT_ORDER, subjectLabelHe } from "./contract-reader.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";
import { isContextualFollowUpUtterance } from "./contextual-follow-up-he.js";
import { detectHistoryCopilotLock } from "./history-scope-he.js";

/** @type {Record<string, string[]>} */
export const SUBJECT_HE_ALIASES = Object.freeze({
  math: ["חשבון", "מתמטיקה"],
  geometry: ["גאומטריה", "גיאומטריה"],
  english: ["אנגלית"],
  science: ["מדעים", "מדע"],
  history: ["היסטוריה"],
  hebrew: ["עברית", "שפה"],
  "moledet-geography": ["מולדת", "גאוגרפיה", "מולדת וגאוגרפיה"],
});

/** Common parent/taxonomy topic phrases beyond exact displayName (report rows still win first). */
/** @type {Record<string, string[]>} */
export const TOPIC_HE_ALIASES = Object.freeze({
  fractions: ["שברים", "חשבון שברים"],
  multiplication: ["כפל", "לוח הכפל", "כפל בעשרות"],
  division: ["חילוק", "חלוקה", "חילוק בעשרות"],
  "word-problems": ["בעיות מילוליות", "בעיות מילולית", "תרגילי מילה"],
  "reading-comprehension": ["הבנת הנקרא", "הבנה", "קריאה"],
  grammar: ["דקדוק", "דקדוק עברית"],
  vocabulary: ["אוצר מילים", "אוצר"],
  what_is_history: ["מהי היסטוריה", "מקור ראשוני", "מקור משני", "ציר זמן"],
  classical_greece: ["יוון הקלאסית", "אתונה", "ספרטה", "דמוקרטיה", "השוואה אתונה ספרטה"],
  hellenism_jews: ["הלניזם", "אלכסנדר מוקדון", "אלכסנדר", "הלניזם והיהודים"],
  hasmonaeans: ["החשמונאים", "חשמונאים", "אנטיוכוס", "מרד המקבים", "המקבים", "חנוכה"],
  rome_jews: ["רומא והיהודים", "רומא", "הורדוס", "המרד הגדול", "חורבן בית המקדש", "חורבן", "יבנה", "בר כוכבא", "בבל"],
  hist_sub_intro_sources_timeline: ["מקור ראשוני", "מקור משני", "ציר זמן", "מהי היסטוריה"],
  hist_sub_athens_democracy: ["אתונה", "דמוקרטיה", "אתונה הדמוקרטית"],
  hist_sub_sparta: ["ספרטה"],
  hist_sub_athens_sparta_compare: ["השוואה אתונה ספרטה", "השוואה בין אתונה לספרטה"],
  hist_sub_greek_culture_legacy: ["תרבות יוון", "מורשת יוון", "אולימפיאדה"],
  hist_sub_alexander_hellenism: ["אלכסנדר מוקדון", "הלניזם"],
  hist_sub_hellenism_meets_judaism: ["המפגש בין הלניזם ליהדות", "הלניזם והיהודים"],
  hist_sub_antiochus_maccabees: ["גזרות אנטיוכוס", "מרד המקבים", "המקבים"],
  hist_sub_hasmonaean_kingdom: ["ממלכת החשמונאים"],
  hist_sub_rise_of_rome: ["עליית רומא", "רומא"],
  hist_sub_roman_culture_law: ["תרבות רומית", "משפט רומי", "חוק רומי"],
  hist_sub_hasmonaean_loss_roman_conquest: ["כיבוש רומי", "פומפיוס", "אובדן עצמאות"],
  hist_sub_herod_building: ["הורדוס", "מפעלי בנייה", "הרודיון"],
  hist_sub_judea_province: ["יהודה כפרובינציה", "פרובינציה"],
  hist_sub_great_revolt_destruction: ["המרד הגדול", "חורבן בית המקדש", "מצדה"],
  hist_sub_yavne_bar_kokhba_babylon: ["יבנה", "בר כוכבא", "מרכז בבל", "בבל"],
});

const TOPIC_INQUIRY_PREFIX_RE =
  /^(?:תסביר\s+לי\s+|תסביר\s+|הסבר\s+לי\s+|הסבר\s+|מה\s+הבעיה\s+(?:ב|ב)?|מה\s+קורה\s+(?:ב|ב)?|מה\s+עם\s+|מה\s+לגבי\s+|איך\s+הוא\s+(?:ב|ב)?|איך\s+היא\s+(?:ב|ב)?|איך\s+הילד\s+(?:ב|ב)?|מה\s+לעשות\s+(?:ב|ב)?|מה\s+לחזק\s+(?:ב|ב)?|רוצה\s+לדעת\s+(?:על\s+)?|רוצה\s+להבין\s+(?:על\s+)?|אני\s+רוצה\s+לדעת\s+(?:על\s+)?|אני\s+רוצה\s+להבין\s+(?:על\s+)?)/u;

const FOLDED_PHRASE_BOUNDARY = /[\s?!.,:;״׳]/u;

/**
 * Avoid false positives (e.g. alias "שבר" inside "חשבון").
 * @param {string} haystack
 * @param {string} phrase
 */
function foldedIncludesPhrase(haystack, phrase) {
  const h = String(haystack || "");
  const p = String(phrase || "").trim();
  if (p.length < 2 || !h.includes(p)) return false;
  if (p.length >= 4) return true;
  let idx = 0;
  while ((idx = h.indexOf(p, idx)) !== -1) {
    const before = idx === 0 ? " " : h[idx - 1];
    const afterIdx = idx + p.length;
    const after = afterIdx >= h.length ? " " : h[afterIdx];
    if (FOLDED_PHRASE_BOUNDARY.test(before) && FOLDED_PHRASE_BOUNDARY.test(after)) return true;
    idx += 1;
  }
  return false;
}

/**
 * @param {unknown} payload
 */
export function hasAnchoredReportRows(payload) {
  const rows = listReportRows(payload);
  return rows.some((r) => r.anchored);
}

/**
 * @param {unknown} payload
 * @returns {Array<{
 *   subjectId: string;
 *   subjectLabelHe: string;
 *   topicRowKey: string;
 *   displayName: string;
 *   displayNameFolded: string;
 *   anchored: boolean;
 *   contentGradeKey: string|null;
 *   topicBaseKey: string;
 * }>}
 */
export function listReportRows(payload) {
  const raw = listTopicRowsForClassifier(payload);
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const trByKey = new Map();
  for (const sp of profiles) {
    const sid = String(sp?.subject || "");
    for (const tr of Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : []) {
      const trk = String(tr?.topicRowKey || tr?.topicKey || "").trim();
      if (trk) trByKey.set(`${sid}|${trk}`, tr);
    }
    for (const row of Array.isArray(sp?.topicOverviewRows) ? sp.topicOverviewRows : []) {
      const trk = String(row?.topicRowKey || row?.topicKey || "").trim();
      if (trk && !trByKey.has(`${sid}|${trk}`)) trByKey.set(`${sid}|${trk}`, row);
    }
  }
  return raw.map((row) => {
    const topicRowKey = String(row.topicRowKey || "").trim();
    let contentGradeKey = null;
    let topicBaseKey = topicRowKey;
    const gradeSep = "::grade:";
    if (topicRowKey.includes(gradeSep)) {
      const parts = topicRowKey.split(gradeSep);
      topicBaseKey = parts[0] || topicRowKey;
      contentGradeKey = parts[1] || null;
    }
    const tr = trByKey.get(`${row.subjectId}|${topicRowKey}`);
    const questions = Math.max(0, Math.round(Number(tr?.questions ?? tr?.contractsV1?.evidence?.questionCount) || 0));
    const accuracy = Math.max(
      0,
      Math.min(100, Math.round(Number(tr?.accuracy ?? tr?.contractsV1?.evidence?.accuracyPct) || 0)),
    );
    return {
      subjectId: row.subjectId,
      subjectLabelHe: subjectLabelHe(row.subjectId),
      topicRowKey,
      displayName: row.displayName,
      displayNameFolded: row.displayNameFolded,
      anchored: row.anchored,
      contentGradeKey,
      topicBaseKey,
      questions,
      accuracy,
    };
  });
}

/**
 * @param {string} folded
 */
export function isTopicWeaknessInquiry(folded) {
  const t = String(folded || "").trim();
  return /^מה\s+הבעיה/u.test(t) || /^מה\s+קשה/u.test(t) || /^איפה\s+הוא\s+מתקשה/u.test(t) || /^איפה\s+היא\s+מתקשה/u.test(t);
}

/**
 * @param {string} folded
 * @param {ReturnType<typeof listReportRows>[number]} row
 */
export function utteranceNamesTopicRow(folded, row) {
  if (!row) return false;
  const u = String(folded || "");
  if (foldedIncludesPhrase(u, row.displayNameFolded)) return true;
  return topicAliasPhrases(row.subjectId, row.topicBaseKey).some((a) => foldedIncludesPhrase(u, a));
}

/**
 * @param {string} folded
 */
export function stripTopicInquiryPrefixes(folded) {
  let t = String(folded || "").trim();
  for (let i = 0; i < 4; i++) {
    const next = t.replace(TOPIC_INQUIRY_PREFIX_RE, "").trim();
    if (next === t) break;
    t = next;
  }
  return t.replace(/[?!.,:;״׳]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * @param {string} subjectId
 * @param {string} topicBaseKey
 */
function topicAliasPhrases(subjectId, topicBaseKey) {
  const base = String(topicBaseKey || "").trim();
  const aliases = TOPIC_HE_ALIASES[base] || [];
  const out = new Set(aliases.map((a) => foldUtteranceForHeMatch(a)).filter((a) => a.length >= 2));
  return [...out];
}

/**
 * @param {string} foldedUtterance
 * @param {ReturnType<typeof listReportRows>[number]} row
 */
function scoreRowMatch(foldedUtterance, row) {
  const u = foldedUtterance;
  if (!u || u.length < 2) return 0;
  const dn = row.displayNameFolded;
  const subj = foldUtteranceForHeMatch(row.subjectLabelHe);
  let score = 0;
  if (dn.length >= 2 && u.includes(dn)) score = Math.max(score, dn.length + 10);
  const tail = stripTopicInquiryPrefixes(u);
  if (dn.length >= 2 && tail.length >= 2) {
    if (tail === dn || tail.endsWith(` ${dn}`) || tail.startsWith(`${dn} `)) {
      score = Math.max(score, dn.length + 14);
    }
    if (tail.includes(dn)) score = Math.max(score, dn.length + 8);
  }
  for (const alias of topicAliasPhrases(row.subjectId, row.topicBaseKey)) {
    if (alias.length >= 2 && foldedIncludesPhrase(u, alias)) score = Math.max(score, alias.length + 6);
  }
  for (const alias of SUBJECT_HE_ALIASES[row.subjectId] || []) {
    const af = foldUtteranceForHeMatch(alias);
    if (af.length >= 2 && u.includes(af) && dn.length >= 2 && u.includes(dn)) {
      score = Math.max(score, af.length + dn.length + 6);
    }
  }
  if (score <= 0) return 0;
  if (row.anchored) score += 2;
  return score;
}

/**
 * @param {string} utterance
 * @param {unknown} payload
 */
export function resolveReportRowFromUtterance(utterance, payload) {
  const folded = foldUtteranceForHeMatch(utterance);
  const rows = listReportRows(payload);
  /** @type {Array<{ row: typeof rows[0]; score: number }>} */
  const hits = [];
  for (const row of rows) {
    const score = scoreRowMatch(folded, row);
    if (score > 0) hits.push({ row, score });
  }
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      SUBJECT_ORDER.indexOf(a.row.subjectId) - SUBJECT_ORDER.indexOf(b.row.subjectId),
  );
  let best = hits[0] || null;
  const second = hits[1] || null;
  let ambiguous = !!(
    best &&
    second &&
    best.score > 0 &&
    second.score > 0 &&
    best.score - second.score <= 3
  );

  let subjectId = null;
  const subjHits = [];
  for (const sid of SUBJECT_ORDER) {
    const labels = [subjectLabelHe(sid), ...(SUBJECT_HE_ALIASES[sid] || [])];
    for (const lbl of labels) {
      const lf = foldUtteranceForHeMatch(lbl);
      if (lf.length >= 2 && folded.includes(lf)) {
        subjHits.push({ subjectId: sid, score: lf.length });
        break;
      }
    }
  }
  subjHits.sort((a, b) => b.score - a.score);
  if (subjHits[0] && (!best || subjHits[0].score >= 4)) {
    subjectId = subjHits[0].subjectId;
  }

  const historyLock = detectHistoryCopilotLock(utterance);
  if (historyLock?.locked) {
    subjectId = "history";
    if (historyLock.topicBaseKey) {
      const histRows = rows.filter(
        (r) => r.subjectId === "history" && r.topicBaseKey === historyLock.topicBaseKey,
      );
      const histBest = [...histRows].sort(
        (a, b) => (Number(b.questions) || 0) - (Number(a.questions) || 0) || b.score - a.score,
      )[0];
      if (histBest) {
        best = { row: histBest, score: Math.max(best?.score ?? 0, 100) };
        ambiguous = false;
      }
    }
  }

  if (best && subjectId && best.row.subjectId === subjectId) {
    const topicNamed =
      foldedIncludesPhrase(folded, best.row.displayNameFolded) ||
      topicAliasPhrases(best.row.subjectId, best.row.topicBaseKey).some((a) =>
        foldedIncludesPhrase(folded, a),
      );
    if (!topicNamed) {
      best = null;
      ambiguous = false;
    }
  }

  const isSubjectScopedInquiry =
    isSubjectStatusInquiry(folded) || /^מה\s+לעשות\s+ב/u.test(folded) || /^מה\s+לחזק\s+ב/u.test(folded);
  if (isSubjectScopedInquiry && subjHits[0]) {
    const tail = stripTopicInquiryPrefixes(folded).replace(/^ב/u, "").trim();
    const sid = subjHits[0].subjectId;
    const subjectLabels = [subjectLabelHe(sid), ...(SUBJECT_HE_ALIASES[sid] || [])].map((l) =>
      foldUtteranceForHeMatch(l),
    );
    const topicExplicit =
      best &&
      (foldedIncludesPhrase(folded, best.row.displayNameFolded) ||
        topicAliasPhrases(best.row.subjectId, best.row.topicBaseKey).some((a) =>
          foldedIncludesPhrase(folded, a),
        ));
    if (!topicExplicit && (subjectLabels.includes(tail) || subjectLabels.some((l) => foldedIncludesPhrase(folded, l)))) {
      best = null;
      subjectId = sid;
      ambiguous = false;
    }
  }

  const sameTopicBase =
    best && second && best.row.topicBaseKey && best.row.topicBaseKey === second.row.topicBaseKey;

  let gradeSplitTopicRows = [];
  if (sameTopicBase && best?.row?.topicBaseKey) {
    gradeSplitTopicRows = hits
      .filter((h) => h.row.topicBaseKey === best.row.topicBaseKey && h.score > 0)
      .map((h) => h.row);
    const grades = new Set(gradeSplitTopicRows.map((r) => r.contentGradeKey).filter(Boolean));
    if (grades.size < 2) gradeSplitTopicRows = [];
  }

  if (gradeSplitTopicRows.length >= 2 && isTopicWeaknessInquiry(folded)) {
    const weakest = [...gradeSplitTopicRows].sort(
      (a, b) => (Number(a.accuracy) || 0) - (Number(b.accuracy) || 0) || (Number(a.questions) || 0) - (Number(b.questions) || 0),
    )[0];
    if (weakest) {
      best = { row: weakest, score: best?.score ?? 0 };
      ambiguous = false;
    }
  }

  return {
    best: best ? best.row : null,
    bestScore: best?.score ?? 0,
    subjectId: best ? best.row.subjectId : subjectId,
    ambiguous: ambiguous && !sameTopicBase,
    candidates: hits.slice(0, 4).map((h) => h.row),
    gradeSplitTopicRows,
    mixedGradeQuestion: isMixedGradeReportQuestion(folded),
    foldedUtterance: folded,
  };
}

/**
 * @param {string} folded
 */
export function isSubjectStatusInquiry(folded) {
  const t = String(folded || "").trim();
  return /^(?:איך\s+(?:הוא|היא|הילד|הילדה|בני|בתי)|מה\s+המצב|מה\s+קורה)(?:\s|$)/u.test(t) && /\s+ב/u.test(t);
}

/**
 * @param {string} folded
 */
export function isGeneralReportQuestion(folded) {
  const t = String(folded || "").trim();
  if (t.length < 3) return false;
  return (
    /^מה\s+הבעיה\??$/u.test(t) ||
    /^מה\s+הבעיה\s/u.test(t) ||
    /^מה\s+קשה(?:\s+לו|\s+לה|\s+לילד)?/u.test(t) ||
    /^מה\s+טוב(?:\s+לו|\s+לה)?/u.test(t) ||
    /^מה\s+לחזק/u.test(t) ||
    /^מה\s+לעשות\s+בבית/u.test(t) ||
    /^מה\s+לעשות\s+ב/u.test(t) ||
    /^מה\s+הכי\s+חשוב/u.test(t) ||
    /^איפה\s+הוא\s+חלש/u.test(t) ||
    /^איפה\s+הוא\s+חזק/u.test(t) ||
    /^איפה\s+הוא\s+מתקשה/u.test(t) ||
    /^איפה\s+היא\s+חלש/u.test(t) ||
    /^איפה\s+היא\s+חזק/u.test(t) ||
    /^איפה\s+היא\s+מתקשה/u.test(t) ||
    /^במה\s+הוא\s+חזק/u.test(t) ||
    /^במה\s+הוא\s+מתקשה/u.test(t) ||
    /^במה\s+היא\s+חזק/u.test(t) ||
    /^במה\s+היא\s+מתקשה/u.test(t) ||
    /^מה\s+הדוח\s+אומר/u.test(t) ||
    /^מה\s+הדוח\s+אומר\s+בקצרה/u.test(t) ||
    /^מה\s+השתפר/u.test(t) ||
    /^מה\s+לעשות\s+השבוע/u.test(t) ||
    /^מה\s+לעשות\s+עכשיו/u.test(t) ||
    /למה\s+הדוח\s+אומר/u.test(t) ||
    /^תסביר\s+לי\s+את\s+הדוח/u.test(t) ||
    /^תסביר\s+את\s+הדוח/u.test(t) ||
    /^איך\s+הוא\s+ב/u.test(t) ||
    /^איך\s+היא\s+ב/u.test(t) ||
    /^מה\s+המצב\s+ב/u.test(t) ||
    /^מה\s+קורה\s+ב/u.test(t)
  );
}

/**
 * @param {string} folded
 */
export function isMixedGradeReportQuestion(folded) {
  const t = String(folded || "").trim();
  return (
    /שתי\s+כיתות|שתי\s+שורות\s+כיתה|כיתה\s+אחרת|תרגל\s+כיתה\s+אחרת|כיתה\s+גבוהה\s+יותר|כיתה\s+נמוכה\s+יותר|יחסית\s+לכיתה\s+שלו|יחסית\s+לכיתה\s+שלה|בכיתה\s+גבוהה|בכיתה\s+נמוכה|מעל\s+הכיתה\s+שלו|מתחת\s+לכיתה/u.test(
      t,
    )
  );
}

/**
 * @param {string} folded
 */
export function isVagueTopicSelectionRequest(folded) {
  const t = String(folded || "").trim();
  return (
    /נושא\s+מסויים|נושא\s+מסוימי|על\s+נושא\s+מסוים|על\s+נושא\s+מסויים|רוצה\s+לדעת\s+על\s+נושא\s+מסויים|רוצה\s+לדעת\s+על\s+נושא\s+מסוים/u.test(
      t,
    )
  );
}

/**
 * @param {unknown} payload
 */
export function buildTopicClarificationQuestionHe(payload) {
  const rows = listReportRows(payload)
    .filter((r) => r.anchored)
    .slice(0, 6);
  const examples = [];
  const seen = new Set();
  for (const r of rows) {
    const subj = r.subjectLabelHe;
    const label =
      foldUtteranceForHeMatch(r.displayName) === foldUtteranceForHeMatch(subj)
        ? r.displayName
        : `${subj} · ${r.displayName}`;
    const key = foldUtteranceForHeMatch(label);
    if (seen.has(key)) continue;
    seen.add(key);
    examples.push(label);
  }
  const ex =
    examples.length > 0 ? examples.join(", ") : "חשבון, שברים, הבנת הנקרא או מדעים";
  return `על איזה נושא תרצה לדעת? למשל ${ex}.`;
}

/**
 * True when utterance should enter the report pipeline (not ambiguous/off-topic) because it
 * references a report row, a report subject, or a valid general report question.
 * @param {string} utterance
 * @param {unknown} payload
 */
function isStandaloneGenericKnowledgeQuestion(folded) {
  const t = String(folded || "").trim();
  return (
    /^מה\s+זה(?:\s|$)/u.test(t) ||
    /^מהו\s|^מהי\s/u.test(t) ||
    /^מי\s+המציא/u.test(t) ||
    /^מי\s+גילה/u.test(t) ||
    /^מי\s+כתב/u.test(t) ||
    /^איך\s+מכינים/u.test(t)
  );
}

export function utteranceQualifiesAsReportQuestion(utterance, payload) {
  if (!payload || typeof payload !== "object") return false;
  const folded = foldUtteranceForHeMatch(utterance);
  if (hasAnchoredReportRows(payload) && isContextualFollowUpUtterance(utterance)) return true;
  if (
    hasAnchoredReportRows(payload) &&
    /מה\s*חשוב|חשוב\s*כאן|מה\s*לגבי|מה\s*המקצוע\s*החזק|המקצוע\s*החזק|מה\s*הטעויות|מה\s*הטעיות|הטעויות\s*הבולטות/u.test(
      folded,
    )
  ) {
    return true;
  }
  if (
    isStandaloneGenericKnowledgeQuestion(folded) &&
    !/דוח|תרגול|מתקשה|חזק|חלש|לפי\s+הדוח|בבית\s+ספר|למידה/u.test(folded)
  ) {
    return false;
  }
  if (isVagueTopicSelectionRequest(folded) && hasAnchoredReportRows(payload)) return true;
  if (hasAnchoredReportRows(payload) && isGeneralReportQuestion(folded)) return true;
  if (hasAnchoredReportRows(payload) && isMixedGradeReportQuestion(folded)) return true;
  const res = resolveReportRowFromUtterance(utterance, payload);
  if (res.best && res.bestScore >= 8) return true;
  if (res.subjectId && !res.best && /איך\s+הוא|איך\s+היא|מה\s+המצב|מה\s+קורה|במקצוע/u.test(folded)) {
    return true;
  }
  if (res.best && /תסביר|הסבר|מה\s+הבעיה|מה\s+לעשות|רוצה\s+לדעת|רוצה\s+להבין/u.test(folded)) {
    return true;
  }
  return false;
}

export default {
  listReportRows,
  hasAnchoredReportRows,
  resolveReportRowFromUtterance,
  stripTopicInquiryPrefixes,
  isGeneralReportQuestion,
  isMixedGradeReportQuestion,
  isVagueTopicSelectionRequest,
  buildTopicClarificationQuestionHe,
  utteranceQualifiesAsReportQuestion,
  SUBJECT_HE_ALIASES,
  TOPIC_HE_ALIASES,
};
