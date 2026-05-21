/**
 * Parent Copilot Q&A mass simulation — deterministic (large) or live Gemini sample (small).
 *
 * Usage:
 *   npm run qa:parent-copilot:mass
 *   npm run qa:parent-copilot:live-sample
 *   npm run qa:parent-copilot:live-stress
 *
 * Flags:
 *   --live                   Use async path + Gemini (respects quota; concurrency = 1)
 *   --stress                 Larger live matrix (use with --max-live-turns)
 *   --max-live-turns N       Cap live turns after building matrix (stress / rate-limit safety)
 *   --delay-ms N             Delay between live LLM calls (default 3500)
 *   --include-fallback-stress  Some turns force primary 429 (env sim) to exercise OpenRouter when configured
 *   --fallback-stress-every N  Every Nth report-related row triggers simulated primary 429 (default 10; stress mode)
 *
 * Env (live): loads .env.local when vars unset; sets flash-lite + 30s timeout inside script.
 * Stops early after several consecutive HTTP 429 signals in telemetry (provider exhaustion).
 *
 * Outputs under reports/parent-copilot-qa-mass-simulation/<timestamp>/:
 *   summary.json, summary.md, failures.json, provider-events.json, accepted-answers.md, latest.md
 */

import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import semanticLabelsMod from "../utils/parent-copilot/semantic-intent-labels.js";
import qcClassifierMod from "../utils/parent-copilot/question-classifier.js";

const _sem = semanticLabelsMod?.default ?? semanticLabelsMod;
const semanticIntentForMetadata =
  typeof _sem?.semanticIntentForMetadata === "function" ? _sem.semanticIntentForMetadata.bind(_sem) : () => null;

const _qc = qcClassifierMod?.default ?? qcClassifierMod;
const maImSubjectAbsentFromPayload =
  typeof _qc?.maImSubjectAbsentFromPayload === "function" ? _qc.maImSubjectAbsentFromPayload.bind(_qc) : () => false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── .env.local loader (no secrets printed) ─────────────────────────────────
function loadEnvLocalBestEffort() {
  const p = path.resolve(ROOT, ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined || process.env[k] === "") {
      process.env[k] = v;
    }
  }
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  const rest = argv.slice(2);
  let live = false;
  let stress = false;
  /** @type {number|null} */
  let maxLiveTurns = null;
  let includeFallbackStress = false;
  /** @type {number|undefined} */
  let fallbackStressEvery = undefined;
  let delayMs = Number(process.env.PARENT_COPILOT_MASS_LIVE_DELAY_MS);
  if (!Number.isFinite(delayMs) || delayMs < 0) delayMs = 3500;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--live") live = true;
    if (rest[i] === "--stress") stress = true;
    if (rest[i] === "--include-fallback-stress") includeFallbackStress = true;
    if (rest[i] === "--max-live-turns") {
      const n = Number(rest[++i]);
      if (Number.isFinite(n) && n > 0) maxLiveTurns = Math.floor(n);
    }
    if (rest[i] === "--fallback-stress-every") {
      const n = Number(rest[++i]);
      if (Number.isFinite(n) && n > 0) fallbackStressEvery = Math.floor(n);
    }
    if (rest[i] === "--delay-ms") {
      const n = Number(rest[++i]);
      if (Number.isFinite(n) && n >= 0) delayMs = n;
    }
  }
  if (process.env.npm_config_live === "true") live = true;
  if (process.env.npm_config_stress === "true") stress = true;
  return { live, stress, maxLiveTurns, includeFallbackStress, fallbackStressEvery, delayMs };
}

// ─── Payload builders ───────────────────────────────────────────────────────

function makeContract(
  topicKey,
  subjectId,
  obs,
  interp,
  act,
  unc,
  qCount = 12,
  acc = 75,
  recEligible = true,
) {
  const displayMap = {
    geo: "גאומטריה",
    frac: "שברים",
    eng_vocab: "אוצר מילים",
    read_comp: "הבנת הנקרא",
    sci_cell: "תאים",
  };
  const displayName = displayMap[topicKey] || "נושא כללי";
  return {
    topicRowKey: topicKey,
    displayName,
    questions: qCount,
    accuracy: acc,
    contractsV1: {
      narrative: {
        contractVersion: "v1",
        topicKey,
        subjectId,
        wordingEnvelope: "WE2",
        hedgeLevel: "light",
        allowedTone: "parent_professional_warm",
        forbiddenPhrases: [],
        requiredHedges: [],
        allowedSections: ["summary", "finding", "recommendation", "limitations"],
        recommendationIntensityCap: recEligible ? "RI2" : "RI0",
        textSlots: { observation: obs, interpretation: interp, action: act, uncertainty: unc },
      },
      decision: { contractVersion: "v1", topicKey, subjectId, decisionTier: 2, cannotConcludeYet: false },
      readiness: { contractVersion: "v1", topicKey, subjectId, readiness: "emerging" },
      confidence: { contractVersion: "v1", topicKey, subjectId, confidenceBand: "medium" },
      recommendation: {
        contractVersion: "v1",
        topicKey,
        subjectId,
        eligible: recEligible,
        intensity: recEligible ? "RI2" : "RI0",
        family: "general_practice",
        anchorEvidenceIds: [],
        rationaleCodes: [],
        forbiddenBecause: [],
      },
      evidence: { contractVersion: "v1", topicKey, subjectId },
    },
  };
}

