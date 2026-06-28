/**
 * Phase 8 — structured evidence pack on top of mass-simulation output (reports only).
 * Invoked when MASS_PHASE8_PACK=1.
 */
import fs from "node:fs";
import path from "node:path";

const BLOCKED_TAXONOMY_IDS = [];

const LEAK_PATTERNS = [
  { id: "axis_symbolic", re: /ציר\s*\+\s*סימבולי/u },
  { id: "axis_distance", re: /ציר\s*\+\s*מרחק/u },
  { id: "register_he", re: /\bרגיסטר\b/u },
  { id: "pragmatics_he", re: /\bפרגמטיקה\b/u },
  { id: "mini_rule", re: /כלל\s+מיני/u },
  { id: "inference_ascii", re: /\binference\b/i },
  { id: "collocation_ascii", re: /\bcollocation\b/i },
  { id: "preposition_ascii", re: /\bpreposition\b/i },
  { id: "false_friend_ascii", re: /\bfalse\s*friend\b/i },
  { id: "he_she_it_ascii", re: /\bhe\/she\/it\b/i },
  { id: "past_present_ascii", re: /\bpast\/present\b/i },
  { id: "medical_problem", re: /בעיה\s*רפואית/u },
  { id: "medical_report", re: /דיווח\s*רפואי/u },
  { id: "social_teacher", re: /מורה\s*חברתי/u },
  { id: "prejudice", re: /דעות\s*קדומות/u },
  { id: "social_problem", re: /בעיה\s*חברתית/u },
  { id: "ruler_units", re: /סרגל\s*\+\s*יחידות/u },
  { id: "axis_physical_cards", re: /ציר\s*פיזי\s*\+\s*כרטיסיות/u },
  { id: "symbols_small_groups", re: /סימבולים\s*בקבוצות\s*קטנות/u },
  { id: "patternHe", re: /\bpatternHe\b/ },
  { id: "probeHe", re: /\bprobeHe\b/ },
  { id: "interventionHe", re: /\binterventionHe\b/ },
  { id: "doNotConcludeHe", re: /\bdoNotConcludeHe\b/ },
  { id: "escalationHe", re: /\bescalationHe\b/ },
  { id: "competitorsHe", re: /\bcompetitorsHe\b/ },
  { id: "rootsHe", re: /\brootsHe\b/ },
];

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else if (/\.(json|md|html|txt)$/i.test(name)) acc.push(p);
  }
  return acc;
}

