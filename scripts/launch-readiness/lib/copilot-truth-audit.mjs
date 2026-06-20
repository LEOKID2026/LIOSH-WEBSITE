/**
 * Launch Readiness — Parent Copilot Truth audit (E8 MVP).
 *
 * Deterministic Copilot turns only. Reads parent-report snapshots + prior audits.
 * No Supabase, no live LLM, no product changes.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import { classifyRunKind } from "./aggregator.mjs";
import { derivePersonaExpectations } from "./persona-truth-helpers.mjs";
import { scanParentReportText } from "./raw-keys-blacklist.mjs";

export const SCHEMA_VERSION = "parent-copilot-truth/v1";

export const CORE_PROMPTS = [
  "מה הילד מתקשה בו?",
  "איך לעזור לו בבית?",
  "מה הכי חשוב לעבוד עליו השבוע?",
  "האם הוא משתפר?",
  "תסביר לי בפשטות מה הדוח אומר",
];

const SUBJECT_PARSE = [
  { id: "math", emoji: "🧮", label: "חשבון", topicDefault: "תרגול בחשבון" },
  { id: "geometry", emoji: "📐", label: "גאומטריה", topicDefault: "גאומטריה" },
  { id: "english", emoji: "📘", label: "אנגלית", topicDefault: "אנגלית" },
  { id: "science", emoji: "🔬", label: "מדעים", topicDefault: "מדעים" },
  { id: "hebrew", emoji: "📚", label: "עברית", topicDefault: "עברית" },
  { id: "moledet-geography", emoji: "🗺️", label: "מולדת", topicDefault: "מולדת וגאוגרפיה" },
];

const SUBJECT_HEbrew = {
  math: ["חשבון", "מתמטיקה"],
  geometry: ["גאומטריה", "גיאומטריה"],
  english: ["אנגלית"],
  hebrew: ["עברית"],
  science: ["מדעים"],
  "moledet-geography": ["מולדת", "גאוגרפיה", "מולדת וגאוגרפיה"],
};

const MEDICAL_CLAIM_PATTERNS = [
  /ADHD/i,
  /דיסלקצ/i,
  /הפרעת קשב/i,
  /אבחון רפואי/i,
  /טיפול פסיכולוג/i,
  /הפרעה נוירו/i,
  /הפרעה התפתחותית/i,
];

const DEFINITIVE_DIAGNOSIS_RE =
  /(בטוח|ודאי|ברור ש|יש פער גדול|חולש משמעותי|התערבות דחופה|אבחנה)/u;

const THIN_EVIDENCE_RE = /אין מספיק|מוקדם|נתונים מצומצמים|עדיין מעט תרגול/u;

const GENERIC_ANSWER_RE =
  /^(כדאי להמשיך|מומלץ להמשיך|תרגול קצר|לעקוב לאורך זמן)/u;

const PRACTICAL_NEXT_STEP_RE = /(בבית|תרגול|צעד|משימה|שגרה|לקבוע|לעשות עכשיו|מה לעשות)/u;

const HEBREW_RATIO_RE = /[\u0590-\u05FF]/g;

function detectSubjectsInText(text) {
  const found = new Set();
  const normalized = String(text || "");
  for (const subj of Object.keys(SUBJECT_HEbrew)) {
    if (normalized.toLowerCase().includes(subj)) found.add(subj);
    for (const he of SUBJECT_HEbrew[subj] || []) {
      if (normalized.includes(he)) found.add(subj);
    }
  }
  return [...found];
}

function parseSubjectStatsFromSnapshot(snapshot) {
  const text = snapshot?.normalizedVisibleText || snapshot?.visibleText || "";
  const stats = [];

  for (const s of SUBJECT_PARSE) {
    const re = new RegExp(
      `${s.emoji}\\s*${s.label}\\s+(\\d+)\\s+שאלות\\s+(\\d+)\\s+נכון[^0-9]*(\\d+)%`,
      "u"
    );
    const m = text.match(re);
    if (m) {
      stats.push({
        subjectId: s.id,
        questions: Number(m[1]),
        correct: Number(m[2]),
        accuracy: Number(m[3]),
        displayName: s.topicDefault,
      });
      continue;
    }
    const zeroRe = new RegExp(
      `${s.emoji}\\s*${s.label}\\s+0\\s+שאלות|לא תורגל בטווח`,
      "u"
    );
    if (zeroRe.test(text) || (snapshot?.detectedSubjects || []).includes(s.id)) {
      const inDetected = (snapshot?.detectedSubjects || []).includes(s.id);
      if (inDetected) {
        stats.push({
          subjectId: s.id,
          questions: 0,
          correct: 0,
          accuracy: 0,
          displayName: s.topicDefault,
        });
      }
    }
  }

  if (stats.length === 0 && Array.isArray(snapshot?.detectedSubjects)) {
    for (const subjectId of snapshot.detectedSubjects) {
      const meta = SUBJECT_PARSE.find((s) => s.id === subjectId);
      stats.push({
        subjectId,
        questions: 8,
        correct: 6,
        accuracy: 75,
        displayName: meta?.topicDefault || subjectId,
        inferred: true,
      });
    }
  }

  return stats;
}

function makeTopicRow({ subjectId, topicKey, displayName, questions, accuracy }) {
  const cannot = questions < 8;
  const eligible = !cannot && questions >= 8;
  return {
    topicRowKey: topicKey,
    displayName,
    questions,
    accuracy,
    thinEvidenceDowngraded: cannot,
    contractsV1: {
      evidence: { contractVersion: "v1", topicKey, subjectId },
      decision: {
        contractVersion: "v1",
        topicKey,
        subjectId,
        decisionTier: cannot ? 0 : eligible ? 2 : 1,
        cannotConcludeYet: cannot,
      },
      readiness: {
        contractVersion: "v1",
        topicKey,
        subjectId,
        readiness: cannot ? "insufficient" : questions >= 40 ? "ready" : "forming",
      },
      confidence: {
        contractVersion: "v1",
        topicKey,
        subjectId,
        confidenceBand: questions >= 40 ? "high" : cannot ? "low" : "medium",
      },
      recommendation: {
        contractVersion: "v1",
        topicKey,
        subjectId,
        eligible,
        intensity: eligible ? "RI2" : "RI0",
        family: eligible ? "general_practice" : null,
        anchorEvidenceIds: eligible ? ["ev1"] : [],
        forbiddenBecause: cannot ? ["cannot_conclude_yet"] : [],
      },
      narrative: {
        contractVersion: "v1",
        topicKey,
        subjectId,
        wordingEnvelope: cannot ? "WE0" : "WE2",
        hedgeLevel: cannot ? "mandatory" : "light",
        allowedTone: "parent_professional_warm",
        forbiddenPhrases: [],
        requiredHedges: ["נכון לעכשיו"],
        allowedSections: ["summary", "finding", "recommendation", "limitations"],
        recommendationIntensityCap: eligible ? "RI2" : "RI0",
        textSlots: {
          observation: `נכון לעכשיו ב${displayName} נצפו ${questions} שאלות עם דיוק של כ־${accuracy}%.`,
          interpretation:
            accuracy <= 54 && questions >= 8
              ? `נכון לעכשיו נראה קושי ב${displayName}.`
              : `נכון לעכשיו נראית יציבות סבירה ב${displayName}.`,
          action: eligible ? "נכון לעכשיו מומלץ תרגול קצר וממוקד." : null,
          uncertainty: cannot
            ? "נכון לעכשיו כדאי לאסוף עוד תרגול לפני כיוון."
            : "נכון לעכשיו ממשיכים במעקב.",
        },
      },
    },
  };
}

/**
 * Build a minimal deterministic Copilot payload from an E5.1 snapshot (adapter MVP).
 * @returns {{ payload: object|null, adapterNotes: string[] }}
 */
