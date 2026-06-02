/**
 * Answer-first composed replies for aggregate question classes (ranking / listing / period).
 * Uses only payload.subjectProfiles numeric fields + executiveSummary lines; no new contract facts.
 */

import { SUBJECT_ORDER, normalizeSubjectId, subjectLabelHe } from "./contract-reader.js";

/**
 * @param {string} s
 */
function norm(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ");
}

function readinessScore(v) {
  const x = String(v || "").trim().toLowerCase();
  if (x === "ready") return 3;
  if (x === "emerging") return 2;
  if (x === "forming" || x === "partial" || x === "moderate") return 1;
  return 0;
}

function confidenceScore(v) {
  const x = String(v || "").trim().toLowerCase();
  if (x === "high") return 2;
  if (x === "medium" || x === "moderate") return 1;
  return 0;
}

/**
 * @param {unknown} payload
 */
function subjectRollups(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const bySubject = Object.fromEntries(profiles.map((sp) => [normalizeSubjectId(sp?.subject), sp]));
  /** @type {Array<{
   *   sid: string; label: string; totalQ: number; avg: number | null; topicRows: number; dataTopics: number;
   *   lowConfidenceTopics: number; insufficientTopics: number; cannotConcludeTopics: number; accStdDev: number | null;
   *   readinessAvg: number; confidenceAvg: number;
   * }>} */
  const rows = [];
  for (const sid of SUBJECT_ORDER) {
    const sp = bySubject[sid];
    if (!sp) continue;
    const list = Array.isArray(sp.topicRecommendations) ? sp.topicRecommendations : [];
    let totalQ = 0;
    let wAcc = 0;
    let dataTopics = 0;
    let lowConfidenceTopics = 0;
    let insufficientTopics = 0;
    let cannotConcludeTopics = 0;
    let readinessSum = 0;
    let confidenceSum = 0;
    /** @type {number[]} */
    const accList = [];
    for (const tr of list) {
      const q = Math.max(0, Number(tr?.questions ?? tr?.q) || 0);
      const acc = Math.max(0, Math.min(100, Math.round(Number(tr?.accuracy) || 0)));
      const cv = tr?.contractsV1 && typeof tr.contractsV1 === "object" ? tr.contractsV1 : {};
      const r = readinessScore(cv?.readiness?.readiness);
      const c = confidenceScore(cv?.confidence?.confidenceBand);
      readinessSum += r;
      confidenceSum += c;
      if (cv?.decision?.cannotConcludeYet === true) cannotConcludeTopics += 1;
      if (c <= 0) lowConfidenceTopics += 1;
      if (r <= 0) insufficientTopics += 1;
      if (q > 0) {
        totalQ += q;
        wAcc += acc * q;
        dataTopics += 1;
        accList.push(acc);
      }
    }
    if (totalQ <= 0) {
      const qFromSubject = Math.max(0, Number(sp?.subjectQuestionCount) || 0);
      const accFromSubject = Math.max(0, Math.min(100, Math.round(Number(sp?.subjectAccuracy) || 0)));
      if (qFromSubject > 0) {
        totalQ = qFromSubject;
        wAcc = accFromSubject * qFromSubject;
        dataTopics = Math.max(1, dataTopics);
      }
    }
    const avg = totalQ > 0 ? Math.round(wAcc / totalQ) : null;
    const mean = accList.length ? accList.reduce((a, b) => a + b, 0) / accList.length : null;
    const variance =
      mean == null
        ? null
        : accList.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / Math.max(1, accList.length);
    rows.push({
      sid,
      label: subjectLabelHe(sid),
      totalQ,
      avg,
      topicRows: list.length,
      dataTopics,
      lowConfidenceTopics,
      insufficientTopics,
      cannotConcludeTopics,
      accStdDev: variance == null ? null : Math.round(Math.sqrt(variance)),
      readinessAvg: list.length ? readinessSum / list.length : 0,
      confidenceAvg: list.length ? confidenceSum / list.length : 0,
    });
  }
  return rows;
}

/**
 * Subjects that appear in the report with at least one topic row (chronological order).
 * @param {unknown} payload
 */
function subjectsListedInReport(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const present = new Set(profiles.map((p) => normalizeSubjectId(p?.subject)).filter(Boolean));
  /** @type {string[]} */
  const out = [];
  for (const sid of SUBJECT_ORDER) {
    if (!present.has(sid)) continue;
    const sp = profiles.find((p) => normalizeSubjectId(p?.subject) === sid);
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    const subjectQ = Math.max(0, Number(sp?.subjectQuestionCount) || 0);
    if (list.length > 0 || subjectQ > 0) out.push(sid);
  }
  return out;
}

/**
 * @param {string} utterance
 * @param {unknown} payload
 * @returns {string[]} subject ids in order of first mention in utterance
 */
