#!/usr/bin/env node
/**
 * Content gap backlog — planning artifact from content-gap-audit (no question edits).
 * npm run qa:learning-simulator:content-backlog
 *
 * Exit 1 if audit missing, cell count mismatch, unmapped cell, or write failure.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, "reports", "learning-simulator");
const AUDIT_JSON = join(OUT_DIR, "content-gap-audit.json");
const OUT_JSON = join(OUT_DIR, "content-gap-backlog.json");
const OUT_MD = join(OUT_DIR, "content-gap-backlog.md");

/** @param {string} s */
function mdEscape(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

function bump(rec, k) {
  rec[k] = (rec[k] || 0) + 1;
}

/**
 * @param {object} cell — entry from content-gap-audit cells[]
 * @returns {object | null}
 */
function cellToBacklogItem(cell) {
  const subject = String(cell.subject || "");
  const grade = String(cell.grade || "");
  const level = String(cell.level || "");
  const topic = String(cell.topic || "");
  const cat = String(cell.finalGapCategory || "");
  const ck = String(cell.cellKey || "");

  if (!subject || !grade || !level || !topic || !ck) return null;

  const backlogId = `BG_${ck.replace(/\|/g, "__")}`;

  const exactMissingReason = String(cell.currentUnsupportedReason || "").trim() || "unknown";

  /** @type {{ targetFile: string, suggestedContentType: string, releaseRisk: string, notes: string }} */
  let mapped = null;

  if (subject === "science" && cat === "missing_topic_bank_entries") {
    mapped = {
      targetFile: "data/science-questions.js",
      suggestedContentType: "science_bank_question",
      releaseRisk: "high",
      notes:
        "Add SCIENCE_QUESTIONS rows with matching topic, grades[], minLevel/maxLevel band for matrix level; verify filter in question-generator-adapters science branch.",
    };
  } else if (subject === "english" && topic === "translation" && cat === "needs_content_addition") {
    mapped = {
      targetFile: "data/english-questions/translation-pools.js",
      suggestedContentType: "english_translation_mcq",
      releaseRisk: "medium",
      notes:
        "Phase 4 requires MCQ-shaped rows (isEnglishMcqLike); translation flashcards alone do not satisfy. Confirm product wants MCQ here vs curriculum/matrix adjustment.",
    };
  } else if (
    subject === "english" &&
    topic === "phonics" &&
    (grade === "g1" || grade === "g2") &&
    cat === "needs_content_addition"
  ) {
    mapped = {
      targetFile: "data/english-questions/grammar-pools.js",
      suggestedContentType: "future_decision_non_mcq_phonics",
      releaseRisk: "low",
      notes:
        "Launch scope: treat as advisory backlog only. g1/g2 phonics is currently non-MCQ in this QA path (expected skip/not-applicable). If product later requires MCQ phonics, handle as a dedicated future content track.",
    };
  }

  if (!mapped) return null;

  const canBeDeferred = true;
  const priority = String(cell.priority || "P1");

  return {
    backlogId,
    subject,
    grade,
    level,
    topic,
    finalGapCategory: cat,
    priority,
    evidenceFiles: Array.isArray(cell.evidenceFiles) ? cell.evidenceFiles : [],
    exactMissingReason,
    recommendedAction: String(cell.recommendedAction || ""),
    targetFileToEditLater: mapped.targetFile,
    suggestedContentType: mapped.suggestedContentType,
    canBeDeferred,
    releaseRisk: mapped.releaseRisk,
    notes: mapped.notes,
    cellKey: ck,
    needs_review: false,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let audit;
  try {
    audit = JSON.parse(await readFile(AUDIT_JSON, "utf8"));
  } catch {
    console.error(`Missing or invalid ${AUDIT_JSON} — run npm run qa:learning-simulator:content-gaps first.`);
    process.exit(1);
    return;
  }

  const expectedTotal = Number(audit.totalUnsupportedNeedsContent);
  const auditCells = audit.cells || [];

  if (!Number.isFinite(expectedTotal) || expectedTotal < 0) {
    console.error("content-gap-audit.json: invalid totalUnsupportedNeedsContent");
    process.exit(1);
  }

  if (auditCells.length !== expectedTotal) {
    console.error(
      `Backlog mismatch: audit lists totalUnsupportedNeedsContent=${expectedTotal} but cells.length=${auditCells.length}`
    );
    process.exit(1);
  }

  /** @type {object[]} */
  const items = [];
  let needsReview = 0;

  for (let i = 0; i < auditCells.length; i++) {
    const row = cellToBacklogItem(auditCells[i]);
    if (!row) {
      needsReview += 1;
      items.push({
        backlogId: `BG_NEEDS_REVIEW_${i}`,
        subject: auditCells[i].subject,
        grade: auditCells[i].grade,
        level: auditCells[i].level,
        topic: auditCells[i].topic,
        finalGapCategory: auditCells[i].finalGapCategory,
        priority: auditCells[i].priority,
        evidenceFiles: auditCells[i].evidenceFiles || [],
        exactMissingReason: String(auditCells[i].currentUnsupportedReason || ""),
        recommendedAction: String(auditCells[i].recommendedAction || ""),
        targetFileToEditLater: null,
        suggestedContentType: "policy_decision",
        canBeDeferred: true,
        releaseRisk: "low",
        notes: "Unmapped in run-content-gap-backlog.mjs — extend cellToBacklogItem.",
        cellKey: auditCells[i].cellKey,
        needs_review: true,
      });
      continue;
    }
    items.push(row);
  }

  if (needsReview > 0 || items.length !== expectedTotal) {
    console.error(`Backlog FAIL: needs_review=${needsReview}, items=${items.length}, expected=${expectedTotal}`);
    process.exit(1);
  }

  const bySubject = {};
  const byGrade = {};
  const byTopic = {};
  const byLevel = {};
  const byRisk = {};

  for (const it of items) {
    bump(bySubject, it.subject);
    bump(byGrade, it.grade);
    bump(byTopic, `${it.subject}:${it.topic}`);
    bump(byLevel, it.level);
    bump(byRisk, it.releaseRisk);
  }

  const runId = `content-backlog-${Date.now().toString(36)}`;
  const generatedAt = new Date().toISOString();

  const payload = {
    runId,
    generatedAt,
    versions: { contentGapBacklog: "1.0.0" },
    sourceAuditRunId: audit.runId || null,
    totalBacklogItems: items.length,
    countsBySubject: bySubject,
    countsByGrade: byGrade,
    countsByTopic: byTopic,
    countsByLevel: byLevel,
    countsByReleaseRisk: byRisk,
    items: items.sort((a, b) => a.cellKey.localeCompare(b.cellKey)),
  };

  const md = [
    "# Content gap backlog (planning only)",
    "",
    "This file lists the **41** real content gaps (`unsupported_needs_content`). No questions were added or edited.",
    "",
    `- Generated: ${generatedAt}`,
    `- Run id: ${runId}`,
    `- Source audit: ${audit.runId || "(unknown)"}`,
    "",
    "## Summary",
    "",
    `- **Total backlog items:** ${items.length}`,
    "",
    "### By subject",
    "",
    ...Object.entries(bySubject)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${mdEscape(k)}: **${v}**`),
    "",
    "### By grade",
    "",
    ...Object.entries(byGrade)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `- ${mdEscape(k)}: **${v}**`),
    "",
    "### By topic (subject:topic)",
    "",
    ...Object.entries(byTopic)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${mdEscape(k)}: **${v}**`),
    "",
    "### By level",
    "",
    ...Object.entries(byLevel)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `- ${mdEscape(k)}: **${v}**`),
    "",
    "### By releaseRisk",
    "",
    ...Object.entries(byRisk)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${mdEscape(k)}: **${v}**`),
    "",
    "### Recommended order for later implementation",
    "",
    "1. **Science** — batch by topic (`animals`, `body`, `earth_space`, …): extend `data/science-questions.js` so each matrix band has ≥1 MCQ row.",
    "2. **English translation** — decide product stance (MCQ vs flashcards-only); then add MCQ-shaped rows to `data/english-questions/translation-pools.js` or adjust matrix expectations.",
    "",
    "## Example items (first 8)",
    "",
    "| backlogId | subject | grade | topic | level | target file | risk |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...items.slice(0, 8).map((it) => {
      return `| ${mdEscape(it.backlogId)} | ${mdEscape(it.subject)} | ${mdEscape(it.grade)} | ${mdEscape(it.topic)} | ${mdEscape(it.level)} | ${mdEscape(it.targetFileToEditLater)} | ${mdEscape(it.releaseRisk)} |`;
    }),
    "",
    "## Full list",
    "",
    `See JSON: \`${OUT_JSON.replace(/\\/g, "/")}\` — every item includes backlogId, exactMissingReason, recommendedAction, canBeDeferred, notes.`,
    "",
  ].join("\n");

  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  await writeFile(OUT_MD, md, "utf8");

  console.log(JSON.stringify({ ok: true, totalBacklogItems: items.length, needsReview: 0, outJson: OUT_JSON }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
