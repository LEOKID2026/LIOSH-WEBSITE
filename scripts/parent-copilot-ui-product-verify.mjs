/**
 * Product verification: same Copilot engine + payload shape as the parent report UI.
 * Mirrors ParentCopilotPanel → runParentCopilotTurnAsync / runParentCopilotTurn(input).
 *
 * Run: npx tsx scripts/parent-copilot-ui-product-verify.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

async function load(rel) {
  const m = await import(pathToFileURL(join(ROOT, "..", rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const parentCopilot = await load("utils/parent-copilot/index.js");
const { routeParentQuestion, AMBIGUOUS_RESPONSE_HE } = await load("utils/parent-copilot/question-router.js");
const { resolveScope } = await load("utils/parent-copilot/scope-resolver.js");
const { buildTopicClarificationQuestionHe } = await load("utils/parent-copilot/report-row-resolver.js");

/** Same deterministic core as the panel; sync path avoids optional LLM upgrade latency in CI. */
const runTurn = parentCopilot.runParentCopilotTurn;

const AMBIGUOUS_LEAK = AMBIGUOUS_RESPONSE_HE.slice(0, 24);

function makeContract(topicRowKey, subjectId, displayName, qCount = 12, acc = 72, extra = {}) {
  const hasSubskill = extra.hasSubskillMetadata === true;
  const gradeSuffix =
    topicRowKey.includes("g4") ? " (כיתה ד׳)" : topicRowKey.includes("g5") ? " (תרגול בכיתה ה׳ — מעל הכיתה הרשומה)" : "";
  return {
    topicRowKey,
    displayName,
    questions: qCount,
    accuracy: acc,
    contentGradeKey: extra.contentGradeKey || null,
    gradeRelation: extra.gradeRelation || null,
    hasSubskillMetadata: hasSubskill,
    thinEvidenceDowngraded: false,
    contractsV1: {
      narrative: {
        textSlots: {
          observation: `ב${displayName}${gradeSuffix} נצפו ${qCount} שאלות עם דיוק של ${acc}%.`,
          interpretation: hasSubskill
            ? `בנושא ${displayName}${gradeSuffix} חוזר דפוס: השוואה לפי מונה בלבד.`
            : `${displayName}${gradeSuffix} — מצב הנושא ברור ברמת הכיתה, בלי פירוט תת־מיומנות מדויק.`,
          action: `מומלץ לתרגל ${displayName}${gradeSuffix}.`,
          uncertainty: hasSubskill
            ? ""
            : "יש מספיק מידע על מצב הנושא, אבל אין מספיק פירוט כדי לזהות את תת־המיומנות המדויקת.",
        },
      },
      evidence: { questionCount: qCount, accuracyPct: acc, subskillBreakdownAvailable: hasSubskill },
      decision: { cannotConcludeYet: false },
      readiness: { readiness: "emerging" },
      confidence: { confidenceBand: "medium" },
      recommendation: { eligible: true, intensity: "RI2" },
    },
  };
}

/** Grade-split payload from shared output-integrity fixture (no PDF topic names). */
async function screenshotGradeSplitPayload() {
  const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
  const { buildGradeSplitBaseReport } = await import(
    pathToFileURL(join(ROOT, "fixtures/parent-report-output-integrity-fixtures.mjs")).href
  );
  const { detailedReportToCopilotPayload } = await load(
    "utils/parent-report-output-integrity/trace-row-pipeline.js",
  );
  const detailed = buildDetailedParentReportFromBaseReport(buildGradeSplitBaseReport(), { period: "week" });
  return detailedReportToCopilotPayload(detailed);
}

/** Loaded-report shape passed to ParentCopilotShell `payload` prop. */
function uiLoadedReportPayload() {
  return {
    registeredGradeKey: "g4",
    gradePracticeMeta: {
      registeredGradeKey: "g4",
      mixedGradePractice: true,
      mixedGradePracticeNoteHe:
        "חלק מהתרגול בוצע בכיתה שונה מהכיתה הרשומה, ולכן הוא מוצג בנפרד.",
    },
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [
          makeContract("fractions::grade:g4", "math", "שברים", 20, 55),
          makeContract("fractions::grade:g5", "math", "שברים", 18, 40),
          makeContract("multiplication", "math", "כפל", 15, 70),
        ],
      },
      {
        subject: "english",
        topicRecommendations: [makeContract("grammar", "english", "דקדוק", 10, 80)],
      },
      {
        subject: "hebrew",
        topicRecommendations: [makeContract("reading", "hebrew", "הבנת הנקרא", 14, 65)],
      },
      {
        subject: "science",
        topicRecommendations: [makeContract("life", "science", "מדעים כללי", 8, 75)],
      },
      {
        subject: "geometry",
        topicRecommendations: [makeContract("shapes", "geometry", "צורות", 9, 78)],
      },
    ],
  };
}

let sid = 0;
const freshSid = () => `ui-verify-${++sid}`;

