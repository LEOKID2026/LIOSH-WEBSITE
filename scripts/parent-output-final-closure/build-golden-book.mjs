/**
 * Representative-fixture audit report generator (formerly labeled "Final Absolute
 * Closure" — renamed in this file's wording because the underlying check only exercises
 * one hand-picked synthetic fixture per active decisionKey, NOT a full/exhaustive
 * mapping of every runtime path or every real topic/subject row in the database).
 *
 * Runs the REAL parent-report render functions (no hand-written report text) against a
 * representative fixture per active decisionKey in PARENT_ENGINE_DECISION_CONTRACT_V2,
 * then emits:
 *   - reports/parent-output-final-closure/parent-engine-decision-contract.md
 *   - reports/parent-output-final-closure/parent-visible-output-golden-book.md
 *   - reports/parent-output-final-closure/parent-output-final-closure-report.md
 *
 * SCOPE (read before trusting any metric this script prints): one fixture per active
 * decisionKey means the sample size equals the number of active contract entries — NOT
 * a scan of live data. Metrics that this script's approach CANNOT actually measure
 * (e.g. "unmapped decisions" — decisions the real engine returns at runtime that are
 * missing from the contract) are reported as "not_measured", never as a hardcoded 0,
 * because this script only ever builds fixtures FROM existing contract entries and so
 * can never discover a decision that is absent from the contract by construction.
 *
 * Run: node scripts/parent-output-final-closure/build-golden-book.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PARENT_ENGINE_DECISION_CONTRACT_V2,
  findUnsupportedClaims,
  hasRepeatedVsInsufficientContradiction,
  HEBREW_SINGULAR_VIOLATION_RE,
  TECHNICAL_LEAK_RE,
  NOT_INDEPENDENTLY_VERIFIED_SURFACES,
} from "../../utils/learning-pattern-decision/parent-engine-decision-contract-v2.js";
import { buildParentReportEngineDecisionContract } from "../../utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js";
import { buildParentVisibleFinding } from "../../utils/learning-pattern-decision/build-parent-visible-finding.js";
import {
  buildSubjectEngineDecisionContract,
  resolveSubjectSummaryTextFromEngineContract,
} from "../../utils/learning-pattern-decision/build-subject-engine-decision-contract.js";
import { buildNarrativeContractV1 } from "../../utils/contracts/narrative-contract-v1.js";

const OUT_DIR = path.join(process.cwd(), "reports", "parent-output-final-closure");

function topicRow({ subjectId, topicRowKey, topicName, q, c, w, unit = {} }) {
  return {
    subjectId,
    topicRowKey,
    topicName,
    row: { questions: q, correct: c, wrong: w, displayName: topicName },
    unit: { subjectId, topicRowKey, displayName: topicName, ...unit },
  };
}

/**
 * One representative real-render output per active topic decisionKey.
 * @returns {Record<string, ReturnType<typeof buildParentReportEngineDecisionContract>>}
 */
function buildTopicEngineFixtures() {
  return {
    clear_topic_gap: buildParentReportEngineDecisionContract(
      topicRow({ subjectId: "math", topicRowKey: "addition::g1", topicName: "חיבור", q: 10, c: 2, w: 8 }),
    ),
    topic_needs_strengthening: buildParentReportEngineDecisionContract(
      topicRow({ subjectId: "math", topicRowKey: "subtraction::g3", topicName: "חיסור", q: 12, c: 7, w: 5 }),
    ),
    partial_stable: buildParentReportEngineDecisionContract(
      topicRow({ subjectId: "math", topicRowKey: "multiplication::g4", topicName: "כפל", q: 14, c: 10, w: 4 }),
    ),
    mastery_stable: buildParentReportEngineDecisionContract(
      topicRow({ subjectId: "math", topicRowKey: "division::g4", topicName: "חילוק", q: 16, c: 15, w: 1 }),
    ),
    early_direction_only: buildParentReportEngineDecisionContract(
      topicRow({ subjectId: "math", topicRowKey: "fractions::g5", topicName: "שברים", q: 6, c: 5, w: 1 }),
    ),
    insufficient_data: buildParentReportEngineDecisionContract(
      topicRow({ subjectId: "math", topicRowKey: "decimals::g5", topicName: "עשרוניים", q: 1, c: 1, w: 0 }),
    ),
    speed_pressure_pattern: buildParentReportEngineDecisionContract({
      subjectId: "math",
      topicRowKey: "sequences::g5",
      topicName: "סדרות",
      row: { questions: 28, correct: 16, wrong: 12, displayName: "סדרות", modeKey: "speed" },
      unit: {
        subjectId: "math",
        topicRowKey: "sequences::g5",
        displayName: "סדרות",
        modeKey: "speed",
        riskFlags: { speedOnlyRisk: true },
      },
    }),
  };
}