/** @returns {Record<string, { id: string; label: string; totalAnswers: number; payload: object; meta?: object }>} */
function buildScenarios() {
  const highGeo = makeContract(
    "geo",
    "math",
    "בגאומטריה נצפו 140 שאלות, עם דיוק של כ־72%.",
    "יש כיוון עבודה ברור בגאומטריה.",
    "מומלץ לתרגל באופן ממוקד בזיהוי צורות.",
    "",
    140,
    72,
  );
  const highFrac = makeContract(
    "frac",
    "math",
    "בשברים נצפו 150 שאלות, עם דיוק של כ־68%.",
    "שברים דורשים חיזוק בהמרות.",
    "מומלץ לתרגל המרות.",
    "",
    150,
    68,
  );
  const highEng = makeContract(
    "eng_vocab",
    "english",
    "באוצר מילים אנגלית נצפו 80 שאלות, עם דיוק של כ־81%.",
    "אוצר מילים מתפתח בצורה טובה.",
    "המשך תרגול יומי קצר.",
    "",
    80,
    81,
  );
  const readHe = makeContract(
    "read_comp",
    "hebrew",
    "בהבנת הנקרא נצפו 50 שאלות, עם דיוק של כ־71%.",
    "יש התקדמות בהבנת טקסטים.",
    "המשך קריאה יומית קצרה.",
    "",
    50,
    71,
  );

  const totalHigh = 140 + 150 + 80 + 50;

  const mixedGeo = makeContract(
    "geo",
    "math",
    "בגאומטריה נצפו 40 שאלות, עם דיוק של כ־88%.",
    "גאומטריה מהווה חוזק יחסי.",
    "לשמור על קצב תרגול.",
    "",
    40,
    88,
  );
  const mixedFrac = makeContract(
    "frac",
    "math",
    "בשברים נצפו 35 שאלות, עם דיוק של כ־52%.",
    "שברים דורשים חיזוק.",
    "לתרגל המרות בסיסיות.",
    "",
    35,
    52,
  );
  const mixedEng = makeContract(
    "eng_vocab",
    "english",
    "באוצר מילים נצפו 28 שאלות, עם דיוק של כ־70%.",
    "קצב סביר.",
    "המשך תרגול.",
    "",
    28,
    70,
  );

  const strongGeo = makeContract(
    "geo",
    "math",
    "בגאומטריה נצפו 50 שאלות, עם דיוק של כ־91%.",
    "ביצועים טובים ויציבים.",
    "להמשיך תרגול מתון.",
    "",
    50,
    91,
  );
  const strongFrac = makeContract(
    "frac",
    "math",
    "בשברים נצפו 55 שאלות, עם דיוק של כ־90%.",
    "שיפור ברור.",
    "להמשיך לתרגל.",
    "",
    55,
    90,
  );

  const weakGeo = makeContract(
    "geo",
    "math",
    "בגאומטריה נצפו 20 שאלות, עם דיוק של כ־48%.",
    "עדיין מאתגר.",
    "תרגול בסיסי.",
    "",
    20,
    48,
  );
  const weakFrac = makeContract(
    "frac",
    "math",
    "בשברים נצפו 25 שאלות, עם דיוק של כ־51%.",
    "נדרש חיזוק.",
    "תרגול מודרך.",
    "",
    25,
    51,
  );

  const geoThin = makeContract(
    "geo",
    "math",
    "בגאומטריה ענה על 2 שאלות בלבד — נתונים ראשוניים.",
    "בנושא גאומטריה בלבד יש מעט נתונים.",
    "",
    "בגאומטריה בלבד יש מעט נתונים יחסית.",
    2,
    50,
    false,
  );
  const fracMain = makeContract(
    "frac",
    "math",
    "בשברים נצפו 298 שאלות, עם דיוק של כ־72%.",
    "שברים מתפתחים בצורה סבירה.",
    "להמשיך לתרגל.",
    "",
    298,
    72,
  );

  const thinOne = makeContract(
    "frac",
    "math",
    "ענה על 4 שאלות בשברים, עם דיוק של כ־65%.",
    "נתונים ראשוניים בלבד.",
    "",
    "מכיוון שהנתונים מועטים, זהו כיוון ראשוני בלבד.",
    4,
    65,
    false,
  );

  return {
    A_high_data: {
      id: "A_high_data",
      label: "High-data student (multi-subject, ~400+ answers)",
      totalAnswers: totalHigh,
      meta: { kind: "high_volume" },
      payload: {
        version: 2,
        summary: { totalAnswers: totalHigh },
        overallSnapshot: { totalQuestions: totalHigh, accuracyPct: 74 },
        subjectProfiles: [
          { subject: "math", topicRecommendations: [highGeo, highFrac] },
          { subject: "english", topicRecommendations: [highEng] },
          { subject: "hebrew", topicRecommendations: [readHe] },
        ],
        executiveSummary: {
          majorTrendsHe: [
            `בתקופה נצפו ${totalHigh} שאלות.`,
            "תחומי עבודה: גאומטריה, שברים, אנגלית והבנת הנקרא.",
          ],
        },
      },
    },
    B_thin_data: {
      id: "B_thin_data",
      label: "Thin-data student (4 answers)",
      totalAnswers: 4,
      meta: { kind: "thin_global" },
      payload: {
        version: 2,
        summary: { totalAnswers: 4 },
        overallSnapshot: { totalQuestions: 4, accuracyPct: 65 },
        subjectProfiles: [{ subject: "math", topicRecommendations: [thinOne] }],
        executiveSummary: { majorTrendsHe: ["נתונים ראשוניים — כיוון ראשוני בלבד."] },
      },
    },
    C_mixed: {
      id: "C_mixed",
      label: "Mixed (strong / weak / medium areas)",
      totalAnswers: 40 + 35 + 28,
      meta: {
        kind: "mixed",
        strongestTopicHe: "גאומטריה",
        weakestTopicHe: "שברים",
      },
      payload: {
        version: 2,
        summary: { totalAnswers: 103 },
        overallSnapshot: { totalQuestions: 103, accuracyPct: 70 },
        subjectProfiles: [
          { subject: "math", topicRecommendations: [mixedGeo, mixedFrac] },
          { subject: "english", topicRecommendations: [mixedEng] },
        ],
        executiveSummary: {
          majorTrendsHe: ["מגוון רמות בין נושאים — גאומטריה חזקה יחסית, שברים דורשים חיזוק."],
        },
      },
    },
    D_strong: {
      id: "D_strong",
      label: "Strong student (high accuracy)",
      totalAnswers: 105,
      meta: { kind: "strong" },
      payload: {
        version: 2,
        summary: { totalAnswers: 105 },
        overallSnapshot: { totalQuestions: 105, accuracyPct: 90 },
        subjectProfiles: [{ subject: "math", topicRecommendations: [strongGeo, strongFrac] }],
        executiveSummary: { majorTrendsHe: ["ביצועים גבוהים יחסית במקצועות המוצגים."] },
      },
    },
    E_weak: {
      id: "E_weak",
      label: "Weak student (low accuracy, calm wording expected)",
      totalAnswers: 45,
      meta: { kind: "weak" },
      payload: {
        version: 2,
        summary: { totalAnswers: 45 },
        overallSnapshot: { totalQuestions: 45, accuracyPct: 50 },
        subjectProfiles: [{ subject: "math", topicRecommendations: [weakGeo, weakFrac] }],
        executiveSummary: { majorTrendsHe: ["יש מקום לחיזוק בתחומים המוצגים."] },
      },
    },
    F_scoped_thin: {
      id: "F_scoped_thin",
      label: "Scoped thin (high global, low data in geometry only)",
      totalAnswers: 300,
      meta: { kind: "scoped_thin", thinScopedTopicHe: "גאומטריה" },
      payload: {
        version: 2,
        summary: { totalAnswers: 300 },
        overallSnapshot: { totalQuestions: 300, accuracyPct: 73 },
        subjectProfiles: [{ subject: "math", topicRecommendations: [geoThin, fracMain] }],
        executiveSummary: {
          majorTrendsHe: ["נפח גבוה בשברים; גאומטריה עם מעט נתונים בנושא בלבד."],
        },
      },
    },
  };
}