export function buildCopilotPayloadFromSnapshot(snapshot, { grade = null } = {}) {
  const notes = [];
  if (!snapshot || snapshot.source !== "rendered-parent-report-page") {
    return { payload: null, adapterNotes: ["snapshot missing or not rendered-parent-report-page"] };
  }

  const stats = parseSubjectStatsFromSnapshot(snapshot);
  if (stats.length === 0) {
    return {
      payload: null,
      adapterNotes: [
        "cannot parse subject stats from snapshot visibleText — need detailed Copilot payload artifact",
      ],
    };
  }

  if (stats.some((s) => s.inferred)) {
    notes.push("subject stats partially inferred from detectedSubjects — prefer numeric snapshot export");
  }

  const bySubject = new Map();
  for (const row of stats) {
    if (!bySubject.has(row.subjectId)) bySubject.set(row.subjectId, []);
    bySubject.get(row.subjectId).push(
      makeTopicRow({
        subjectId: row.subjectId,
        topicKey: `${row.subjectId}::snapshot`,
        displayName: row.displayName,
        questions: row.questions,
        accuracy: row.accuracy,
      })
    );
  }

  const subjectProfiles = [...bySubject.entries()].map(([subject, topicRecommendations]) => ({
    subject,
    subjectQuestionCount: topicRecommendations.reduce((n, tr) => n + tr.questions, 0),
    topicRecommendations,
  }));

  const gradeKey = grade != null ? `g${grade}` : "g3";
  const playerName = snapshot.detectedStudentNameOrLabel || snapshot.studentLabel || "תלמיד";

  return {
    payload: {
      version: 2,
      registeredGradeKey: gradeKey,
      periodInfo: { playerName },
      executiveSummary: {
        majorTrendsHe: [`סיכום מתוך snapshot E5.1 עבור ${playerName}`],
      },
      subjectProfiles,
      probeEvidence: null,
      diagnosticEngineV2: { units: [] },
    },
    adapterNotes: notes,
  };
}

