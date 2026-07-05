/**
 * Parent report Hebrew copy guard — scans parent-facing source strings for forbidden jargon.
 * Run: node scripts/parent-report-hebrew-copy-guard.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const {
  PARENT_COPY_FORBIDDEN_FRAGMENTS,
  PARENT_COPY_DUPLICATE_WORD_PAIRS,
  findParentCopyForbiddenFragmentsInString,
  findDuplicateWordPairsInString,
  findReadabilityLeakSubstringsInString,
} = await import(u("utils/parent-report-language/forbidden-terms.js"));
const { normalizeParentFacingHe } = await import(u("utils/parent-report-language/parent-facing-normalize-he.js"));
const { findParentReportEnglishEnumLeaks, formatParentReportModeHe } = await import(
  u("utils/parent-report-language/parent-report-display-labels.he.js")
);
const { buildNarrativeContractV1, narrativeSectionTextHe } = await import(u("utils/contracts/narrative-contract-v1.js"));
const {
  zeroEvidenceSubjectLineHe,
  thinEvidenceSubjectLineHe,
} = await import(u("utils/parent-report-language/subject-evidence-policy.js"));
const {
  buildSubjectOwnerCopySlots,
  renderOwnerSubjectCopyTemplateHe,
  SUBJECT_OWNER_COPY_TEMPLATE_IDS,
} = await import(u("utils/parent-report-language/parent-report-owner-copy-templates-he.js"));
const {
  buildTopicOwnerCopySlots,
  resolveTopicOwnerCopyHe,
  resolveTopicExplainOwnerSectionsHe,
  resolveTopicRecommendationOwnerCopyHe,
  resolveNarrativeOwnerCopyHe,
  resolveTopicOwnerBaseTemplateId,
} = await import(u("utils/learning-pattern-decision/resolve-topic-owner-copy.js"));
const { parentReportOwnerTopicCopyTemplatesHe } = await import(
  u("utils/parent-report-language/parent-report-owner-topic-copy-templates-he.js")
);
const { EDC_CONTRACT_KEY } = await import(u("utils/learning-pattern-decision/engine-decision-codes.js"));

const SKIP_FILES = new Set([
  // Normalization / guard infrastructure — not parent-visible copy.
  "utils/parent-report-language/forbidden-terms.js",
  "utils/parent-report-language/parent-facing-normalize-he.js",
  "utils/parent-report-language/parent-report-hebrew-copy-spec.js",
  // Owner-authored editorial packs: skip static source literal scan only.
  // Rendered output from these packs is validated in ownerCopyRenderedSamples below.
  "utils/parent-report-language/engine-decision-parent-copy-he.js",
  "utils/parent-report-language/parent-report-owner-copy-templates-he.js",
  "utils/parent-report-language/parent-report-owner-topic-copy-templates-he.js",
]);

/**
 * Strings that may remain in engine files but are not shown to parents as-is
 * (decision-trace blockers / apply() detailHe — filtered or collapsed).
 */
const INTERNAL_ONLY_SOURCE_SNIPPETS = Object.freeze({
  "utils/topic-next-step-phase2.js": [
    "עדיין לא ברור כיוון הדיוק לאורך זמן — לא עושים שינוי גדול עכשיו.",
    "ייתכן שהקושי קשור להבנת המשימה או לצורך ברמזים — לא מורידים רמה בלי מספיק תרגול שמראה שזה באמת נחוץ.",
    "יש סימן לקושי, אבל הדיוק משתפר — עדיף לחזק באותה רמה לפני שמורידים רמה.",
    "כשהמידע חלקי או ישן — כדאי לעשות בדיקה קצרה לפני שמחליטים לשנות כיוון.",
    "אין מספיק מידע לשינוי גדול עכשיו.",
    "לא מורידים רמה או כיתה כשעדיין אין מספיק מידע — ממשיכים בחיזוק באותה רמה.",
    "הנתונים מרמזים שהבעיה אולי קשורה לבסיס של הנושא, אבל כרגע אין מספיק מידע כדי לזהות איזה חלק בסיסי צריך לחזק.",
    "אין עדיין מספיק מידע כדי להבין מאיפה הקושי מתחיל — לא מורידים רמה; ממשיכים בחיזוק מבוקר.",
  ],
  "utils/topic-next-step-engine.js": [],
  "utils/learning-patterns-analysis.js": [],
  "utils/parent-report-ai/parent-report-ai-explainer.js": [],
});

