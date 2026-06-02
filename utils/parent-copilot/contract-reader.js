/**
 * Helper-only: contract slices from detailed-report payload rows.
 * Not a TruthPacketV1 owner (see truth-packet-v1.js).
 */

export const SUBJECT_ORDER = [
  "math",
  "geometry",
  "english",
  "science",
  "hebrew",
  "moledet-geography",
];

export function normalizeSubjectId(subjectId) {
  const sid = String(subjectId || "").trim();
  if (sid === "moledet_geography") return "moledet-geography";
  return sid;
}

function shallowCopy(x) {
  if (x == null) return x;
  if (typeof x !== "object") return x;
  return { ...x };
}

/**
 * @param {unknown} tr
 */
export function contractsFromTopicRow(tr) {
  const cv = tr?.contractsV1 && typeof tr.contractsV1 === "object" ? tr.contractsV1 : {};
  return {
    evidence: shallowCopy(cv.evidence ?? null),
    decision: shallowCopy(cv.decision ?? null),
    readiness: shallowCopy(cv.readiness ?? null),
    confidence: shallowCopy(cv.confidence ?? null),
    recommendation: shallowCopy(cv.recommendation ?? null),
    narrative: shallowCopy(cv.narrative ?? null),
  };
}

/**
 * @param {unknown} payload
 * @returns {{ subject: string, tr: object } | null}
 */
export function findFirstAnchoredTopicRow(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const bySubject = Object.fromEntries(profiles.map((sp) => [normalizeSubjectId(sp?.subject), sp]));
  for (const sid of SUBJECT_ORDER) {
    const sp = bySubject[sid];
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of list) {
      const nar = tr?.contractsV1?.narrative;
      if (nar && typeof nar === "object" && String(nar?.textSlots?.observation || "").trim()) {
        return { subject: sid, tr };
      }
    }
  }
  return null;
}

/**
 * @param {unknown} payload
 * @returns {Array<{ subject: string, tr: object }>}
 */
export function listAllAnchoredTopicRows(payload) {
  /** @type {Array<{ subject: string, tr: object }>} */
  const out = [];
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const bySubject = Object.fromEntries(profiles.map((sp) => [normalizeSubjectId(sp?.subject), sp]));
  for (const sid of SUBJECT_ORDER) {
    const sp = bySubject[sid];
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of list) {
      const nar = tr?.contractsV1?.narrative;
      if (nar && typeof nar === "object" && String(nar?.textSlots?.observation || "").trim()) {
        out.push({ subject: sid, tr });
      }
    }
  }
  return out;
}

/**
 * @param {unknown} payload
 * @param {string} subjectId
 * @returns {{ subject: string, tr: object } | null}
 */
export function findFirstAnchoredTopicRowForSubject(payload, subjectId) {
  const sid = normalizeSubjectId(subjectId);
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const sp = profiles.find((p) => normalizeSubjectId(p?.subject) === sid);
  const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
  for (const tr of list) {
    const nar = tr?.contractsV1?.narrative;
    if (nar && typeof nar === "object" && String(nar?.textSlots?.observation || "").trim()) {
      return { subject: sid, tr };
    }
  }
  return null;
}

/**
 * @param {unknown} payload
 * @param {string} topicRowKey
 * @param {string} [subjectIdHint]
 * @returns {{ subject: string, tr: object } | null}
 */
export function findTopicRowByKey(payload, topicRowKey, subjectIdHint = "") {
  const key = String(topicRowKey || "").trim();
  if (!key) return null;
  const hint = normalizeSubjectId(subjectIdHint);
  if (hint) {
    const hit = findFirstAnchoredTopicRowForSubject(payload, hint);
    if (hit) {
      const k = String(hit.tr?.topicRowKey || hit.tr?.topicKey || "");
      if (k === key) return hit;
    }
  }
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
      const sid = normalizeSubjectId(sp?.subject);
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of list) {
      const k = String(tr?.topicRowKey || tr?.topicKey || "");
      if (k === key) {
        const nar = tr?.contractsV1?.narrative;
        if (nar && typeof nar === "object") return { subject: sid || hint, tr };
      }
    }
  }
  return null;
}

const SUBJECT_LABEL_HE = {
  math: "חשבון",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
  moledet_geography: "מולדת וגאוגרפיה",
};

export function subjectLabelHe(subjectId) {
  return SUBJECT_LABEL_HE[normalizeSubjectId(subjectId)] || "מקצוע";
}

/** Minimum answered questions in-window before we fabricate subject-level anchors from aggregates alone. */
export const COPILOT_MIN_AGGREGATE_QUESTIONS_FOR_SYNTHETIC_ANCHORS = 20;

/**
 * True when the detailed payload has enough answered practice to ground executive Copilot turns
 * without requiring narrative observation slots on every topic row.
 * @param {unknown} payload
 * @param {number} [minQuestions]
 */
