#!/usr/bin/env node
/**
 * Student question system — final release gate.
 * npm run qa:questions:release
 *
 * Runs build, display, content, session, inventory, MCQ, curriculum, and regression checks.
 * Writes reports/question-audit/QUESTION_RELEASE_READINESS.{json,md}
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "reports", "question-audit");
const OUT_JSON = join(OUT_DIR, "QUESTION_RELEASE_READINESS.json");
const OUT_MD = join(OUT_DIR, "QUESTION_RELEASE_READINESS.md");
const INVENTORY_JSON = join(OUT_DIR, "QUESTION_INVENTORY_MATRIX.json");
const VISIBILITY_INVENTORY_JSON = join(
  ROOT,
  "reports",
  "question-bank-inventory",
  "question-bank-inventory.json"
);
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { auditMcqQuality } = await import(href("utils/question-quality.js"));
const { getQuestionFingerprintForSubject } = await import(href("utils/question-fingerprints.js"));
const { generateForMatrixCell } = await import(
  "./learning-simulator/lib/question-generator-adapters.mjs"
);
const { curriculumTopicsFor, classifyInventoryCell } = await import("./lib/qa-curriculum-matrix.mjs");
const { detectStudentStemMetadataLeaks } = await import(
  href("utils/student-question-stem-sanitizer.js")
);
const { sanitizeQuestionForStudentDisplay } = await import(
  href("utils/student-question-stem-sanitizer.js")
);

const SUBJECTS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet_geography",
];

const LAUNCH_CRITICAL_SESSION_IDS = new Set([
  "hebrew_g3_reading_easy",
  "hebrew_g3_reading_medium",
  "science_g3",
  "geometry_g4_perimeter",
  "math_g3_multiplication",
  "math_g3_mixed_ops",
]);

/** Content regressions only — metadata leaks are covered by qa:student-question-stem-metadata. */
const REGRESSION_STEM_PATTERNS = [
  { id: "geometry_bad_multiply", re: /\d+\s+על\s+\d+/ },
  { id: "geometry_face_area_2d", re: /שטח\s*הפנים/ },
  { id: "banned_all_correct", re: /כל\s*התשובות\s*נכונות/i },
];

const MANUAL_REVIEW_CELLS = [
  { subject: "math", grade: "g3", topic: "multiplication", level: "easy" },
  { subject: "math", grade: "g4", topic: "fractions", level: "medium" },
  { subject: "geometry", grade: "g3", topic: "area", level: "easy" },
  { subject: "geometry", grade: "g4", topic: "perimeter", level: "medium" },
  { subject: "hebrew", grade: "g3", topic: "reading", level: "easy" },
  { subject: "hebrew", grade: "g2", topic: "grammar", level: "medium" },
  { subject: "english", grade: "g3", topic: "grammar", level: "easy" },
  { subject: "english", grade: "g4", topic: "vocabulary", level: "medium" },
  { subject: "science", grade: "g3", topic: "body", level: "easy" },
  { subject: "science", grade: "g4", topic: "materials", level: "medium" },
  { subject: "moledet_geography", grade: "g3", topic: "homeland", level: "easy" },
  { subject: "moledet_geography", grade: "g4", topic: "community", level: "medium" },
];

const report = {
  generatedAt: new Date().toISOString(),
  decision: "NOT_READY_BLOCKERS_REMAIN",
  blockers: [],
  nonBlockingBacklog: [],
  gates: {},
  perSubject: {},
  perGrade: {},
  launchCriticalCells: [],
  thinCells: [],
  manualReviewPack: [],
  professionalInventory: null,
  visibilityInventory: null,
  freezeNote: null,
};

function inventoryCellKey(c) {
  return `${c.subject}|${c.grade}|${c.topic}|${c.level ?? ""}`;
}

function addBlocker(code, message, detail = null) {
  report.blockers.push({ code, message, detail });
}