const SCAN_ROOTS = [
  "utils/parent-report-language",
  "utils/learning-pattern-decision/resolve-subject-owner-copy.js",
  "utils/learning-pattern-decision/resolve-topic-owner-copy.js",
  "utils/parent-data-presence.js",
  "utils/detailed-parent-report.js",
  "utils/detailed-report-parent-letter-he.js",
  "utils/parent-report-ui-explain-he.js",
  "utils/parent-report-v2.js",
  "utils/parent-report-row-diagnostics.js",
  "utils/contracts/narrative-contract-v1.js",
  "utils/learning-patterns-analysis.js",
  "utils/topic-next-step-engine.js",
  "utils/topic-next-step-phase2.js",
  "utils/parent-report-ai/parent-report-ai-explainer.js",
  "pages/learning/parent-report.js",
  "pages/learning/parent-report-detailed.js",
  "pages/learning/parent-report-detailed.renderable.jsx",
  "components/parent-report-detailed-surface.jsx",
  "components/parent",
];

function collectFiles(relPath) {
  const abs = join(ROOT, relPath);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return [];
  }
  if (st.isFile()) {
    if (/\.(js|jsx|mjs)$/i.test(relPath)) return [relPath.replace(/\\/g, "/")];
    return [];
  }
  if (!st.isDirectory()) return [];
  const out = [];
  for (const name of readdirSync(abs)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    out.push(...collectFiles(join(relPath, name).replace(/\\/g, "/")));
  }
  return out;
}

function isInternalOnlyHit(rel, lineText) {
  const allow = INTERNAL_ONLY_SOURCE_SNIPPETS[rel];
  if (!allow?.length) return false;
  const t = String(lineText || "").trim();
  return allow.some((snippet) => t.includes(snippet));
}

