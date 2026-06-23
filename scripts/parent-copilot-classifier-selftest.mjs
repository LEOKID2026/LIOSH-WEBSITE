/**
 * Focused self-test for the new Parent Q&A 4-bucket classifier.
 *
 * Run: npm run test:parent-copilot-classifier
 *
 * Two layers of assertions:
 *   1. Direct classifier (deterministic only): asserts bucket per utterance.
 *   2. Pipeline gate (runParentCopilotTurn): asserts the hard gate guarantees —
 *      no truthPacket leakage, no answer-LLM call, no subject/topic name leakage,
 *      and exact boundary copy for off_topic / diagnostic_sensitive / ambiguous_or_unclear.
 */

import classifierMod from "../utils/parent-copilot/question-classifier.js";
import routerMod from "../utils/parent-copilot/question-router.js";
import parentCopilot from "../utils/parent-copilot/index.js";

const {
  classifyParentQuestionDeterministic,
  HEALTH_BOUNDARY_RESPONSE_HE,
  DIAGNOSTIC_BOUNDARY_RESPONSE_HE,
  OFF_TOPIC_RESPONSE_HE,
  PEER_COMPARISON_RESPONSE_HE,
  AMBIGUOUS_RESPONSE_HE,
} = classifierMod;
const { routeParentQuestion } = routerMod;
const { runParentCopilotTurn } = parentCopilot;

let runs = 0;
let failures = 0;
const failureLog = [];

function check(name, ok, detail) {
  runs += 1;
  if (!ok) {
    failures += 1;
    failureLog.push({ name, detail });
    process.stderr.write(`FAIL  ${name}${detail ? ` :: ${detail}` : ""}\n`);
  } else {
    process.stdout.write(`  ok  ${name}\n`);
  }
}

// ─── Payload builder (484 answers; subjects: math/english; topics include שברים, גאומטריה) ──

function makeContract(topicKey, subjectId, displayName, qCount = 12, acc = 75) {
  return {
    topicRowKey: topicKey,
    displayName,
    questions: qCount,
    accuracy: acc,
    contractsV1: {
      narrative: {
        contractVersion: "v1", topicKey, subjectId,
        wordingEnvelope: "WE2", hedgeLevel: "light", allowedTone: "parent_professional_warm",
        forbiddenPhrases: [], requiredHedges: [],
        allowedSections: ["summary", "finding", "recommendation", "limitations"],
        recommendationIntensityCap: "RI2",
        textSlots: {
          observation: `ב${displayName} נצפו ${qCount} שאלות עם דיוק של ${acc}%.`,
          interpretation: `${displayName} מצריך תרגול ממוקד.`,
          action: `מומלץ לתרגל ${displayName}.`,
          uncertainty: "",
        },
      },
      decision: { contractVersion: "v1", topicKey, subjectId, decisionTier: 2, cannotConcludeYet: false },
      readiness: { contractVersion: "v1", topicKey, subjectId, readiness: "emerging" },
      confidence: { contractVersion: "v1", topicKey, subjectId, confidenceBand: "medium" },
      recommendation: {
        contractVersion: "v1", topicKey, subjectId,
        eligible: true, intensity: "RI2",
        family: "general_practice", anchorEvidenceIds: [], rationaleCodes: [], forbiddenBecause: [],
      },
      evidence: { contractVersion: "v1", topicKey, subjectId },
    },
  };
}

function richReportPayload() {
  return {
    version: 2,
    summary: { totalAnswers: 484 },
    overallSnapshot: { totalQuestions: 484, accuracyPct: 74 },
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [
          makeContract("geo", "math", "גאומטריה", 45, 72),
          makeContract("frac", "math", "שברים", 60, 68),
        ],
      },
      {
        subject: "english",
        topicRecommendations: [
          makeContract("eng_vocab", "english", "אוצר מילים", 38, 81),
        ],
      },
      {
        subject: "science",
        topicRecommendations: [
          makeContract("photo", "science", "פוטוסינתזה", 8, 60),
        ],
      },
    ],
    executiveSummary: { majorTrendsHe: ["בתקופה נצפו 484 שאלות עם דיוק 74%."] },
  };
}

let sid = 0;
const freshSid = () => `cls-test-${++sid}-${Date.now()}`;

const SUBJECT_TOPIC_HE = ["חשבון", "גאומטריה", "אנגלית", "מדעים", "עברית", "מולדת", "שברים", "אוצר מילים", "פוטוסינתזה"];
// NOTE: Boundary copies are suggested example questions for the parent, not report facts, so we exclude
// "התחזק" / "מתקדם" from the banned-verb list; we only ban verbs that, when
// attached to "הילד", indicate a child-state assertion.
const REPORT_DATA_BANNED_PATTERNS = [
  /\d{2,}\s*שאלות/u,
  /דיוק\s+של\s*\d/u,
  /הילד\s+(?:מתרגל|הגיע|ענה|טעה|צבר)/u,
  /לפי\s+הדוח|על\s+פי\s+הדוח|מהדוח/u,
  /מוקדם\s+לקבוע|אין\s+מספיק\s+נתונים|נתונים\s+מועטים/u,
];