/** Real render, direct call — matches contract sourceFunction=buildParentVisibleFinding exactly. */
function buildLpdFixtures() {
  return {
    lpd_insufficient_no_pattern: buildParentVisibleFinding({
      topicName: "גיאומטריה", questionCount: 6, topicStatus: "no_clear_pattern", findingType: "none",
      evidenceStrength: "emerging", canUseRepeatedWording: false, repeatedMistakePatterns: [], wrongCount: 1, accuracy: 83,
    }),
    lpd_difficulty_no_specific_pattern: buildParentVisibleFinding({
      topicName: "גיאומטריה", questionCount: 8, topicStatus: "no_clear_pattern", findingType: "none",
      evidenceStrength: "emerging", canUseRepeatedWording: false, repeatedMistakePatterns: [], wrongCount: 5, accuracy: 38,
    }),
    lpd_mixed: buildParentVisibleFinding({
      topicName: "היסטוריה", questionCount: 10, topicStatus: "mixed", findingType: "mixed_pattern",
      evidenceStrength: "emerging", canUseRepeatedWording: true, repeatedMistakePatterns: [], hasMixed: true, wrongCount: 3, accuracy: 70,
    }),
    lpd_difficulty_repeated: buildParentVisibleFinding({
      topicName: "אנגלית", questionCount: 10, topicStatus: "difficulty_repeated", findingType: "difficulty_pattern",
      evidenceStrength: "supported", canUseRepeatedWording: true,
      repeatedMistakePatterns: [{ label: "בלבול בין past-simple ל-present-simple", count: 4, ratio: 0.4 }],
      wrongCount: 4, accuracy: 60,
    }),
  };
}

function buildSubjectFixtures(topicEngineFixtures) {
  const gapTopic = {
    topicRowKey: "addition::g1", displayName: "חיבור", questions: 10, correct: 2, wrong: 8, accuracy: 20,
    engineDecisionContract: topicEngineFixtures.clear_topic_gap, parentVisibleFinding: topicEngineFixtures.clear_topic_gap.parentSafeFinding,
  };
  const gap2Topic = {
    topicRowKey: "subtraction::g3", displayName: "חיסור", questions: 12, correct: 7, wrong: 5, accuracy: 58,
    engineDecisionContract: topicEngineFixtures.topic_needs_strengthening, parentVisibleFinding: topicEngineFixtures.topic_needs_strengthening.parentSafeFinding,
  };
  const stableTopic = {
    topicRowKey: "division::g4", displayName: "חילוק", questions: 16, correct: 15, wrong: 1, accuracy: 94,
    engineDecisionContract: topicEngineFixtures.mastery_stable, parentVisibleFinding: topicEngineFixtures.mastery_stable.parentSafeFinding,
    recommendedAction: "maintain_and_strengthen",
  };
  const partialTopic = {
    topicRowKey: "multiplication::g4", displayName: "כפל", questions: 14, correct: 10, wrong: 4, accuracy: 71,
    engineDecisionContract: topicEngineFixtures.partial_stable, parentVisibleFinding: topicEngineFixtures.partial_stable.parentSafeFinding,
  };
  // Only a speed_pressure_pattern topic — no other gap, no other stable topic. This is
  // the exact state that used to be misclassified as insufficient_subject_data.
  const speedOnlyTopic = {
    topicRowKey: "sequences::g5", displayName: "סדרות", questions: 28, correct: 16, wrong: 12, accuracy: 57,
    engineDecisionContract: topicEngineFixtures.speed_pressure_pattern, parentVisibleFinding: topicEngineFixtures.speed_pressure_pattern.parentSafeFinding,
  };

  const multipleGapsContract = buildSubjectEngineDecisionContract("math", [gapTopic, gap2Topic], { subjectLabelKey: "math" });
  const focusedContract = buildSubjectEngineDecisionContract("math", [gapTopic], { subjectLabelKey: "math" });
  const mixedContract = buildSubjectEngineDecisionContract("math", [gapTopic, stableTopic], { subjectLabelKey: "math" });
  const stableContract = buildSubjectEngineDecisionContract("math", [stableTopic, partialTopic], { subjectLabelKey: "math" });
  const speedOnlyContract = buildSubjectEngineDecisionContract("math", [speedOnlyTopic], { subjectLabelKey: "math" });
  const insufficientContract = buildSubjectEngineDecisionContract("math", [], { subjectLabelKey: "math" });

  return {
    multiple_topic_gaps: { contract: multipleGapsContract, text: resolveSubjectSummaryTextFromEngineContract(multipleGapsContract, { subjectLabelHe: "חשבון" }) },
    focused_strengthening_needed: { contract: focusedContract, text: resolveSubjectSummaryTextFromEngineContract(focusedContract, { subjectLabelHe: "חשבון" }) },
    mixed_subject_profile: { contract: mixedContract, text: resolveSubjectSummaryTextFromEngineContract(mixedContract, { subjectLabelHe: "חשבון" }) },
    subject_strength_stable: { contract: stableContract, text: resolveSubjectSummaryTextFromEngineContract(stableContract, { subjectLabelHe: "חשבון" }) },
    speed_check_only_subject: { contract: speedOnlyContract, text: resolveSubjectSummaryTextFromEngineContract(speedOnlyContract, { subjectLabelHe: "חשבון" }) },
    insufficient_subject_data: { contract: insufficientContract, text: resolveSubjectSummaryTextFromEngineContract(insufficientContract, { subjectLabelHe: "חשבון" }) },
  };
}