function subjectsMentionedInUtterance(utterance, payload) {
  const u = norm(utterance);
  const listed = subjectsListedInReport(payload);
  /** @type {Array<{ sid: string; idx: number; len: number }>} */
  const hits = [];
  for (const sid of listed) {
    const lab = subjectLabelHe(sid);
    const idx = u.indexOf(lab);
    if (idx >= 0) hits.push({ sid, idx, len: lab.length });
  }
  /** Informal wording parents use (e.g. «קריאה» ≈ עברית / אוריינות). Longer needles first. */
  const informalNeedles = [
    ["hebrew", "קריאת מילים"],
    ["hebrew", "קריאת משפטים"],
    ["hebrew", "הבנת הנקרא"],
    ["math", "מתמטיקה"],
    ["hebrew", "עברית"],
    ["english", "אנגלית"],
    ["science", "מדעים"],
    ["geometry", "גאומטריה"],
    ["moledet-geography", "מולדת וגאוגרפיה"],
    ["moledet-geography", "מולדת"],
    ["math", "חשבון"],
    ["hebrew", "קריאה"],
  ];
  for (const [sid, needle] of informalNeedles) {
    if (!listed.includes(sid)) continue;
    const idx = u.indexOf(needle);
    if (idx >= 0) hits.push({ sid, idx, len: needle.length });
  }
  hits.sort((a, b) => a.idx - b.idx || b.len - a.len);
  const seen = new Set();
  /** @type {string[]} */
  const ordered = [];
  for (const h of hits) {
    if (seen.has(h.sid)) continue;
    seen.add(h.sid);
    ordered.push(h.sid);
  }
  return ordered;
}

/**
 * @param {ReturnType<typeof subjectRollups>} rows
 */
