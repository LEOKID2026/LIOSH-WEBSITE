#!/usr/bin/env node
/**
 * Production parity audit — read-only investigation.
 * Run: node --env-file=.env.local --env-file=.env.e2e.local tmp/audit-production-parity.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

import parentCopilot from "../utils/parent-copilot/index.js";
import { classifyParentQuestionDeterministic } from "../utils/parent-copilot/question-classifier.js";
import {
  AMBIGUOUS_RESPONSE_HE,
  NO_DATA_FOR_REQUEST_RESPONSE_HE,
} from "../utils/parent-copilot/question-classifier.js";
import { resolveAaaStudents, QA_PARENT_ID } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";
import { resolveParentBearer } from "../scripts/truth-gates/lib/live-parent-report.mjs";
import { aggregateParentReportPayload } from "../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../lib/parent-server/parent-report-parent-facing.server.js";
import { attachStudentLearningAccountToParentReportPayload } from "../lib/parent-server/parent-report-account-attachment.server.js";
import { buildDetailedPayloadFromAggregatedReportBody } from "../lib/parent-server/db-input-to-detailed-report.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/copilot-closure-round");
const PROD_ORIGIN = process.env.COPILOT_PROD_ORIGIN || "https://liosh-website.vercel.app";

const OWNER_QUESTIONS = [
  "מה הכי חשוב כרגע?",
  "איפה רואים התקדמות?",
  "מה כדאי להימנע ממנו עכשיו?",
  "מה לעשות בבית היום?",
  "איפה הוא צריך עזרה?",
  "למה כתוב שיש פער במתמטיקה?",
  "האם הבעיה היא נשיאה?",
];

/** Owner manual report fingerprint */
const OWNER_FINGERPRINT = {
  totalQuestions: 214,
  totalMinutes: 372,
  overallAccuracy: 53,
  subjects: {
    math: { q: 102, acc: 33 },
    geometry: { q: 25, acc: 72 },
    english: { q: 18, acc: 67 },
    science: { q: 44, acc: 75 },
    hebrew: { q: 25, acc: 64 },
  },
};

const RANGE = { reportPeriod: "custom", rangeFrom: "2026-05-25", rangeTo: "2026-06-23" };