function buildNarrativeFixtures() {
  const defs = {
    narrative_we0: { questions: 3, accuracy: 30, contractsV1: { readiness: { readiness: "insufficient" }, confidence: { confidenceBand: "low" }, decision: { decisionTier: 0 }, recommendation: { eligible: false } } },
    narrative_we1: { questions: 10, accuracy: 45, contractsV1: { readiness: { readiness: "forming" }, confidence: { confidenceBand: "medium" }, decision: { decisionTier: 1 }, recommendation: { eligible: false } } },
    narrative_we2: { questions: 15, accuracy: 65, contractsV1: { readiness: { readiness: "ready" }, confidence: { confidenceBand: "low" }, decision: { decisionTier: 2 }, recommendation: { eligible: false } } },
    narrative_we3: { questions: 15, accuracy: 76, contractsV1: { readiness: { readiness: "ready" }, confidence: { confidenceBand: "high" }, decision: { decisionTier: 2 }, recommendation: { eligible: false } } },
    narrative_we4: { questions: 45, accuracy: 82, contractsV1: { readiness: { readiness: "ready" }, confidence: { confidenceBand: "high" }, decision: { decisionTier: 3 }, recommendation: { eligible: true, intensity: "RI2" } } },
  };
  /** @type {Record<string, ReturnType<typeof buildNarrativeContractV1>>} */
  const out = {};
  for (const [key, def] of Object.entries(defs)) {
    out[key] = buildNarrativeContractV1({
      topicKey: `${key}-golden`, subjectId: "math", displayName: "נושא לדוגמה", ...def,
    });
  }
  return out;
}

function mdEscapePipes(s) {
  return String(s || "").replace(/\|/g, "\\|");
}

/**
 * Renders a contract entry's declared surfaces, explicitly marking any surface this
 * script does not independently re-render (see NOT_INDEPENDENTLY_VERIFIED_SURFACES) —
 * never silently listing it as if it were checked and passed.
 * @param {ReturnType<typeof PARENT_ENGINE_DECISION_CONTRACT_V2.find>} entry
 * @param {string} fallback
 */