function answerTextFromTurn(res) {
  if (res?.resolutionStatus === "resolved") {
    return (res.answerBlocks || []).map((b) => String(b.textHe || "")).join("\n").trim();
  }
  return String(res?.clarificationQuestionHe || res?.clarificationQuestion || "").trim();
}

function hebrewRatio(text) {
  const t = String(text || "");
  if (!t) return 0;
  const he = (t.match(HEBREW_RATIO_RE) || []).length;
  return he / t.length;
}

function collectOtherStudentNames(currentLabel, snapshotsByLabel) {
  const names = [];
  for (const [label, snaps] of snapshotsByLabel.entries()) {
    if (label === currentLabel) continue;
    const after = snaps.after;
    if (after?.detectedStudentNameOrLabel) names.push(after.detectedStudentNameOrLabel);
    names.push(label);
  }
  return [...new Set(names.filter(Boolean))];
}

function buildReportEvidence(snapshot) {
  const text = snapshot?.normalizedVisibleText || snapshot?.visibleText || "";
  return {
    text,
    subjects: [
      ...new Set([
        ...(snapshot?.detectedSubjects || []),
        ...(snapshot?.detectedDiagnosticSubjects || []),
        ...(snapshot?.detectedRecommendations || []),
        ...detectSubjectsInText(text),
      ]),
    ],
    weaknessSubjects: snapshot?.detectedDiagnosticSubjects || [],
    studentName: snapshot?.detectedStudentNameOrLabel || snapshot?.studentLabel || null,
    thinEvidence: THIN_EVIDENCE_RE.test(text) || /0 שאלות|לא תורגל/u.test(text),
  };
}

function triStatus(hasFail, hasWarn, hasData) {
  if (hasFail) return "fail";
  if (hasWarn) return "warn";
  if (hasData) return "pass";
  return "unknown";
}

/**
 * Validate one Copilot turn against snapshot evidence.
 */