/** Normalization / JSDoc lines are not parent-visible output. */
function isGuardExemptSourceLine(lineText) {
  const t = String(lineText || "").trim();
  if (/\.replace\s*\(/.test(t)) return true;
  if (/^\*\s/.test(t) || /^\/\*\*/.test(t) || /^\s*\/\//.test(t)) return true;
  return false;
}

const files = [...new Set(SCAN_ROOTS.flatMap(collectFiles))].filter((f) => !SKIP_FILES.has(f));
const violations = [];

for (const rel of files) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const lines = text.split("\n");
  for (const frag of PARENT_COPY_FORBIDDEN_FRAGMENTS) {
    let idx = 0;
    while (idx < text.length) {
      const at = text.indexOf(frag, idx);
      if (at < 0) break;
      const lineNo = text.slice(0, at).split("\n").length;
      const lineText = lines[lineNo - 1] || "";
      if (!isInternalOnlyHit(rel, lineText) && !isGuardExemptSourceLine(lineText)) {
        violations.push({ file: rel, line: lineNo, fragment: frag });
      }
      idx = at + frag.length;
    }
  }
  for (const pair of PARENT_COPY_DUPLICATE_WORD_PAIRS) {
    let idx = 0;
    while (idx < text.length) {
      const at = text.indexOf(pair, idx);
      if (at < 0) break;
      const lineNo = text.slice(0, at).split("\n").length;
      const lineText = lines[lineNo - 1] || "";
      if (!isInternalOnlyHit(rel, lineText) && !isGuardExemptSourceLine(lineText)) {
        violations.push({ file: rel, line: lineNo, fragment: `duplicate:${pair}` });
      }
      idx = at + pair.length;
    }
  }
}

assert.equal(
  violations.length,
  0,
  `forbidden parent-copy fragments in sources:\n${violations
    .slice(0, 20)
    .map((v) => `  ${v.file}:${v.line} — ${v.fragment}`)
    .join("\n")}${violations.length > 20 ? `\n  …and ${violations.length - 20} more` : ""}`
);

const narrativeSamples = [];
for (const q of [0, 3, 12, 40]) {
  for (const acc of [45, 72, 88]) {
    const c = buildNarrativeContractV1({
      topicKey: "fractions",
      subjectId: "math",
      displayName: "שברים",
      questions: q,
      accuracy: acc,
      contractsV1: {
        readiness: { readiness: q >= 12 ? "ready" : "forming" },
        confidence: { confidenceBand: q >= 12 ? "high" : "low" },
        decision: { decisionTier: q >= 12 ? 2 : 0, cannotConcludeYet: q < 8 },
        recommendation: { eligible: q >= 12, intensity: "RI2" },
        evidence: { questionCount: q, accuracyPct: acc },
      },
    });
    for (const section of ["summary", "finding", "recommendation", "limitations"]) {
      narrativeSamples.push(narrativeSectionTextHe(section, c));
    }
  }
}

const ownerCopyRenderedSamples = (() => {
  /** @type {string[]} */
  const out = [];
  const fixtures = [
    {
      subjectLabelHe: "מתמטיקה",
      contract: {
        subjectDecision: "multiple_topic_gaps",
        recommendedSubjectAction: "remediate_priority_topics_same_level",
        blockedLegacySummary: true,
        priorityTopics: [
          {
            topicLabelKey: "שברים",
            questions: 206,
            correct: 108,
            wrong: 98,
            accuracy: 52,
            detectedPattern: "השוואה לפי מונה בלבד",
            evidenceStrength: "strong",
          },
          {
            topicLabelKey: "כפל",
            questions: 32,
            correct: 22,
            wrong: 10,
            accuracy: 69,
            detectedPattern: "אותם זוגות שגויים",
            evidenceStrength: "strong",
          },
        ],
      },
    },
    {
      subjectLabelHe: "מתמטיקה",
      contract: {
        subjectDecision: "focused_strengthening_needed",
        recommendedSubjectAction: "remediate_priority_topics_same_level",
        blockedLegacySummary: true,
        priorityTopics: [
          {
            topicLabelKey: "חיבור",
            questions: 10,
            correct: 2,
            wrong: 8,
            accuracy: 20,
            detectedPattern: null,
            evidenceStrength: "supported",
          },
        ],
      },
    },
  ];
  for (const fx of fixtures) {
    const slots = buildSubjectOwnerCopySlots(fx.contract, fx.subjectLabelHe);
    if (!slots) continue;
    for (const templateId of Object.values(SUBJECT_OWNER_COPY_TEMPLATE_IDS)) {
      const rendered = renderOwnerSubjectCopyTemplateHe(templateId, slots);
      if (rendered) out.push(rendered);
    }
  }
  return out;
})();

const topicOwnerCopyRenderedSamples = (() => {
  /** @type {string[]} */
  const out = [];
  /** @param {Record<string, unknown>} body @param {Record<string, unknown>} contract */
  const lpdWithContract = (body, contract) => ({ ...body, [EDC_CONTRACT_KEY]: contract });
  const fixtures = [
    {
      label: "שברים",
      subjectLabelHe: "מתמטיקה",
      questions: 206,
      correct: 108,
      wrong: 98,
      accuracy: 52,
      learningPatternDecision: lpdWithContract(
        {
          templateId: "difficulty_observed",
          topicStatus: "difficulty_observed",
          findingType: "difficulty_pattern",
          evidenceStrength: "strong",
          practicedQuestions: 206,
        },
        {
          engineDecision: "clear_topic_gap",
          detectedPattern: "השוואה לפי מונה בלבד",
          recommendedAction: "remediate_same_level",
          evidenceStrength: "strong",
        },
      ),
      contractsV1: { narrative: { wordingEnvelope: "WE2" } },
    },
    {
      label: "חיבור",
      subjectLabelHe: "מתמטיקה",
      questions: 10,
      correct: 2,
      wrong: 8,
      accuracy: 20,
      learningPatternDecision: lpdWithContract(
        {
          templateId: "difficulty_observed",
          topicStatus: "difficulty_observed",
          findingType: "difficulty_pattern",
          evidenceStrength: "supported",
          practicedQuestions: 10,
        },
        {
          engineDecision: "clear_topic_gap",
          detectedPattern: null,
          recommendedAction: "remediate_same_level",
          evidenceStrength: "supported",
        },
      ),
      contractsV1: { narrative: { wordingEnvelope: "WE1" } },
    },
    {
      label: "חיבור חיובי",
      subjectLabelHe: "מתמטיקה",
      questions: 8,
      correct: 6,
      wrong: 2,
      accuracy: 75,
      learningPatternDecision: lpdWithContract(
        {
          templateId: "positive_observed",
          topicStatus: "positive_observed",
          findingType: "success_pattern",
          evidenceStrength: "supported",
          practicedQuestions: 8,
        },
        {
          engineDecision: "maintain_and_strengthen",
          detectedPattern: null,
          recommendedAction: "maintain_and_strengthen",
        },
      ),
      contractsV1: { narrative: { wordingEnvelope: "WE2" } },
    },
    {
      label: "חילוק עם שארית",
      subjectLabelHe: "מתמטיקה",
      questions: 2,
      correct: 1,
      wrong: 1,
      accuracy: 50,
      learningPatternDecision: lpdWithContract(
        {
          templateId: "initial_topic_data",
          topicStatus: "initial_data",
          findingType: "initial_topic_data",
          evidenceStrength: "low",
          practicedQuestions: 2,
        },
        {
          engineDecision: "early_direction_only",
          detectedPattern: null,
        },
      ),
      contractsV1: { narrative: { wordingEnvelope: "WE0" } },
    },
  ];
  for (const fx of fixtures) {
    const base = resolveTopicOwnerBaseTemplateId(fx.learningPatternDecision);
    const we = String(fx.contractsV1?.narrative?.wordingEnvelope || "").toUpperCase();
    const templateIds = Object.keys(parentReportOwnerTopicCopyTemplatesHe).filter((id) => {
      if (id.startsWith("NARRATIVE_")) return we && id.startsWith(`NARRATIVE_${we}_`);
      return id === base || id.startsWith(`${base}:`);
    });
    for (const templateId of templateIds) {
      const rendered = resolveTopicOwnerCopyHe(fx, templateId);
      if (rendered) out.push(rendered);
    }
    const explain = resolveTopicExplainOwnerSectionsHe(fx);
    if (explain) out.push(...Object.values(explain).filter(Boolean));
    for (const field of ["stepLabel", "finding", "interventionPlan", "doNow", "caution"]) {
      const rec = resolveTopicRecommendationOwnerCopyHe(fx, field);
      if (rec) out.push(rec);
    }
    for (const section of ["snapshot", "cautionLineHe"]) {
      const narr = resolveNarrativeOwnerCopyHe(fx, section);
      if (narr) out.push(narr);
    }
  }
  return out;
})();

const TOPIC_OWNER_INTERNAL_LEAK_TERMS = [
  "clear_topic_gap",
  "topic_needs_strengthening",
  "early_direction_only",
  "engineDecision",
  "parentSafeFinding",
  "recommendedAction",
  "undefined",
  "unknown",
];

const renderedSamples = [
  zeroEvidenceSubjectLineHe("חשבון"),
  thinEvidenceSubjectLineHe("עברית", 5),
  ...narrativeSamples,
  ...ownerCopyRenderedSamples,
].map((s) => normalizeParentFacingHe(String(s || "")));

const topicOwnerRenderedSamples = topicOwnerCopyRenderedSamples.map((s) =>
  normalizeParentFacingHe(String(s || "")),
);

for (const [i, sample] of renderedSamples.entries()) {
  const copyHits = findParentCopyForbiddenFragmentsInString(sample);
  assert.equal(copyHits.length, 0, `rendered sample[${i}] forbidden: [${copyHits.join(", ")}]\n${sample.slice(0, 200)}`);
  const dupHits = findDuplicateWordPairsInString(sample);
  assert.equal(dupHits.length, 0, `rendered sample[${i}] duplicate pair: [${dupHits.join(", ")}]\n${sample.slice(0, 200)}`);
  const leakHits = findReadabilityLeakSubstringsInString(sample);
  assert.equal(leakHits.length, 0, `rendered sample[${i}] readability leak: [${leakHits.join(", ")}]\n${sample.slice(0, 200)}`);
  const enumHits = findParentReportEnglishEnumLeaks(sample);
  assert.equal(enumHits.length, 0, `rendered sample[${i}] english enum leak: [${enumHits.join(", ")}]\n${sample.slice(0, 200)}`);
}

for (const [i, sample] of topicOwnerRenderedSamples.entries()) {
  for (const term of TOPIC_OWNER_INTERNAL_LEAK_TERMS) {
    assert.doesNotMatch(String(sample), new RegExp(term, "i"), `topic owner sample[${i}] internal leak: ${term}\n${sample.slice(0, 200)}`);
  }
  const dupHits = findDuplicateWordPairsInString(sample);
  assert.equal(dupHits.length, 0, `topic owner sample[${i}] duplicate pair: [${dupHits.join(", ")}]\n${sample.slice(0, 200)}`);
  const enumHits = findParentReportEnglishEnumLeaks(sample);
  assert.equal(enumHits.length, 0, `topic owner sample[${i}] english enum leak: [${enumHits.join(", ")}]\n${sample.slice(0, 200)}`);
}

for (const rawMode of ["practice", "guided_practice", "learning_book", "worksheet", "self_practice"]) {
  const rendered = formatParentReportModeHe(rawMode);
  assert.equal(findParentReportEnglishEnumLeaks(rendered).length, 0, `mode label leak for ${rawMode}: ${rendered}`);
}

const requiredInScan = [
  "utils/learning-patterns-analysis.js",
  "utils/topic-next-step-engine.js",
  "utils/topic-next-step-phase2.js",
  "utils/parent-report-ai/parent-report-ai-explainer.js",
];
for (const req of requiredInScan) {
  assert.ok(files.includes(req), `guard must scan ${req}`);
}

// Wiring paths stay in static scan; only owner editorial packs are source-scan exempt.
assert.ok(
  SKIP_FILES.has("utils/parent-report-language/parent-report-owner-copy-templates-he.js"),
  "owner copy pack must remain source-scan exempt (rendered samples checked separately)",
);
assert.ok(
  files.includes("utils/detailed-report-parent-letter-he.js"),
  "guard must scan parent letter wiring for forbidden source fragments",
);
assert.ok(
  files.includes("utils/learning-pattern-decision/resolve-subject-owner-copy.js"),
  "guard must scan subject owner-copy resolver wiring",
);
assert.ok(
  SKIP_FILES.has("utils/parent-report-language/parent-report-owner-topic-copy-templates-he.js"),
  "topic owner copy pack must remain source-scan exempt (rendered samples checked separately)",
);
assert.ok(
  files.includes("utils/learning-pattern-decision/resolve-topic-owner-copy.js"),
  "guard must scan topic owner-copy resolver wiring",
);
assert.ok(ownerCopyRenderedSamples.length >= 5, "owner copy rendered samples must cover Phase A templates");
assert.ok(topicOwnerCopyRenderedSamples.length >= 20, "topic owner copy rendered samples must cover Phase B+C+D");

const GUILLEMET_UI_FILES = [
  "utils/parent-report-language/parent-report-hebrew-copy-spec.js",
  "utils/parent-report-language/engine-decision-parent-copy-he.js",
  "utils/topic-next-step-engine.js",
  "utils/topic-next-step-phase2.js",
  "utils/learning-patterns-analysis.js",
  "utils/parent-report-intervention-plan.js",
  "utils/parent-report-mistake-intelligence.js",
  "utils/history-subtopic-report.js",
  "utils/parent-report-ui-explain-he.js",
  "utils/parent-report-language/grade-aware-recommendation-templates.js",
  "utils/parent-report-language/v2-parent-copy.js",
  "utils/parent-copilot/intent-answer-composers.js",
  "utils/parent-copilot/semantic-aggregate-answers.js",
  "utils/parent-copilot/parent-coaching-packs.js",
  "utils/parent-copilot/short-followup-composer.js",
  "utils/parent-copilot/truth-packet-v1.js",
  "utils/parent-copilot/direct-answer-openers.js",
  "utils/parent-copilot/followup-engine.js",
  "pages/student/home.js",
  "pages/student/cards.js",
  "components/student/StudentClassroomActivitiesPanel.jsx",
  "lib/educational-games/educational-game-registry.js",
  "components/educational-games/leo-word-detective/leo-word-detective-data.js",
  "components/pwa/PwaInstallPageShell.jsx",
  "data/help-center/content/parents.js",
];

const guillemetUiViolations = [];
for (const rel of GUILLEMET_UI_FILES) {
  const abs = join(ROOT, rel);
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    assert.fail(`guillemet UI guard missing file: ${rel}`);
  }
  const lines = text.split("\n");
  for (const guil of ["«", "»"]) {
    let idx = 0;
    while (idx < text.length) {
      const at = text.indexOf(guil, idx);
      if (at < 0) break;
      const lineNo = text.slice(0, at).split("\n").length;
      const lineText = lines[lineNo - 1] || "";
      if (!isGuardExemptSourceLine(lineText)) {
        guillemetUiViolations.push({ file: rel, line: lineNo, fragment: guil });
      }
      idx = at + 1;
    }
  }
}

assert.equal(
  guillemetUiViolations.length,
  0,
  `guillemets in child/help UI sources:\n${guillemetUiViolations
    .slice(0, 20)
    .map((v) => `  ${v.file}:${v.line} — ${v.fragment}`)
    .join("\n")}${guillemetUiViolations.length > 20 ? `\n  …and ${guillemetUiViolations.length - 20} more` : ""}`
);

console.log(
  "parent-report-hebrew-copy-guard: OK",
  files.length,
  "files scanned,",
  renderedSamples.length,
  "rendered samples checked (incl.",
  ownerCopyRenderedSamples.length,
  "owner subject templates)",
);