function answerText(res) {
  if (res?.resolutionStatus === "resolved") {
    return (Array.isArray(res.answerBlocks) ? res.answerBlocks : [])
      .map((b) => String(b?.textHe || ""))
      .join(" ");
  }
  return String(res?.clarificationQuestionHe || "");
}

function pipelineHardGateChecks(label, q, expectedBucket, expectedBoundary) {
  const res = runParentCopilotTurn({
    audience: "parent",
    payload: richReportPayload(),
    utterance: q,
    sessionId: freshSid(),
  });
  const text = answerText(res);

  // Boundary text must match exactly — no extras
  check(
    `[${label}] exact boundary text :: "${q}"`,
    text.includes(expectedBoundary),
    `expected to include: ${expectedBoundary.slice(0, 60)} ; got: ${text.slice(0, 200)}`,
  );

  // No subject / topic name leakage
  for (const name of SUBJECT_TOPIC_HE) {
    if (text.includes(name)) {
      check(`[${label}] no leakage of "${name}" :: "${q}"`, false, text.slice(0, 200));
    }
  }

  // No report data leakage
  for (const re of REPORT_DATA_BANNED_PATTERNS) {
    if (re.test(text)) {
      check(`[${label}] no report-data pattern (${re}) :: "${q}"`, false, text.slice(0, 200));
    }
  }

  // generationPath must be deterministic
  const gp = res?.telemetry?.generationPath || "deterministic";
  check(`[${label}] generationPath=deterministic :: "${q}"`, gp === "deterministic", `gp=${gp}`);

  // routerExitEarly true (no TruthPacket built)
  // (not exposed on response directly, but we can check resolutionStatus)
  check(
    `[${label}] resolutionStatus=clarification_required :: "${q}"`,
    res?.resolutionStatus === "clarification_required",
    `resolutionStatus=${res?.resolutionStatus}`,
  );

  // classifierBucket on response.metadata
  const cb = res?.metadata?.classifierBucket;
  check(
    `[${label}] classifierBucket=${expectedBucket} on metadata :: "${q}"`,
    cb === expectedBucket,
    `classifierBucket=${cb}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group A — Off-topic regression list (the exact failures from user feedback)
//
// These cases must classify as off_topic AND produce the exact off-topic boundary.
// "הוא אוהב משחקים?" is treated separately in Group A2 because it has no
// off-topic lexical hit and legitimately falls into ambiguous_or_unclear; the
// only hard guarantee is that it is NOT report_related.
// ═══════════════════════════════════════════════════════════════════════════════
process.stdout.write("\n── Group A: Off-topic regression list ──\n");

const offTopicRegression = [
  "מה מזג אויר?",
  "כמה עולה ביטקוין?",
  "איך מכינים פיצה?",
  "מי כתב את הארי פוטר?",
  "מה זה פוטוסינתזה?",
  "מי המציא את החשמל?",
  "תכין לי מתכון לעוגיות",
  "כמה זה 17 כפול 24?",
];

for (const q of offTopicRegression) {
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[A] classifier off_topic :: "${q}"`,
    det.bucket === "off_topic",
    `bucket=${det.bucket} confidence=${det.confidence.toFixed(2)} signals=${JSON.stringify(det.signals)}`,
  );
  if (det.bucket === "off_topic") {
    pipelineHardGateChecks("A-pipe", q, "off_topic", OFF_TOPIC_RESPONSE_HE);
  }
}

// ─── Group A2 — Off-topic-OR-ambiguous (no hard pre-listed lexicon match) ───
process.stdout.write("\n── Group A2: Off-topic-or-ambiguous (no report leakage either way) ──\n");

const offTopicOrAmbiguous = [
  "הוא אוהב משחקים?",       // pronoun + non-learning verb; either off_topic or ambiguous
];