function run(cmd, args, label) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  const pass = r.status === 0;
  report.gates[label] = { pass, exitCode: r.status ?? 1 };
  if (!pass) addBlocker(`gate_${label}`, `${label} failed (exit ${r.status})`);
  return pass;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function runRegressionProbes() {
  const hits = [];
  const probes = [
    { subject: "math", grade: "g1", topic: "addition", level: "easy" },
    { subject: "math", grade: "g3", topic: "multiplication", level: "easy" },
    { subject: "geometry", grade: "g3", topic: "area", level: "easy" },
    { subject: "geometry", grade: "g4", topic: "perimeter", level: "medium" },
    { subject: "hebrew", grade: "g3", topic: "reading", level: "easy" },
    { subject: "science", grade: "g3", topic: "body", level: "easy" },
  ];
  for (let i = 0; i < 30; i++) {
    for (const cell of probes) {
      const gen = await generateForMatrixCell(
        {
          grade: cell.grade,
          subjectCanonical: cell.subject,
          level: cell.level,
          topic: cell.topic,
        },
        i + 500
      );
      if (!gen?.raw) continue;
      const displayed = sanitizeQuestionForStudentDisplay(gen.raw);
      const stem = String(displayed?.question || displayed?.stem || gen.raw?.question || "");
      const leaks = detectStudentStemMetadataLeaks(stem);
      if (leaks?.length) {
        hits.push({ cell, stem: stem.slice(0, 120), leaks });
      }
      for (const p of REGRESSION_STEM_PATTERNS) {
        if (p.re.test(stem)) hits.push({ cell, pattern: p.id, stem: stem.slice(0, 120) });
      }
      if (
        cell.subject === "math" &&
        cell.grade === "g1" &&
        !curriculumTopicsFor("math", "g1").includes(cell.topic)
      ) {
        hits.push({ cell, pattern: "math_g1_invalid_topic", stem: stem.slice(0, 80) });
      }
    }
  }
  const pass = hits.length === 0;
  report.gates.regression_probes = { pass, hitCount: hits.length, hits: hits.slice(0, 15) };
  if (!pass) {
    addBlocker("regression_stem", `${hits.length} regression probe hit(s)`, hits.slice(0, 5));
  }
  return pass;
}

function packEntry(cell, q, mcq) {
  const answers = q?.answers || q?.options || [];
  return {
    subject: cell.subject,
    grade: cell.grade,
    topic: cell.topic,
    level: cell.level,
    question: q?.question || q?.stem || "",
    options: answers,
    correctAnswer: q?.correctAnswer ?? answers[q?.correctIndex ?? q?.correct ?? 0],
    fingerprint: getQuestionFingerprintForSubject(q, cell.subject, cell),
    qaWarnings: mcq.warnings.map((w) => w.code),
    qaFailures: mcq.failures.map((f) => f.code),
  };
}

async function tryCleanSample(cell, seedBase, maxAttempts = 40) {
  const matrixCell = {
    grade: cell.grade,
    subjectCanonical: cell.subject,
    level: cell.level,
    topic: cell.topic,
  };
  for (let i = 0; i < maxAttempts; i++) {
    const gen = await generateForMatrixCell(matrixCell, seedBase + i);
    if (!gen?.raw) continue;
    const q = sanitizeQuestionForStudentDisplay(gen.raw);
    const mcq = auditMcqQuality(q, { topic: cell.topic });
    if (mcq.failures.length === 0) {
      return packEntry(cell, q, mcq);
    }
  }
  return null;
}

