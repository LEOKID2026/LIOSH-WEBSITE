#!/usr/bin/env node
/**
 * Launch Readiness Matrix — reads central launch registry + inventory.
 * node scripts/qa/launch-readiness-matrix.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { curriculumTopicsFor } from "../lib/qa-curriculum-matrix.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const {
  getAllTopicLaunchRows,
  getTopicLaunchRow,
  isTopicAllowedOnSurface,
  getDiagnosticContributionMetadata,
} = await import(href("lib/launch-readiness/topic-launch-policy.js"));
const { LAUNCH_SURFACES } = await import(href("lib/launch-readiness/launch-surfaces.js"));
const { LEARNING_BOOK_META_BY_KEY, getLearningBookKey } = await import(
  href("lib/learning-book/learning-book-catalog-meta.js")
);
const { getBookSectionAudioScope } = await import(
  href("lib/learning-book/audio/learning-book-audio-manifest.js")
);

const SUBJECTS = ["math", "geometry", "hebrew", "english", "science", "moledet_geography"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

/** @type {Record<string, string>} */
const SUBJECT_LABEL = {
  math: "חשבון",
  geometry: "גאומטריה",
  hebrew: "עברית",
  english: "אנגלית",
  science: "מדעים",
  moledet_geography: "מולדת וגאוגרפיה",
};

function hasLearningBook(subject, grade) {
  if (subject === "moledet_geography") {
    const g = Number(grade.replace("g", ""));
    if (g >= 2 && g <= 4) return Boolean(LEARNING_BOOK_META_BY_KEY[getLearningBookKey("moledet", grade)]);
    if (g >= 5 && g <= 6) return Boolean(LEARNING_BOOK_META_BY_KEY[getLearningBookKey("geography", grade)]);
    return false;
  }
  return Boolean(LEARNING_BOOK_META_BY_KEY[getLearningBookKey(subject, grade)]);
}

function bookHasAudio(subject, grade) {
  return Boolean(getBookSectionAudioScope(subject, grade));
}

function gradeLaunchRollup(rows) {
  const levels = rows.map((r) => r.recommendedLaunch);
  if (levels.every((l) => l === "HIDE")) return "HIDE";
  if (levels.every((l) => l === "FULL")) return "FULL";
  if (levels.every((l) => l === "PRACTICE_ONLY" || l === "FULL")) {
    if (levels.some((l) => l === "PRACTICE_ONLY") && !levels.some((l) => l === "FULL")) {
      return "PRACTICE_ONLY";
    }
  }
  if (levels.some((l) => l === "FULL") && levels.some((l) => l === "HIDE")) return "LIMITED";
  if (levels.every((l) => l === "PRACTICE_ONLY" || l === "LIMITED")) {
    return levels.includes("PRACTICE_ONLY") ? "PRACTICE_ONLY" : "LIMITED";
  }
  return "LIMITED";
}