function scanLeaks(text) {
  const hits = [];
  const t = String(text || "");
  for (const { id, re } of LEAK_PATTERNS) {
    if (re.test(t)) hits.push(id);
  }
  return hits;
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

function aggregateTopicMatrix(questionRows) {
  const by = {};
  for (const r of questionRows) {
    const g = r.grade || "?";
    const s = r.subject || "?";
    const top = r.topic || "?";
    const k = `${s}|${g}|${top}`;
    if (!by[k]) by[k] = { subject: s, grade: g, topic: top, questions: 0, correct: 0, studentIds: new Set() };
    by[k].questions += 1;
    if (r.isCorrect) by[k].correct += 1;
    by[k].studentIds.add(r.studentId);
  }
  return Object.values(by).map((x) => ({
    subject: x.subject,
    grade: x.grade,
    topic: x.topic,
    questions: x.questions,
    accuracy: x.questions ? Math.round((1000 * x.correct) / x.questions) / 10 : 0,
    studentCount: x.studentIds.size,
  }));
}

function extractRecommendations(detailed) {
  const units = detailed?.diagnosticEngineV2?.units;
  if (!Array.isArray(units)) return [];
  return units.map((u) => ({
    subjectId: u?.subjectId || null,
    topicRowKey: u?.topicRowKey || null,
    bucketKey: u?.bucketKey || null,
    taxonomyId: String(u?.diagnosis?.taxonomyId || u?.intervention?.taxonomyId || u?.taxonomy?.id || "").trim() || null,
    immediateActionHe: String(u?.intervention?.immediateActionHe || "").trim() || null,
    shortPracticeHe: String(u?.intervention?.shortPracticeHe || "").trim() || null,
  }));
}

const GRADES_G1_G6 = ["g1", "g2", "g3", "g4", "g5", "g6"];

/**
 * Owner-facing navigation + summaries (harness output only).
 * @param {string} outputRoot
 * @param {object} args
 */
function writeFullHumanReviewArtifacts(outputRoot, args) {
  const {
    massPayload,
    students,
    pdfIndex,
    auditResult,
    perfectCases,
    weakCases,
    thinCases,
    globalInteractions,
  } = args;
  const subjects = massPayload?.subjectsResolved || massPayload?.supportedSubjectKeys || [];
  const rel = (p) => p.replace(/\\/g, "/");

  const pick = (pred) => students.find(pred)?.studentId || null;
  const byArch = (a) => pick((s) => s.metadata?.coverageArchetype === a);

  const richId = pick((s) => s.profileType === "rich_data");
  const mixedStrongWeakId = byArch("strong_topic_weak_topic");
  const improveId = byArch("improvement_over_time");
  const regressId = byArch("regression_over_time");

  /** @type {Array<{grade: string, subject: string, studentId: string}>} */
  const gradeSubjectSamples = [];
  for (const g of GRADES_G1_G6) {
    for (const subj of subjects) {
      const sid = students.find((s) => s.grade === g && String(s.studentId).endsWith(`_${g}_${subj}`))?.studentId;
      if (sid) gradeSubjectSamples.push({ grade: g, subject: subj, studentId: sid });
    }
  }

  const pdfFolderLines = students.map((s) => `- \`${rel(path.join("students", s.studentId, "pdf"))}\` — short+detailed PDFs`);

  const humanIdx = [
    "# HUMAN_REVIEW_INDEX",
    "",
    "נתיבים יחסיים לשורש הריצה (אותו תיק שבו קובץ זה).",
    "",
    "## 1. מקרי נושא 100% (PERFECT_TOPIC_CASES)",
    "",
    `- [\`PERFECT_TOPIC_CASES.md\`](PERFECT_TOPIC_CASES.md)`,
    `- [\`PERFECT_TOPIC_CASES.json\`](PERFECT_TOPIC_CASES.json)`,
    ...perfectCases.map((c) => `  - **${c.studentId}** — ${c.subject} / ${c.topic} (${c.grade})`),
    "",
    "## 2. מקרי נושא חלש (WEAK_TOPIC_CASES)",
    "",
    `- [\`WEAK_TOPIC_CASES.md\`](WEAK_TOPIC_CASES.md)`,
    `- [\`WEAK_TOPIC_CASES.json\`](WEAK_TOPIC_CASES.json)`,
    ...weakCases.slice(0, 40).map((c) => `  - **${c.studentId}** — ${c.subject} / ${c.topic} (${c.grade})`),
    "",
    "## 3. thin_data",
    "",
    `- [\`THIN_DATA_CASES.md\`](THIN_DATA_CASES.md)`,
    `- [\`THIN_DATA_CASES.json\`](THIN_DATA_CASES.json)`,
    ...thinCases.map((c) => `  - **${c.studentId}** (${c.grade})`),
    "",
    "## 4. rich / high_volume",
    "",
    richId ? `- דוגמה: **${richId}** — תיקייה \`students/${richId}/\`` : "- לא נמצא rich_data בגריד זה",
    "",
    "## 5. mixed strong + weak topic",
    "",
    mixedStrongWeakId
      ? `- דוגמה: **${mixedStrongWeakId}** — \`students/${mixedStrongWeakId}/\``
      : "- לא נמצא archetype strong_topic_weak_topic",
    "",
    "## 6. שיפור / הידרדרות",
    "",
    improveId ? `- שיפור לאורך זמן: **${improveId}**` : "- —",
    regressId ? `- הידרדרות: **${regressId}**` : "- —",
    "",
    "## 7. דוגמה אחת לכל ציר כיתה × מקצוע (כיסוי)",
    "",
    "| grade | subject | studentId |",
    "|---|---|---|",
    ...gradeSubjectSamples.map((r) => `| ${r.grade} | ${r.subject} | \`${r.studentId}\` |`),
    "",
    "## 8. תיקיות PDF (לכל תלמיד)",
    "",
    ...pdfFolderLines.slice(0, 220),
    ...(pdfFolderLines.length > 220 ? [`- …ועוד ${pdfFolderLines.length - 220} תיקיות`] : []),
    "",
    "## Parent AI / איכות",
    "",
    "- [`COPILOT_INTERACTIONS_AUDIT.md`](COPILOT_INTERACTIONS_AUDIT.md)",
    "- [`AI_RESPONSE_QUALITY_AUDIT.md`](AI_RESPONSE_QUALITY_AUDIT.md)",
    "- [`QUALITY_FLAGS.md`](QUALITY_FLAGS.md)",
    "- [`RAW_INTERNAL_LEAK_SCAN.md`](RAW_INTERNAL_LEAK_SCAN.md)",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(outputRoot, "HUMAN_REVIEW_INDEX.md"), humanIdx, "utf8");

  const audit = auditResult?.auditPayload?.summary || {};
  const counts = massPayload?.counts || {};
  const ownerHe = [
    "# OWNER_REVIEW_SUMMARY_HE",
    "",
    `נוצר: ${massPayload?.generatedAt || ""}`,
    "",
    "## מה יש בחבילה",
    "",
    `- תלמידים: **${counts.students ?? students.length}**`,
    `- שאלות סימולציה: **${counts.questions ?? "—"}**`,
    `- אינטראקציות Copilot (דטרמיניסטי): **${counts.parentAiInteractions ?? globalInteractions?.length ?? "—"}**`,
    `- דוחות קצר/מפורט לכל תלמיד: תחת \`students/<id>/\` + \`parent-reports/<id>/\``,
    `- PDF מוצר (Playwright): **${counts.totalPdfCount ?? "—"}** קבצים; קריאים heuristically: **${counts.validReadablePdfCount ?? "—"}**`,
    "",
    "## סטטוס ביקורת אוטומטית",
    "",
    `- AI_RESPONSE_QUALITY_AUDIT: **${audit.finalStatus || "—"}** (כשלים: ${audit.totalFailures ?? 0})`,
    `- אזהרות audit: **${audit.totalWarnings ?? 0}**`,
    "",
    "## הוראות בעלים",
    "",
    "1. פתח `HUMAN_REVIEW_INDEX.md` ובחר תלמידים לפי פרופיל/נושא.",
    "2. לכל תלמיד: עיין ב-`report-short.md`, `report-detailed.md`, ובשני ה-PDF בתיקיית `pdf/`.",
    "3. השווה ל-`copilot-turns.json` עבור עקביות מול הדוח.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outputRoot, "OWNER_REVIEW_SUMMARY_HE.md"), ownerHe, "utf8");

  const tech = [
    "# TECHNICAL_SUMMARY",
    "",
    "- Engine: `scripts/parent-ai-mass-simulation/run-mass-simulation.mjs` + Phase 8 pack writer.",
    "- PDFs: Next routes `/learning/parent-report` + `/learning/parent-report-detailed`, Playwright `page.pdf`.",
    "- Deterministic Copilot: sync `runParentCopilotTurn` (no live LLM).",
    `- Output root: \`${String(massPayload?.outputDirectory || "").replace(/\\\\/g, "/")}\``,
    "",
    "```json",
    JSON.stringify(massPayload?.environment || {}, null, 2),
    "```",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outputRoot, "TECHNICAL_SUMMARY.md"), tech, "utf8");

  const nextSteps = [
    "# NEXT_STEPS",
    "",
    "1. סקירה ידנית של מדגם PDF (עברית, מבנה עמוד).",
    "2. אם `AI_RESPONSE_QUALITY_AUDIT` במצב NEEDS_REVIEW — החלטה אם ליישר rubric או לקבל כאזהרות ידועות.",
    "3. אופציונלי: הרצת QA נוספת עם שרת/פורט אחר אם יש חוסר יציבות ברשת מקומית.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outputRoot, "NEXT_STEPS.md"), nextSteps, "utf8");
}

/**
 * @param {object} ctx
 */
export async function writePhase8Pack(ctx) {
  const {
    outputRoot,
    massPayload,
    students,
    questionRows,
    globalInteractions,
    qualityIssues,
    qualityWarnings,
    pdfIndex,
    auditResult,
  } = ctx;

  const topicMatrix = aggregateTopicMatrix(questionRows);
  fs.writeFileSync(path.join(outputRoot, "COVERAGE_MATRIX.json"), JSON.stringify({ topics: topicMatrix }, null, 2), "utf8");
  fs.writeFileSync(
    path.join(outputRoot, "COVERAGE_MATRIX.md"),
    [
      "# COVERAGE_MATRIX",
      "",
      "| subject | grade | topic | questions | accuracy% | students |",
      "|---|---|---|---:|---:|---:|",
      ...topicMatrix
        .sort((a, b) => b.questions - a.questions)
        .slice(0, 400)
        .map((r) => `| ${r.subject} | ${r.grade} | ${r.topic} | ${r.questions} | ${r.accuracy} | ${r.studentCount} |`),
      "",
    ].join("\n"),
    "utf8",
  );

  /** @type {any[]} */
  const recRows = [];
  const reportsRoot = path.join(outputRoot, "parent-reports");
  if (fs.existsSync(reportsRoot)) {
    for (const sid of fs.readdirSync(reportsRoot)) {
      const dj = path.join(reportsRoot, sid, "detailed.json");
      if (!fs.existsSync(dj)) continue;
      const detailed = readJsonSafe(dj);
      if (!detailed) continue;
      for (const row of extractRecommendations(detailed)) {
        recRows.push({ studentId: sid, ...row });
      }
    }
  }
  fs.writeFileSync(path.join(outputRoot, "RECOMMENDATION_COVERAGE.json"), JSON.stringify({ rows: recRows }, null, 2), "utf8");
  fs.writeFileSync(
    path.join(outputRoot, "RECOMMENDATION_COVERAGE.md"),
    ["# RECOMMENDATION_COVERAGE", "", `Rows: ${recRows.length}`, ""].join("\n"),
    "utf8",
  );

  fs.writeFileSync(
    path.join(outputRoot, "FAILURES.md"),
    ["# FAILURES", "", ...(qualityIssues || []).slice(0, 200).map((x) => `- **${x.code}** — ${x.detail}`)].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outputRoot, "WARNINGS.md"),
    ["# WARNINGS", "", ...(qualityWarnings || []).slice(0, 200).map((x) => `- **${x.code || "warn"}** — ${x.detail}`)].join("\n"),
    "utf8",
  );

  const leakHits = [];
  const scanRoots = [path.join(outputRoot, "parent-ai-chats"), path.join(outputRoot, "parent-reports")];
  for (const root of scanRoots) {
    if (!fs.existsSync(root)) continue;
    const isReportsMdOnly = root.endsWith("parent-reports");
    for (const f of walkFiles(root)) {
      const rel = path.relative(outputRoot, f).replace(/\\/g, "/");
      if (isReportsMdOnly) {
        if (!rel.endsWith(".md")) continue;
      } else if (rel.endsWith("detailed.json") || rel.endsWith("short.json")) {
        continue;
      }
      const ext = path.extname(f).toLowerCase();
      if (ext === ".pdf") continue;
      let text = "";
      try {
        if (ext === ".json" && rel.includes("parent-ai-chats")) {
          const j = readJsonSafe(f);
          const answers = (j?.turns || []).map((t) => String(t?.aiAnswer || ""));
          const qs = (j?.turns || []).map((t) => String(t?.parentQuestionText || ""));
          text = [...qs, ...answers].join("\n");
        } else if (!isReportsMdOnly && ext === ".json") {
          continue;
        } else {
          text = fs.readFileSync(f, "utf8");
        }
      } catch {
        continue;
      }
      const hits = scanLeaks(text);
      if (hits.length) leakHits.push({ file: rel, hits });
    }
  }
  fs.writeFileSync(path.join(outputRoot, "RAW_INTERNAL_LEAK_SCAN.json"), JSON.stringify({ hitCount: leakHits.length, hits: leakHits }, null, 2), "utf8");
  fs.writeFileSync(
    path.join(outputRoot, "RAW_INTERNAL_LEAK_SCAN.md"),
    ["# RAW_INTERNAL_LEAK_SCAN", "", `Files with hits: ${leakHits.length}`, ...leakHits.slice(0, 120).map((h) => `- \`${h.file}\`: ${h.hits.join(", ")}`)].join("\n"),
    "utf8",
  );

  const perfectStudents = students.filter((s) => s.coverageHints?.perfectTopic);
  const perfectCases = [];
  for (const s of perfectStudents) {
    const pt = s.coverageHints.perfectTopic;
    const rows = questionRows.filter((q) => q.studentId === s.studentId && q.subject === pt.subject && q.topic === pt.topic);
    const n = rows.length;
    const correct = rows.filter((q) => q.isCorrect).length;
    const chat = readJsonSafe(path.join(outputRoot, "parent-ai-chats", `${s.studentId}.json`));
    const firstPerfectTurn = (chat?.turns || []).find((t) => t.parentQuestionId?.startsWith("phase8_perfect_topic_q"));
    perfectCases.push({
      studentId: s.studentId,
      grade: s.grade,
      subject: pt.subject,
      topic: pt.topic,
      attemptsInTopic: n,
      accuracyPercent: n ? Math.round((1000 * correct) / n) / 10 : 0,
      copilotQuestionHe: s.coverageHints.perfectTopicQuestionHe || null,
      copilotAnswerHe: firstPerfectTurn?.aiAnswer?.slice(0, 2000) || null,
      resolutionStatus: firstPerfectTurn?.resolutionStatus || null,
      assertionFlags: firstPerfectTurn?.qualityFlags || [],
    });
  }
  fs.writeFileSync(path.join(outputRoot, "PERFECT_TOPIC_CASES.json"), JSON.stringify({ cases: perfectCases }, null, 2), "utf8");
  fs.writeFileSync(
    path.join(outputRoot, "PERFECT_TOPIC_CASES.md"),
    [
      "# PERFECT_TOPIC_CASES",
      "",
      ...perfectCases.map(
        (c) =>
          `## ${c.studentId}\n- grade: ${c.grade}\n- subject/topic: ${c.subject} / ${c.topic}\n- attempts: ${c.attemptsInTopic} accuracy: ${c.accuracyPercent}%\n- resolution: ${c.resolutionStatus}\n- Q: ${c.copilotQuestionHe}\n- A: ${String(c.copilotAnswerHe || "").slice(0, 1200)}\n`,
      ),
    ].join("\n"),
    "utf8",
  );

  const weakStudents = students.filter((s) => s.coverageHints?.weakTopic);
  const weakCases = weakStudents.map((s) => {
    const wt = s.coverageHints.weakTopic;
    const rows = questionRows.filter((q) => q.studentId === s.studentId && q.subject === wt.subject && q.topic === wt.topic);
    const n = rows.length;
    const correct = rows.filter((q) => q.isCorrect).length;
    return {
      studentId: s.studentId,
      grade: s.grade,
      subject: wt.subject,
      topic: wt.topic,
      attemptsInTopic: n,
      accuracyPercent: n ? Math.round((1000 * correct) / n) / 10 : 0,
    };
  });
  fs.writeFileSync(path.join(outputRoot, "WEAK_TOPIC_CASES.json"), JSON.stringify({ cases: weakCases }, null, 2), "utf8");
  fs.writeFileSync(path.join(outputRoot, "WEAK_TOPIC_CASES.md"), ["# WEAK_TOPIC_CASES", "", `count: ${weakCases.length}`].join("\n"), "utf8");

  const thinCases = students
    .filter((s) => s.profileType === "thin_data")
    .map((s) => ({
      studentId: s.studentId,
      grade: s.grade,
      questionCount: questionRows.filter((q) => q.studentId === s.studentId).length,
    }));
  fs.writeFileSync(path.join(outputRoot, "THIN_DATA_CASES.json"), JSON.stringify({ cases: thinCases }, null, 2), "utf8");
  fs.writeFileSync(path.join(outputRoot, "THIN_DATA_CASES.md"), ["# THIN_DATA_CASES", "", `count: ${thinCases.length}`].join("\n"), "utf8");

  const fallbackRows = questionRows.filter((q) => q.adapterStatus === "fallback" || q.questionSource === "placeholder");
  fs.writeFileSync(
    path.join(outputRoot, "FALLBACK_CASES.json"),
    JSON.stringify({ count: fallbackRows.length, sample: fallbackRows.slice(0, 500) }, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outputRoot, "FALLBACK_CASES.md"),
    [
      "# FALLBACK_CASES",
      "",
      "Hybrid/real mode may produce placeholder rows when no bank hit — intentional for coverage of empty cells.",
      "",
      `Total rows: ${fallbackRows.length}`,
    ].join("\n"),
    "utf8",
  );

  const blockedFoundInRec = [];
  for (const r of recRows) {
    if (r.taxonomyId && BLOCKED_TAXONOMY_IDS.includes(r.taxonomyId)) blockedFoundInRec.push(r);
  }
  fs.writeFileSync(
    path.join(outputRoot, "BLOCKED_IDS_CHECK.md"),
    [
      "# BLOCKED_IDS_CHECK",
      "",
      "Expected: blocked taxonomy rows should not surface parent-facing bridge text unless product explicitly maps them.",
      "",
      `Blocked ids monitored: ${BLOCKED_TAXONOMY_IDS.join(", ")}`,
      "",
      `Units in detailed.json snapshots referencing these ids: ${blockedFoundInRec.length}`,
      "",
      ...blockedFoundInRec.slice(0, 80).map((x) => `- ${x.studentId} ${x.taxonomyId} ${x.topicRowKey || ""}`),
    ].join("\n"),
    "utf8",
  );

  fs.writeFileSync(
    path.join(outputRoot, "COPILOT_INTERACTIONS_AUDIT.md"),
    [
      "# COPILOT_INTERACTIONS_AUDIT",
      "",
      `- Total interactions recorded: ${globalInteractions.length}`,
      `- By category: ${JSON.stringify(massPayload.coverage?.parentAiByCategory || {})}`,
      "",
      "## Sample (first 12)",
      "",
      ...globalInteractions.slice(0, 12).map((x) => `- **${x.studentId}** [${x.questionCategory}] ${String(x.parentQuestionText || "").slice(0, 120)}`),
    ].join("\n"),
    "utf8",
  );

  if (pdfIndex) {
    fs.writeFileSync(
      path.join(outputRoot, "PDF_SUMMARY.md"),
      ["# PDF_SUMMARY", "", "```json", JSON.stringify(pdfIndex, null, 2), "```"].join("\n"),
      "utf8",
    );
    fs.writeFileSync(path.join(outputRoot, "PDF_SUMMARY.json"), JSON.stringify(pdfIndex, null, 2), "utf8");
  }

  fs.writeFileSync(path.join(outputRoot, "RUN_SUMMARY.json"), JSON.stringify(massPayload, null, 2), "utf8");
  fs.writeFileSync(
    path.join(outputRoot, "RUN_SUMMARY.md"),
    [
      "# RUN_SUMMARY (Phase 8 pack)",
      "",
      `Generated: ${massPayload.generatedAt}`,
      "",
      "## Counts",
      "",
      "```json",
      JSON.stringify(massPayload.counts, null, 2),
      "```",
      "",
      "## Environment",
      "",
      "```json",
      JSON.stringify(massPayload.environment, null, 2),
      "```",
      "",
      "## AI audit",
      "",
      "```json",
      JSON.stringify(massPayload.aiResponseQualityAudit, null, 2),
      "```",
    ].join("\n"),
    "utf8",
  );

  const studentsOut = path.join(outputRoot, "students");
  ensureDir(studentsOut);
  for (const s of students) {
    const id = s.studentId;
    const destDir = path.join(studentsOut, id);
    ensureDir(destDir);
    copyIfExists(path.join(outputRoot, "students", `${id}.json`), path.join(destDir, "profile.json"));
    copyIfExists(path.join(outputRoot, "students", `${id}.md`), path.join(destDir, "profile.md"));
    copyIfExists(path.join(outputRoot, "question-runs", `${id}.json`), path.join(destDir, "generated-questions-summary.json"));
    copyIfExists(path.join(outputRoot, "parent-ai-chats", `${id}.json`), path.join(destDir, "copilot-turns.json"));
    const pr = path.join(outputRoot, "parent-reports", id);
    if (fs.existsSync(pr)) {
      copyIfExists(path.join(pr, "short.json"), path.join(destDir, "report-short.json"));
      copyIfExists(path.join(pr, "detailed.json"), path.join(destDir, "report-detailed.json"));
      copyIfExists(path.join(pr, "short.md"), path.join(destDir, "report-short.md"));
      copyIfExists(path.join(pr, "detailed.md"), path.join(destDir, "report-detailed.md"));
      const pdfSub = path.join(destDir, "pdf");
      ensureDir(pdfSub);
      const shortSrc = path.join(outputRoot, "pdfs", "short", `${id}.pdf`);
      const detailedSrc = path.join(outputRoot, "pdfs", "detailed", `${id}.pdf`);
      copyIfExists(shortSrc, path.join(pdfSub, "report-short.pdf"));
      copyIfExists(detailedSrc, path.join(pdfSub, "report-detailed.pdf"));
    }
    const bySubj = {};
    for (const q of questionRows.filter((q) => q.studentId === id)) {
      if (!bySubj[q.subject]) bySubj[q.subject] = {};
      if (!bySubj[q.subject][q.topic]) bySubj[q.subject][q.topic] = { questions: 0, correct: 0 };
      bySubj[q.subject][q.topic].questions += 1;
      if (q.isCorrect) bySubj[q.subject][q.topic].correct += 1;
    }
    fs.writeFileSync(path.join(destDir, "performance-by-subject-topic.json"), JSON.stringify(bySubj, null, 2), "utf8");
    const recs = recRows.filter((r) => r.studentId === id);
    fs.writeFileSync(path.join(destDir, "recommendations.json"), JSON.stringify(recs, null, 2), "utf8");
    fs.writeFileSync(
      path.join(destDir, "notes.md"),
      ["# Scenario notes", "", String(s.phase8Notes || s.metadata?.coverageArchetype || ""), "", `Archetype: ${s.metadata?.coverageArchetype || "—"}`, `Profile: ${s.profileType}`].join("\n"),
      "utf8",
    );
  }

  const bySubjectRoot = path.join(outputRoot, "by-subject");
  for (const cell of topicMatrix) {
    const d = path.join(bySubjectRoot, cell.subject, cell.grade, String(cell.topic).replace(/[^\w-]+/g, "_"));
    ensureDir(d);
    const inCell = students.filter((st) =>
      questionRows.some((q) => q.studentId === st.studentId && q.subject === cell.subject && q.grade === cell.grade && q.topic === cell.topic),
    );
    fs.writeFileSync(
      path.join(d, "students-index.md"),
      ["# Students", "", ...inCell.map((st) => `- ${st.studentId}`)].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(d, "topic-summary.json"),
      JSON.stringify({ subject: cell.subject, grade: cell.grade, topic: cell.topic, questions: cell.questions, accuracy: cell.accuracy }, null, 2),
      "utf8",
    );
    const perfectHere = perfectCases.filter((c) => c.subject === cell.subject && c.grade === cell.grade && c.topic === cell.topic);
    const weakHere = weakCases.filter((c) => c.subject === cell.subject && c.grade === cell.grade && c.topic === cell.topic);
    const fbHere = fallbackRows.filter((q) => q.subject === cell.subject && q.grade === cell.grade && q.topic === cell.topic).slice(0, 40);
    fs.writeFileSync(path.join(d, "perfect-cases.json"), JSON.stringify(perfectHere, null, 2), "utf8");
    fs.writeFileSync(path.join(d, "weak-cases.json"), JSON.stringify(weakHere, null, 2), "utf8");
    fs.writeFileSync(path.join(d, "fallback-cases.json"), JSON.stringify(fbHere, null, 2), "utf8");
    fs.writeFileSync(
      path.join(d, "recommendation-examples.md"),
      ["# Recommendation examples", "", "See parent-reports/*/detailed.json in student folders."].join("\n"),
      "utf8",
    );
  }

  writeFullHumanReviewArtifacts(outputRoot, {
    massPayload,
    students,
    pdfIndex,
    auditResult,
    perfectCases,
    weakCases,
    thinCases,
    globalInteractions,
  });

  fs.writeFileSync(
    path.join(outputRoot, "PHASE8_PACK_INDEX.json"),
    JSON.stringify(
      {
        writtenAt: new Date().toISOString(),
        files: [
          "RUN_SUMMARY.md",
          "RUN_SUMMARY.json",
          "COVERAGE_MATRIX.md",
          "COVERAGE_MATRIX.json",
          "RECOMMENDATION_COVERAGE.md",
          "RECOMMENDATION_COVERAGE.json",
          "FAILURES.md",
          "WARNINGS.md",
          "RAW_INTERNAL_LEAK_SCAN.md",
          "RAW_INTERNAL_LEAK_SCAN.json",
          "PERFECT_TOPIC_CASES.md",
          "PERFECT_TOPIC_CASES.json",
          "WEAK_TOPIC_CASES.md",
          "WEAK_TOPIC_CASES.json",
          "THIN_DATA_CASES.md",
          "THIN_DATA_CASES.json",
          "FALLBACK_CASES.md",
          "FALLBACK_CASES.json",
          "BLOCKED_IDS_CHECK.md",
          "COPILOT_INTERACTIONS_AUDIT.md",
          "PDF_SUMMARY.md",
          "PDF_SUMMARY.json",
          "HUMAN_REVIEW_INDEX.md",
          "OWNER_REVIEW_SUMMARY_HE.md",
          "TECHNICAL_SUMMARY.md",
          "NEXT_STEPS.md",
          "students/*/…",
          "by-subject/…",
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
}