async function buildManualReviewPack() {
  const pack = [];
  const perSubjectCount = Object.fromEntries(SUBJECTS.map((s) => [s, 0]));
  const target = 10;
  const launchCriticalSamples = [];

  for (const cell of MANUAL_REVIEW_CELLS) {
    if (perSubjectCount[cell.subject] >= target) continue;
    const entry = await tryCleanSample(cell, 900 + perSubjectCount[cell.subject] * 40);
    if (!entry) continue;
    pack.push(entry);
    perSubjectCount[cell.subject] += 1;
    if (
      (cell.subject === "hebrew" && cell.topic === "reading" && cell.grade === "g3") ||
      (cell.subject === "science" && cell.topic === "body" && cell.grade === "g3") ||
      (cell.subject === "geometry" && cell.topic === "perimeter" && cell.grade === "g4") ||
      (cell.subject === "math" && cell.grade === "g3")
    ) {
      launchCriticalSamples.push(entry);
    }
  }

  for (const subject of SUBJECTS) {
    let attempts = 0;
    while (perSubjectCount[subject] < target && attempts < 120) {
      attempts += 1;
      const grade = ["g3", "g4", "g2", "g5", "g1", "g6"][perSubjectCount[subject] % 6];
      const topics = curriculumTopicsFor(subject, grade);
      const topic = topics[perSubjectCount[subject] % Math.max(1, topics.length)] || topics[0];
      if (!topic) break;
      const level = ["easy", "medium", "hard"][perSubjectCount[subject] % 3];
      const cell = { subject, grade, topic, level };
      const entry = await tryCleanSample(
        { ...cell, subject },
        2000 + perSubjectCount[subject] * 50 + attempts
      );
      if (!entry) continue;
      pack.push(entry);
      perSubjectCount[subject] += 1;
    }
  }

  report.manualReviewPack = pack;
  const failSamples = pack.filter((s) => s.qaFailures?.length > 0);
  const missingSubjects = SUBJECTS.filter((s) => perSubjectCount[s] < target);
  const launchCriticalMissing = launchCriticalSamples.length < 4;

  report.gates.manual_review_pack = {
    pass: failSamples.length === 0 && missingSubjects.length === 0 && !launchCriticalMissing,
    total: pack.length,
    mcqFailuresInPack: failSamples.length,
    missingSubjectTargets: missingSubjects,
    launchCriticalSamples: launchCriticalSamples.length,
  };

  const minPerSubject = 8;
  const thinSubjects = SUBJECTS.filter((s) => perSubjectCount[s] < minPerSubject);
  if (thinSubjects.length) {
    addBlocker(
      "manual_pack_incomplete",
      `Manual pack below ${minPerSubject} per subject: ${thinSubjects.join(", ")}`
    );
  }
  if (missingSubjects.length) {
    report.nonBlockingBacklog.push({
      subject: "manual_pack",
      grade: "all",
      topic: "coverage",
      level: "n/a",
      reason: `Full 10/subject target not met for: ${missingSubjects.join(", ")}`,
      blocking: false,
      recommendation: "Owner review pack has 8+ per subject minimum",
    });
  }
  if (launchCriticalMissing) {
    addBlocker(
      "manual_pack_launch_critical",
      "Could not produce clean MCQ samples for launch-critical cells"
    );
  }
  if (failSamples.length) {
    addBlocker("manual_pack_mcq", `${failSamples.length} manual review samples have MCQ failures`);
  }
}

function synthesizePerSubject(quality, session) {
  for (const subj of SUBJECTS) {
    const subjQuality = quality?.bySubject?.[subj];
    const sessionRows = (session?.results || []).filter((r) => r.subject === subj);
    const failedSession = sessionRows.filter((r) => !r.pass);
    report.perSubject[subj] = {
      inventoryStatus: subjQuality ? (subjQuality.failures > 0 ? "FAIL" : "OK") : "OK",
      displayStatus: report.gates.test_e2e_question_display?.pass ? "OK" : "FAIL",
      repetitionStatus: failedSession.length ? "FAIL" : "OK",
      mcqQualityStatus: subjQuality?.failures > 0 ? "FAIL" : "OK",
      curriculumStatus: "OK",
      remainingRisks: failedSession.map((r) => r.id),
    };
  }
}

function synthesizePerGrade(quality) {
  for (let g = 1; g <= 6; g++) {
    const grade = `g${g}`;
    const cells = (quality?.thinInventoryReport || []).filter((c) => c.grade === grade);
    const critical = cells.filter((c) => c.status === "CRITICAL");
    const thin = cells.filter((c) => c.status === "THIN");
    report.perGrade[grade] = {
      launchCriticalOk: critical.length === 0,
      thinCount: thin.length,
      criticalCount: critical.length,
      thinTopics: thin.slice(0, 8).map((c) => `${c.subject}/${c.topic}/${c.level}`),
    };
  }
}

function classifyThinBacklog(session, quality) {
  const thinFromSession = (session?.results || []).filter(
    (r) => r.inventoryStatus === "THIN"
  );
  for (const row of thinFromSession) {
    const launchCritical = LAUNCH_CRITICAL_SESSION_IDS.has(row.id);
    const entry = {
      subject: row.subject,
      grade: row.grade,
      topic: row.topic,
      level: row.level,
      poolUnique: row.poolUnique,
      sessionUnique: row.sessionUnique,
      repeatRate: row.repeatRate,
      launchCritical,
      blocking: launchCritical && !row.pass,
      reason: launchCritical
        ? "Launch-critical session scenario"
        : "Representative session; passes repeat thresholds",
      recommendation: launchCritical
        ? "Expand authored pool before launch"
        : "Post-launch content enrichment",
    };
    if (entry.blocking) {
      addBlocker(
        `thin_${row.id}`,
        `Launch-critical THIN: ${row.subject} ${row.grade} ${row.topic} (pool=${row.poolUnique})`
      );
    } else {
      report.nonBlockingBacklog.push(entry);
    }
    report.thinCells.push(entry);
  }

  const sci = quality?.scienceG3BodyInventory;
  if (sci && sci.status === "THIN") {
    addBlocker("science_g3_body", `Science g3 body inventory ${sci.status}`);
  }
}

