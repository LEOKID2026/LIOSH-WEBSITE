/**
 * Builds Expert Review Pack snapshot from existing validation artifacts (no diagnostic imports).
 * Used by Next API (bundled) and by scripts/learning-simulator/generate-expert-review-pack-artifacts.mjs (writes to disk).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const BANNED_PHRASES = ["dyslexia", "dyscalculia", "adhd", "learning disability", "autism spectrum", "psychiatric disorder"];

const DISCLAIMER =
  "**Disclaimer:** This is an internal educational diagnostic support review artifact. It is **not** a clinical or medical diagnosis. It is **not** a parent-facing report.";

const ARTIFACT_MODE_NOTE =
  "This scenario file was produced in **artifact snapshot mode** (from `professional-engine-validation.json` only). It does not embed the full `professionalEngineV1` object. For the full replay pack (aggregates + engine JSON), run `npm run qa:learning-simulator:expert-review-pack` in a local/CI Node environment.";

function defaultReviewerFields() {
  return {
    agreesWithEngine: null,
    concernLevel: null,
    notes: "",
    suggestedCorrection: "",
    needsEngineChange: null,
    needsQuestionMetadataChange: null,
    needsExpertRuleChange: null,
  };
}

function inferScenarioType(id) {
  if (id.startsWith("strong_")) return "strong_profile";
  if (id.startsWith("weak_")) return "weak_topic_or_subject";
  if (id.startsWith("thin")) return "thin_data";
  if (id.includes("prerequisite")) return "dependency";
  if (id.includes("cross_subject")) return "cross_subject";
  if (id.includes("misconception")) return "misconception";
  if (id.includes("mastery_decay") || id.includes("retention")) return "retention";
  if (id.includes("calibration") || id.includes("difficulty")) return "calibration";
  if (["random_guessing", "fast_wrong", "slow_correct", "inconsistent"].includes(id)) return "reliability_pace";
  if (["improving", "declining", "mixed_strengths"].includes(id)) return "trend_mixed";
  return "synthetic_validation";
}

function subjectsFromValidationActual(actual) {
  if (!actual || typeof actual !== "object") return [];
  const samples = actual.masteryBandsSample;
  if (!Array.isArray(samples)) return [];
  const s = new Set();
  for (const x of samples) {
    const subj = String(x).split("/")[0];
    if (subj) s.add(subj);
  }
  return [...s];
}

function scanBanned(text) {
  const lower = String(text).toLowerCase();
  return BANNED_PHRASES.filter((b) => lower.includes(b));
}

async function readJsonSafe(p) {
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return null;
  }
}

function qaAssert(cond, msg) {
  if (!cond) throw new Error(`Expert review pack (artifact mode) QA failed: ${msg}`);
}

function buildEvidenceStub() {
  return [];
}

function buildScenarioMarkdown(payload) {
  const lines = [
    `# Scenario: ${payload.scenarioId}`,
    "",
    DISCLAIMER,
    "",
    "> " + ARTIFACT_MODE_NOTE,
    "",
    "## 1. Scenario identity",
    "",
    `- **Scenario id:** \`${payload.scenarioId}\``,
    `- **Scenario type:** ${payload.scenarioType}`,
    `- **Subject(s) (inferred from validation snapshot):** ${payload.subjects.join(", ") || "(none)"}`,
    `- **Intended signal:** ${payload.intendedSignal}`,
    "",
    "## 2. Expected vs actual (validation artifact)",
    "",
    `- **Expected:** ${payload.validation.expectedSummary}`,
    `- **Pass / fail (validation):** ${payload.validation.pass ? "PASS" : "FAIL"}`,
    "",
    "### Validation snapshot (`actual`)",
    "",
    "```json",
    JSON.stringify(payload.validation.actualValidationSnapshot, null, 2),
    "```",
    "",
    "## 3. Full engine output",
    "",
    "Not embedded in artifact mode. Use local CLI expert-review-pack for complete `professionalEngineV1`, reliability, mastery tables, etc.",
    "",
    "## 4. Limitations",
    "",
    `- ${payload.limitations.sparseMetadata}`,
    `- ${payload.limitations.crossSubjectHeuristic}`,
    "",
    "## 5. Reviewer fields (machine-readable)",
    "",
    "```json",
    JSON.stringify(payload.reviewer, null, 2),
    "```",
    "",
    "## Human reviewer notes",
    "",
    "- **Agree with engine conclusion:** ",
    "- **Concern level:** ",
    "- **Notes:** ",
    "- **Suggested correction:** ",
    "- **Needs engine change:** ",
    "- **Needs metadata change:** ",
    "- **Needs expert rule change:** ",
    "",
  ];
  return lines.join("\n");
}

function buildSummaryMarkdown(payload) {
  const lines = [
    "# Expert Review Pack - summary",
    "",
    DISCLAIMER,
    "",
    `> **Generation mode:** artifact snapshot (API-safe).`,
    "",
    `- **Generated:** ${payload.generatedAt}`,
    `- **Status:** ${payload.status}`,
    `- **Scenario count:** ${payload.scenarioCount}`,
    `- **requiresHumanExpertReview:** ${payload.requiresHumanExpertReview}`,
    "",
    "## Engine final (if present)",
    "",
    "```json",
    JSON.stringify(payload.engineFinal, null, 2),
    "```",
    "",
    "## Orchestrator run summary (if present)",
    "",
    "```json",
    JSON.stringify(payload.orchestratorRunSummary, null, 2),
    "```",
    "",
    "## Limitations",
    "",
    ...payload.limitations.map((x) => `- ${x}`),
    "",
    "## Per scenario",
    "",
    ...payload.scenarios.map(
      (s) =>
        `- **${s.scenarioId}** - ${s.pass ? "PASS" : "FAIL"} - confidence ${s.engineConfidence} - readiness ${s.engineReadiness}`
    ),
    "",
  ];
  return lines.join("\n");
}

/** Index for inline/browser delivery (no repo-relative file links). */
function buildIndexMarkdownInline(manifest, summary) {
  const lines = [
    "# Professional engine - Expert Review Pack",
    "",
    DISCLAIMER,
    "",
    `> **Pack built from artifacts** (\`${manifest.generationMode}\`, inline delivery). Scenario bodies are returned alongside this document in the API response / downloads.`,
    "",
    `- **Generated:** ${manifest.generatedAt}`,
    `- **Pack status:** ${manifest.status}`,
    `- **Scenarios:** ${manifest.scenarioCount}`,
    `- **requiresHumanExpertReview:** ${manifest.requiresHumanExpertReview}`,
    "",
    "## Scenarios (see bundled JSON/Markdown per scenario)",
    "",
    ...manifest.scenarios.map((s) => `- **${s.scenarioId}** - ${s.pass ? "PASS" : "FAIL"}`),
    "",
    "## Source artifacts (paths on the machine that produced validation JSON)",
    "",
    `- Professional validation JSON: \`${manifest.sourceArtifacts.professionalEngineValidation}\``,
    manifest.sourceArtifacts.engineFinalSummary
      ? `- Engine final summary: \`${manifest.sourceArtifacts.engineFinalSummary}\``
      : "- Engine final summary: *(not found - run engine-final after validation)*",
  ];
  if (manifest.sourceArtifacts.orchestratorRunSummary) {
    lines.push(`- Orchestrator run summary: \`${manifest.sourceArtifacts.orchestratorRunSummary}\``);
  }
  lines.push("");
  lines.push("## Summary excerpt");
  lines.push("");
  lines.push(`- Engine final status: ${summary?.engineFinal?.engineFinalStatus ?? "(n/a)"}`);
  lines.push("");
  return lines.join("\n");
}