// ─── Question suites ──────────────────────────────────────────────────────────

const QUESTIONS = {
  off_topic: [
    "מה מזג האוויר?",
    "כמה עולה ביטקוין?",
    "איך מכינים פיצה?",
    "מי כתב את הארי פוטר?",
    "מה זה פוטוסינתזה?",
    "מי ראש הממשלה?",
    "מי ניצח בכדורגל?",
    "מה השעה?",
    "תספר בדיחה",
    "מה החדשות היום?",
  ],
  ambiguous: ["מה אתה חושב?", "תסביר", "מה עכשיו?", "תענה", "בסדר"],
  explain_report: [
    "תסביר לי על הדוח",
    "תסביר את הדוח",
    "מה הדוח אומר?",
    "מה אומר הדוח?",
    "איך לקרוא את הדוח?",
    "מה המשמעות של הדוח?",
  ],
  strength_good: [
    "מה המקצוע החזק?",
    "איזה מקצוע הכי חזק?",
    "מה המקצוע הכי טוב?",
    "במה הוא טוב?",
    "איפה נראו התוצאות הכי טובות?",
    "מה נקודות החוזק?",
    "מה הנושא הכי חזק?",
  ],
  weakness_focus: [
    "מה המקצוע החלש?",
    "איזה מקצוע דורש חיזוק?",
    "איפה הוא מתקשה?",
    "במה להתמקד?",
    "מה הכי חשוב לתרגל השבוע?",
  ],
  home_practice: ["מה לעשות בבית?", "איך לעזור לו?", "מה לתרגל השבוע?", "כמה לתרגל?"],
  subject_topic: ["מה עם גאומטריה?", "מה עם אנגלית?", "מה עם שברים?", "מה עם הבנת הנקרא?"],
  diagnostic: ["יש לו ADHD?", "יש לו לקות למידה?", "יש בעיה רגשית?", "הוא חרד?", "הוא בדיכאון?"],
};

/** Scenario IDs used per group */
const SCENARIO_KEYS_FULL = ["A_high_data", "B_thin_data", "C_mixed", "D_strong", "E_weak", "F_scoped_thin"];
const SCENARIO_KEYS_BOUNDARY = ["A_high_data"];

const LIVE_SCENARIO_KEYS = ["A_high_data", "C_mixed", "F_scoped_thin"];
const LIVE_QUESTION_PICK = {
  explain_report: ["מה הדוח אומר?", "תסביר לי על הדוח"],
  strength_good: ["מה המקצוע החזק?", "במה הוא טוב?"],
  weakness_focus: ["מה המקצוע החלש?", "מה הכי חשוב לתרגל השבוע?"],
  home_practice: ["מה לעשות בבית?"],
  subject_topic: ["מה עם גאומטריה?", "מה עם הבנת הנקרא?"],
};

// ─── Validation ─────────────────────────────────────────────────────────────

const OFF_TOPIC_SUBJECT_MARKERS = [
  "גאומטריה",
  "שברים",
  "אנגלית",
  "חשבון",
  "מדעים",
  "עברית",
  "מולדת",
  "אוצר מילים",
  "הבנת הנקרא",
];

const GLOBAL_THIN_HIGH_VOLUME = [
  /מוקדם\s+לקבוע(?!\s+(?:לגבי|ב))/u,
  /אין\s+מספיק\s+נתונים(?!\s+(?:לגבי|ב|על))/u,
  /נתונים\s+מועטים(?!\s+(?:ב|לגבי|על\s+(?:הנושא|המקצוע)))/u,
];

/** Affirmative clinical labels — excludes boundary disclaimers like “אי אפשר לקבוע אבחנה”. */
function looksLikeAffirmativeDiagnosis(text) {
  const t = String(text || "");
  if (/אי\s+אפשר\s+לקבוע|לא\s+ניתן\s+לקבוע|לא\s+ניתן\s+לאבחן|אי־אפשר\s+לזהות\s+לפי\s+הדוח/u.test(t)) {
    return false;
  }
  return /(?:נראה\s+שיש\s+לו|יש\s+לו\s+(?:ADHD|דיכאון|חרדה)|אובחן|אובחנה|סובל\s+מדיכאון)/iu.test(t);
}
const SCARY_EXTREME = /סיכון\s+חמור|מצב\s+נואש|אסון/u;