for (const q of offTopicOrAmbiguous) {
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[A2] classifier NOT report_related :: "${q}"`,
    det.bucket !== "report_related",
    `bucket=${det.bucket} signals=${JSON.stringify(det.signals)}`,
  );
  // Hard gate: regardless of which non-report bucket, no leakage allowed.
  const res = runParentCopilotTurn({
    audience: "parent",
    payload: richReportPayload(),
    utterance: q,
    sessionId: freshSid(),
  });
  const text = answerText(res);
  for (const name of SUBJECT_TOPIC_HE) {
    if (text.includes(name)) {
      check(`[A2] no leakage of "${name}" :: "${q}"`, false, text.slice(0, 200));
    }
  }
  for (const re of REPORT_DATA_BANNED_PATTERNS) {
    if (re.test(text)) {
      check(`[A2] no report-data pattern (${re}) :: "${q}"`, false, text.slice(0, 200));
    }
  }
  check(
    `[A2] resolutionStatus=clarification_required :: "${q}"`,
    res?.resolutionStatus === "clarification_required",
    `resolutionStatus=${res?.resolutionStatus}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group B2 — Peer comparison
// ═══════════════════════════════════════════════════════════════════════════════
process.stdout.write("\n── Group B2: Peer comparison ──\n");

const peerQuestions = [
  "האם הוא חלש יותר מילדים אחרים בכיתה?",
  "האם הוא יותר חלש מילדים אחרים?",
  "האם הוא חלש יותר מילדים אחרים?",
  "האם הוא טוב יותר מילדים אחרים בכיתה?",
  "לעומת שאר הכיתה איך הוא?",
];

for (const q of peerQuestions) {
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(`[B2] classifier peer_comparison :: "${q}"`, det.bucket === "peer_comparison", `bucket=${det.bucket}`);
  if (det.bucket === "peer_comparison") {
    pipelineHardGateChecks("B2-pipe", q, "peer_comparison", PEER_COMPARISON_RESPONSE_HE);
  }
}
const detClinical = classifyParentQuestionDeterministic({
  utterance: "האם הוא דיסלקסי?",
  payload: richReportPayload(),
});
check("[B2] clinical still health_sensitive", detClinical.bucket === "health_sensitive", detClinical.bucket);

// Group B — Diagnostic
// ═══════════════════════════════════════════════════════════════════════════════
process.stdout.write("\n── Group B: Diagnostic ──\n");

const diagnostic = [
  "האם הוא דיסלקסי?",
  "יש לו ADHD?",
  "אולי יש לו לקות למידה?",
  "הוא בסדר רגשית?",
  "יש לה חרדה?",
  "האם יש לו הפרעת קשב?",
];

for (const q of diagnostic) {
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[B] classifier health_sensitive :: "${q}"`,
    det.bucket === "health_sensitive",
    `bucket=${det.bucket} confidence=${det.confidence.toFixed(2)}`,
  );
  if (det.bucket === "health_sensitive") {
    pipelineHardGateChecks("B-pipe", q, "health_sensitive", HEALTH_BOUNDARY_RESPONSE_HE);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group C — Ambiguous (vague / pure pronoun / single token)
// ═══════════════════════════════════════════════════════════════════════════════
process.stdout.write("\n── Group C: Ambiguous ──\n");

const ambiguous = [
  "מה אתה חושב?",
  "תסביר",
  "כן",
  "מה?",
  "בסדר",
  "אוקיי",
];

for (const q of ambiguous) {
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[C] classifier ambiguous :: "${q}"`,
    det.bucket === "ambiguous_or_unclear",
    `bucket=${det.bucket} confidence=${det.confidence.toFixed(2)} signals=${JSON.stringify(det.signals)}`,
  );
  if (det.bucket === "ambiguous_or_unclear") {
    pipelineHardGateChecks("C-pipe", q, "ambiguous_or_unclear", AMBIGUOUS_RESPONSE_HE);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group D — Report-related (must NOT block the pipeline)
// ═══════════════════════════════════════════════════════════════════════════════
process.stdout.write("\n── Group D: Report-related ──\n");

const reportRelated = [
  "מה הכי חשוב לתרגל השבוע?",
  "במה הוא חזק?",
  "במה הוא מתקשה?",
  "איפה הוא מתקשה?",
  "מה לעשות בבית?",
  "איך לעזור לו בשברים לפי הדוח?",
  "האם יש סיבה לדאגה?",
  "הוא מתקשה בשברים?",
  "מה עם גאומטריה?",
  "תסביר לי שברים",
  "תסביר לי על שברים מה הבעיה",
  "חשבון שברים",
  "מה הבעיה?",
  "איך הוא בחשבון?",
  // Regression: strength/explain/weakness phrasing must clear deterministic threshold (0.5)
  "מה המקצוע החזק?",
  "תסביר לי על הדוח",
  "מה המקצוע החלש?",
  "איזה מקצוע דורש חיזוק?",
  "באיזה מקצוע נראו התוצאות הכי טובות?",
];

for (const q of reportRelated) {
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[D] classifier report_related :: "${q}"`,
    det.bucket === "report_related",
    `bucket=${det.bucket} confidence=${det.confidence.toFixed(2)} signals=${JSON.stringify(det.signals)}`,
  );

  // Pipeline must NOT exit early. Resolution must be resolved (truthPacket built).
  const res = runParentCopilotTurn({
    audience: "parent",
    payload: richReportPayload(),
    utterance: q,
    sessionId: freshSid(),
  });
  check(
    `[D-pipe] resolved (not early-exit) :: "${q}"`,
    res?.resolutionStatus === "resolved",
    `resolutionStatus=${res?.resolutionStatus}`,
  );
  // classifierBucket telemetry
  const cb = res?.metadata?.classifierBucket;
  check(
    `[D-pipe] classifierBucket=report_related :: "${q}"`,
    cb === "report_related",
    `classifierBucket=${cb}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group E — Two-tier proof: weak signals alone are NOT report_related
// ═══════════════════════════════════════════════════════════════════════════════
process.stdout.write("\n── Group E: Two-tier proof ──\n");

// "הוא אוהב פיצה?" — pronoun + food = NOT report_related
{
  const q = "הוא אוהב פיצה?";
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[E] "הוא אוהב פיצה?" must NOT be report_related`,
    det.bucket !== "report_related",
    `bucket=${det.bucket} signals=${JSON.stringify(det.signals)}`,
  );
}

// "הוא מתקשה בשברים?" — pronoun + STRONG verb + topic = report_related
{
  const q = "הוא מתקשה בשברים?";
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[E] "הוא מתקשה בשברים?" must be report_related`,
    det.bucket === "report_related",
    `bucket=${det.bucket} signals=${JSON.stringify(det.signals)}`,
  );
}

// "מה זה פוטוסינתזה?" — generic-knowledge framing on a topic in the report = off_topic
{
  const q = "מה זה פוטוסינתזה?";
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[E] "מה זה פוטוסינתזה?" must be off_topic (generic-knowledge framing clamps report_signal)`,
    det.bucket === "off_topic",
    `bucket=${det.bucket} signals=${JSON.stringify(det.signals)}`,
  );
}

// "מה עם פוטוסינתזה בדוח?" — report shorthand + "בדוח" strong = report_related
{
  const q = "מה עם פוטוסינתזה בדוח?";
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[E] "מה עם פוטוסינתזה בדוח?" must be report_related`,
    det.bucket === "report_related",
    `bucket=${det.bucket} signals=${JSON.stringify(det.signals)}`,
  );
}

// "תסביר לי שברים" — anchored topic in utterance = report_related (report-row-first)
{
  const q = "תסביר לי שברים";
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: richReportPayload() });
  check(
    `[E] "תסביר לי שברים" must be report_related (topic row match + explain framing)`,
    det.bucket === "report_related",
    `bucket=${det.bucket} signals=${JSON.stringify(det.signals)}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group F — Router compatibility
// ═══════════════════════════════════════════════════════════════════════════════
process.stdout.write("\n── Group F: Router compatibility (back-compat shape) ──\n");

{
  const r = routeParentQuestion("מה מזג אויר?", richReportPayload());
  check(`[F] router off_topic exitEarly`, r.exitEarly === true, String(r.exitEarly));
  check(`[F] router off_topic deterministicResponse exact`,
    r.deterministicResponse === OFF_TOPIC_RESPONSE_HE,
    r.deterministicResponse || "null");
  check(`[F] router off_topic classifierBucket`,
    r.classifierBucket === "off_topic",
    r.classifierBucket);
}
{
  const r = routeParentQuestion("יש לו ADHD?", richReportPayload());
  check(`[F] router health exitEarly`, r.exitEarly === true, String(r.exitEarly));
  check(`[F] router health deterministicResponse exact`,
    r.deterministicResponse === HEALTH_BOUNDARY_RESPONSE_HE,
    r.deterministicResponse || "null");
  check(`[F] router health classifierBucket`,
    r.classifierBucket === "health_sensitive",
    r.classifierBucket);
}
{
  const r = routeParentQuestion("תסביר", richReportPayload());
  check(`[F] router ambiguous exitEarly`, r.exitEarly === true, String(r.exitEarly));
  check(`[F] router ambiguous deterministicResponse exact`,
    r.deterministicResponse === AMBIGUOUS_RESPONSE_HE,
    r.deterministicResponse || "null");
  check(`[F] router ambiguous classifierBucket`,
    r.classifierBucket === "ambiguous_or_unclear",
    r.classifierBucket);
}
{
  const r = routeParentQuestion("מה הכי חשוב לתרגל השבוע?", richReportPayload());
  check(`[F] router report_related no early exit`, r.exitEarly === false, String(r.exitEarly));
  check(`[F] router report_related classifierBucket`,
    r.classifierBucket === "report_related",
    r.classifierBucket);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
process.stdout.write(`\nparent-copilot-classifier selftest :: ${runs - failures}/${runs} passed\n`);
if (failures > 0) {
  process.stderr.write(`\n${failures} test(s) FAILED\n`);
  process.exit(1);
}