export function hasAggregatePracticeEvidence(payload, minQuestions = COPILOT_MIN_AGGREGATE_QUESTIONS_FOR_SYNTHETIC_ANCHORS) {
  const os = payload?.overallSnapshot && typeof payload.overallSnapshot === "object" ? payload.overallSnapshot : null;
  const tq = Number(os?.totalQuestions ?? payload?.summary?.totalQuestions ?? 0);
  if (tq >= minQuestions) return true;
  let sum = 0;
  for (const sp of Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : []) {
    sum += Math.max(0, Number(sp?.subjectQuestionCount ?? sp?.questionCount ?? 0));
  }
  return sum >= minQuestions;
}

/**
 * When topic rows lack narrative observation text, still expose one row per subject with practice
 * so TruthPacket / Parent AI can personalize from numbers + labels (deterministic).
 * @param {unknown} payload
 * @returns {Array<{ subject: string; tr: object }>}
 */
export function listSyntheticAggregateAnchoredTopicRows(payload) {
  /** @type {Array<{ subject: string; tr: object }>} */
  const out = [];
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const bySubject = Object.fromEntries(profiles.map((sp) => [normalizeSubjectId(sp?.subject), sp]));
  for (const sid of SUBJECT_ORDER) {
    const sp = bySubject[sid];
    if (!sp) continue;
    const qc = Math.max(0, Number(sp.subjectQuestionCount ?? sp.questionCount ?? 0));
    if (qc <= 0) continue;
    const acc = Math.max(0, Math.min(100, Math.round(Number(sp.subjectAccuracy ?? sp.accuracy ?? 0))));
    const topics = Array.isArray(sp.topicRecommendations) ? sp.topicRecommendations : [];
    const baseTr = topics[0] && typeof topics[0] === "object" ? topics[0] : null;
    const displayName =
      String(baseTr?.displayName || "").trim() || `${subjectLabelHe(sid)} — סיכום תקופתי`;
    const topicRowKey = String(baseTr?.topicRowKey || baseTr?.topicKey || `aggregate-${sid}`).trim() || `aggregate-${sid}`;
    const cv0 = baseTr?.contractsV1 && typeof baseTr.contractsV1 === "object" ? baseTr.contractsV1 : {};
    const nar0 = cv0.narrative && typeof cv0.narrative === "object" ? cv0.narrative : {};
    const ts0 = nar0.textSlots && typeof nar0.textSlots === "object" ? nar0.textSlots : {};
    const obs =
      String(ts0.observation || "").trim() ||
      `ב${subjectLabelHe(sid)} נספרו בטווח כ־${qc} שאלות, עם דיוק של כ־${acc}% — זו התמונה שעולה מנתוני הדוח לתקופה הזו.`;
    const interp =
      String(ts0.interpretation || "").trim() ||
      `לפי מה שמופיע בדוח תחת ${subjectLabelHe(sid)}, ניתן לראות את נפח התרגול ואת רמת הדיוק בתקופה שנבחרה (בלי להסיק מוקד חולשה מחוץ למה שמוצג שם).`;
    const readinessRaw =
      qc >= 28 ? "ready" : qc >= 12 ? "forming" : qc >= 6 ? "forming" : "insufficient";
    const confRaw = acc >= 78 ? "high" : acc >= 58 ? "medium" : "low";
    const cannotConcludeYet = qc < 10 || acc < 38;
    const syntheticTr = {
      ...(baseTr && typeof baseTr === "object" ? baseTr : {}),
      topicRowKey,
      topicKey: topicRowKey,
      displayName,
      questions: qc,
      q: qc,
      accuracy: acc,
      contractsV1: {
        ...cv0,
        narrative: {
          ...nar0,
          contractVersion: nar0.contractVersion || "v1",
          textSlots: {
            ...ts0,
            observation: obs,
            interpretation: interp,
            uncertainty:
              String(ts0.uncertainty || "").trim() ||
              (cannotConcludeYet
                ? "עדיין יש מעט נקודות עם ניסוח זהיר ביחס לנפח — נבדוק שוב אחרי עוד תרגול בטווח."
                : "עדיין יש פער טבעי בין מה שנראה בבית לבין מה שנספר בדוח; נמשיך לעקוב לאורך כמה ימי תרגול."),
          },
        },
        readiness: {
          ...(cv0.readiness && typeof cv0.readiness === "object" ? cv0.readiness : {}),
          readiness: readinessRaw,
        },
        confidence: {
          ...(cv0.confidence && typeof cv0.confidence === "object" ? cv0.confidence : {}),
          confidenceBand: confRaw,
        },
        decision: {
          ...(cv0.decision && typeof cv0.decision === "object" ? cv0.decision : {}),
          cannotConcludeYet,
        },
      },
      __copilotSyntheticAggregate: true,
    };
    out.push({ subject: sid, tr: syntheticTr });
  }
  if (!out.length && hasAggregatePracticeEvidence(payload)) {
    const os = payload?.overallSnapshot && typeof payload.overallSnapshot === "object" ? payload.overallSnapshot : {};
    const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
    const tq = Math.max(
      0,
      Math.round(Number(os.totalQuestions ?? summary.totalAnswers ?? summary.totalQuestions ?? 0)),
    );
    const acc = Math.max(0, Math.min(100, Math.round(Number(os.accuracy ?? summary.accuracy ?? 0))));
    if (tq > 0) {
      const cannotConcludeYet = tq < 10 || acc < 38;
      const syntheticTr = {
        topicRowKey: "aggregate-executive-summary",
        topicKey: "aggregate-executive-summary",
        displayName: "סיכום כללי של התרגול",
        questions: tq,
        q: tq,
        accuracy: acc,
        contractsV1: {
          narrative: {
            contractVersion: "v1",
            textSlots: {
              observation: `בתקופה שנבחרה נענו כ־${tq} שאלות, עם דיוק כולל של כ־${acc}%. זהו סיכום כללי של התרגול שנאסף עד עכשיו.`,
              interpretation: `בשלב הזה אפשר להתייחס בעיקר להיקף התרגול ולדיוק הכללי, לפני שמסיקים מסקנות מפורטות לפי מקצוע או נושא.`,
              uncertainty: cannotConcludeYet
                ? "עדיין אין מספיק נתונים כדי להסיק מסקנה חזקה. כדאי לבדוק שוב אחרי עוד תרגול."
                : "ייתכן שיהיה פער בין מה שמרגישים בבית לבין מה שמופיע בדוח, לכן כדאי להמשיך לעקוב לאורך כמה ימי תרגול.",
            },
          },
          readiness: { readiness: tq >= 28 ? "ready" : tq >= 12 ? "forming" : "insufficient" },
          confidence: { confidenceBand: acc >= 78 ? "high" : acc >= 58 ? "medium" : "low" },
          decision: { cannotConcludeYet },
        },
        __copilotSyntheticAggregate: true,
      };
      out.push({ subject: "math", tr: syntheticTr });
    }
  }
  return out;
}