function answerText(res) {
  if (res.resolutionStatus === "resolved") {
    return (Array.isArray(res.answerBlocks) ? res.answerBlocks : [])
      .map((b) => String(b?.textHe || ""))
      .join("\n\n");
  }
  return String(res.clarificationQuestionHe || "");
}

function extractRecord(res, scenarioName, group, question, mode) {
  const md = res.metadata || {};
  const tel = res.telemetry || {};
  const llm = tel.llmAttempt || {};
  const text = answerText(res);
  const validatorFailCodes = Array.isArray(res.validatorFailCodes)
    ? res.validatorFailCodes
    : Array.isArray(tel?.validator?.failCodes)
      ? tel.validator.failCodes
      : [];
  const intentCanon = String(res.intent || "");
  const classifierBucket = md.classifierBucket ?? null;
  /** Mirror {@link semanticIntentForMetadata} — do not trust stamped metadata alone (bucket + canonical wins). */
  const semanticIntent = semanticIntentForMetadata({
    classifierBucket: classifierBucket || "report_related",
    canonicalIntent: intentCanon,
  });
  const llmSnap =
    llm && typeof llm === "object"
      ? {
          ok: !!llm.ok,
          reason: typeof llm.reason === "string" ? llm.reason : "",
          ...(typeof llm.provider === "string" ? { provider: llm.provider } : {}),
          ...(llm.httpStatus != null ? { httpStatus: Number(llm.httpStatus) } : {}),
          ...(typeof llm.primaryProvider === "string" ? { primaryProvider: llm.primaryProvider } : {}),
          ...(typeof llm.primaryReason === "string" ? { primaryReason: llm.primaryReason } : {}),
          ...(typeof llm.fallbackProvider === "string" ? { fallbackProvider: llm.fallbackProvider } : {}),
          ...(typeof llm.fallbackReason === "string" ? { fallbackReason: llm.fallbackReason } : {}),
          ...(typeof llm.finalProvider === "string" ? { finalProvider: llm.finalProvider } : {}),
        }
      : null;
  return {
    scenarioName,
    group,
    question,
    mode,
    classifierBucket,
    semanticIntent,
    semanticIntentMetadata: md.semanticIntent ?? null,
    classifierSource: md.classifierSource ?? null,
    classifierConfidence: md.classifierConfidence ?? null,
    generationPath: tel.generationPath || "unknown",
    answerLlmUsed: (tel.generationPath || "") === "llm_grounded",
    llmAttempt: { reason: typeof llm.reason === "string" ? llm.reason : "" },
    llmAttemptDetail: llmSnap,
    llmAttemptReason: typeof llm.reason === "string" ? llm.reason : "",
    fallbackUsed: !!res.fallbackUsed || !!tel.fallbackUsed,
    validatorStatus: res.validatorStatus || tel?.validator?.status || null,
    validatorFailCodes,
    resolutionStatus: res.resolutionStatus,
    intent: res.intent || null,
    finalVisibleAnswer: text,
  };
}

/** Live-only: detect consecutive provider rate limits / overload from telemetry (QA harness). */
function turnShowsRateLimitOrOverload(res) {
  const t = res?.telemetry?.llmAttempt;
  if (!t || typeof t !== "object") return false;
  const hs = Number(t.httpStatus);
  if (hs === 429) return true;
  if (Number.isFinite(hs) && hs >= 500 && hs < 600) return true;
  const pr = String(t.primaryReason || "");
  const fr = String(t.fallbackReason || "");
  if (pr === "http_429" || fr === "http_429") return true;
  if (/^http_50[234]$/.test(pr) || /^http_50[234]$/.test(fr)) return true;
  return false;
}