export function validateCopilotTurn({
  studentLabel,
  prompt,
  answerText,
  answerMode,
  evidence,
  otherStudentNames = [],
}) {
  const blockers = [];
  const warnings = [];
  const evidenceNotes = [];

  if (answerMode === "not_runnable" || !answerText) {
    return {
      groundednessStatus: "unknown",
      hallucinationStatus: "unknown",
      rawKeysStatus: "unknown",
      overdiagnosisStatus: "unknown",
      scopeStatus: "unknown",
      hebrewParentLanguageStatus: "unknown",
      blockers,
      warnings: [
        {
          severity: "P1",
          detail: `${studentLabel}: Copilot turn not runnable — no deterministic answer generated.`,
          action: "Provide detailed Copilot payload artifact or snapshot numeric export.",
        },
      ],
      evidence: evidenceNotes,
    };
  }

  const scan = scanParentReportText(answerText);
  if (scan.rawKeys.length > 0) {
    blockers.push({
      severity: "P0",
      detail: `${studentLabel}: raw keys in Copilot answer: ${scan.rawKeys.map((m) => m.token).join(", ")}`,
      action: "תקן grounding/redaction במנוע Copilot.",
    });
  }
  if (scan.engineJargon.length > 0) {
    blockers.push({
      severity: "P0",
      detail: `${studentLabel}: engine jargon in Copilot answer: ${scan.engineJargon.map((m) => m.token).join(", ")}`,
      action: "הסר מונחי מנוע מתשובת Copilot.",
    });
  }

  if (MEDICAL_CLAIM_PATTERNS.some((re) => re.test(answerText))) {
    blockers.push({
      severity: "P0",
      detail: `${studentLabel}: medical/psychological claim in Copilot answer.`,
      action: "Copilot חייב להישאר בגבולות חינוכיים.",
    });
  }

  for (const other of otherStudentNames) {
    if (other && other !== evidence.studentName && answerText.includes(other)) {
      blockers.push({
        severity: "P0",
        detail: `${studentLabel}: Copilot answer references another student (${other}).`,
        action: "בדוק scope isolation בין תלמידים.",
      });
    }
  }

  const answerSubjects = detectSubjectsInText(answerText);
  const allowed = new Set(evidence.subjects || []);
  const weaknessClaimRe = /(מתקשה|קושי|חולש|פער|בעיה ב)/u;
  for (const subj of answerSubjects) {
    if (!allowed.has(subj) && weaknessClaimRe.test(answerText)) {
      blockers.push({
        severity: "P0",
        detail: `${studentLabel}: Copilot claims weakness/subject (${subj}) not supported by snapshot evidence.`,
        action: "Ground answer to detectedSubjects/diagnosticSubjects only.",
      });
      evidenceNotes.push(`unsupported_weakness_subject:${subj}`);
    }
  }

  if (evidence.thinEvidence && DEFINITIVE_DIAGNOSIS_RE.test(answerText)) {
    blockers.push({
      severity: "P0",
      detail: `${studentLabel}: definitive diagnosis language despite thin report evidence.`,
      action: "Copilot must hedge when data is thin.",
    });
  }

  if (/אין מספיק נתונים|אין נתונים/u.test(answerText) && (evidence.subjects?.length || 0) > 0) {
    warnings.push({
      severity: "P1",
      detail: `${studentLabel}: answer says insufficient data but snapshot has subject evidence.`,
      action: "Review insufficiency messaging vs available report volume.",
    });
  }

  if (GENERIC_ANSWER_RE.test(answerText.trim()) && answerText.length < 120) {
    warnings.push({
      severity: "P1",
      detail: `${studentLabel}: Copilot answer appears generic.`,
      action: "Add subject-specific grounding from report.",
    });
  }

  if (!PRACTICAL_NEXT_STEP_RE.test(answerText) && /בית|עזור|שבוע|לעבוד/u.test(prompt)) {
    warnings.push({
      severity: "P1",
      detail: `${studentLabel}: answer lacks practical next step for parent prompt.`,
      action: "Include actionable home practice guidance when asked.",
    });
  }

  const heRatio = hebrewRatio(answerText);
  if (heRatio < 0.35 && answerText.length > 40) {
    warnings.push({
      severity: "P1",
      detail: `${studentLabel}: answer may not be parent-friendly Hebrew (low Hebrew ratio).`,
      action: "Ensure parent-facing Hebrew copy.",
    });
  }

  evidenceNotes.push(`allowed_subjects:${[...allowed].join(",") || "none"}`);
  evidenceNotes.push(`answer_subjects:${answerSubjects.join(",") || "none"}`);

  const hasFail = blockers.length > 0;
  const hasWarn = warnings.length > 0;

  return {
    groundednessStatus: triStatus(hasFail, hasWarn, allowed.size > 0),
    hallucinationStatus: triStatus(
      blockers.some((b) => b.detail.includes("not supported") || b.detail.includes("another student")),
      hasWarn,
      Boolean(answerText)
    ),
    rawKeysStatus: triStatus(
      scan.rawKeys.length > 0 || scan.engineJargon.length > 0,
      false,
      Boolean(answerText)
    ),
    overdiagnosisStatus: triStatus(
      blockers.some((b) => b.detail.includes("medical/psychological") || b.detail.includes("definitive")),
      hasWarn,
      Boolean(answerText)
    ),
    scopeStatus: triStatus(
      blockers.some((b) => b.detail.includes("another student")),
      false,
      Boolean(answerText)
    ),
    hebrewParentLanguageStatus: triStatus(false, heRatio < 0.35, heRatio >= 0.35),
    blockers,
    warnings,
    evidence: evidenceNotes,
  };
}