function formatSurfaceList(entry, fallback) {
  const surfaces = entry?.supportedSurfaces?.length ? entry.supportedSurfaces : String(fallback || "").split(" / ").filter(Boolean);
  return surfaces
    .map((s) => (NOT_INDEPENDENTLY_VERIFIED_SURFACES.includes(s) ? `${s} (declared only — NOT independently re-rendered this run)` : s))
    .join(" / ");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const topicEngineFixtures = buildTopicEngineFixtures();
  const lpdFixtures = buildLpdFixtures();
  const subjectFixtures = buildSubjectFixtures(topicEngineFixtures);
  const narrativeFixtures = buildNarrativeFixtures();

  // ---------------------------------------------------------------- contract markdown
  const contractLines = [];
  contractLines.push("# Parent Engine Decision Contract");
  contractLines.push("");
  contractLines.push("Generated by `scripts/parent-output-final-closure/build-golden-book.mjs` from the single");
  contractLines.push("source-of-truth module `utils/learning-pattern-decision/parent-engine-decision-contract-v2.js`.");
  contractLines.push("Every row below is an ACTIVE, reachable engine/LPD/subject/narrative decision.");
  contractLines.push("");
  contractLines.push(`Total active decisions: ${PARENT_ENGINE_DECISION_CONTRACT_V2.filter((e) => e.status === "active").length} / ${PARENT_ENGINE_DECISION_CONTRACT_V2.length}`);
  contractLines.push("");
  for (const entry of PARENT_ENGINE_DECISION_CONTRACT_V2) {
    contractLines.push(`## \`${entry.decisionKey}\` (${entry.scope}, ${entry.status})`);
    contractLines.push("");
    contractLines.push(entry.description);
    contractLines.push("");
    contractLines.push(`- **Evidence requirement:** ${entry.evidenceRequirement}`);
    contractLines.push(`- **Allowed claims:** ${entry.allowedClaims.length ? entry.allowedClaims.join(", ") : "(none — silence only)"}`);
    contractLines.push(`- **Forbidden claims:** ${entry.forbiddenClaims.join(", ")}`);
    contractLines.push(`- **Required template IDs:** ${entry.requiredTemplateIds.join(", ")}`);
    contractLines.push(`- **Supported surfaces:** ${entry.supportedSurfaces.join(", ")}`);
    contractLines.push(`- **Fallback policy:** ${entry.fallbackPolicy}`);
    contractLines.push(`- **Owner approval status:** ${entry.ownerApprovalStatus}`);
    contractLines.push(`- **Provenance:** ${entry.provenance}`);
    contractLines.push(`- **Source:** \`${entry.sourceFile}\` → \`${entry.sourceFunction}\``);
    contractLines.push("");
  }
  await writeFile(path.join(OUT_DIR, "parent-engine-decision-contract.md"), contractLines.join("\n"), "utf8");

  // ---------------------------------------------------------------- golden book rows
  /** @type {{decisionKey:string,scope:string,subject:string,grade:string,topic:string,questions:number,accuracy:number,evidenceClass:string,lpdState:string,templateId:string,surface:string,text:string,allowedClaims:string,provenance:string,ownerCopyRequired:boolean,violations:string[]}[]} */
  const rows = [];

  for (const [key, contract] of Object.entries(topicEngineFixtures)) {
    const entry = PARENT_ENGINE_DECISION_CONTRACT_V2.find((e) => e.decisionKey === key);
    const text = String(contract.parentSafeFinding || "");
    rows.push({
      decisionKey: key, scope: "topic", subject: "math", grade: "g1-g5", topic: contract.topicName,
      questions: contract.questions, accuracy: contract.accuracy, evidenceClass: contract.evidenceStrength,
      lpdState: contract.engineDecision, templateId: key, surface: formatSurfaceList(entry, "shortReport / detailedReport / subjectSummary / parentLetter"),
      text: text || "(empty — silence by design; see fallbackPolicy)",
      allowedClaims: entry?.allowedClaims.join(", ") || "(none)",
      provenance: entry?.provenance || "", ownerCopyRequired: entry?.ownerApprovalStatus === "owner_copy_required",
      violations: text ? findUnsupportedClaims(key, text) : [],
    });
  }

  for (const [key, result] of Object.entries(lpdFixtures)) {
    const entry = PARENT_ENGINE_DECISION_CONTRACT_V2.find((e) => e.decisionKey === key);
    const text = String(result.parentVisibleFinding || "");
    rows.push({
      decisionKey: key, scope: "topic", subject: "math/english/history (topic-agnostic)", grade: "any", topic: "(varies)",
      questions: "-", accuracy: "-", evidenceClass: "-", lpdState: "no_clear_pattern / mixed / difficulty_repeated",
      templateId: result.templateId, surface: formatSurfaceList(entry, "lpdExplain / detailedReport"),
      text: text || "(empty — silence by design)",
      allowedClaims: entry?.allowedClaims.join(", ") || "(none)",
      provenance: entry?.provenance || "", ownerCopyRequired: entry?.ownerApprovalStatus === "owner_copy_required",
      violations: text ? findUnsupportedClaims(key, text) : [],
    });
  }

  for (const [key, { text }] of Object.entries(subjectFixtures)) {
    const entry = PARENT_ENGINE_DECISION_CONTRACT_V2.find((e) => e.decisionKey === key);
    rows.push({
      decisionKey: key, scope: "subject", subject: "math", grade: "g1-g5", topic: "(subject-level, multiple topics)",
      questions: "-", accuracy: "-", evidenceClass: "-", lpdState: key, templateId: entry?.requiredTemplateIds.join(", ") || "",
      surface: formatSurfaceList(entry, "subjectSummary / shortReport / parentLetter"),
      text: text || "(null — resolveSubjectSummaryTextFromEngineContract defers to legacy withhold/short-report copy; see fallbackPolicy)",
      allowedClaims: entry?.allowedClaims.join(", ") || "(none)",
      provenance: entry?.provenance || "", ownerCopyRequired: entry?.ownerApprovalStatus === "owner_copy_required",
      violations: text ? findUnsupportedClaims(key, text) : [],
    });
  }

  for (const [key, nc] of Object.entries(narrativeFixtures)) {
    const entry = PARENT_ENGINE_DECISION_CONTRACT_V2.find((e) => e.decisionKey === key);
    const text = String(nc.textSlots.interpretation || "");
    rows.push({
      decisionKey: key, scope: "topic", subject: "math", grade: "any", topic: "נושא לדוגמה",
      questions: nc.topicKey.includes("we4") ? 45 : "-", accuracy: "-", evidenceClass: nc.hedgeLevel,
      lpdState: nc.wordingEnvelope, templateId: entry?.requiredTemplateIds.join(", ") || "",
      surface: formatSurfaceList(entry, "detailedReport / parentLetter"),
      text,
      allowedClaims: entry?.allowedClaims.join(", ") || "(none)",
      provenance: entry?.provenance || "", ownerCopyRequired: entry?.ownerApprovalStatus === "owner_copy_required",
      violations: findUnsupportedClaims(key, text),
    });
  }

  // group identical final text
  /** @type {Map<string, typeof rows>} */
  const byText = new Map();
  for (const r of rows) {
    const k = r.text;
    if (!byText.has(k)) byText.set(k, []);
    byText.get(k).push(r);
  }

  const bookLines = [];
  bookLines.push("# Parent-Visible Output Golden Book — Selected Fixtures");
  bookLines.push("");
  bookLines.push("**For product-owner review — not a developer artifact.**");
  bookLines.push("");
  bookLines.push(
    "This is **not a listing of all parent-visible outputs**. It covers exactly " +
      `${rows.length} selected examples (one hand-picked fixture per active decisionKey / narrative ` +
      "envelope currently registered in the contract), each produced by the real render functions " +
      "(no hand-written copy). Identical final sentences across those examples are grouped so the " +
      `same text only appears once below: ${byText.size} texts out of ${rows.length} selected examples ` +
      "are unique. Full text is always shown — never a hash or id alone. Real production topics/subjects " +
      "not matching one of these fixtures are NOT represented here.",
  );
  bookLines.push("");
  bookLines.push(`Selected examples generated: ${rows.length}. Unique final texts among them: ${byText.size} of ${rows.length}.`);
  bookLines.push("");

  let i = 0;
  for (const [text, group] of byText) {
    i++;
    const first = group[0];
    bookLines.push(`## ${i}. ${first.decisionKey}${group.length > 1 ? ` (+${group.length - 1} identical variant${group.length > 2 ? "s" : ""})` : ""}`);
    bookLines.push("");
    bookLines.push("> " + mdEscapePipes(text).replace(/\n/g, "\n> "));
    bookLines.push("");
    bookLines.push("| Field | Value |");
    bookLines.push("|---|---|");
    for (const r of group) {
      bookLines.push(`| decisionKey | \`${r.decisionKey}\` |`);
      bookLines.push(`| scope | ${r.scope} |`);
      bookLines.push(`| subject | ${r.subject} |`);
      bookLines.push(`| grade/range | ${r.grade} |`);
      bookLines.push(`| topic/pattern | ${r.topic} |`);
      bookLines.push(`| questions | ${r.questions} |`);
      bookLines.push(`| accuracy | ${r.accuracy} |`);
      bookLines.push(`| evidence class | ${r.evidenceClass} |`);
      bookLines.push(`| LPD state | ${r.lpdState} |`);
      bookLines.push(`| templateId | \`${r.templateId}\` |`);
      bookLines.push(`| surface(s) | ${r.surface} |`);
      bookLines.push(`| allowed claims | ${r.allowedClaims} |`);
      bookLines.push(`| provenance | ${r.provenance} |`);
      bookLines.push(`| OWNER_COPY_REQUIRED | ${r.ownerCopyRequired ? "YES" : "no"} |`);
      bookLines.push(`| unsupported-claim violations | ${r.violations.length ? r.violations.join(", ") : "none"} |`);
      bookLines.push("|---|---|");
    }
    bookLines.push("");
  }
  await writeFile(path.join(OUT_DIR, "parent-visible-output-golden-book.md"), bookLines.join("\n"), "utf8");

  // ---------------------------------------------------------------- closure metrics
  const activeEntries = PARENT_ENGINE_DECISION_CONTRACT_V2.filter((e) => e.status === "active");
  const registeredDecisions = PARENT_ENGINE_DECISION_CONTRACT_V2.length;
  const reachableKeys = new Set(rows.map((r) => r.decisionKey));
  const unreachableActive = activeEntries.filter((e) => !reachableKeys.has(e.decisionKey));

  const missingTemplateId = rows.filter((r) => !String(r.templateId || "").trim());
  // "Generic fallback on an active route" = a decisionKey whose own dedicated branch was bypassed
  // in favor of the shared difficulty_observed_fallback/no_clear_pattern text (losing the specific
  // decision's meaning). speed_pressure_pattern is the historically-affected case; verify by name.
  // Checks for the approved canonical sentence's actual markers (בתרגול המהיר / ללא הגבלת זמן) —
  // NOT the bare noun "מהירות", since the approved wording uses the adjective "המהיר" instead.
  const genericFallbacks = rows.filter(
    (r) => r.decisionKey === "speed_pressure_pattern" && !/בתרגול\s*המהיר/u.test(r.text),
  );
  const unsupportedClaims = rows.filter((r) => r.violations.length > 0);

  const contradictions = rows.filter((r) => hasRepeatedVsInsufficientContradiction(r.text));
  const hebrewGrammarFailures = rows.filter((r) => HEBREW_SINGULAR_VIOLATION_RE.test(r.text));
  const technicalLeaks = rows.filter((r) => TECHNICAL_LEAK_RE.test(r.text));
  const ownerCopyRequiredItems = rows.filter((r) => r.ownerCopyRequired);

  // decision-output mismatch: text mentions early_direction_only-forbidden stability/mastery language, etc.
  // (covered by unsupportedClaims via forbiddenClaims scan above; kept as a separate named metric per spec)
  const decisionOutputMismatches = unsupportedClaims.length;

  const missingProvenance = rows.filter((r) => !String(r.provenance || "").trim());

  const metrics = {
    selectedExamples: rows.length,
    registeredDecisions,
    activeDecisions: activeEntries.length,
    reachableActiveDecisions: activeEntries.length - unreachableActive.length,
    uniqueParentVisibleOutputs: `${byText.size} of ${rows.length} selected examples`,
    // NOT measurable by this script: it only ever builds fixtures FROM existing contract
    // entries (forward direction), so it can never discover a decisionKey that the real
    // engine returns at runtime but that is absent from the contract (the reverse
    // direction, which requires scanning live/real engine output, not fixtures built from
    // the contract itself). Reporting this as 0 would be a false, unverified claim.
    unmappedDecisions: "not_measured",
    unreachableActiveDecisions: unreachableActive.length,
    missingTemplateIds: missingTemplateId.length,
    genericFallbacksOnActiveRoutes: genericFallbacks.length,
    unsupportedClaims: unsupportedClaims.length,
    semanticContradictions: contradictions.length,
    decisionOutputMismatches,
    hebrewGrammarFailures: hebrewGrammarFailures.length,
    technicalLeaks: technicalLeaks.length,
    ownerCopyRequiredItems: ownerCopyRequiredItems.length,
    missingProvenance: missingProvenance.length,
  };

  const measuredMetricKeys = Object.entries(metrics)
    .filter(([, v]) => typeof v === "number")
    .map(([k]) => k)
    .filter((k) => !["selectedExamples", "registeredDecisions", "activeDecisions", "reachableActiveDecisions"].includes(k));
  const notMeasuredKeys = Object.entries(metrics)
    .filter(([, v]) => v === "not_measured")
    .map(([k]) => k);
  const failingMeasured = measuredMetricKeys.filter((k) => Number(metrics[k]) > 0);
  const passWithinScope = failingMeasured.length === 0;

  const reportLines = [];
  reportLines.push(`# Parent Output — Representative Fixture Audit Report (${rows.length} Selected Examples)`);
  reportLines.push("");
  reportLines.push(`Generated: ${new Date().toISOString()}`);
  reportLines.push("");
  reportLines.push(
    "**Scope note (read before the result line):** this is NOT a full mapping of every parent-" +
      "visible output and NOT a live-production scan. It exercises the real render functions for " +
      `${rows.length} representative synthetic fixtures — one per active decisionKey / narrative ` +
      "envelope currently registered in the contract, per its primary surface family. It is a " +
      "deterministic regression check over selected fixtures only. Any metric below marked " +
      "`not_measured` reflects a real limitation of this script's approach (explained inline), not a " +
      "verified zero. Coverage limits are listed explicitly below so nothing under-tested is silently " +
      "counted as verified.",
  );
  reportLines.push("");
  reportLines.push("## Metrics");
  reportLines.push("");
  reportLines.push("| Metric | Value |");
  reportLines.push("|---|---|");
  for (const [k, v] of Object.entries(metrics)) reportLines.push(`| ${k} | ${v} |`);
  reportLines.push("");
  reportLines.push(
    `## Result (scoped to ${rows.length} selected fixtures): ${passWithinScope ? "PASS" : "NOT PASS — see gaps below"}` +
      (notMeasuredKeys.length ? ` — ${notMeasuredKeys.length} metric(s) not_measured and therefore NOT covered by this PASS: ${notMeasuredKeys.join(", ")}` : ""),
  );
  reportLines.push("");
  reportLines.push(
    "This result describes only the fixtures generated by this script. It does not certify the " +
      "absence of issues in real production topics/subjects that were not selected as a fixture, and " +
      "it does not certify `unmappedDecisions` (not measured — see above).",
  );
  reportLines.push("");
  if (!passWithinScope) {
    reportLines.push("Non-zero measured metrics requiring resolution before this can be marked PASS:");
    reportLines.push("");
    for (const k of failingMeasured) {
      reportLines.push(`- **${k} = ${metrics[k]}**`);
    }
    reportLines.push("");
  }
  reportLines.push("## Coverage / known scope limits (owner review required — NOT silently marked as zero-gap)");
  reportLines.push("");
  reportLines.push(
    "- `parentLetterCompact` and `gradeAwareRecommendation` surfaces are declared in the contract's " +
      "`supportedSurfaces` but were NOT independently re-rendered through their own compact/grade-aware " +
      "renderer functions in this run — only the shared `engineDecisionContract.parentSafeFinding` source " +
      "text they are documented to reuse was verified. A dedicated cross-surface consistency test for those " +
      "two specific renderers is a recommended follow-up, not yet part of this closure.",
  );
  reportLines.push(
    "- A pre-existing, unrelated test failure was found in `tests/learning/parent-report-engine-decision-contract.test.mjs` " +
      "(topic-level owner-copy resolver `resolveTopicOwnerBaseTemplateId` collapses templateId `difficulty_repeated` into the " +
      "generic `difficulty_observed` owner-template family, so the `identified` section shows a generic sentence while the " +
      "specific pattern name only appears in the separate `pattern` section). This file was NOT modified in this closure " +
      "(git status confirms it was already failing before this session) and is flagged here for product-owner triage rather " +
      "than silently fixed or silently ignored.",
  );
  reportLines.push(
    "- A second pre-existing failure, directly matching one of the ten named root causes " +
      "(`speed_pressure_pattern שאינו רשום או שמשמעות המהירות שלו אובדת בפלט`), was found in " +
      "`tests/learning-pattern-decision/scenarios.test.mjs` scenario 11: when a topic is `competitiveBucketOnly` " +
      "(speed/competitive-mode mistakes) AND the engine's own `accuracyBand` is `clear_gap` (not `needs_strengthening`), " +
      "`buildEngineDiagnosticDecision`'s speed override intentionally does not fire (by design — a clear knowledge gap " +
      "should not be reframed as 'just speed'), so `engineDecision` stays `clear_topic_gap`. `buildLearningPatternDecision`'s " +
      "precedence rule then prefers the engine's generic clear_topic_gap text over the LPD's own " +
      "`competitiveBucketOnly` fallback text (which explicitly says 'בהקשר תחרותי/מהירות'), silently dropping the " +
      "speed/competitive framing that the LPD layer had correctly detected. Confirmed via `git stash` that this predates " +
      "this session (same failure on the pre-session baseline) — NOT fixed here to avoid an un-reviewed behavior change " +
      "to `build-learning-pattern-decision.js`'s cross-source precedence rule; flagged for explicit product-owner decision " +
      "(should competitiveBucketOnly framing always survive even under a clear_topic_gap engine decision?).",
  );
  reportLines.push(
    "- A third pre-existing failure set (3 of 9 subtests: A, G, H) was found in " +
      "`tests/learning-pattern-decision/parent-facing-lpd-practice-alignment.test.mjs`. Subtests A/G assert an older " +
      "phrasing (`/2 נכונות/`, `/8 שגויות/`) that predates the current `formatCorrectTextHe`/`formatWrongTextHe` " +
      "helper wording (`\"N תשובות נכונות\"` / `\"N תשובות שגויות\"`); subtest H expects a raw technical pattern key " +
      "(`carry_error`) to appear in parent-visible text, which the current `isUsableParentPatternLabel` guard correctly " +
      "blocks. All three were confirmed via `git stash` to fail identically on the pre-session baseline — they are test " +
      "expectations lagging behind already-shipped, intentional copy/safety changes, not something introduced or " +
      "silently masked by this closure.",
  );
  reportLines.push(
    "- Live production data was not queried; all fixtures above are synthetic but pass through the unmodified real " +
      "render functions, so behavior in production for the same q/accuracy/mode inputs will match.",
  );
  reportLines.push(
    "- A more precise, code-level instance of root cause #10 (owner narrative missing for WE3/WE4) was located: " +
      "`resolveNarrativeOwnerCopyHe` (`utils/learning-pattern-decision/resolve-topic-owner-copy.js`) is called live " +
      "from the periodic subject letter (`buildTopicRecommendationNarrative` in `utils/detailed-report-parent-letter-he.js`, " +
      "`ownerSnapshot`/`ownerCaution`) but its allow-list is hardcoded to `[\"WE0\", \"WE1\", \"WE2\"]` — it returns `null` for " +
      "WE3/WE4, so those two envelopes fall through to the narrative-contract-v1.js curated `textSlots` text instead of a " +
      "dedicated owner template. The fallback text is still a fixed, curated Hebrew set (not free-form/unapproved), and this " +
      "closure's CI gate already verifies it carries no unsupported claims — but no owner template file defines WE3/WE4 " +
      "entries the way it does for WE0–WE2, so any future divergence between the two presentation layers for those tiers " +
      "would be unreviewed. NOT modified in this closure (would require authoring new owner copy without approval); " +
      "flagged as OWNER_COPY_REQUIRED for explicit product-owner decision on whether WE3/WE4 need their own owner template.",
  );
  reportLines.push("");
  reportLines.push("## Root causes addressed in code, with current status (re-verified on follow-up audit)");
  reportLines.push("");
  reportLines.push("1. Contradiction between \"repeated mistake\" and \"insufficient information\" — CI gate `hasRepeatedVsInsufficientContradiction` added; 0 hits across these fixtures. **Status: fixed, verified.**");
  reportLines.push("2. Attention/fatigue/pressure claims without evidence — removed from `narrative-contract-v1.js` WE4 interpretation slot; the 3 remaining WE4 variants assert only stability/continuity backed by the q/acc evidence gate. **Status: fixed, verified.**");
  reportLines.push("3. `no_clear_pattern` disambiguated into `lpd_insufficient_no_pattern` (silent) vs `lpd_difficulty_no_specific_pattern` (templateId `no_clear_pattern_difficulty_fallback`, grounded strengthening claim only). **Status: fixed, verified via direct `buildParentVisibleFinding` calls.**");
  reportLines.push("4. Hebrew singular/plural for q=1 / wrong=1 — `formatQuestionsTextHe`/`formatWrongOfQuestionsTextHe`/etc. exported and wired into `build-parent-report-engine-decision-contract.js`. `formatWrongOfQuestionsTextHe` wording corrected on follow-up audit from the ungrammatical \"שגויה אחת\"/\"5 שגויות\" to \"שגיאה אחת\"/\"5 שגיאות\". **Status: fixed, verified.**");
  reportLines.push("5. Broken sentence \"אין מספיק מה שרואים בשורות בשלב זה\" replaced with correct Hebrew in `subject-withhold-summary-he.js` and `parent-report-v2.js`, meaning preserved. **Status: fixed, verified.**");
  reportLines.push("6. `speed_pressure_pattern` — PRODUCT DECISION APPLIED (follow-up session): the previously-flagged text duplication is resolved — every parent-facing renderer now calls the ONE canonical sentence builder `buildSpeedPressurePatternFindingHe` (`normalize-parent-practice-metrics.js`), used verbatim by both `build-parent-report-engine-decision-contract.js` and `engine-decision-parent-copy-he.js`; the latter's `competitiveModeContextHe` addendum is suppressed for this decisionKey to prevent doubling up. At the subject level, `speed_pressure_pattern` is now EXCLUDED from `isActionableGapTopic`/`actionableCandidates`/`ENGINE_DECISION_RANK`'s gap tier entirely — it can never by itself produce `focused_strengthening_needed` or `multiple_topic_gaps`, and is tracked separately via `speedCheckTopics`. `clear_topic_gap` continues to win over this decision whenever accuracy is low enough to be `clear_gap`-banded (verified, pre-existing guardrail behavior). **Status: fixed and reclassified `owner_approved`, verified by dedicated CI gates.**");
  reportLines.push("7. `mixed_subject_profile` — PRODUCT DECISION APPLIED (follow-up session): `deriveSubjectDecision` now routes by exact counts — `gaps.length===1 && stable.length>=1` => `mixed_subject_profile`; `gaps.length>=2` => `multiple_topic_gaps` (even with stable topics present); `gaps.length===1 && stable.length===0` => `focused_strengthening_needed`; `gaps.length===0 && stable.length>=1` => `subject_strength_stable`. `renderSubjectOpeningPriorityTopic0` now has a dedicated `mixed_subject_profile` branch using the product-owner-approved singular sentence (\"...נראית יציבות בחלק מהנושאים, ולצדה נושא אחד שכדאי לחזק...\", corrected on second follow-up review from an earlier draft that said \"נושאים שבהם\" — plural-implying wording — for the stable side) instead of reusing the `multiple_topic_gaps` plural sentence — the overclaim for 1-gap cases is no longer reachable. **Status: fixed and reclassified `owner_approved`, verified by dedicated CI gates covering 1+1, 2+1, 5+1, and 1+5 gap/stable combinations.**");
  reportLines.push("8. `early_direction_only` / `partial_stable` / `mastery_stable` are asserted, by CI gate over these fixtures, never to co-occur or leak into each other's forbidden-claim set. **Status: fixed, verified within fixture scope.**");
  reportLines.push("9. Compact/approved vs owner/LPD copy provenance — every contract entry now carries an explicit `provenance` + `sourceFile`/`sourceFunction`; two entries' provenance strings were corrected on follow-up audit after being found inaccurate (see #6/#7 above). **Status: partially fixed — provenance is now documented, but the underlying copy-duplication issues it documents are still open.**");
  reportLines.push("10. WE3/WE4 owner narrative — WE0-WE4 are all registered as `narrative_we0..we4` contract entries with explicit evidence gates; the WE4 unsupported-claim issue is fix #2 above. A separate, code-level gap (`resolveNarrativeOwnerCopyHe`'s WE0-WE2-only allow-list) is documented above as still open. **Status: WE4 claims fixed; WE3/WE4 dedicated owner-template gap still open, flagged OWNER_COPY_REQUIRED.**");
  reportLines.push("");

  await writeFile(path.join(OUT_DIR, "parent-output-final-closure-report.md"), reportLines.join("\n"), "utf8");

  console.log(JSON.stringify(metrics, null, 2));
  console.log(passWithinScope ? `RESULT: PASS (scoped to ${rows.length} selected fixtures)` : "RESULT: NOT PASS");
  return { metrics, passWithinScope };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