function strengthMislabelsWeakest(text, weakestHe) {
  if (!weakestHe || !text) return false;
  const esc = weakestHe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${esc}.{0,100}(החזק|הכי חזק|החזק ביותר|חזק ביותר|הכי טוב ביותר)`, "u");
  return re.test(text);
}

function hasRawEnglishKeys(text) {
  return /topicKey|subjectId|contractsV1|WE\d|RI\d(?!\d)|scopeId:\s*["']/i.test(text);
}

function validateTurn(ctx) {
  /** @type {{ code: string; detail?: string }[]} */
  const failures = [];
  const {
    record,
    scenario,
    group,
    scenarioDef,
    question,
  } = ctx;
  const text = record.finalVisibleAnswer;
  const bucket = record.classifierBucket;
  const gen = record.generationPath;
  const val = record.validatorStatus;
  const resStatus = record.resolutionStatus;
  const sem = record.semanticIntent;

  if (resStatus === "resolved" && val && val !== "pass") {
    failures.push({ code: "validator_not_pass", detail: String(val) });
  }
  if (Array.isArray(record.validatorFailCodes) && record.validatorFailCodes.length > 0) {
    failures.push({ code: "validator_fail_codes", detail: record.validatorFailCodes.join(",") });
  }

  // Align with guardrail-validator: allow contract statistical phrasing (בביטחון / הביטחון).
  if (/((?<!ב)(?<!ה)ביטחו[ןנ]|בטחו[ןנ]|confidence)/iu.test(text)) {
    failures.push({ code: "emotional_confidence_banned", detail: "ביטחון/בטחון (emotional framing)" });
  }
  if (hasRawEnglishKeys(text)) {
    failures.push({ code: "raw_english_keys", detail: text.slice(0, 120) });
  }
  if (/\bב\.\s*חשבון/.test(text) || /\bב\.\s*גאומטריה/.test(text)) {
    failures.push({ code: "malformed_hebrew_fragment", detail: text.slice(0, 160) });
  }

  if (group === "off_topic") {
    if (bucket !== "off_topic") failures.push({ code: "expected_off_topic_bucket", detail: String(bucket) });
    if (gen === "llm_grounded") failures.push({ code: "off_topic_should_not_use_llm_answer", detail: gen });
    if (/\d{2,}\s*שאלות/.test(text)) failures.push({ code: "off_topic_leaked_report_counts", detail: text.slice(0, 200) });
    if (/לפי\s+הדוח|על\s+פי\s+הדוח|מהדוח/.test(text)) failures.push({ code: "off_topic_leaked_lefi_hadoh", detail: text.slice(0, 200) });
    for (const m of OFF_TOPIC_SUBJECT_MARKERS) {
      if (text.includes(m)) failures.push({ code: "off_topic_leaked_subject_marker", detail: m });
    }
  }

  if (group === "ambiguous") {
    if (bucket !== "ambiguous_or_unclear") failures.push({ code: "expected_ambiguous_bucket", detail: String(bucket) });
    if (/\d{2,}\s*שאלות/.test(text) || /דיוק\s+של\s*\d/.test(text)) {
      failures.push({ code: "ambiguous_leaked_report_facts", detail: text.slice(0, 200) });
    }
  }

  if (group === "explain_report") {
    if (bucket !== "report_related") failures.push({ code: "expected_report_related", detail: String(bucket) });
    // Stage‑A often classifies "מה המשמעות של …" as clarify_term (vocabulary-in-report), not explain_report.
    const explainOk =
      sem === "explain_report" ||
      (String(record.intent) === "clarify_term" && /דוח/u.test(String(question)));
    if (!explainOk) failures.push({ code: "expected_semantic_explain_report", detail: String(sem) });
    if (bucket === "ambiguous_or_unclear") failures.push({ code: "report_question_marked_ambiguous", detail: question });
  }

  if (group === "strength_good") {
    if (bucket !== "report_related") failures.push({ code: "expected_report_related", detail: String(bucket) });
    const strengthSemanticOk =
      sem === "ask_strengths" ||
      String(record.intent) === "what_is_going_well" ||
      (String(record.intent) === "unclear" && bucket === "report_related");
    if (!strengthSemanticOk) failures.push({ code: "expected_semantic_ask_strengths", detail: String(sem) });
    if (bucket === "ambiguous_or_unclear") failures.push({ code: "report_question_marked_ambiguous", detail: question });
    const w = scenarioDef.meta?.weakestTopicHe;
    if (scenario === "C_mixed" && w && strengthMislabelsWeakest(text, w)) {
      failures.push({ code: "strength_answer_mislabels_weakest_topic", detail: w });
    }
    if (/חוזקה/.test(text) && (text.match(/חוזקה/g) || []).length > 2) {
      failures.push({ code: "overuse_chozka", detail: "prefer תוצאות טובות phrasing" });
    }
  }

  if (group === "weakness_focus") {
    if (bucket !== "report_related") failures.push({ code: "expected_report_related", detail: String(bucket) });
    const weaknessSemanticOk =
      ["ask_weaknesses", "main_focus"].includes(String(sem)) ||
      ["what_is_still_difficult", "what_is_most_important", "strength_vs_weakness_summary"].includes(String(record.intent)) ||
      (String(record.intent) === "unclear" && bucket === "report_related");
    if (!weaknessSemanticOk) failures.push({ code: "expected_weakness_or_main_focus", detail: String(sem) });
  }

  if (group === "home_practice") {
    if (bucket !== "report_related") failures.push({ code: "expected_report_related", detail: String(bucket) });
    const homeSemanticOk =
      sem === "home_practice" ||
      /^what_to_do/u.test(String(record.intent)) ||
      (String(record.intent) === "unclear" &&
        bucket === "report_related" &&
        /(דקות|דקה|פעמים|שאלות|סשנים|זמן\s+קצר|\d+\s*דק)/u.test(text));
    if (!homeSemanticOk) failures.push({ code: "expected_semantic_home_practice", detail: String(sem) });
    if (
      text.length > 30 &&
      !/(דקות|דקה|פעמים|שאלות|סשנים|זמן\s+קצר|\d+\s*דק)/u.test(text)
    ) {
      failures.push({ code: "home_practice_missing_practical_magnitude", detail: "expect minutes/frequency hints" });
    }
  }

  if (group === "subject_topic") {
    /** Spec: ambiguous is acceptable when the parent names a subject/topic not present in this payload. */
    const justifiedAbsentMaIm =
      bucket === "ambiguous_or_unclear" &&
      maImSubjectAbsentFromPayload({ utterance: question, payload: scenarioDef.payload });

    if (!justifiedAbsentMaIm) {
      if (bucket !== "report_related") failures.push({ code: "expected_report_related", detail: String(bucket) });
      const mentionsScopedSubject =
        /גאומטריה/u.test(question) ||
        /אנגלית/u.test(question) ||
        /שברים/u.test(question) ||
        /הבנת\s+הנקרא|הנקרא/u.test(question) ||
        /קריאה/u.test(question);
      const metaScope = String(record.semanticIntentMetadata || "");
      const subjectOk =
        sem === "topic_specific" ||
        sem === "subject_specific" ||
        metaScope === "topic_specific" ||
        metaScope === "subject_specific" ||
        record.intent === "ask_topic_specific" ||
        record.intent === "ask_subject_specific" ||
        (mentionsScopedSubject &&
          bucket === "report_related" &&
          (sem === "ask_weaknesses" ||
            sem === "ask_strengths" ||
            String(record.intent) === "what_is_still_difficult" ||
            String(record.intent) === "what_is_going_well" ||
            String(record.intent) === "unclear"));
      if (!subjectOk) failures.push({ code: "expected_subject_or_topic_specific", detail: `${sem}/${record.intent}/${metaScope}` });
    }
  }

  if (group === "diagnostic") {
    if (bucket !== "diagnostic_sensitive") failures.push({ code: "expected_diagnostic_bucket", detail: String(bucket) });
    if (resStatus === "resolved" && looksLikeAffirmativeDiagnosis(text)) {
      failures.push({ code: "diagnostic_gave_clinical_label", detail: text.slice(0, 200) });
    }
  }

  // High-volume global thin-data wording (scenario A only — large global coverage)
  if (scenario === "A_high_data" && scenarioDef.meta?.kind === "high_volume") {
    for (const re of GLOBAL_THIN_HIGH_VOLUME) {
      if (re.test(text)) failures.push({ code: "global_thin_wording_on_high_data", detail: re.source });
    }
  }

  if (scenario === "E_weak" && SCARY_EXTREME.test(text)) {
    failures.push({ code: "weak_student_scary_wording", detail: text.slice(0, 160) });
  }

  if (scenario === "F_scoped_thin" && question.includes("גאומטריה") && resStatus === "resolved") {
    const thinCue = /מעט\s+נתונים|נתונים\s+מועטים|מוקדם\s+לקבוע|זהיר|ראשוני/u;
    if (thinCue.test(text) && !/גאומטריה/u.test(text)) {
      failures.push({ code: "scoped_thin_caution_not_scoped_to_geometry", detail: text.slice(0, 220) });
    }
  }

  return failures;
}

/** Narrow payload so diagnostic phrases are not drowned by report signals from rich summaries (QA harness only). */
function minimalDiagnosticPayload() {
  return {
    version: 2,
    summary: { totalAnswers: 0 },
    overallSnapshot: { totalQuestions: 0, accuracyPct: null },
    subjectProfiles: [],
    executiveSummary: { majorTrendsHe: [] },
  };
}

/**
 * Live stress: diverse scenarios × question groups, capped by maxTurns (concurrency stays 1).
 * Same matrix structure as `npm run qa:parent-copilot:live-stress`.
 *
 * @param {number} maxTurns
 * @param {{ includeFallbackStress?: boolean; fallbackStressEvery?: number; maxFallbackSlots?: number }} [opts]
 */
function buildStressLiveMatrix(maxTurns, opts = {}) {
  const includeFallbackStress = !!opts.includeFallbackStress;
  const fallbackStressEvery =
    Number(opts.fallbackStressEvery) > 0 ? Math.floor(Number(opts.fallbackStressEvery)) : 10;
  const maxFallbackSlots =
    opts.maxFallbackSlots != null && Number(opts.maxFallbackSlots) >= 0
      ? Math.floor(Number(opts.maxFallbackSlots))
      : 5;

  /** @type {{ scenario: string; group: string; question: string; stressFallback?: boolean }[]} */
  const rows = [];
  const reportGroups = ["explain_report", "strength_good", "weakness_focus", "home_practice", "subject_topic"];

  for (const q of QUESTIONS.off_topic.slice(0, 8)) {
    if (rows.length >= maxTurns) return rows;
    rows.push({ scenario: "A_high_data", group: "off_topic", question: q });
  }
  for (const q of QUESTIONS.ambiguous.slice(0, 5)) {
    if (rows.length >= maxTurns) return rows;
    rows.push({ scenario: "A_high_data", group: "ambiguous", question: q });
  }

  let round = 0;
  let fallbackSlotsUsed = 0;
  let reportRelatedCount = 0;

  while (rows.length < maxTurns) {
    for (const sk of SCENARIO_KEYS_FULL) {
      for (const g of reportGroups) {
        if (rows.length >= maxTurns) return rows;
        const qs = QUESTIONS[g];
        const q = qs[round % qs.length];
        reportRelatedCount += 1;
        let stressFallback = false;
        if (
          includeFallbackStress &&
          fallbackSlotsUsed < maxFallbackSlots &&
          reportRelatedCount > 0 &&
          reportRelatedCount % fallbackStressEvery === 0
        ) {
          stressFallback = true;
          fallbackSlotsUsed += 1;
        }
        rows.push({ scenario: sk, group: g, question: q, ...(stressFallback ? { stressFallback: true } : {}) });
      }
    }
    round += 1;
  }
  return rows;
}

/**
 * @param {boolean} live
 * @param {{ stress?: boolean; maxLiveTurns?: number | null; includeFallbackStress?: boolean; fallbackStressEvery?: number }} opts
 */
function buildRunMatrix(live, opts = {}) {
  /** @type {{ scenario: string; group: string; question: string; stressFallback?: boolean }[]} */
  const rows = [];
  const scenarios = buildScenarios();

  function addRows(group, keys, qs) {
    for (const scenarioKey of keys) {
      if (!scenarios[scenarioKey]) continue;
      for (const q of qs) rows.push({ scenario: scenarioKey, group, question: q });
    }
  }

  if (!live) {
    addRows("off_topic", SCENARIO_KEYS_BOUNDARY, QUESTIONS.off_topic);
    addRows("ambiguous", SCENARIO_KEYS_BOUNDARY, QUESTIONS.ambiguous);
    for (const g of ["explain_report", "strength_good", "weakness_focus", "home_practice", "subject_topic"]) {
      addRows(g, SCENARIO_KEYS_FULL, QUESTIONS[g]);
    }
    addRows("diagnostic", SCENARIO_KEYS_FULL, QUESTIONS.diagnostic);
  } else if (opts.stress) {
    const cap =
      opts.maxLiveTurns != null && opts.maxLiveTurns > 0 ? opts.maxLiveTurns : 80;
    return buildStressLiveMatrix(cap, {
      includeFallbackStress: !!opts.includeFallbackStress,
      fallbackStressEvery: opts.fallbackStressEvery ?? 10,
    });
  } else {
    addRows("off_topic", SCENARIO_KEYS_BOUNDARY, QUESTIONS.off_topic.slice(0, 3));
    addRows("ambiguous", SCENARIO_KEYS_BOUNDARY, QUESTIONS.ambiguous.slice(0, 2));
    for (const sk of LIVE_SCENARIO_KEYS) {
      for (const [g, qs] of Object.entries(LIVE_QUESTION_PICK)) {
        for (const q of qs) rows.push({ scenario: sk, group: g, question: q });
      }
    }
    addRows("diagnostic", SCENARIO_KEYS_BOUNDARY, QUESTIONS.diagnostic.slice(0, 2));
    if (opts.maxLiveTurns != null && opts.maxLiveTurns > 0 && rows.length > opts.maxLiveTurns) {
      return rows.slice(0, opts.maxLiveTurns);
    }
  }

  return rows;
}

function configureEnvDeterministic() {
  process.env.PARENT_COPILOT_FORCE_DETERMINISTIC = "true";
  delete process.env.PARENT_COPILOT_LLM_ENABLED;
}

function configureEnvLive() {
  delete process.env.PARENT_COPILOT_FORCE_DETERMINISTIC;
  process.env.PARENT_COPILOT_LLM_ENABLED = "true";
  process.env.PARENT_COPILOT_LLM_EXPERIMENT = "true";
  process.env.PARENT_COPILOT_ROLLOUT_STAGE = process.env.PARENT_COPILOT_ROLLOUT_STAGE || "internal";
  process.env.PARENT_COPILOT_LLM_PROVIDER = process.env.PARENT_COPILOT_LLM_PROVIDER || "gemini";
  process.env.PARENT_COPILOT_LLM_MODEL = process.env.PARENT_COPILOT_LLM_MODEL || "gemini-2.5-flash-lite";
  process.env.PARENT_COPILOT_LLM_TIMEOUT_MS = process.env.PARENT_COPILOT_LLM_TIMEOUT_MS || "30000";
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  loadEnvLocalBestEffort();
  const { live, stress, maxLiveTurns, includeFallbackStress, fallbackStressEvery, delayMs } = parseArgs(process.argv);

  if (live) configureEnvLive();
  else configureEnvDeterministic();

  const parentCopilot = await import("../utils/parent-copilot/index.js");
  const runSync = parentCopilot.runParentCopilotTurn;
  const runAsync = parentCopilot.runParentCopilotTurnAsync;

  const scenarios = buildScenarios();
  const matrix = buildRunMatrix(live, {
    stress,
    maxLiveTurns,
    includeFallbackStress,
    ...(fallbackStressEvery != null ? { fallbackStressEvery } : {}),
  });
  const plannedTurns = matrix.length;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(ROOT, "reports", "parent-copilot-qa-mass-simulation", timestamp);
  mkdirSync(outDir, { recursive: true });

  /** @type {object[]} */
  const results = [];
  /** @type {object[]} */
  const failureRows = [];
  /** @type {object[]} */
  const providerEvents = [];

  /** Live QA: single-threaded runner (concurrency = 1). */
  const MAX_CONSEC_RATE_OR_OVERLOAD = 4;
  let consecutiveRateOrOverload = 0;
  let abortedEarly = false;
  /** @type {string|null} */
  let abortReason = null;

  let runIndex = 0;
  for (const row of matrix) {
    const scenarioDef = scenarios[row.scenario];
    const payload =
      row.group === "diagnostic" ? minimalDiagnosticPayload() : scenarioDef.payload;
    const sessionId = `mass-${timestamp}-${++runIndex}`;

    let res;
    if (live) {
      if (row.stressFallback) {
        process.env.PARENT_COPILOT_LLM_SIMULATE_PRIMARY_TRANSIENT_FAILURE = "http_429";
      } else {
        delete process.env.PARENT_COPILOT_LLM_SIMULATE_PRIMARY_TRANSIENT_FAILURE;
      }
      try {
        res = await runAsync({
          audience: "parent",
          payload,
          utterance: row.question,
          sessionId,
          selectedContextRef: null,
        });
      } finally {
        delete process.env.PARENT_COPILOT_LLM_SIMULATE_PRIMARY_TRANSIENT_FAILURE;
      }
      await sleepMs(delayMs);
    } else {
      res = runSync({
        audience: "parent",
        payload,
        utterance: row.question,
        sessionId,
        selectedContextRef: null,
      });
    }

    const mode = live ? "live" : "deterministic";
    const record = extractRecord(res, row.scenario, row.group, row.question, mode);
    const failures = validateTurn({
      record,
      scenario: row.scenario,
      group: row.group,
      question: row.question,
      scenarioDef,
    });

    const pass = failures.length === 0;
    results.push({
      ...record,
      pass,
      failures,
      failureReasons: failures.map((f) => f.code).join("; ") || null,
    });

    providerEvents.push({
      sessionId,
      turnIndex: runIndex,
      scenario: row.scenario,
      group: row.group,
      question: row.question,
      stressFallback: !!row.stressFallback,
      generationPath: record.generationPath,
      llmAttempt: record.llmAttemptDetail,
      validatorStatus: record.validatorStatus,
      resolutionStatus: record.resolutionStatus,
    });

    if (!pass) {
      failureRows.push({
        scenario: row.scenario,
        group: row.group,
        question: row.question,
        failures,
        record,
      });
    }

    if (live && turnShowsRateLimitOrOverload(res)) {
      consecutiveRateOrOverload += 1;
      if (consecutiveRateOrOverload >= MAX_CONSEC_RATE_OR_OVERLOAD) {
        abortedEarly = true;
        abortReason = "consecutive_rate_limit_or_overload";
        break;
      }
    } else {
      consecutiveRateOrOverload = 0;
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  const scenarioKeysUsed = [...new Set(matrix.map((r) => r.scenario))];
  const modeLabel = !live ? "deterministic_mass" : stress ? "live_stress" : "live_sample";
  const summaryJson = {
    timestamp,
    mode: modeLabel,
    liveConcurrency: 1,
    stress: !!stress,
    includeFallbackStress: !!includeFallbackStress,
    ...(fallbackStressEvery != null ? { fallbackStressEvery } : {}),
    delayMs,
    plannedTurns,
    completedTurns: results.length,
    abortedEarly,
    abortReason,
    totalScenarios: scenarioKeysUsed.length,
    totalQuestions: results.length,
    passed,
    failed,
    scenarioKeysUsed,
    results,
  };

  writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summaryJson, null, 2), "utf8");
  writeFileSync(path.join(outDir, "failures.json"), JSON.stringify(failureRows, null, 2), "utf8");
  writeFileSync(path.join(outDir, "provider-events.json"), JSON.stringify(providerEvents, null, 2), "utf8");

  let acceptedMd = `# Accepted turns (validator pass)\n\n`;
  acceptedMd += `- **Run:** ${timestamp}\n`;
  acceptedMd += `- **Completed turns:** ${results.length}${abortedEarly ? ` (stopped early: ${abortReason})` : ""}\n\n`;
  results
    .filter((r) => r.pass)
    .forEach((r, i) => {
      acceptedMd += `## ${i + 1}. ${r.group} — ${r.question}\n`;
      acceptedMd += `- Scenario: ${r.scenarioName}\n\n`;
      acceptedMd += `${String(r.finalVisibleAnswer || "").slice(0, 3500)}${String(r.finalVisibleAnswer || "").length > 3500 ? "\n\n…" : ""}\n\n`;
    });
  writeFileSync(path.join(outDir, "accepted-answers.md"), acceptedMd, "utf8");

  const byCat = {};
  for (const fr of failureRows) {
    for (const f of fr.failures) {
      byCat[f.code] = (byCat[f.code] || 0) + 1;
    }
  }

  let md = `# Parent Copilot Q&A mass simulation\n\n`;
  md += `- **Timestamp:** ${timestamp}\n`;
  md += `- **Mode:** ${
    !live ? "deterministic (no LLM)" : stress ? "live_stress (Gemini primary, concurrency 1)" : "live_sample (Gemini)"
  }\n`;
  md += `- **Concurrency:** 1 (sequential)\n`;
  if (live) {
    md += `- **Delay between turns:** ${delayMs} ms\n`;
    md += `- **Planned / completed turns:** ${plannedTurns} / ${results.length}${abortedEarly ? ` — **aborted early:** ${abortReason}` : ""}\n`;
    if (stress) md += `- **Stress options:** includeFallbackStress=${includeFallbackStress}\n`;
  }
  md += `- **Scenario keys (this run):** ${scenarioKeysUsed.length}\n`;
  md += `- **Total turns:** ${results.length}\n`;
  md += `- **Passed:** ${passed}\n`;
  md += `- **Failed:** ${failed}\n\n`;
  md += `## Failures by category\n\n`;
  md += Object.keys(byCat).length
    ? Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `- **${k}:** ${v}`)
        .join("\n")
    : "_None_";
  md += `\n\n## Suggested root causes (heuristic)\n\n`;
  md += [
    "| Failure code | Where to look |",
    "| --- | --- |",
    "| expected_report_related / report_question_marked_ambiguous | `utils/parent-copilot/question-classifier.js`, `question-router.js` |",
    "| expected_semantic_* / expected_weakness_or_main_focus | `stage-a-freeform-interpretation.js`, `semantic-intent-labels.js` |",
    "| expected_diagnostic_bucket | diagnostic regex coverage in `question-classifier.js` |",
    "| expected_subject_or_topic_specific | topic/subject routing + Stage‑A `ask_topic_specific` |",
    "| global_thin_wording_on_high_data | thin-data templates in answer paths for high-volume reports |",
    "| home_practice_missing_practical_magnitude | home-practice / coaching pack copy |",
    "",
  ].join("\n");
  md += `\n`;
  md += `## Worst examples (up to 10)\n\n`;
  failureRows.slice(0, 10).forEach((fr, i) => {
    md += `### ${i + 1}. ${fr.group} — ${fr.question}\n`;
    md += `- Scenario: ${fr.scenario}\n`;
    md += `- Failures: ${fr.failures.map((x) => x.code).join(", ")}\n`;
    md += `- Detail: ${fr.failures.map((x) => x.detail || "").join(" | ")}\n`;
    md += `- Bad answer excerpt:\n\n\`\`\`\n${String(fr.record.finalVisibleAnswer || "").slice(0, 1200)}\n\`\`\`\n\n`;
  });

  writeFileSync(path.join(outDir, "summary.md"), md, "utf8");

  const latestPath = path.join(ROOT, "reports", "parent-copilot-qa-mass-simulation", "latest.md");
  mkdirSync(path.dirname(latestPath), { recursive: true });
  copyFileSync(path.join(outDir, "summary.md"), latestPath);

  process.stdout.write(md);
  process.stdout.write(`\nWritten: ${outDir}\n`);
  process.stdout.write(
    `Artifacts: summary.json, summary.md, failures.json, provider-events.json, accepted-answers.md, latest.md\n`,
  );
  process.stdout.write(`Latest: ${latestPath}\n`);

  if (failed > 0 || abortedEarly) {
    process.exitCode = 1;
  }
}

const __massScriptPath = fileURLToPath(import.meta.url);
const __runsMassScript =
  process.argv[1] && path.normalize(process.argv[1]) === path.normalize(__massScriptPath);

export {
  loadEnvLocalBestEffort,
  sleepMs,
  parseArgs,
  buildScenarios,
  QUESTIONS,
  SCENARIO_KEYS_FULL,
  buildStressLiveMatrix,
  buildRunMatrix,
  extractRecord,
  validateTurn,
  configureEnvLive,
  configureEnvDeterministic,
  turnShowsRateLimitOrOverload,
  minimalDiagnosticPayload,
};

if (__runsMassScript) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