async function main() {
  const invPath = join(ROOT, "reports", "question-audit", "QUESTION_INVENTORY_MATRIX.json");
  const invRaw = JSON.parse(await readFile(invPath, "utf8"));
  const invRows = invRaw.rows || [];

  /** @type {Map<string, object>} */
  const invByTopic = new Map();
  for (const row of invRows) {
    const key = `${row.subject}:${row.grade}:${row.topic}`;
    if (!invByTopic.has(key)) {
      invByTopic.set(key, {
        topicTotal: 0,
        byLevel: {},
        criticalBlocking: false,
        needsAuthoring: false,
        inventoryStatus: "MIXED",
      });
    }
    const agg = invByTopic.get(key);
    agg.byLevel[row.level] = row.uniqueUsableQuestionCount ?? row.count ?? 0;
    agg.topicTotal = Math.max(agg.topicTotal, row.topicTotalUniqueCount ?? 0);
    if (row.status === "CRITICAL_BLOCKING") {
      agg.criticalBlocking = true;
      agg.inventoryStatus = "CRITICAL_BLOCKING";
    } else if (row.status === "NEEDS_AUTHORING_BEFORE_LAUNCH") {
      agg.needsAuthoring = true;
      if (agg.inventoryStatus !== "CRITICAL_BLOCKING") agg.inventoryStatus = "NEEDS_AUTHORING";
    } else if (row.status === "PROFESSIONAL_READY" && agg.inventoryStatus === "MIXED") {
      agg.inventoryStatus = "PROFESSIONAL_READY";
    }
  }

  /** @type {Array<object>} */
  const matrix = [];
  const registryRows = getAllTopicLaunchRows();

  for (const subject of SUBJECTS) {
    for (const grade of GRADES) {
      const topics = curriculumTopicsFor(subject, grade);
      if (!topics.length) {
        matrix.push({
          subject,
          grade,
          topic: "(none)",
          visibleTopics: [],
          questionCount: 0,
          mcqNonMcq: "n/a",
          selfPractice: false,
          assignedActivities: false,
          parentDiagnostics: "excluded",
          learningBook: hasLearningBook(subject, grade),
          audioRequired: false,
          audioAvailable: bookHasAudio(subject, grade),
          launchReady: false,
          recommendedLaunch: "HIDE",
          reason: "No visible topics in curriculum",
          policySource: "registry",
        });
        continue;
      }

      for (const topic of topics) {
        const key = `${subject}:${grade}:${topic}`;
        const policy = getTopicLaunchRow(subject, grade, topic);
        const inv = invByTopic.get(key) || { topicTotal: 0, byLevel: {} };
        const easy = inv.byLevel?.easy ?? 0;
        const med = inv.byLevel?.medium ?? 0;
        const hard = inv.byLevel?.hard ?? 0;
        const total = inv.topicTotal || easy + med + hard;
        const isWriting = topic === "writing" || topic === "speaking";
        const launchLevel = policy?.launchLevel ?? "LIMITED";
        const selfPractice = isTopicAllowedOnSurface(
          subject,
          grade,
          topic,
          LAUNCH_SURFACES.SELF_PRACTICE
        );
        const assign = isTopicAllowedOnSurface(subject, grade, topic, LAUNCH_SURFACES.PARENT_ASSIGN);

        matrix.push({
          subject,
          grade,
          topic,
          visibleTopics: topics,
          questionCount: total,
          countByLevel: { easy, medium: med, hard },
          mcqNonMcq: isWriting ? "non-MCQ (typing/speaking)" : "MCQ-primary",
          selfPractice,
          assignedActivities: assign,
          parentDiagnostics: getDiagnosticContributionMetadata(subject, grade, topic) ?? "thin",
          learningBook: hasLearningBook(subject, grade),
          audioRequired: Boolean(policy?.audioRequired),
          audioAvailable: bookHasAudio(subject, grade),
          bookFirstRecommended: Boolean(policy?.bookFirstRecommended),
          launchReady:
            launchLevel !== "HIDE" &&
            !inv.criticalBlocking &&
            total > 0 &&
            ["FULL", "LIMITED", "PRACTICE_ONLY"].includes(launchLevel),
          recommendedLaunch: launchLevel,
          reason: policy?.reason ?? "No registry row",
          inventoryStatus: inv.inventoryStatus ?? policy?.inventoryStatus,
          policySource: "topic-launch-registry.json",
        });
      }
    }
  }

  const outDir = join(ROOT, "docs", "qa");
  const artifactDir = join(outDir, "_artifacts", "launch-readiness");
  await mkdir(artifactDir, { recursive: true });

  const jsonOut = {
    generatedAt: new Date().toISOString(),
    policySource: "data/launch-readiness/topic-launch-registry.json",
    registryRowCount: registryRows.length,
    assumptions: {
      diagnosticMetadataFlags: "OFF (subskill, parent gating, promotion)",
      parentReportBehavior: "unchanged",
      diagnosticContributionConsumedByParent: false,
    },
    rows: matrix,
    gradeRollup: {},
  };

  for (const subject of SUBJECTS) {
    for (const grade of GRADES) {
      const rows = matrix.filter((r) => r.subject === subject && r.grade === grade && r.topic !== "(none)");
      if (!rows.length) continue;
      jsonOut.gradeRollup[`${subject}:${grade}`] = {
        recommendedLaunch: gradeLaunchRollup(rows),
        topics: rows.length,
        full: rows.filter((r) => r.recommendedLaunch === "FULL").length,
        limited: rows.filter((r) => r.recommendedLaunch === "LIMITED").length,
        practiceOnly: rows.filter((r) => r.recommendedLaunch === "PRACTICE_ONLY").length,
        hide: rows.filter((r) => r.recommendedLaunch === "HIDE").length,
      };
    }
  }

  await writeFile(join(artifactDir, "launch-readiness-matrix.json"), JSON.stringify(jsonOut, null, 2));

  const lines = [];
  lines.push("# Launch Readiness Matrix");
  lines.push("");
  lines.push(`**Generated:** ${jsonOut.generatedAt}`);
  lines.push(`**Policy source:** ${jsonOut.policySource}`);
  lines.push("");
  lines.push("## Assumptions");
  lines.push("");
  lines.push("- Central policy: `lib/launch-readiness/topic-launch-policy.js`");
  lines.push("- `diagnosticContribution` in registry is metadata only — parent report unchanged");
  lines.push("- Diagnostic metadata flags: **OFF**");
  lines.push("");
  lines.push("## Grade rollup");
  lines.push("");
  lines.push("| Subject | Grade | Rollup | FULL | LIMITED | PRACTICE_ONLY | HIDE |");
  lines.push("|---------|-------|--------|-----:|--------:|--------------:|-----:|");
  for (const [k, v] of Object.entries(jsonOut.gradeRollup).sort()) {
    const [subj, gr] = k.split(":");
    lines.push(
      `| ${SUBJECT_LABEL[subj] || subj} | ${gr} | **${v.recommendedLaunch}** | ${v.full} | ${v.limited} | ${v.practiceOnly} | ${v.hide} |`
    );
  }
  lines.push("");
  lines.push("## Full matrix");
  lines.push("");
  lines.push(
    "| Subject | Grade | Topic | Q count | Level | Self-practice | Assigned | Diag (meta) | Book-first | Reason |"
  );
  lines.push(
    "|---------|-------|-------|--------:|-------|---------------|----------|-------------|------------|--------|"
  );
  for (const r of matrix) {
    if (r.topic === "(none)") {
      lines.push(`| ${SUBJECT_LABEL[r.subject]} | ${r.grade} | — | 0 | HIDE | no | no | excluded | no | ${r.reason} |`);
      continue;
    }
    lines.push(
      `| ${SUBJECT_LABEL[r.subject]} | ${r.grade} | ${r.topic} | ${r.questionCount} | **${r.recommendedLaunch}** | ${r.selfPractice ? "yes" : "no"} | ${r.assignedActivities ? "yes" : "no"} | ${r.parentDiagnostics} | ${r.bookFirstRecommended ? "yes" : "no"} | ${r.reason} |`
    );
  }

  await writeFile(join(outDir, "LAUNCH_READINESS_MATRIX.md"), lines.join("\n"));
  console.log("Wrote docs/qa/LAUNCH_READINESS_MATRIX.md");
  console.log("Wrote docs/qa/_artifacts/launch-readiness/launch-readiness-matrix.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