function answerText(res) {
  if (res?.resolutionStatus === "resolved") {
    return (res.answerBlocks || []).map((b) => String(b.textHe || "")).join("\n");
  }
  return String(res.clarificationQuestionHe || "");
}

function scopeFromTurn(res) {
  return {
    scopeType: res?.scopeType ?? res?.telemetry?.trace?.scopeType ?? null,
    scopeId: res?.scopeId ?? res?.telemetry?.trace?.scopeId ?? null,
    scopeReason: res?.telemetry?.scope?.reason || res?.metadata?.scopeReason,
    classifierBucket: res?.metadata?.classifierBucket,
  };
}

function uiTurn(utterance, payload) {
  const input = {
    audience: "parent",
    payload,
    utterance,
    sessionId: freshSid(),
    selectedContextRef: null,
    clickedFollowupFamily: null,
  };
  return runTurn(input);
}

function assertNoAmbiguousLeak(text, label) {
  assert.ok(
    !String(text).includes(AMBIGUOUS_LEAK),
    `${label}: must not leak generic ambiguous help copy`,
  );
}

// ─── Static UI wiring audit (no design changes) ─────────────────────────────

const panelSrc = readFileSync(join(ROOT, "../components/parent-copilot/parent-copilot-panel.jsx"), "utf8");
assert.ok(
  panelSrc.includes("runParentCopilotTurnAsync") || panelSrc.includes("runParentCopilotTurn"),
  "panel uses parent-copilot index turn runner",
);
assert.ok(!panelSrc.includes("localStorage") && !panelSrc.includes("sessionStorage"), "panel must not cache copilot answers in storage");

const shortReportSrc = readFileSync(join(ROOT, "../pages/learning/parent-report.js"), "utf8");
assert.ok(shortReportSrc.includes("copilotDetailedPayload"), "short report builds detailed payload for copilot");
assert.ok(shortReportSrc.includes("/api/parent/copilot-turn"), "short report API path for copilot when enabled");

const apiSrc = readFileSync(join(ROOT, "../pages/api/parent/copilot-turn.js"), "utf8");
assert.ok(apiSrc.includes("runParentCopilotTurnAsync"), "API uses async copilot engine");
assert.ok(apiSrc.includes("resolveCopilotTurnPayloadForApi"), "API resolves server payload (not stale client-only path)");

const resolverSrc = readFileSync(join(ROOT, "../utils/parent-copilot/report-row-resolver.js"), "utf8");
assert.ok(resolverSrc.includes("resolveReportRowFromUtterance"), "report-row resolver present in codebase");

process.stdout.write("UI wiring audit: panel→index.js, no answer cache, API→runParentCopilotTurnAsync\n");

// ─── Turn matrix (same as ParentCopilotPanel.submit) ─────────────────────────

function listTopicLabels(p) {
  const out = [];
  for (const sp of p.subjectProfiles || []) {
    for (const tr of sp.topicRecommendations || []) {
      if (tr?.displayName) out.push(String(tr.displayName));
    }
  }
  return out;
}

const payload = uiLoadedReportPayload();
const rows = listTopicLabels(payload);