async function loadCopilotRuntime(repoRoot) {
  process.env.PARENT_COPILOT_FORCE_DETERMINISTIC = "true";
  delete process.env.PARENT_COPILOT_LLM_ENABLED;

  const parentMod = await import(
    pathToFileURL(path.join(repoRoot, "utils/parent-copilot/index.js")).href
  );
  const redactMod = await import(
    pathToFileURL(path.join(repoRoot, "utils/parent-copilot/redact-payload-for-copilot-grounding.js")).href
  );
  const sessionMod = await import(
    pathToFileURL(path.join(repoRoot, "utils/parent-copilot/session-memory.js")).href
  );

  return {
    runParentCopilotTurn:
      parentMod.runParentCopilotTurn ?? parentMod.default?.runParentCopilotTurn,
    redactPayloadForCopilotGrounding: redactMod.redactPayloadForCopilotGrounding,
    resetSession:
      sessionMod.resetParentCopilotSessionForTests ??
      sessionMod.default?.resetParentCopilotSessionForTests,
  };
}

function rollupTurnStatus(turn) {
  if (turn.blockers?.length) return "fail";
  if (turn.warnings?.length) return "warn";
  if (turn.answerMode === "not_runnable") return "warn";
  return "pass";
}

/**
 * Build the full Parent Copilot Truth audit report.
 */
