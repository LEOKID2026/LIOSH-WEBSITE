#!/usr/bin/env node
/**
 * Final engine professionalization gate — layered QA + core artifacts, then full learning-simulator release
 * (orchestrator includes Next.js production build and release-readiness summary).
 * npm run qa:learning-simulator:engine-final
 */
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, "reports/learning-simulator/engine-professionalization");
const OUT_JSON = join(OUT_DIR, "engine-final-summary.json");
const OUT_MD = join(OUT_DIR, "engine-final-summary.md");

const STEPS = [
  ["qa:learning-simulator:question-skill-metadata", "Question skill metadata"],
  ["qa:learning-simulator:diagnostic-framework", "Professional diagnostic framework QA"],
  ["qa:learning-simulator:misconceptions", "Misconception engine"],
  ["qa:learning-simulator:mastery", "Mastery engine"],
  ["qa:learning-simulator:dependencies", "Dependency engine"],
  ["qa:learning-simulator:calibration", "Calibration engine"],
  ["qa:learning-simulator:reliability", "Reliability engine"],
  ["qa:learning-simulator:probes", "Probe engine"],
  ["qa:learning-simulator:cross-subject", "Cross-subject engine"],
  ["qa:learning-simulator:professional-engine-output", "Professional engine output"],
  ["qa:learning-simulator:professional-engine", "Professional engine validation"],
  ["qa:learning-simulator:engine", "Engine truth audit"],
  ["qa:learning-simulator:coverage", "Coverage catalog"],
  ["qa:learning-simulator:framework-real-scenarios", "Framework real scenarios"],
  ["qa:learning-simulator:engine-completion-summary", "Engine completion summary"],
  ["qa:learning-simulator:release", "Full learning-simulator release (orchestrator full → includes production build)"],
];

function run(cmd, cwd) {
  const start = Date.now();
  const r = spawnSync("npm", ["run", cmd], { cwd, encoding: "utf8", shell: true, stdio: "inherit" });
  const durationMs = Date.now() - start;
  const code = typeof r.status === "number" ? r.status : 1;
  return { pass: code === 0, exitCode: code, durationMs };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  /** @type {object[]} */
  const stepResults = [];
  let failuresCount = 0;
  for (const [script, label] of STEPS) {
    console.log(`\n▶ ${label}: npm run ${script}\n`);
    const row = run(script, ROOT);
    stepResults.push({ script, label, ...row });
    if (!row.pass) failuresCount += 1;
    if (!row.pass) break;
  }

  const engineFinalStatus = failuresCount === 0 && stepResults.every((s) => s.pass) ? "PASS" : "FAIL";
  const releaseStep = stepResults.find((s) => s.script === "qa:learning-simulator:release");
  const payload = {
    engineFinalStatus,
    engineTechnicallyComplete: engineFinalStatus === "PASS",
    /** Internal automation gates only — never implies licensed educator / psychometric sign-off. */
    requiresHumanExpertReview: true,
    professionalReadiness:
      engineFinalStatus === "PASS" ? "internal_engine_and_release_gates_passed" : "not_ready",
    releaseIncludedInEngineFinal: true,
    releaseStatus: releaseStep ? (releaseStep.pass ? "PASS" : "FAIL") : "skipped",
    releaseRequiredSeparately: false,
    buildStatus: releaseStep?.pass ? "included_in_qa_learning_simulator_release" : releaseStep ? "FAIL" : "unknown",
    subjectsCovered: ["math", "hebrew", "english", "science", "geometry", "moledet-geography"],
    skillsCovered: "framework_skill_packs_v1",
    subskillsCovered: "framework_subskills_v1",
    scenarioCount: stepResults.length,
    failuresCount,
    knownLimitations: [
      "English difficulty tiers may not align perfectly with matrix level labels.",
      "Cross-subject patterns are heuristic and require confirming probes.",
      "Subskill and misconception precision is limited until question pools carry dense expectedErrorTypes and prerequisiteSkillIds.",
    ],
    safeToMoveToParentReports: false,
    parentReportOrUiChangesInThisPass: false,
    generatedAt: new Date().toISOString(),
    steps: stepResults,
  };

  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  await writeFile(
    OUT_MD,
    `# Engine final gate\n\n- **engineFinalStatus:** ${payload.engineFinalStatus}\n- **engineTechnicallyComplete:** ${payload.engineTechnicallyComplete}\n- **requiresHumanExpertReview:** ${payload.requiresHumanExpertReview}\n- **professionalReadiness:** ${payload.professionalReadiness}\n- **releaseStatus:** ${payload.releaseStatus}\n- **buildStatus:** ${payload.buildStatus}\n- **safeToMoveToParentReports:** ${payload.safeToMoveToParentReports}\n\n## Steps\n\n${stepResults.map((s) => `- ${s.label}: ${s.pass ? "PASS" : "FAIL"} (${s.durationMs}ms)`).join("\n")}\n`,
    "utf8"
  );

  console.log(`\n── Engine final: ${engineFinalStatus} ──\n`);
  process.exit(engineFinalStatus === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