/**
 * @param {string} root - repository root (process.cwd())
 * @returns {Promise<{
 *   manifest: object,
 *   summary: object,
 *   indexMarkdown: string,
 *   summaryMarkdown: string,
 *   scenarios: { scenarioId: string, pass: boolean, json: string, markdown: string }[],
 *   manifestJson: string,
 *   summaryJson: string,
 * }>}
 */
export async function buildExpertReviewPackSnapshot(root) {
  const validationPath = join(root, "reports/learning-simulator/engine-professionalization/professional-engine-validation.json");
  const validationArtifact = await readJsonSafe(validationPath);
  qaAssert(validationArtifact?.status === "PASS", "professional-engine-validation.json missing or status !== PASS");

  const listFromValidation = Array.isArray(validationArtifact.scenarioList) ? validationArtifact.scenarioList : [];
  qaAssert(listFromValidation.length > 0, "professional-engine-validation.json: scenarioList missing or empty");
  qaAssert(
    Number(validationArtifact.scenarioCount) === listFromValidation.length,
    `scenarioCount vs scenarioList length mismatch (${validationArtifact.scenarioCount} vs ${listFromValidation.length})`
  );

  const validationById = Object.fromEntries((validationArtifact.scenarios || []).map((s) => [s.scenario, s]));
  for (const id of listFromValidation) {
    qaAssert(validationById[id] != null, `no validation row for scenario in scenarioList: ${id}`);
  }
  const listSet = new Set(listFromValidation);
  for (const row of validationArtifact.scenarios || []) {
    if (row?.scenario != null) {
      qaAssert(listSet.has(row.scenario), `validation row for unknown scenario (not in scenarioList): ${row.scenario}`);
    }
  }

  const engineFinalPath = join(root, "reports/learning-simulator/engine-professionalization/engine-final-summary.json");
  const engineFinal = await readJsonSafe(engineFinalPath);

  const orchestratorPath = join(root, "reports/learning-simulator/orchestrator/run-summary.json");
  const orchestratorRunSummary = await readJsonSafe(orchestratorPath);

  const manifestScenarios = [];
  const summaryScenarios = [];
  /** @type {{ scenarioId: string, pass: boolean, json: string, markdown: string }[]} */
  const scenarioBodies = [];

  for (const id of listFromValidation) {
    const valRow = validationById[id];
    qaAssert(valRow != null, `no validation row for ${id}`);

    const actual = valRow.actual && typeof valRow.actual === "object" ? valRow.actual : {};
    const subjects = subjectsFromValidationActual(actual);
    const pass = !!valRow.pass;
    const reviewer = defaultReviewerFields();

    const scenarioPayload = {
      scenarioId: id,
      scenarioType: inferScenarioType(id),
      subjects,
      intendedSignal: valRow.expected,
      validation: {
        expectedSummary: valRow.expected,
        actualValidationSnapshot: actual,
        pass,
      },
      generationMode: "artifact_snapshot_v1",
      generationNote: ARTIFACT_MODE_NOTE,
      rawAndAggregate: {
        note: "Not populated in artifact snapshot mode. Run `npm run qa:learning-simulator:expert-review-pack` for synthetic maps / aggregates.",
      },
      rawMistakesCounts: {},
      professionalEngineV1: null,
      evidenceAndReasoning: buildEvidenceStub(),
      limitations: {
        engineLayer: ["Full professional engine object omitted in artifact snapshot mode."],
        sparseMetadata:
          "Subskill and misconception precision is limited until question pools carry dense expectedErrorTypes and prerequisiteSkillIds.",
        crossSubjectHeuristic: "Cross-subject patterns are hypotheses and require confirming probes per subject.",
      },
      reviewer,
    };

    const jsonStr = JSON.stringify(scenarioPayload, null, 2);
    const mdText = buildScenarioMarkdown(scenarioPayload);

    const bannedHits = [...scanBanned(jsonStr), ...scanBanned(mdText)];
    qaAssert(bannedHits.length === 0, `banned phrases in ${id}: ${bannedHits.join(", ")}`);

    qaAssert(mdText.includes("## Human reviewer notes"), `${id}: reviewer section missing`);
    qaAssert(mdText.includes("Agree with engine conclusion"), `${id}: reviewer checklist missing`);

    manifestScenarios.push({
      scenarioId: id,
      pass,
      files: { markdown: `scenarios/${id}.md`, json: `scenarios/${id}.json` },
    });

    summaryScenarios.push({
      scenarioId: id,
      pass,
      engineConfidence: actual.engineConfidence ?? null,
      engineReadiness: actual.engineReadiness ?? null,
      expected: valRow.expected,
    });

    scenarioBodies.push({ scenarioId: id, pass, json: jsonStr, markdown: mdText });
  }

  const generatedAt = new Date().toISOString();

  const manifest = {
    kind: "expert_review_pack_v1",
    generationMode: "artifact_snapshot_v1",
    deliveryMode: "inline_response",
    generatedAt,
    status: "PASS",
    scenarioCount: manifestScenarios.length,
    scenarioIds: [...listFromValidation],
    requiresHumanExpertReview: true,
    sourceArtifacts: {
      professionalEngineValidation: "reports/learning-simulator/engine-professionalization/professional-engine-validation.json",
      engineFinalSummary: engineFinal ? "reports/learning-simulator/engine-professionalization/engine-final-summary.json" : null,
      orchestratorRunSummary: orchestratorRunSummary ? "reports/learning-simulator/orchestrator/run-summary.json" : null,
    },
    scenarios: manifestScenarios,
    disclaimer: "Internal educational diagnostic support only - not clinical / not parent-facing.",
  };

  const summaryPayload = {
    generatedAt,
    status: "PASS",
    generationMode: "artifact_snapshot_v1",
    deliveryMode: "inline_response",
    scenarioCount: summaryScenarios.length,
    requiresHumanExpertReview: true,
    engineFinal: engineFinal
      ? {
          engineFinalStatus: engineFinal.engineFinalStatus,
          engineTechnicallyComplete: engineFinal.engineTechnicallyComplete,
          professionalReadiness: engineFinal.professionalReadiness,
          releaseStatus: engineFinal.releaseStatus,
          knownLimitations: engineFinal.knownLimitations || [],
        }
      : null,
    orchestratorRunSummary,
    limitations: [
      ...(engineFinal?.knownLimitations || []),
      "Artifact snapshot mode: scenario files contain validation snapshots only; run CLI expert-review-pack for full engine JSON.",
      "Cross-subject and dependency outputs are heuristic teaching hypotheses.",
      "Sparse expectedErrorTypes / prerequisiteSkillIds on generated questions limit fine-grained misconception and prerequisite mapping.",
    ],
    scenarios: summaryScenarios,
  };

  const indexMarkdown = buildIndexMarkdownInline(manifest, summaryPayload);
  const summaryMarkdown = buildSummaryMarkdown(summaryPayload);

  const manifestJson = JSON.stringify(manifest, null, 2);
  const summaryJson = JSON.stringify(summaryPayload, null, 2);

  const idxBanned = scanBanned(indexMarkdown + manifestJson + summaryJson);
  qaAssert(idxBanned.length === 0, `banned phrases in index/summary: ${idxBanned.join(", ")}`);

  return {
    manifest,
    summary: summaryPayload,
    indexMarkdown,
    summaryMarkdown,
    scenarios: scenarioBodies,
    manifestJson,
    summaryJson,
  };
}