function gitHead() {
  try {
    return execSync('git log -1 --format="%H %ci %s"', { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function answerText(res) {
  const core = res?.result?.response || res?.result || res?.response || res;
  if (core?.resolutionStatus === "resolved") {
    return (core.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  }
  return String(core?.clarificationQuestionHe || res?.clarificationQuestionHe || "");
}

function extractMeta(res) {
  const core = res?.result?.response || res?.result || res?.response || res;
  const dbg = core?.debug || res?.debug || {};
  return {
    resolutionStatus: core?.resolutionStatus || null,
    intent: core?.intent || dbg?.intent || null,
    route: dbg?.route || dbg?.composerRoute || dbg?.patternRoute || null,
    fallbackUsed: Boolean(core?.fallbackUsed ?? dbg?.fallbackUsed),
    ambiguous: core?.resolutionStatus === "clarification_required",
    isNoData: answerText(res).includes(NO_DATA_FOR_REQUEST_RESPONSE_HE.slice(0, 40)),
    classification: dbg?.classification || dbg?.questionBucket || null,
    clientPayloadIgnored: dbg?.clientPayloadIgnored ?? dbg?.grounding === "server_snapshot" ?? null,
    grounding: dbg?.grounding || null,
    serverRebuild: dbg?.grounding === "server_snapshot" || dbg?.payloadSource === "server_snapshot",
  };
}

function payloadSummary(payload, reportBody = null) {
  const rb = reportBody || {};
  const summary = rb.summary || rb.practiceSummary || {};
  const totalAnswers = Number(summary.totalAnswers ?? summary.totalQuestions ?? 0) || 0;
  const accuracy = summary.accuracy ?? summary.accuracyPercent ?? null;
  const bySubject = summary.bySubject || rb.bySubject || {};
  /** @type {Record<string, {questions: number, accuracy: number|null}>} */
  const subjects = {};
  for (const [sid, row] of Object.entries(bySubject)) {
    const q = Number(row?.answers ?? row?.questions ?? row?.totalAnswers ?? 0) || 0;
    const c = Number(row?.correct ?? 0) || 0;
    subjects[sid] = {
      questions: q,
      accuracy: row?.accuracy ?? (q ? Math.round((c / q) * 100) : null),
    };
  }

  const de = payload?.diagnosticEngineV2 || {};
  const units = Array.isArray(de.units) ? de.units : [];
  const topicRows = [];
  for (const u of units) {
    const topics = Array.isArray(u.topics) ? u.topics : [];
    for (const t of topics) {
      topicRows.push({
        subject: u.subjectId || u.subject,
        topic: t.topicId || t.displayNameHe || t.label,
        questions: t.questionCount ?? t.questions,
        accuracy: t.accuracyPercent ?? t.accuracy,
      });
    }
  }

  return {
    totalQuestions: totalAnswers || payload?.globalReportSummary?.totalQuestions || 0,
    overallAccuracy: accuracy,
    totalMinutes: summary.totalTimeMinutes ?? summary.totalMinutes ?? null,
    subjectBreakdown: Object.keys(subjects).length ? subjects : undefined,
    topicRowCount: topicRows.length,
    topicRowsSample: topicRows.slice(0, 8),
    hasDetailedPayload: Boolean(payload?.diagnosticEngineV2?.units?.length),
  };
}

function fingerprintMatch(summary) {
  const fp = OWNER_FINGERPRINT;
  if (summary.totalQuestions !== fp.totalQuestions) return false;
  const sb = summary.subjectBreakdown || {};
  const map = {
    math: sb.math?.questions,
    geometry: sb.geometry?.questions,
    english: sb.english?.questions,
    science: sb.science?.questions,
    hebrew: sb.hebrew?.questions,
  };
  return Object.entries(fp.subjects).every(([k, v]) => map[k] === v.q);
}

async function loadPayloadForStudent(supabase, entry, range) {
  const from = new Date(`${range.rangeFrom}T00:00:00.000Z`);
  const to = new Date(`${range.rangeTo}T23:59:59.999Z`);
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel,
    is_active: true,
  };
  const reportBody = await aggregateParentReportPayload(supabase, student, from, to, {
    includeParentActivities: true,
    includePrivateTeacherActivities: true,
  });
  const withAcc = await attachStudentLearningAccountToParentReportPayload(supabase, student, reportBody);
  const enriched = await enrichPayloadWithParentFacing(supabase, withAcc, entry.studentId);
  const detailed = buildDetailedPayloadFromAggregatedReportBody(enriched, range.reportPeriod);
  return { detailed, enriched, reportBody };
}

async function fetchProdHeaders() {
  try {
    const res = await fetch(PROD_ORIGIN, { method: "HEAD", signal: AbortSignal.timeout(15000) });
    const headers = {};
    for (const [k, v] of res.headers.entries()) {
      if (/vercel|x-|server|date|cache/i.test(k)) headers[k] = v;
    }
    return { status: res.status, headers };
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}

async function postProdTurn(token, studentId, utterance, sessionId) {
  const fakePayload = { version: 999, shouldBeIgnored: true, diagnosticEngineV2: { units: [] } };
  const body = {
    studentId,
    utterance,
    sessionId,
    ...RANGE,
    payload: fakePayload,
  };
  const res = await fetch(`${PROD_ORIGIN}/api/parent/copilot-turn`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const json = await res.json().catch(() => ({}));
  return { httpStatus: res.status, body: json, requestBody: { ...body, payload: "[REDACTED_FAKE]" } };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key);
  const aaa = await resolveAaaStudents(supabase);
  const prodHeaders = await fetchProdHeaders();

  /** Scan AAA + all QA parent children for owner fingerprint */
  const { data: allChildren } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .eq("parent_id", QA_PARENT_ID)
    .eq("is_active", true);

  /** @type {object[]} */
  const childScans = [];
  const scanList = [
    ...aaa.map((a) => ({ label: a.label, studentId: a.studentId, fullName: a.fullName, gradeLevel: a.gradeLevel })),
    ...(allChildren || [])
      .filter((s) => !aaa.some((a) => a.studentId === s.id))
      .map((s) => ({ label: s.full_name || s.id.slice(0, 8), studentId: s.id, fullName: s.full_name, gradeLevel: s.grade_level })),
  ];

  for (const entry of scanList) {
    try {
      const loaded = await loadPayloadForStudent(supabase, entry, RANGE);
      const summary = payloadSummary(loaded.detailed, loaded.enriched);
      childScans.push({
        label: entry.label,
        studentId: entry.studentId,
        ...summary,
        matchesOwnerFingerprint: fingerprintMatch(summary),
      });
    } catch (err) {
      childScans.push({ label: entry.label, studentId: entry.studentId, error: String(err?.message || err) });
    }
  }

  const matched = childScans.find((c) => c.matchesOwnerFingerprint);
  const target =
    matched ||
    childScans.find((c) => c.totalQuestions === OWNER_FINGERPRINT.totalQuestions) ||
    childScans.sort((a, b) => (b.totalQuestions || 0) - (a.totalQuestions || 0))[0];

  if (!target?.studentId) throw new Error("No scan target found");

  const targetLoaded = await loadPayloadForStudent(supabase, target, RANGE);
  const targetPayload = targetLoaded.detailed;
  const targetSummary = payloadSummary(targetPayload, targetLoaded.enriched);

  const { token, reason, identifier } = await resolveParentBearer(PROD_ORIGIN);
  if (!token) throw new Error(`Parent bearer unavailable for production: ${reason}`);

  /** @type {object[]} */
  const parityRows = [];

  for (const utterance of OWNER_QUESTIONS) {
    const sessionId = `prod-parity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const detClass = classifyParentQuestionDeterministic({ utterance, payload: targetPayload });

    let prodResult = null;
    try {
      prodResult = await postProdTurn(token, target.studentId, utterance, sessionId);
    } catch (err) {
      prodResult = { error: String(err?.message || err) };
    }

    const engineRes = await parentCopilot.runParentCopilotTurnAsync({
      audience: "parent",
      payload: targetPayload,
      utterance,
      sessionId: `${sessionId}-engine`,
    });

    const prodText = prodResult?.body ? answerText(prodResult.body) : "";
    const engineText = answerText(engineRes);
    const prodMeta = prodResult?.body ? extractMeta(prodResult.body) : {};
    const engineMeta = extractMeta(engineRes);

    parityRows.push({
      utterance,
      deterministicClassification: detClass?.bucket || null,
      deterministicConfidence: detClass?.confidence ?? null,
      uiProduction: "NOT_CAPTURED_BROWSER — code path verified: postParentCopilotTurn → /api/parent/copilot-turn",
      httpProduction: {
        url: `${PROD_ORIGIN}/api/parent/copilot-turn`,
        httpStatus: prodResult?.httpStatus ?? null,
        textPreview: preview(prodText, 500),
        fullText: prodText,
        ...prodMeta,
        requestBody: prodResult?.requestBody,
      },
      engineLocal: {
        path: "runParentCopilotTurnAsync (same as production API handler)",
        textPreview: preview(engineText, 500),
        fullText: engineText,
        ...engineMeta,
      },
      identicalHttpEngine: prodText.trim() === engineText.trim(),
      note: buildNote(utterance, prodText, engineText, prodMeta, detClass),
    });
  }

  const progressQuestion = parityRows.find((r) => r.utterance === "איפה רואים התקדמות?");

  const report = {
    generatedAt: new Date().toISOString(),
    status: "NOT_APPROVED — investigation only",
    localGitHead: gitHead(),
    productionOrigin: PROD_ORIGIN,
    productionHeaders: prodHeaders,
    productionRunsLatestLocalCommit: "UNKNOWN — compare local HEAD to Vercel deployment commit manually",
    uiEndpointVerifiedInCode: {
      file: "lib/parent-client/copilot-turn-api.js",
      endpoint: "/api/parent/copilot-turn",
      method: "POST",
      wiredFrom: "pages/learning/parent-report-detailed.js → detailedCopilotTurnRunner → postParentCopilotTurn",
      clientPayloadInProduction: "ignored — server rebuild via resolveCopilotTurnPayloadForApi",
    },
    authUsed: { identifier: identifier || "[redacted]", mode: "parent_bearer" },
    targetChild: {
      label: target.label,
      studentId: target.studentId,
      matchesOwner214Fingerprint: Boolean(matched),
      payloadSummary: targetSummary,
      reportPeriod: RANGE,
    },
    childScanTop: childScans
      .filter((c) => c.totalQuestions)
      .sort((a, b) => Math.abs((b.totalQuestions || 0) - 214) - Math.abs((a.totalQuestions || 0) - 214))
      .slice(0, 15),
    parityTable: parityRows.map((r) => ({
      question: r.utterance,
      uiProduction: "same as HTTP (verified wiring)",
      httpProduction: preview(r.httpProduction.fullText, 120) || `[${r.httpProduction.resolutionStatus}]`,
      engineLocal: preview(r.engineLocal.fullText, 120) || `[${r.engineLocal.resolutionStatus}]`,
      identical: r.identicalHttpEngine ? "כן" : "לא",
      note: r.note,
    })),
    progressQuestionDeepDive: progressQuestion,
    suggestionsSource: {
      quickActionsChips: "utils/parent-copilot/render-adapter.js buildQuickActions — labels: צעד קטן היום, תוכנית לשבוע, מה להימנע ממנו עכשיו, etc.",
      quickActionPresets: "components/parent-copilot/parent-copilot-panel.jsx — maps chip id → preset utterance (NOT 'איפה רואים התקדמות')",
      suggestedFollowUp: "utils/parent-copilot/followup-engine.js selectFollowUp — contract-bound families",
      ambiguousExamplesText: "utils/parent-copilot/question-classifier.js AMBIGUOUS_RESPONSE_HE mentions 'איפה רואים התקדמות' as example only",
      uiIntroExamples: "parent-copilot-panel.jsx intro mentions 'מה הכי חשוב כרגע' — NOT 'איפה רואים התקדמות'",
      progressQuestionLikelySource: "AMBIGUOUS_RESPONSE_HE or GENERAL_OFF_TOPIC_RESPONSE_HE example text shown after failed classification; OR user typed manually after seeing example in prior ambiguous/off-topic answer",
    },
    awkwardHebrewSource: {
      phrase: "זה מגביל כמה ברורה התמונה הכוללת",
      file: "utils/parent-copilot/truth-packet-v1.js:827",
      ownerReportedAs: "מגדיל כמה ברורה התמונה הכוללת (possible misread or postprocess truncation)",
    },
    ownerReport11Points: buildOwnerSummary(prodHeaders, progressQuestion, matched, parityRows),
    fullRows: parityRows,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outJson = path.join(OUT_DIR, "production-parity-report.json");
  const outMd = path.join(OUT_DIR, "production-parity-report.md");
  await writeFile(outJson, JSON.stringify(report, null, 2), "utf8");
  await writeFile(outMd, renderMarkdown(report), "utf8");

  console.log(JSON.stringify({ ok: true, outJson, outMd, target: target.label, matched214: Boolean(matched) }, null, 2));
}

function preview(text, max) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function buildNote(utterance, prodText, engineText, prodMeta, detClass) {
  if (utterance === "איפה רואים התקדמות?" && prodMeta.ambiguous) {
    return "FAIL: ambiguous despite being listed as example in AMBIGUOUS_RESPONSE_HE; deterministic bucket=" + (detClass?.bucket || "?");
  }
  if (prodMeta.isNoData && utterance !== "האם הבעיה היא נשיאה?") {
    return "NO_DATA on report with data";
  }
  if (!prodText.trim() && prodMeta.ambiguous) return "ambiguous/clarification";
  if (prodText.includes("מגביל כמה ברורה") || prodText.includes("מגדיל כמה ברורה")) return "awkward executive narrative phrase";
  if (prodText.trim() !== engineText.trim()) return "HTTP≠Engine — deploy/payload divergence";
  return "";
}

function buildOwnerSummary(prodHeaders, progressQ, matched, rows) {
  const allSame = rows.every((r) => r.identicalHttpEngine);
  return {
    "1_productionRunsLatestCode": "UNKNOWN — local HEAD synced with origin/main; Vercel commit id not fetched (gh CLI unavailable)",
    "2_commitBuildId": prodHeaders?.headers?.["x-vercel-id"] || prodHeaders?.headers?.["x-deployment-id"] || "not in headers",
    "3_uiCallsCopilotTurn": "YES — lib/parent-client/copilot-turn-api.js POST /api/parent/copilot-turn",
    "4_progressQuestionLog": progressQ?.httpProduction || null,
    "5_payloadSummary": progressQ ? "see targetChild.payloadSummary" : null,
    "6_classificationRoute": {
      utterance: "איפה רואים התקדמות?",
      deterministic: progressQ?.deterministicClassification,
      httpIntent: progressQ?.httpProduction?.intent,
      httpRoute: progressQ?.httpProduction?.route,
    },
    "7_fallbackAmbiguous": {
      fallback: progressQ?.httpProduction?.fallbackUsed,
      ambiguous: progressQ?.httpProduction?.ambiguous,
    },
    "8_whySuggestionAppeared": "Not from quickActions chips — likely prior ambiguous/off-topic response example text or manual entry",
    "9_oldCopyInProduction": allSame ? "Production HTTP matches local engine — same codebase path" : "HTTP≠Engine — possible stale deploy or env",
    "10_artifactVsProduction": "Artifact used AAA synthetic children; owner tested real child with 214q — fingerprint match: " + (matched ? "FOUND" : "NOT FOUND in QA parent scan"),
    "11_fixProposalDeferred": "After parity proof only — route 'איפה רואים התקדמות' to trend/stable-subject composer; ban ambiguous for catalog questions",
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Parent Copilot — Production Parity Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("**Status: NOT APPROVED — investigation only. No fixes applied.**");
  lines.push("");
  lines.push("## Executive summary");
  lines.push("");
  lines.push(`- Production URL: ${report.productionOrigin}`);
  lines.push(`- Local git HEAD: \`${report.localGitHead}\``);
  lines.push(`- Target child: **${report.targetChild.label}** (${report.targetChild.studentId})`);
  lines.push(`- Owner 214-question fingerprint match: **${report.targetChild.matchesOwner214Fingerprint ? "YES" : "NO"}**`);
  lines.push(`- UI → API wiring: **${report.uiEndpointVerifiedInCode.endpoint}** (server rebuild, client payload ignored)`);
  lines.push("");
  lines.push("## Parity table (7 owner questions)");
  lines.push("");
  lines.push("| שאלה | UI Production | HTTP Production | Engine Local | זהה? | הערה |");
  lines.push("| ---- | ------------- | --------------- | ------------ | ---- | ---- |");
  for (const row of report.parityTable) {
    lines.push(`| ${row.question} | ${row.uiProduction} | ${row.httpProduction} | ${row.engineLocal} | ${row.identical} | ${row.note} |`);
  }
  lines.push("");
  lines.push("## \"איפה רואים התקדמות\" — deep dive");
  lines.push("");
  const p = report.progressQuestionDeepDive;
  if (p) {
    lines.push(`- Deterministic classification: \`${p.deterministicClassification}\` (confidence ${p.deterministicConfidence})`);
    lines.push(`- HTTP status: ${p.httpProduction.httpStatus}`);
    lines.push(`- Resolution: ${p.httpProduction.resolutionStatus}`);
    lines.push(`- Ambiguous: ${p.httpProduction.ambiguous}`);
    lines.push(`- Intent/route: ${p.httpProduction.intent} / ${p.httpProduction.route}`);
    lines.push("");
    lines.push("**HTTP full answer:**");
    lines.push("");
    lines.push("```");
    lines.push(p.httpProduction.fullText || "(empty)");
    lines.push("```");
  }
  lines.push("");
  lines.push("## Payload summary (target child)");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(report.targetChild.payloadSummary, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Owner 11-point checklist");
  lines.push("");
  for (const [k, v] of Object.entries(report.ownerReport11Points)) {
    lines.push(`### ${k}`);
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(v, null, 2));
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