const cases = [
  {
    id: 1,
    q: "תסביר לי על שברים מה הבעיה",
    run() {
      const scope = resolveScope({ payload, utterance: this.q });
      assert.equal(scope.scope?.scopeType, "topic");
      assert.match(String(scope.scope?.scopeLabel || ""), /שברים/);
      const res = uiTurn(this.q, payload);
      assert.equal(res.resolutionStatus, "resolved");
      assertNoAmbiguousLeak(answerText(res), this.q);
      const t = answerText(res);
      assert.ok(t.includes("שברים") || /\d/.test(t), "grounded topic/metrics");
      assert.ok(scopeFromTurn(res).scopeReason?.includes("report_row") || scope.scopeReason?.includes("report_row"));
    },
  },
  {
    id: 2,
    q: "חשבון שברים",
    run() {
      const res = uiTurn(this.q, payload);
      assert.equal(res.resolutionStatus, "resolved");
      assertNoAmbiguousLeak(answerText(res), this.q);
      const scope = resolveScope({ payload, utterance: this.q });
      assert.equal(scope.scope?.scopeType, "topic");
      assert.match(String(scope.scope?.scopeLabel || ""), /שברים/);
    },
  },
  {
    id: 3,
    q: "איך הוא בחשבון?",
    run() {
      const scope = resolveScope({ payload, utterance: this.q });
      assert.equal(scope.scope?.scopeType, "subject");
      assert.equal(scope.scope?.scopeId, "math");
      const res = uiTurn(this.q, payload);
      assert.equal(res.resolutionStatus, "resolved");
      assertNoAmbiguousLeak(answerText(res), this.q);
      const st = scopeFromTurn(res);
      if (st.scopeType != null) {
        assert.equal(st.scopeType, "subject", "must not scope to first math topic");
        assert.equal(st.scopeId, "math");
      }
      assert.ok(
        scope.scopeReason?.includes("report_row_subject") ||
          scope.scopeReason?.includes("utterance_subject") ||
          scope.scopeReason?.includes("aggregate_class"),
        "subject routing via report-row or aggregate path",
      );
    },
  },
  {
    id: 4,
    q: "מה הבעיה?",
    run() {
      const res = uiTurn(this.q, payload);
      assert.equal(res.resolutionStatus, "resolved");
      assertNoAmbiguousLeak(answerText(res), this.q);
      assert.ok(answerText(res).length >= 20, "general weakness answer");
    },
  },
  {
    id: 5,
    q: "מה הכי חשוב לתרגל השבוע?",
    run() {
      const res = uiTurn(this.q, payload);
      assert.equal(res.resolutionStatus, "resolved");
      assertNoAmbiguousLeak(answerText(res), this.q);
    },
  },
  {
    id: 6,
    q: "מה לעשות בבית?",
    run() {
      const res = uiTurn(this.q, payload);
      assert.equal(res.resolutionStatus, "resolved");
      assertNoAmbiguousLeak(answerText(res), this.q);
    },
  },
  {
    id: 7,
    q: "אני רוצה לדעת על נושא מסויים",
    run() {
      const route = routeParentQuestion(this.q, payload);
      assert.equal(route.exitEarly, true);
      const text = String(route.deterministicResponse || "");
      assert.ok(text.includes("על איזה נושא"), "short clarification");
      assertNoAmbiguousLeak(text, this.q);
      assert.ok(
        rows.some((r) => text.includes(r)) || text.includes("שברים") || text.includes("כפל"),
        "examples from loaded rows when possible",
      );
    },
  },
  {
    id: 8,
    q: "הוא תרגל כיתה אחרת?",
    run() {
      const res = uiTurn(this.q, payload);
      assert.equal(res.resolutionStatus, "resolved");
      assertNoAmbiguousLeak(answerText(res), this.q);
      const t = answerText(res);
      assert.ok(
        /כיתה|גבוה|נמוך|נפרד|תרגול/i.test(t) || t.includes("כיתה"),
        "mixed-grade awareness in answer",
      );
    },
  },
  {
    id: 9,
    q: "למה יש שתי כיתות באותו נושא?",
    run() {
      const res = uiTurn(this.q, payload);
      assert.equal(res.resolutionStatus, "resolved");
      assertNoAmbiguousLeak(answerText(res), this.q);
      const t = answerText(res);
      assert.ok(
        /כיתה|שברים|נפרד|גבוה|נמוך|שורות|תוכן|תרגול/i.test(t),
        `split-grade explanation :: ${t.slice(0, 120)}`,
      );
    },
  },
  {
    id: 10,
    q: "תסביר",
    run() {
      const route = routeParentQuestion(this.q, payload);
      assert.equal(route.classifierBucket, "ambiguous_or_unclear");
      assert.equal(route.exitEarly, true);
      assert.equal(route.deterministicResponse, AMBIGUOUS_RESPONSE_HE);
    },
  },
  {
    id: 11,
    q: "כן",
    run() {
      const route = routeParentQuestion(this.q, payload);
      assert.equal(route.classifierBucket, "ambiguous_or_unclear");
      assert.equal(route.exitEarly, true);
    },
  },
  {
    id: 12,
    q: "מה?",
    run() {
      const route = routeParentQuestion(this.q, payload);
      assert.equal(route.classifierBucket, "ambiguous_or_unclear");
      assert.equal(route.exitEarly, true);
    },
  },
  {
    id: 13,
    q: "מה הבעיה בנושא א׳?",
    async run() {
      const shot = await screenshotGradeSplitPayload();
      const res = uiTurn(this.q, shot);
      assert.equal(res.resolutionStatus, "resolved");
      assertNoAmbiguousLeak(answerText(res), this.q);
      const t = answerText(res);
      assert.ok(
        /שבר|367|66|38|87|כיתה|נושא/i.test(t),
        `grounded fractions/grade answer :: ${t.slice(0, 160)}`,
      );
      assert.ok(!/לאסוף עוד מידע|עדיין מוקדם לקבוע|אין מספיק מידע על המצב/u.test(t), "no thin-data phrasing on high-volume rows");
      assert.ok(
        (t.includes("367") && t.includes("87")) || (t.includes("66") && t.includes("38")) || /כיתה|מעל|נפרד/i.test(t),
        "must reference grade-split or both volume bands — not a single averaged score",
      );
      assert.ok(
        !t.includes("367") || !t.includes("38") || (t.includes("87") && t.includes("66")),
        "must not treat high-accuracy g4 row as the problem because of g5 failure",
      );
    },
  },
];

for (const c of cases) {
  await Promise.resolve(c.run());
  process.stdout.write(`  ok  UI case ${c.id}: ${c.q}\n`);
}

const clarify = buildTopicClarificationQuestionHe(payload);
assert.ok(clarify.includes("שברים"), "clarification examples include report row");

process.stdout.write("\nparent-copilot-ui-product-verify: ALL PASS\n");