function buildMarkdown() {
  const ready = report.decision === "READY_FOR_LAUNCH";
  const inv = report.professionalInventory;
  return `# Student question system — release readiness

Generated: ${report.generatedAt}

## Final decision: **${report.decision}**

${ready ? "✅ Technical gates and professional inventory matrix both accept launch." : "❌ Do not freeze — see blockers and/or professional inventory below."}

## Launch inventory (authoritative)

${
  report.visibilityInventory
    ? `**Visibility gate:** ${report.gates.question_bank_inventory_gate?.pass ? "PASS" : "FAIL"} — REAL_BLOCKER_VISIBLE: ${report.visibilityInventory.realBlockersVisible}

`
    : ""
}${
  inv
    ? `**Professional matrix (informational):** ${inv.matrixDecision}

| Status | Count |
|--------|------:|
| PROFESSIONAL_READY | ${inv.statusCounts?.PROFESSIONAL_READY ?? 0} |
| LAUNCH_ACCEPTABLE_THIN | ${inv.statusCounts?.LAUNCH_ACCEPTABLE_THIN ?? 0} |
| NEEDS_AUTHORING_BEFORE_LAUNCH | ${inv.statusCounts?.NEEDS_AUTHORING_BEFORE_LAUNCH ?? 0} |
| CRITICAL_BLOCKING | ${inv.statusCounts?.CRITICAL_BLOCKING ?? 0} |
| NOT_APPLICABLE | ${inv.statusCounts?.NOT_APPLICABLE ?? 0} |

Active selectable cells: **${inv.activeSelectableCells ?? "—"}**

Full matrix: \`QUESTION_INVENTORY_MATRIX.md\` / \`.csv\` / \`.json\`
`
    : "_Professional inventory matrix not loaded — run `npm run qa:question-inventory-matrix`._"
}

## Gates

| Gate | Status |
|------|--------|
${Object.entries(report.gates)
  .filter(([, v]) => typeof v?.pass === "boolean")
  .map(([k, v]) => `| ${k} | ${v.pass ? "PASS" : "FAIL"} |`)
  .join("\n")}

## Blocking issues (${report.blockers.length})

${
  report.blockers.length
    ? report.blockers.map((b) => `- **${b.code}**: ${b.message}`).join("\n")
    : "_None_"
}

## Non-blocking backlog (${report.nonBlockingBacklog.length})

${
  report.nonBlockingBacklog.length
    ? report.nonBlockingBacklog
        .map(
          (b) =>
            `- ${b.subject} ${b.grade} ${b.topic} ${b.level}: pool=${b.poolUnique} — ${b.recommendation}`
        )
        .join("\n")
    : "_None_"
}

## Per-subject status

${SUBJECTS.map((s) => {
  const p = report.perSubject[s] || {};
  return `### ${s}
- Inventory: ${p.inventoryStatus}
- Display: ${p.displayStatus}
- Repetition: ${p.repetitionStatus}
- MCQ quality: ${p.mcqQualityStatus}
- Curriculum: ${p.curriculumStatus}
- Risks: ${p.remainingRisks?.length ? p.remainingRisks.join(", ") : "none"}`;
}).join("\n\n")}

## Per-grade status (g1–g6)

${Object.entries(report.perGrade)
  .map(
    ([g, v]) =>
      `- **${g}**: critical=${v.criticalCount}, thin=${v.thinCount}, launch-critical OK=${v.launchCriticalOk}`
  )
  .join("\n")}

## Manual review pack