function mostStableSubject(rows) {
  if (!rows.length) return null;
  const scored = rows.map((r) => {
    const qFactor = Math.min(1, Math.log10(Math.max(1, r.totalQ + 1)));
    const conf = r.confidenceAvg / 2;
    const read = r.readinessAvg / 3;
    const variancePenalty = r.accStdDev == null ? 0.45 : Math.min(1, r.accStdDev / 40);
    const score = conf * 0.45 + read * 0.35 + qFactor * 0.35 - variancePenalty * 0.35;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score || b.r.totalQ - a.r.totalQ);
  return scored[0]?.r || null;
}

/**
 * @param {NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>} truthPacket
 * @param {string} obs
 * @param {string} meaning
 */
function passesEnvelope(truthPacket, obs, meaning, caution = "") {
  const joined = `${obs} ${meaning} ${caution || ""}`;
  for (const ph of truthPacket?.allowedClaimEnvelope?.forbiddenPhrases || []) {
    if (ph && joined.includes(String(ph))) return false;
  }
  const nar = truthPacket?.contracts?.narrative;
  const slotText = [
    String(nar?.textSlots?.observation || ""),
    String(nar?.textSlots?.interpretation || ""),
    String(nar?.textSlots?.action || ""),
    String(nar?.textSlots?.uncertainty || ""),
  ].join(" ");
  const slotBundle = slotText + joined;
  for (const hedge of truthPacket?.allowedClaimEnvelope?.requiredHedges || []) {
    if (hedge && !slotBundle.includes(String(hedge))) return false;
  }
  return true;
}

/**
 * @param {NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>} truthPacket
 * @param {string} obs
 * @param {string} meaning
 */
function ensureRequiredHedges(truthPacket, obs, meaning) {
  let o = obs;
  let m = meaning;
  const req = Array.isArray(truthPacket?.allowedClaimEnvelope?.requiredHedges)
    ? truthPacket.allowedClaimEnvelope.requiredHedges.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  for (const h of req) {
    const bundle = `${o} ${m}`;
    if (h && !bundle.includes(h)) {
      o = `${h} ${o}`.trim();
    }
  }
  return { obs: o, meaning: m };
}

/** Keeps comparison answers direct-first: add required hedges to meaning tail, not observation lead. */
function ensureRequiredHedgesTrailing(truthPacket, obs, meaning) {
  let o = String(obs || "").trim();
  let m = String(meaning || "").trim();
  const req = Array.isArray(truthPacket?.allowedClaimEnvelope?.requiredHedges)
    ? truthPacket.allowedClaimEnvelope.requiredHedges.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  for (const h of req) {
    const bundle = `${o} ${m}`;
    if (h && !bundle.includes(h)) {
      m = `${m} · ${h}.`.trim();
    }
  }
  return { obs: o, meaning: m };
}

/**
 * @param {NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>} truthPacket
 */
function narrativeTextSlots(truthPacket) {
  const nar =
    truthPacket.contracts?.narrative?.textSlots && typeof truthPacket.contracts.narrative.textSlots === "object"
      ? truthPacket.contracts.narrative.textSlots
      : {};
  return {
    observation: String(nar.observation || "").trim(),
    interpretation: String(nar.interpretation || "").trim(),
    action: String(nar.action || "").trim(),
    uncertainty: String(nar.uncertainty || "").trim(),
  };
}

/**
 * Answer-first: plain-language re-explain from narrative slots (not generic report summary).
 * @param {{
 *   utterance?: string;
 *   truthPacket: NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>;
 * }} input
 * @returns {{ answerBlocks: Array<{ type: string; textHe: string; source: "composed" }> } | null}
 */
function buildClarifyReexplainDraft(input) {
  const truthPacket = input?.truthPacket;
  if (!truthPacket) return null;
  const { observation, interpretation, uncertainty } = narrativeTextSlots(truthPacket);
  const hedges = Array.isArray(truthPacket.allowedClaimEnvelope?.requiredHedges)
    ? truthPacket.allowedClaimEnvelope.requiredHedges.map((h) => String(h || "").trim()).filter(Boolean)
    : [];
  const lead = hedges[0] ? `${hedges[0]} — ` : "";

  /** @type {string} */
  let obs = "";
  /** @type {string} */
  let meaning = "";

  if (interpretation.length >= 8) {
    obs = `${lead}במילים פשוטות, זה אומר: ${interpretation}`;
  } else if (observation.length >= 8) {
    obs = `${lead}במילים פשוטות, זה אומר: מה שרואים בדוח הוא ש־${observation.charAt(0).toLowerCase()}${observation.slice(1)}`;
  } else if (uncertainty.length >= 8) {
    obs = `${lead}${uncertainty}`;
  } else {
    return null;
  }

  if (observation.length >= 8 && interpretation.length >= 8 && obs !== `${lead}${uncertainty}`) {
    meaning = `במסגרת המספרים בדוח: ${observation}`;
  } else if (uncertainty.length >= 8 && !obs.includes(uncertainty.slice(0, Math.min(24, uncertainty.length)))) {
    meaning = uncertainty;
  } else if (interpretation.length >= 8 && obs.includes(interpretation.slice(0, Math.min(24, interpretation.length))) && observation.length >= 8) {
    meaning = `רק כדי לעגן לדוח: ${observation}`;
  } else {
    meaning =
      uncertainty.length >= 8
        ? uncertainty
        : "זה עדיין תמונה מהדוח עצמו, בלי להוסיף הסבר שלא הופיע שם.";
  }

  ({ obs, meaning } = ensureRequiredHedges(truthPacket, obs, meaning));
  obs = norm(obs);
  meaning = norm(meaning);
  if (obs.length < 8 || meaning.length < 8) return null;
  if (!passesEnvelope(truthPacket, obs, meaning)) return null;
  return {
    answerBlocks: [
      { type: "observation", textHe: obs, source: "composed" },
      { type: "meaning", textHe: meaning, source: "composed" },
    ],
  };
}

/**
 * Answer-first: advance vs hold from derivedLimits + decision (bounded, parent language).
 * @param {{
 *   utterance?: string;
 *   truthPacket: NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>;
 * }} input
 * @returns {{ answerBlocks: Array<{ type: string; textHe: string; source: "composed" }> } | null}
 */
function buildAdvanceOrHoldDraft(input) {
  const truthPacket = input?.truthPacket;
  if (!truthPacket) return null;
  const dl = truthPacket.derivedLimits || {};
  const d =
    truthPacket.contracts?.decision && typeof truthPacket.contracts.decision === "object"
      ? truthPacket.contracts.decision
      : {};
  const tier = Number(d.decisionTier) || 0;
  const { observation, interpretation, uncertainty, action } = narrativeTextSlots(truthPacket);
  const hedges = Array.isArray(truthPacket.allowedClaimEnvelope?.requiredHedges)
    ? truthPacket.allowedClaimEnvelope.requiredHedges.map((h) => String(h || "").trim()).filter(Boolean)
    : [];
  const lead = hedges[0] ? `${hedges[0]} — ` : "";

  const holdStrong =
    dl.cannotConcludeYet === true ||
    dl.readiness === "insufficient" ||
    dl.confidenceBand === "low" ||
    tier < 2;

  const hasConcreteStep =
    dl.recommendationEligible === true &&
    dl.recommendationIntensityCap !== "RI0" &&
    action.length >= 8;

  /** @type {string} */
  let obs = "";
  /** @type {string} */
  let meaning = "";

  if (holdStrong) {
    obs = `${lead}כרגע עדיף להמתין ולא לדחוף התקדמות גדולה: בדוח עדיין אין בסיס מספיק יציב כדי לומר שכדאי «ללחוץ על הגז».`;
    meaning = norm(
      uncertainty ||
        interpretation ||
        (observation.length >= 8 ? `לפי מה שמופיע בדוח: ${observation}` : "אפשר להמשיך בתרגול רגיל ולבדוק שוב אחרי עוד קצת נתונים."),
    );
  } else if (hasConcreteStep) {
    obs = `${lead}אפשר להתקדם, אבל בזהירות ובצעדים קטנים — לא לקפוץ צעדים גדולים בבת אחת.`;
    const tail = interpretation.length >= 8 ? ` ${interpretation}` : "";
    meaning = norm(`${action}${tail}`);
  } else {
    obs = `${lead}אפשר להתקדם רק בקצב איטי: קצת תרגול, עצירה לבדיקה, ואז החלטה שוב לפי מה שיופיע בדוח.`;
    meaning = norm(
      interpretation ||
        uncertainty ||
        (observation.length >= 8 ? observation : "זה עדיין לא שלב לפתיחת יעדים חדשים שלא נבנו מהדוח."),
    );
  }

  ({ obs, meaning } = ensureRequiredHedges(truthPacket, obs, meaning));
  obs = norm(obs);
  meaning = norm(meaning);
  if (obs.length < 8 || meaning.length < 8) return null;
  if (!passesEnvelope(truthPacket, obs, meaning)) return null;
  return {
    answerBlocks: [
      { type: "observation", textHe: obs, source: "composed" },
      { type: "meaning", textHe: meaning, source: "composed" },
    ],
  };
}

/**
 * Answer-first: recommendation / next-step / focus questions from contract slots only.
 * @param {{
 *   utterance?: string;
 *   truthPacket: NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>;
 * }} input
 * @returns {{ answerBlocks: Array<{ type: string; textHe: string; source: "composed" }> } | null}
 */
function buildRecommendationActionDraft(input) {
  const truthPacket = input?.truthPacket;
  const utterance = String(input?.utterance || "");
  if (!truthPacket) return null;

  const t = norm(utterance).toLowerCase();
  const { action, interpretation: interp, uncertainty: unc } = narrativeTextSlots(truthPacket);

  const dl = truthPacket.derivedLimits || {};
  const eligible =
    dl.recommendationEligible === true &&
    dl.recommendationIntensityCap !== "RI0" &&
    dl.cannotConcludeYet !== true;

  const hedges = Array.isArray(truthPacket.allowedClaimEnvelope?.requiredHedges)
    ? truthPacket.allowedClaimEnvelope.requiredHedges.map((h) => String(h || "").trim()).filter(Boolean)
    : [];
  const lead = hedges[0] ? `${hedges[0]} — ` : "";

  /** @type {string} */
  let obs = "";
  /** @type {string} */
  let meaning = "";

  if (eligible && action) {
    obs = `${lead}${action}`;
    if (/השבוע|בשבוע|שבוע\s+הקרוב/.test(t)) {
      meaning = interp
        ? `${interp} במסגרת השבוע: לפרק את הצעד שמופיע בדוח ליחידות קטנות לאורך הימים, בלי להוסיף יעדים שלא מופיעים שם.`
        : `במסגרת השבוע: לפרק את הצעד שמופיע בדוח ליחידות קטנות לאורך הימים, בלי להוסיף יעדים שלא מופיעים שם.`;
    } else if (/עכשיו|היום|מיד|כרגע/.test(t) || /על\s+מה\s+להתמקד/.test(t)) {
      meaning = interp
        ? `${interp} כעת: להתחיל מהצעד שמופיע בדוח לפני הרחבה נוספת.`
        : `כעת: להתחיל מהצעד שמופיע בדוח לפני הרחבה נוספת.`;
    } else {
      meaning = interp
        ? `ההקשר מהדוח: ${interp} זהו הצעד המעשי שמופיע בדוח כרגע, בלי להרחיק מעבר למה שמוסבר שם בשלב הזה.`
        : `זהו הצעד המעשי שמופיע בדוח כרגע, בלי להרחיק מעבר למה שמוסבר שם בשלב הזה.`;
    }
  } else {
    if (dl.cannotConcludeYet === true) {
      obs = `${lead}עדיין מוקדם מדי בדוח כדי להציע צעד הבית הבא בצורה ברורה — התמונה עדיין לא סגורה.`;
    } else if (dl.recommendationEligible !== true || dl.recommendationIntensityCap === "RI0") {
      obs = `${lead}הדוח לא מכוון כרגע להמלצת צעד מוגדרת מהבית; במצב כזה נכון יותר להמשיך לתרגל ולאסוף עוד תמונה לפני שמחליטים מה הלאה.`;
    } else if (!action) {
      obs = `${lead}בדוח אין כרגע ניסוח מעשי של הצעד הבא — רק תיאור של מה שנראה עד כה.`;
    } else {
      obs = `${lead}לא הצלחנו לגזור מהדוח צעד הבית הבא בצורה ברורה; עדיף עוד קצת בסיס לפני שמחליטים.`;
    }
    meaning = unc || interp || `מומלץ לחזור לנושא אחרי עוד תרגול, או כשתופיע בדוח שורת כיוון ברורה יותר.`;
  }

  ({ obs, meaning } = ensureRequiredHedges(truthPacket, obs, meaning));
  obs = norm(obs);
  meaning = norm(meaning);
  if (obs.length < 8 || meaning.length < 8) return null;
  if (!passesEnvelope(truthPacket, obs, meaning)) return null;

  return {
    answerBlocks: [
      { type: "observation", textHe: obs, source: "composed" },
      { type: "meaning", textHe: meaning, source: "composed" },
    ],
  };
}

/**
 * @param {{
 *   questionClass: string;
 *   utterance?: string;
 *   payload: unknown;
 *   truthPacket: NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>;
 * }} input
 * @returns {{ answerBlocks: Array<{ type: string; textHe: string; source: "composed" }>; aggregateContinuity?: { questionClass: string; subjectId: string; role: string } | null } | null}
 */
export function buildSemanticAggregateDraft(input) {
  const qc = String(input?.questionClass || "");
  const utterance = String(input?.utterance || "");
  const payload = input?.payload;
  const truthPacket = input?.truthPacket;
  if (!truthPacket || !payload || typeof payload !== "object") return null;

  if (qc === "clarify_reexplain") {
    return buildClarifyReexplainDraft({ utterance, truthPacket });
  }
  if (qc === "advance_or_hold_question") {
    return buildAdvanceOrHoldDraft({ utterance, truthPacket });
  }
  if (qc === "recommendation_action") {
    return buildRecommendationActionDraft({ utterance, truthPacket });
  }

  if (
    qc !== "strongest_subject" &&
    qc !== "weakest_subject" &&
    qc !== "hardest_subject" &&
    qc !== "subject_listing" &&
    qc !== "period_highlight" &&
    qc !== "comparison" &&
    qc !== "most_practice" &&
    qc !== "least_data" &&
    qc !== "improved" &&
    qc !== "needs_attention" &&
    qc !== "still_unclear" &&
    qc !== "most_stable"
  ) {
    return null;
  }

  const hedges = Array.isArray(truthPacket.allowedClaimEnvelope?.requiredHedges)
    ? truthPacket.allowedClaimEnvelope.requiredHedges.map((h) => String(h || "").trim()).filter(Boolean)
    : [];
  const lead = hedges[0] ? `${hedges[0]} — ` : "";

  const roll = subjectRollups(payload);
  const withAvg = roll.filter((r) => r.avg != null);

  /** @type {string} */
  let obs = "";
  /** @type {string} */
  let meaning = "";
  /** @type {{ questionClass: string; subjectId: string; role: string } | null} */
  let aggregateContinuity = null;

  if (qc === "subject_listing") {
    const ids = subjectsListedInReport(payload);
    if (!ids.length) {
      obs = `${lead}בדוח לא מופיעים כרגע מקצועות עם שורות נושא.`;
      meaning = "כשיופיעו מקצועות בטווח התאריכים, אפשר לשאול שוב ולקבל רשימה מסודרת.";
    } else {
      const names = ids.map((sid) => subjectLabelHe(sid)).join(" · ");
      obs = `${lead}בדוח מופיעים המקצועות הבאים: ${names}.`;
      meaning = "הרשימה מבוססת על המקצועות שמוצגים בדוח לתקופה הנבחרה, לפי סדר התצוגה.";
    }
  } else if (qc === "period_highlight") {
    const es = payload?.executiveSummary && typeof payload.executiveSummary === "object" ? payload.executiveSummary : {};
    const trends = Array.isArray(es.majorTrendsHe)
      ? es.majorTrendsHe.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    if (trends.length) {
      obs = `מה שבולט ביותר בתקופה: ${trends.slice(0, 4).join(" · ")}.`;
      meaning = "אלה ניסוחי הסיכום לתקופה כפי שהם מופיעים בדוח; לפרטים לפי מקצוע אפשר לעבור למסך המקצועות.";
      aggregateContinuity = { questionClass: qc, subjectId: "", role: "period_highlight" };
    } else if (withAvg.length) {
      const sorted = [...withAvg].sort((a, b) => (b.avg || 0) - (a.avg || 0) || b.totalQ - a.totalQ);
      const top = sorted.slice(0, 2);
      obs = `הכי גבוהים כרגע בממוצע דירוג הדיוק הכללי בדוח: ${top.map((r) => `${r.label} (כ־${r.avg}%)`).join(" · ")}.`;
      meaning = "הדירוג מבוסס על ממוצעים על פני נושאים עם תרגול בכל מקצוע, לא על ניסוח נושא בודד.";
      aggregateContinuity = { questionClass: qc, subjectId: top[0]?.sid || "", role: "period_numeric" };
    } else {
      obs = `אין כרגע בדוח מספיק תרגול מספרי על פני מקצועות כדי לתאר «מה הכי בולט» בביטחון.`;
      meaning = "כשמופיעים נתוני תרגול לפחות בנושא אחד עם שאלות, אפשר לחזור לשאלה ולקבל תמונה ברורה יותר.";
    }
  } else if (qc === "comparison") {
    const mentioned = subjectsMentionedInUtterance(utterance, payload);
    if (mentioned.length < 2) {
      obs = `${lead} כדי להשוות בין שני מקצועות צריך לציין את שני השמות כפי שמופיעים אצלך בדוח.`;
      meaning = "אפשר לנסח שוב עם שני שמות מקצוע, או לשאול שאלה אחת על דירוג לפי קושי מול תוצאות טובות יחסית לפי הנתונים בדוח.";
    } else {
      const a = roll.find((r) => r.sid === mentioned[0]);
      const b = roll.find((r) => r.sid === mentioned[1]);
      if (!a || !b || a.avg == null || b.avg == null) {
        obs = `${lead} יש אזכור לשני מקצועות בשאלה, אבל בדוח חסרים מספיק נתוני תרגול מספריים לשניהם כדי להשוות בצורה יציבה.`;
        meaning = "כשמופיעים שאלות ודיוק לשני המקצועות, אפשר לשאול שוב ולקבל השוואה ישירה לפי הממוצעים בדוח.";
      } else if (a.avg === b.avg) {
        obs = `${lead} לפי הממוצעים בדוח, ${a.label} ו־${b.label} נמצאים כרגע על אותו קו מבחינת דיוק כללי (כ־${a.avg}%).`;
        meaning = "כדי להבדיל בין הכיוונים כדאי להסתכל גם על כמות השאלות בכל מקצוע ובניסוח הנושאים עצמם בדוח.";
      } else {
        const hi = a.avg > b.avg ? a : b;
        const lo = a.avg > b.avg ? b : a;
        obs = `${hi.label} גבוה יותר כרגע מ־${lo.label} — לפי ממוצע הדיוק הכללי בדוח (בערך ${hi.avg}% לעומת ${lo.avg}%).`;
        meaning = "ההשוואה מבוססת על ממוצעים על פני הנושאים שיש להם תרגול בדוח, לא על ניסוח של נושא בודד.";
        aggregateContinuity = { questionClass: qc, subjectId: hi.sid, role: "comparison_hi" };
      }
    }
  } else if (qc === "most_practice") {
    const listed = roll.filter((r) => r.topicRows > 0);
    if (!listed.length) {
      obs = `${lead}אין כרגע מקצועות פעילים בדוח לתקופה הנבחרה.`;
      meaning = "כשמופיעים מקצועות עם שורות נושא, אפשר לחזור לשאלה ולקבל דירוג תרגול.";
    } else {
      const best = [...listed].sort((a, b) => b.totalQ - a.totalQ || b.topicRows - a.topicRows)[0];
      obs = `הכי הרבה תרגול בדוח כרגע: ${best.label} (${best.totalQ} שאלות מתועדות).`;
      meaning = "הדירוג לפי כמות שאלות בפועל בדוח התקופה, לא לפי תחושת עומס.";
      aggregateContinuity = { questionClass: qc, subjectId: best.sid, role: "most_practice" };
    }
  } else if (qc === "least_data") {
    const listed = roll.filter((r) => r.topicRows > 0);
    if (!listed.length) {
      obs = `${lead}בדוח אין כרגע מקצועות פעילים עם נתונים להשוואה.`;
      meaning = "כשיופיעו מקצועות פעילים, אפשר לזהות במדויק איפה הנתונים הכי דלים.";
    } else {
      const weakestData = [...listed].sort((a, b) => a.totalQ - b.totalQ || a.dataTopics - b.dataTopics)[0];
      obs = `הכי מעט נתונים בדוח כרגע: ${weakestData.label} (${weakestData.totalQ} שאלות מתועדות).`;
      meaning = "זה סימן שיש מעט מדי נתונים בדוח התקופה; במקרה כזה נכון להיות זהירים במסקנות.";
      aggregateContinuity = { questionClass: qc, subjectId: weakestData.sid, role: "least_data" };
    }
  } else if (qc === "improved") {
    const es = payload?.executiveSummary && typeof payload.executiveSummary === "object" ? payload.executiveSummary : {};
    const trends = Array.isArray(es.majorTrendsHe)
      ? es.majorTrendsHe.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    const improvementLines = trends.filter((t) => /שיפור|התקדמות|עלייה|התחזק|משתפר/.test(t));
    if (improvementLines.length) {
      obs = `סימני שיפור שמופיעים בניסוח הסיכום לתקופה: ${improvementLines.slice(0, 3).join(" · ")}.`;
      meaning = "זו תשובה על בסיס שורות הסיכום בדוח בלבד, בלי להמציא מגמת זמן שלא הופיעה במפורש.";
      aggregateContinuity = { questionClass: qc, subjectId: "", role: "improved" };
    } else {
      const uImp = norm(utterance).toLowerCase();
      const mathRow = roll.find((r) => r.sid === "math");
      if (/מתמטיקה|חשבון/.test(uImp) && mathRow && mathRow.avg != null && mathRow.totalQ > 0) {
        obs = `${lead}בחשבון נספרו בטווח כ־${mathRow.totalQ} שאלות, עם דיוק ממוצע של כ־${mathRow.avg}% לפי הדוח.`;
        meaning =
          "מגמת שיפור מפורשת לא תמיד מופיעה כשורה נפרדת בדוח — עדיין אפשר לעגן לנפח ולדיוק במקצוע מתוך הנתונים שמוצגים.";
      } else {
        obs = `${lead}בדוח הנוכחי אין שורת מגמה מפורשת שמסמנת שיפור לאורך זמן.`;
        meaning = "כדי לענות על «מה השתפר» באופן חד יותר צריך או מגמות מפורשות בסיכום התקופה או השוואת תקופות.";
      }
    }
  } else if (qc === "needs_attention") {
    const atRisk = [...roll].sort((a, b) => {
      const aRisk = (a.avg == null ? 1 : 0) * 100 + (a.avg == null ? 0 : 100 - a.avg) + a.lowConfidenceTopics * 8 + a.insufficientTopics * 8;
      const bRisk = (b.avg == null ? 1 : 0) * 100 + (b.avg == null ? 0 : 100 - b.avg) + b.lowConfidenceTopics * 8 + b.insufficientTopics * 8;
      return bRisk - aRisk || a.totalQ - b.totalQ;
    })[0];
    if (!atRisk) {
      obs = `${lead}אין כרגע נתונים מספיקים בדוח כדי לזהות מוקד תשומת לב ברור.`;
      meaning = "כשמופיעים נתוני תרגול מלאים לפי מקצוע בדוח, אפשר לזהות מוקד שדורש תשומת לב.";
    } else {
      obs = `המוקד שדורש כרגע הכי הרבה חיזוק הוא ${atRisk.label}.`;
      meaning =
        atRisk.avg == null
          ? "הסיבה המרכזית היא שיש מעט מדי נתונים במקצוע הזה בתקופה הנוכחית."
          : `הדירוג מבוסס על שילוב של דיוק ממוצע (כ־${atRisk.avg}%) יחד עם סימני חוסר יציבות בדוח.`;
      aggregateContinuity = { questionClass: qc, subjectId: atRisk.sid, role: "needs_attention" };
    }
  } else if (qc === "still_unclear") {
    const unclear = roll.filter((r) => r.cannotConcludeTopics > 0 || r.lowConfidenceTopics > 0 || r.insufficientTopics > 0);
    if (!unclear.length) {
      obs = `${lead}אין כרגע בדוח סימן חזק לכך שמקצוע שלם עדיין לא ברור.`;
      meaning = "עדיין נכון להמשיך לתרגל ולבדוק, אבל אין כאן כרגע סימן מובהק מהדוח לחוסר בהירות.";
    } else {
      const names = unclear.map((r) => r.label).join(" · ");
      obs = `${lead}עדיין לא ברור מספיק בעיקר ב: ${names}.`;
      meaning = "הזיהוי מבוסס על סימנים של ספק לגבי הניסוח, עדיין לא ברור מספיק או מעט מדי נתונים שמופיעים בדוח עצמו.";
    }
  } else if (qc === "most_stable") {
    if (roll.length < 2) {
      obs = `${lead}בדוח מופיע כרגע מקצוע אחד בלבד, ולכן אי אפשר להשוות יציבות בין מקצועות.`;
      meaning = "אפשר עדיין לתאר את המצב במקצוע היחיד, אבל לא לקבוע מי «הכי יציב» בהשוואה.";
    } else {
      const stable = mostStableSubject(roll);
      if (!stable || stable.totalQ <= 0) {
        obs = `${lead}אין כרגע מספיק תרגול בכמה מקצועות כדי לקבוע מי הכי יציב.`;
        meaning = "צריך עוד שאלות ורצף תרגול רחב יותר כדי לבדוק יציבות בצורה אמינה.";
      } else {
        obs = `המקצוע היציב ביותר כרגע לפי נתוני התקופה בדוח הוא ${stable.label}.`;
        meaning = `ההערכה מבוססת על שילוב של כמות התרגול, יציבות הביצועים, הביטחון והבשלות לפי הדוח, לא על שורת נושא בודדת.`;
        aggregateContinuity = { questionClass: qc, subjectId: stable.sid, role: "most_stable" };
      }
    }
  } else {
    if (withAvg.length === 1 && (qc === "strongest_subject" || qc === "weakest_subject" || qc === "hardest_subject")) {
      const only = withAvg[0];
      const pct =
        only.avg == null
          ? "עדיין בלי ממוצע דיוק יציב שאפשר לסמוך עליו בביטחון"
          : `עם דיוק ממוצע של כ־${only.avg}%`;
      obs = `יש כרגע בעיקר מקצוע אחד עם מספיק תרגול מספרי בדוח — ${only.label}, ${pct}.`;
      if (qc === "strongest_subject") {
        meaning =
          "כשיש מקצוע אחד עם נתונים, «הכי חזק» פשוט מתאר את מה שמופיע בפועל במקצוע הזה, בלי השוואה לאחרים. כדי לדרג בין מקצועות צריך שיופיעו לפחות שני מקצועות עם תרגול בדוח.";
        aggregateContinuity = { questionClass: qc, subjectId: only.sid, role: "strongest" };
      } else if (qc === "weakest_subject") {
        meaning =
          "כשיש מקצוע אחד עם נתונים, «הכי חלש» לא אומר השוואה בין מקצועות — רק את הרף במקצוע היחיד שמופיע. להשוואה אמיתית צריך שני מקצועות ומעלה עם תרגול.";
        aggregateContinuity = { questionClass: qc, subjectId: only.sid, role: "weakest" };
      } else {
        meaning =
          "כשיש רק מקצוע אחד עם נתונים, «הכי קשה» מתייחס למצב בתוך המקצוע הזה מהדוח, לא למי נוח יותר לעומת מקצוע אחר.";
        aggregateContinuity = { questionClass: qc, subjectId: only.sid, role: "hardest" };
      }
    } else if (withAvg.length < 2) {
      obs = `${lead}בדוח אין כרגע מספיק תרגול מספרי על לפחות שני מקצועות שונים, ולכן לא נדרגים כאן מקצועות אחד מול השני.`;
      meaning = "כשמופיעים נתונים לשני מקצועות ומעלה, אפשר לשאול שוב ולקבל דירוג לפי הממוצעים שמוצגים בדוח.";
    } else {
      const sortedStrength = [...withAvg].sort((a, b) => (b.avg || 0) - (a.avg || 0) || b.totalQ - a.totalQ);
      const sortedWeak = [...withAvg].sort((a, b) => (a.avg || 0) - (b.avg || 0) || a.totalQ - b.totalQ);
      const strongest = sortedStrength[0];
      const weakest = sortedWeak[0];
      if (qc === "strongest_subject") {
        obs = `המקצוע החזק ביותר כרגע הוא ${strongest.label} — לפי ממוצע הדיוק הכללי על פני הנושאים עם תרגול בדוח (בערך ${strongest.avg}%).`;
        meaning = `המדד משקף ממוצע על כל שורות הנושא עם תרגול תחת ${strongest.label}, לא ניסוח של נושא בודד.`;
        aggregateContinuity = { questionClass: qc, subjectId: strongest.sid, role: "strongest" };
      } else if (qc === "weakest_subject") {
        obs = `המקצוע הנמוך ביותר כרגע הוא ${weakest.label} — לפי אותו ממוצע דיוק כללי על פני נושאים עם תרגול (בערך ${weakest.avg}%).`;
        meaning = "זה תיאור ברמת מקצוע מהדוח; לפרטים מדויקים לפי נושא צריך לפתוח את המקצוע בדוח.";
        aggregateContinuity = { questionClass: qc, subjectId: weakest.sid, role: "weakest" };
      } else {
        obs = `המקצוע שבו הכי «קשה» כרגע מבחינת התוצאות הוא ${weakest.label} — לפי ממוצע הדיוק הכללי בדוח (בערך ${weakest.avg}%).`;
        meaning = "כאן «קשה» מתורגם לפי הדיוק הממוצע בנושאים עם תרגול בדוח, לא לפי רושם בלי נתונים.";
        aggregateContinuity = { questionClass: qc, subjectId: weakest.sid, role: "hardest" };
      }
    }
  }

  const directOpenQ = new Set([
    "strongest_subject",
    "weakest_subject",
    "hardest_subject",
    "period_highlight",
    "comparison",
    "most_practice",
    "least_data",
    "improved",
    "needs_attention",
    "most_stable",
  ]);
  const uncSlot = String(truthPacket.contracts?.narrative?.textSlots?.uncertainty || "").trim();
  let cautionHe = "";
  let cautionSource = /** @type {"composed"|"contract_slot"} */ ("composed");
  if (directOpenQ.has(qc) && uncSlot.length >= 12) {
    cautionHe = norm(uncSlot.length <= 420 ? uncSlot : `${uncSlot.slice(0, 400)}…`);
    cautionSource = uncSlot.length <= 420 ? "contract_slot" : "composed";
  }

  if (directOpenQ.has(qc)) {
    ({ obs, meaning } = ensureRequiredHedgesTrailing(truthPacket, obs, meaning));
  } else {
    ({ obs, meaning } = ensureRequiredHedges(truthPacket, obs, meaning));
  }
  obs = norm(obs);
  meaning = norm(meaning);
  if (obs.length < 8 || meaning.length < 8) return null;
  if (!passesEnvelope(truthPacket, obs, meaning, cautionHe)) return null;

  /** @type {Array<{ type: string; textHe: string; source: "composed"|"contract_slot" }>} */
  const answerBlocks = [
    { type: "observation", textHe: obs, source: "composed" },
    { type: "meaning", textHe: meaning, source: "composed" },
  ];
  if (cautionHe) {
    answerBlocks.push({ type: "caution", textHe: cautionHe, source: cautionSource });
  }

  return {
    answerBlocks,
    aggregateContinuity,
  };
}

export default { buildSemanticAggregateDraft };