/**
 * Anchored topic rows for Copilot: prefer real narrative anchors; otherwise synthetic rows from subject aggregates
 * when there is enough practice evidence in-window.
 * @param {unknown} payload
 */
export function listCopilotAnchoredTopicRows(payload) {
  const real = listAllAnchoredTopicRows(payload);
  if (real.length) return real;
  if (!hasAggregatePracticeEvidence(payload)) return [];
  return listSyntheticAggregateAnchoredTopicRows(payload);
}

/**
 * @param {"topic"|"subject"|"executive"} scopeType
 * @param {string} scopeId
 * @param {string} [subjectId]
 * @param {unknown} payload
 * @returns {{ subjectId: string, topicRow: object, contracts: ReturnType<typeof contractsFromTopicRow> } | null}
 */
/**
 * Read-only mapping of intelligenceV1 for Copilot / planning (no decisions).
 * @param {unknown} unit — diagnosticEngineV2 unit (optional `intelligenceV1` sibling)
 * @returns {{ weaknessLevel: string, confidenceBand: string, recurrence: boolean }}
 */
export function getIntelligenceSignals(unit) {
  const iv = unit?.intelligenceV1;
  if (!iv || typeof iv !== "object") {
    return { weaknessLevel: "none", confidenceBand: "low", recurrence: false };
  }
  const p = iv.patterns && typeof iv.patterns === "object" ? iv.patterns : {};
  return {
    weaknessLevel: String(iv.weakness?.level || "none"),
    confidenceBand: String(iv.confidence?.band || "low"),
    recurrence: !!p.recurrenceFull,
  };
}

export function readContractsSliceForScope(scopeType, scopeId, subjectId, payload) {
  if (!payload || typeof payload !== "object") return null;
  if (scopeType === "topic") {
    const hit = findTopicRowByKey(payload, scopeId, subjectId);
    if (!hit) return null;
    return { subjectId: hit.subject, topicRow: hit.tr, contracts: contractsFromTopicRow(hit.tr) };
  }
  if (scopeType === "subject") {
    const sid = String(scopeId || subjectId || "").trim();
    const hit = findFirstAnchoredTopicRowForSubject(payload, sid);
    if (!hit) return null;
    return { subjectId: hit.subject, topicRow: hit.tr, contracts: contractsFromTopicRow(hit.tr) };
  }
  let hit = findFirstAnchoredTopicRow(payload);
  if (!hit) {
    const rows = listCopilotAnchoredTopicRows(payload);
    hit = rows[0] || null;
  }
  if (!hit) return null;
  return { subjectId: hit.subject, topicRow: hit.tr, contracts: contractsFromTopicRow(hit.tr) };
}

export default {
  readContractsSliceForScope,
  subjectLabelHe,
  normalizeSubjectId,
  SUBJECT_ORDER,
  listAllAnchoredTopicRows,
  listCopilotAnchoredTopicRows,
  listSyntheticAggregateAnchoredTopicRows,
  hasAggregatePracticeEvidence,
  COPILOT_MIN_AGGREGATE_QUESTIONS_FOR_SYNTHETIC_ANCHORS,
  findFirstAnchoredTopicRow,
  findFirstAnchoredTopicRowForSubject,
  findTopicRowByKey,
  contractsFromTopicRow,
  getIntelligenceSignals,
};