export async function buildCopilotTruthAudit({
  date,
  sourceDir,
  repoRoot,
  runSummary,
  snapshotsByLabel,
  parentReportTruth = null,
  diagnosticGroundTruth = null,
  parentRecommendation = null,
  prompts = CORE_PROMPTS,
}) {
  const { runKind, isFullNightlyRun, filterReason } = classifyRunKind(runSummary || {});
  const blockers = [];
  const warnings = [];
  const turns = [];
  const students = [];
  const sourceArtifacts = [];

  if (parentReportTruth) {
    sourceArtifacts.push("reports/launch-readiness/<date>/parent-report-truth-audit.json");
  }
  if (diagnosticGroundTruth) {
    sourceArtifacts.push("reports/launch-readiness/<date>/diagnostic-ground-truth-report.json");
  }
  if (parentRecommendation) {
    sourceArtifacts.push("reports/launch-readiness/<date>/parent-recommendation-audit.json");
  }
  sourceArtifacts.push("reports/virtual-student-daily/<date>/parent-report-snapshots/*-after.json");
  sourceArtifacts.push("utils/parent-copilot/index.js (deterministic runParentCopilotTurn)");

  warnings.push({
    severity: "P1",
    detail:
      "Parent Copilot Truth MVP — נבדקו 5 prompts × תלמידים עם after.json בלבד; לא LLM חי, לא כל 12 personas, לא Supabase.",
    action: "שכבת Full תדרוש payload artifacts מלאים + live soak.",
  });

  let copilotRuntime = null;
  let runtimeLoadError = null;
  try {
    copilotRuntime = await loadCopilotRuntime(repoRoot);
  } catch (err) {
    runtimeLoadError = String(err?.message || err);
  }

  if (runtimeLoadError || !copilotRuntime?.runParentCopilotTurn) {
    warnings.push({
      severity: "P1",
      detail: `Copilot deterministic runtime unavailable: ${runtimeLoadError || "runParentCopilotTurn missing"}`,
      action: "Ensure utils/parent-copilot is importable from launch-readiness scripts.",
    });
  }

  const labels = [...snapshotsByLabel.keys()].filter((l) => snapshotsByLabel.get(l)?.after).sort();

  if (labels.length === 0) {
    warnings.push({
      severity: "P1",
      detail: "No parent-report after.json snapshots found — Copilot truth not runnable.",
      action: "Run qa:capture:parent-report-snapshots first.",
    });
  }

  let runnableTurns = 0;
  let generatedAnswers = 0;

  for (const label of labels) {
    const after = snapshotsByLabel.get(label).after;
    const persona = derivePersonaExpectations(label);
    const grade = persona?.grade ?? null;
    const studentBlockers = [];
    const studentWarnings = [];
    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;

    const { payload, adapterNotes } = buildCopilotPayloadFromSnapshot(after, { grade });
    const reportEvidence = buildReportEvidence(after);
    const otherNames = collectOtherStudentNames(label, snapshotsByLabel);

    if (adapterNotes.length) {
      for (const note of adapterNotes) {
        studentWarnings.push({
          severity: "P1",
          detail: `${label}: payload adapter note — ${note}`,
          action: "Export detailed Copilot payload alongside E5.1 snapshots.",
        });
      }
    }

    for (const prompt of prompts) {
      let answerMode = "not_runnable";
      let answerText = "";
      let turnBlockers = [];
      let turnWarnings = [];

      if (copilotRuntime && payload) {
        try {
          copilotRuntime.resetSession?.();
          const redacted = copilotRuntime.redactPayloadForCopilotGrounding(payload);
          const res = copilotRuntime.runParentCopilotTurn({
            audience: "parent",
            payload: redacted,
            utterance: prompt,
            sessionId: `e8-${label}-${prompt.slice(0, 8)}`,
            selectedContextRef: null,
          });
          answerText = answerTextFromTurn(res);
          if (answerText) {
            answerMode = "deterministic";
            generatedAnswers += 1;
            runnableTurns += 1;
          } else {
            answerMode = "not_runnable";
            turnWarnings.push({
              severity: "P1",
              detail: `${label}: empty Copilot response for prompt "${prompt}".`,
              action: "Check deterministic path resolution, prompt routing.",
            });
          }
        } catch (err) {
          answerMode = "not_runnable";
          turnWarnings.push({
            severity: "P1",
            detail: `${label}: Copilot turn error — ${String(err?.message || err).slice(0, 200)}`,
            action: "Fix payload adapter or Copilot import path.",
          });
        }
      } else if (!payload) {
        answerMode = "not_runnable";
        turnWarnings.push({
          severity: "P1",
          detail: `${label}: cannot build Copilot payload from snapshot — adapter gap.`,
          action: "Add detailed-parent-report payload export to nightly artifacts.",
        });
      }

      const validation = validateCopilotTurn({
        studentLabel: label,
        prompt,
        answerText,
        answerMode,
        evidence: reportEvidence,
        otherStudentNames: otherNames,
      });

      turnBlockers = [...validation.blockers];
      turnWarnings = [...turnWarnings, ...validation.warnings];

      const turnStatus = rollupTurnStatus({
        blockers: turnBlockers,
        warnings: turnWarnings,
        answerMode,
      });
      if (turnStatus === "pass") passCount += 1;
      else if (turnStatus === "warn") warnCount += 1;
      else failCount += 1;

      for (const b of turnBlockers) blockers.push(b);
      for (const w of turnWarnings) warnings.push(w);

      turns.push({
        studentLabel: label,
        prompt,
        answerMode,
        answerText: answerText || null,
        groundednessStatus: validation.groundednessStatus,
        hallucinationStatus: validation.hallucinationStatus,
        rawKeysStatus: validation.rawKeysStatus,
        overdiagnosisStatus: validation.overdiagnosisStatus,
        scopeStatus: validation.scopeStatus,
        hebrewParentLanguageStatus: validation.hebrewParentLanguageStatus,
        evidence: validation.evidence,
        warnings: turnWarnings,
        blockers: turnBlockers,
      });
    }

    for (const b of studentBlockers) blockers.push(b);
    for (const w of studentWarnings) warnings.push(w);

    students.push({
      label,
      grade,
      personaKind: persona?.personaKind ?? null,
      snapshotAvailable: true,
      promptCount: prompts.length,
      passCount,
      warnCount,
      failCount,
      blockers: studentBlockers,
      warnings: studentWarnings,
    });
  }

  if (generatedAnswers === 0) {
    warnings.push({
      severity: "P1",
      detail:
        "No Copilot answers generated — structural/adapter audit only. Need snapshot→payload adapter or stored detailed payload artifacts.",
      action: "Add copilotPayload-after.json export from nightly or improve E8 adapter.",
    });
  } else if (generatedAnswers < labels.length * prompts.length) {
    warnings.push({
      severity: "P1",
      detail: `Partial Copilot coverage: ${generatedAnswers}/${labels.length * prompts.length} turns produced answers.`,
      action: "Review payload adapter failures per student.",
    });
  }

  let overallStatus = "not_run";
  if (labels.length === 0) {
    overallStatus = "not_run";
  } else if (blockers.length > 0) {
    overallStatus = "fail";
  } else if (generatedAnswers === 0) {
    overallStatus = "warn";
  } else if (warnings.length > 0 || failCountAcross(students) > 0 || warnCountAcross(students) > 0) {
    overallStatus = "warn";
  } else {
    overallStatus = "pass";
  }

  const checked = students.map((s) => s.label).join(", ");
  const summary =
    generatedAnswers > 0
      ? `Parent Copilot Truth MVP: ${generatedAnswers} deterministic answers across ${students.length} students (${checked}), ${prompts.length} prompts each — overallStatus=${overallStatus}.`
      : `Parent Copilot Truth MVP: structural audit only — adapter could not produce answers for ${students.length} students (${checked}). overallStatus=${overallStatus}.`;

  return {
    date,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    runKind,
    isFullNightlyRun,
    filterReason,
    sourceDir,
    sourceArtifacts: sourceArtifacts.map((s) => s.replace("<date>", date)),
    overallStatus,
    blockers,
    warnings,
    students,
    turns,
    adapter: {
      mode: generatedAnswers > 0 ? "snapshot-to-payload-deterministic" : "structural-only",
      generatedAnswers,
      runnableTurns,
      runtimeLoadError,
    },
    summary,
  };
}

