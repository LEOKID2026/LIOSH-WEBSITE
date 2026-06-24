#!/usr/bin/env node
/**
 * Owner-readable sample answers from closure-report.json (no AI changes).
 * Run: node tmp/generate-owner-manual-summary.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IN_JSON = path.join(ROOT, "docs/qa/_artifacts/copilot-closure-round/closure-report.json");
const OUT_MD = path.join(ROOT, "docs/qa/_artifacts/copilot-closure-round/owner-manual-samples.md");

const PICK = {
  regular: "מה הכי חשוב לי לדעת השבוע?",
  home: "מה לעשות איתו בבית היום?",
  sensitive: "האם צריך אבחון?",
  problem: "האם זה אומר שיש לו בעיה?",
  noDataCandidates: [
    "מה השתנה מהשבוע הקודם?",
    "האם הפעילות שנתתי לו השפיעה?",
    "האם זה בגלל לחץ זמן?",
  ],
  pattern: "איפה הוא צריך עזרה?",
};

function pickRow(live, child, question) {
  return live.find((r) => r.child === child && r.question === question);
}

function pickNoDataRow(live, child) {
  for (const q of PICK.noDataCandidates) {
    const row = pickRow(live, child, q);
    if (row?.noDataCorrect) return { q, row };
  }
  return null;
}

async function main() {
  const report = JSON.parse(await readFile(IN_JSON, "utf8"));
  const live = report.liveAaa || [];
  const continuity = report.continuity || [];
  const children = [...new Set(live.map((r) => r.child))].sort();

  const lines = [];
  lines.push("# Parent Copilot — דוגמאות לבדיקה ידנית של הבעלים");
  lines.push("");
  lines.push(`נוצר: ${new Date().toISOString()}`);
  lines.push(`טווח דוח: ${report.range?.from} – ${report.range?.to}`);
  lines.push(`מקור: \`closure-report.json\` (engine path + rebuild)`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const child of children) {
    const scenario = live.find((r) => r.child === child)?.scenario || "";
    lines.push(`## ${child} (${scenario})`);
    lines.push("");

    const regular = pickRow(live, child, PICK.regular);
    if (regular) {
      lines.push(`### שאלה רגילה`);
      lines.push(`**ש:** ${regular.question}`);
      lines.push("");
      lines.push(`**ת:** ${regular.answer}`);
      lines.push("");
    }

    const home = pickRow(live, child, PICK.home);
    if (home) {
      lines.push(`### מה לעשות בבית`);
      lines.push(`**ש:** ${home.question}`);
      lines.push("");
      lines.push(`**ת:** ${home.answer}`);
      lines.push("");
    }

    const pattern = pickRow(live, child, PICK.pattern);
    if (pattern) {
      lines.push(`### איפה צריך עזרה (anchors)`);
      lines.push(`**ש:** ${pattern.question}`);
      lines.push("");
      lines.push(`**ת:** ${pattern.answer}`);
      lines.push("");
    }

    const sensitive = pickRow(live, child, PICK.sensitive);
    if (sensitive) {
      lines.push(`### שאלה רגישה (אבחון)`);
      lines.push(`**ש:** ${sensitive.question}`);
      lines.push("");
      lines.push(`**ת:** ${sensitive.answer}`);
      lines.push("");
    }

    const problem = pickRow(live, child, PICK.problem);
    if (problem) {
      lines.push(`### שאלה רגישה (בעיה)`);
      lines.push(`**ש:** ${problem.question}`);
      lines.push("");
      lines.push(`**ת:** ${problem.answer}`);
      lines.push("");
    }

    const nd = pickNoDataRow(live, child);
    if (nd) {
      lines.push(`### NO_DATA`);
      lines.push(`**ש:** ${nd.q}`);
      lines.push("");
      lines.push(`**ת:** ${nd.row.answer}`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  lines.push("## שיחות המשכיות (AAA5)");
  lines.push("");
  for (const c of continuity) {
    lines.push(`### שיחה ${c.conversation}`);
    lines.push(`**1.** ${c.q1}`);
    lines.push("");
    lines.push(`${c.a1}`);
    lines.push("");
    lines.push(`**2.** ${c.q2}`);
    lines.push("");
    lines.push(`${c.a2}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  await mkdir(path.dirname(OUT_MD), { recursive: true });
  await writeFile(OUT_MD, lines.join("\n"), "utf8");
  console.log(`Wrote ${OUT_MD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