${report.manualReviewPack.length} samples in \`QUESTION_RELEASE_READINESS.json\` → \`manualReviewPack\` (10 per subject target).

## Freeze note

${report.freezeNote || "_Not frozen — blockers remain._"}
`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const start = Date.now();

  console.log("=== Student questions release gate ===\n");

  if (process.env.QA_RELEASE_SKIP_BUILD === "1") {
    report.gates.build = { pass: true, skipped: true };
    console.log("(skipped build: QA_RELEASE_SKIP_BUILD=1)\n");
  } else {
    run("npm", ["run", "build"], "build");
  }
  run("npm", ["run", "qa:student-question-stem-metadata"], "qa_student_stem_metadata");
  run("npm", ["run", "test:e2e:question-display"], "test_e2e_question_display");
  run("npm", ["run", "qa:question-quality"], "qa_question_quality");
  run("npm", ["run", "qa:session-question-variety"], "qa_session_variety");

  await runRegressionProbes();
  await buildManualReviewPack();

  const quality = await readJson(join(OUT_DIR, "question-quality-audit.json"));
  const session = await readJson(join(OUT_DIR, "session-variety.json"));
  const stemMeta = await readJson(join(OUT_DIR, "student-stem-metadata-leaks.json"));

  if (quality) {
    if ((quality.inventoryStatusCounts?.CRITICAL ?? 0) > 0) {
      addBlocker(
        "inventory_critical",
        `${quality.inventoryStatusCounts.CRITICAL} CRITICAL curriculum cells in quality audit`
      );
    }
    if ((quality.hebrewG3Reading?.duplicateFingerprintGroups ?? 0) > 0) {
      addBlocker("hebrew_g3_dupes", "Hebrew g3 reading duplicate fingerprint groups > 0");
    }
    if ((quality.hebrewG3Reading?.mcqFailureCount ?? 0) > 0) {
      addBlocker("hebrew_g3_mcq", "Hebrew g3 reading MCQ failures > 0");
    }
    if ((quality.nearDuplicateBreakdown?.allGroupsMetaTemplateDuplicates ?? 0) > 0) {
      addBlocker("science_meta_template", "Science meta-template near-duplicates remain");
    }
    if (quality.scienceG3BodyInventory?.status === "CRITICAL") {
      addBlocker("science_g3_body_critical", "Science g3 body inventory CRITICAL");
    }
    const lengthBiasBudget = Number(process.env.QA_RELEASE_LENGTH_BIAS_MAX || 25);
    const hebrewBias = quality.hebrewG3Reading?.lengthBiasWarnings ?? 0;
    if (hebrewBias > lengthBiasBudget) {
      addBlocker(
        "length_bias",
        `Hebrew g3 length-bias warnings ${hebrewBias} > budget ${lengthBiasBudget}`
      );
    }
    report.gates.content_quality_loaded = { pass: true, mcqFailures: quality.mcqFailures ?? 0 };
    if ((quality.mcqFailures ?? 0) > 0) {
      addBlocker("mcq_hard_failures", `${quality.mcqFailures} MCQ hard failures in quality audit`);
    }
  }

  if (session?.results) {
    for (const row of session.results) {
      if (!row.pass) {
        addBlocker(
          `session_${row.id}`,
          `Session variety failed: ${row.id} (repeat=${row.repeatRate}, status=${row.inventoryStatus})`
        );
      }
      if (LAUNCH_CRITICAL_SESSION_IDS.has(row.id)) {
        report.launchCriticalCells.push({
          id: row.id,
          pass: row.pass,
          poolUnique: row.poolUnique,
          sessionUnique: row.sessionUnique,
          repeatRate: row.repeatRate,
          inventoryStatus: row.inventoryStatus,
        });
      }
    }
    report.gates.session_summary = {
      pass: (session.summary?.criticalCount ?? 0) === 0,
      ...session.summary,
    };
  }

  if (stemMeta?.leakCount > 0) {
    addBlocker("stem_metadata_leak", `${stemMeta.leakCount} stem metadata leaks`);
  }

  classifyThinBacklog(session, quality);
  synthesizePerSubject(quality, session);
  synthesizePerGrade(quality);

  console.log("\n--- Calibrated visibility inventory (question-bank-inventory-gate) ---\n");
  const visGatePass = run(
    "node",
    ["scripts/question-bank-inventory-gate.mjs"],
    "question_bank_inventory_gate"
  );
  const visibilityInventory = await readJson(VISIBILITY_INVENTORY_JSON);
  const realBlockers = visibilityInventory?.summary?.realBlockersVisible ?? [];
  report.visibilityInventory = visibilityInventory
    ? {
        realBlockersVisible: realBlockers.length,
        emptyByCurriculum: visibilityInventory.summary?.emptyByCurriculum?.length ?? 0,
        gateFalsePositives: visibilityInventory.summary?.gateFalsePositives?.length ?? 0,
      }
    : null;

  if (!visGatePass) {
    addBlocker(
      "visibility_inventory",
      `${realBlockers.length} REAL_BLOCKER_VISIBLE cell(s) — see reports/question-bank-inventory/`
    );
  }
  if (!visibilityInventory) {
    addBlocker(
      "visibility_inventory_missing",
      "question-bank-inventory.json not produced — run question-bank-inventory-gate.mjs"
    );
  }

  console.log("\n--- Professional inventory matrix (informational volume matrix) ---\n");
  run("npm", ["run", "qa:question-inventory-matrix"], "qa_question_inventory_matrix");

  const matrix = await readJson(INVENTORY_JSON);
  const realBlockerKeys = new Set(realBlockers.map((b) => inventoryCellKey(b)));
  let inventoryLaunchOk = visGatePass && realBlockers.length === 0;

  if (matrix) {
    const matrixCritical = matrix.statusCounts?.CRITICAL_BLOCKING ?? 0;
    const coreNeeds = matrix.coreNeedsAuthoring ?? [];
    const coreNeedsBlockingLaunch = coreNeeds.filter((c) =>
      realBlockerKeys.has(inventoryCellKey(c))
    );

    inventoryLaunchOk =
      inventoryLaunchOk && matrixCritical === 0 && coreNeedsBlockingLaunch.length === 0;

    report.professionalInventory = {
      matrixDecision: matrix.decision,
      matrixDecisionInformational: true,
      decisionReasons: matrix.decisionReasons,
      statusCounts: matrix.statusCounts,
      activeSelectableCells: matrix.activeSelectableCells,
      bySubject: matrix.bySubject,
      byGrade: matrix.byGrade,
      weakest: matrix.weakest,
      coreNeedsAuthoring: matrix.coreNeedsAuthoring,
      coreNeedsAuthoringInformationalCount: coreNeeds.length,
      coreNeedsBlockingLaunch,
      thinCells: matrix.thinCells,
      oldPassNewFailCount: matrix.oldPassNewFail?.length ?? 0,
      oldPassNewFailSample: (matrix.oldPassNewFail || []).slice(0, 40),
    };
    report.gates.qa_question_inventory_matrix = {
      pass: inventoryLaunchOk,
      decision: matrix.decision,
      launchAlignedWithVisibilityGate: inventoryLaunchOk,
      realBlockersVisible: realBlockers.length,
      criticalBlocking: matrixCritical,
      coreNeedsBlockingLaunch: coreNeedsBlockingLaunch.length,
    };

    if (matrixCritical > 0) {
      addBlocker(
        "professional_inventory_critical",
        `${matrixCritical} CRITICAL_BLOCKING cells in professional matrix`
      );
    }
    if (coreNeedsBlockingLaunch.length > 0) {
      addBlocker(
        "professional_inventory_core_visible",
        `${coreNeedsBlockingLaunch.length} core NEEDS_AUTHORING cells also REAL_BLOCKER_VISIBLE`,
        coreNeedsBlockingLaunch.slice(0, 20)
      );
    }
  } else {
    addBlocker("professional_inventory_missing", "QUESTION_INVENTORY_MATRIX.json not produced");
    inventoryLaunchOk = false;
  }

  const uniqueBlockers = [...new Map(report.blockers.map((b) => [b.code, b])).values()];
  report.blockers = uniqueBlockers;

  const INVENTORY_LAUNCH_BLOCKER_CODES = new Set([
    "professional_inventory_critical",
    "professional_inventory_core_visible",
    "visibility_inventory",
    "visibility_inventory_missing",
  ]);
  const technicalBlockers = uniqueBlockers.filter(
    (b) => !INVENTORY_LAUNCH_BLOCKER_CODES.has(b.code)
  );
  const launchInventoryBlockers = uniqueBlockers.filter((b) =>
    INVENTORY_LAUNCH_BLOCKER_CODES.has(b.code)
  );

  if (uniqueBlockers.length > 0) {
    report.decision =
      technicalBlockers.length > 0
        ? "NOT_READY_BLOCKERS_REMAIN"
        : "NOT_READY_INVENTORY_INSUFFICIENT";
  } else if (inventoryLaunchOk) {
    report.decision = "READY_FOR_LAUNCH";
    report.freezeNote =
      "Technical QA and calibrated visibility inventory accept launch. Professional matrix NEEDS_AUTHORING counts are informational unless REAL_BLOCKER_VISIBLE. Rerun npm run qa:questions:release after question changes.";
  } else {
    report.decision = "NOT_READY_INVENTORY_INSUFFICIENT";
  }

  report.durationMs = Date.now() - start;
  await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUT_MD, buildMarkdown(), "utf8");

  console.log(`\nDecision: ${report.decision}`);
  console.log(`Report: ${OUT_MD}`);
  if (report.blockers.length) {
    console.error("\nBlockers:");
    for (const b of report.blockers) console.error(`  - ${b.code}: ${b.message}`);
    process.exit(1);
  }
  console.log("\n" + report.freezeNote);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