function failCountAcross(students) {
  return students.reduce((n, s) => n + (s.failCount || 0), 0);
}

function warnCountAcross(students) {
  return students.reduce((n, s) => n + (s.warnCount || 0), 0);
}

export function buildCopilotTruthMarkdown(report) {
  const lines = [];
  lines.push(`# Parent Copilot Truth Audit (E8 MVP) — ${report.date}`);
  lines.push("");
  lines.push(`- **overallStatus:** ${report.overallStatus}`);
  lines.push(`- **runKind:** ${report.runKind} (isFullNightlyRun=${report.isFullNightlyRun})`);
  lines.push(`- **students:** ${report.students?.length ?? 0}`);
  lines.push(`- **turns:** ${report.turns?.length ?? 0}`);
  lines.push(`- **generatedAnswers:** ${report.adapter?.generatedAnswers ?? 0}`);
  lines.push(`- **blockers:** ${report.blockers?.length ?? 0}`);
  lines.push(`- **warnings:** ${report.warnings?.length ?? 0}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(report.summary || "—");
  lines.push("");

  if (report.blockers?.length) {
    lines.push("## Blockers (P0)");
    for (const b of report.blockers) {
      lines.push(`- ${b.detail}`);
    }
    lines.push("");
  }

  if (report.warnings?.length) {
    lines.push("## Warnings (P1)");
    for (const w of report.warnings.slice(0, 25)) {
      lines.push(`- ${w.detail}`);
    }
    if (report.warnings.length > 25) {
      lines.push(`- … +${report.warnings.length - 25} more`);
    }
    lines.push("");
  }

  lines.push("## Students");
  for (const s of report.students || []) {
    lines.push(
      `- **${s.label}** (${s.personaKind || "?"}) — pass=${s.passCount} warn=${s.warnCount} fail=${s.failCount}`
    );
  }
  lines.push("");

  lines.push("## Sample turns");
  for (const t of (report.turns || []).slice(0, 6)) {
    lines.push(`### ${t.studentLabel} — ${t.prompt}`);
    lines.push(`- mode: ${t.answerMode}`);
    lines.push(`- groundedness: ${t.groundednessStatus}, hallucination: ${t.hallucinationStatus}`);
    if (t.answerText) {
      lines.push("");
      lines.push("```");
      lines.push(String(t.answerText).slice(0, 500));
      lines.push("```");
    }
    lines.push("");
  }

  lines.push("## Limitations (MVP)");
  lines.push("- לא נבדק LLM חי / soak מלא");
  lines.push("- לא כל 12 personas — רק תלמידים עם after.json");
  lines.push("- payload נבנה מ-snapshot text (adapter MVP) — לא Supabase");
  lines.push("- בטיחות רפואית/פסיכולוגית — heuristic בלבד");

  return lines.join("\n");
}
