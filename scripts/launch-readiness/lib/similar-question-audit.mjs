/**
 * Launch Readiness — Similar / Adaptive Follow-up audit (E6 MVP).
 *
 * Read-only analysis of wrong-answer follow-up behavior from existing
 * nightly artifacts. Does not run Playwright, Supabase, or the runner.
 */

import { classifyRunKind } from "./aggregator.mjs";
import { getPersona } from "../../virtual-student-qa/scenarios/student-personas.mjs";

export const SCHEMA_VERSION = "similar-question-audit/v1";

const FOLLOWUP_WINDOW = 3;

const DRIVER_SUBJECT = {
  "english-master": "english",
  "hebrew-master": "hebrew",
  "math-master": "math",
  "geometry-master": "geometry",
  "science-master": "science",
  "moledet-geography-master": "moledet-geography",
  "moledet-master": "moledet-geography",
};

const SESSION_LINE =
  /phase-d2:\s+(\S+)\s+session\s+(\d+)\/(\d+)\s+subject=(\S+)\s+profile=(\S+)\s+topic=(\S+)\s+questions=(\d+)/;

const STUDENT_BLOCK =
  /phase-d2:\s+===== student \d+\/\d+:\s+(\S+)\s+\(/;

const QUESTION_LINE =
  /^(english-master|hebrew-master|math-master|geometry-master|science-master|moledet-geography-master|moledet-master):\s+q(\d+)\s+shape=(\S+).*?\sintendedCorrect=(true|false)/;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumAnswered(sessions) {
  if (!Array.isArray(sessions)) return 0;
  return sessions.reduce((s, sess) => s + num(sess?.answeredCount), 0);
}

function subjectsFromSessions(sessions) {
  if (!Array.isArray(sessions)) return [];
  return [...new Set(sessions.map((s) => s?.subject).filter(Boolean))];
}

function inferWrongCountFromSession(session) {
  const answered = num(session?.answeredCount);
  const intendedCorrect = num(session?.correctIntended);
  if (answered > 0 && intendedCorrect >= 0 && intendedCorrect <= answered) {
    return answered - intendedCorrect;
  }
  return null;
}

function extractQuestionsFromRunSummarySession(session) {
  const candidates = [
    session?.answeredQuestions,
    session?.questions,
    session?.tally?.questions,
    session?.questionLog,
  ];
  for (const list of candidates) {
    if (!Array.isArray(list) || list.length === 0) continue;
    return list.map((q, i) => normalizeQuestionEntry(q, session, i));
  }
  return null;
}

function normalizeQuestionEntry(q, session, fallbackIndex) {
  return {
    questionIndex: num(q?.index ?? q?.questionIndex ?? fallbackIndex + 1),
    subject: q?.subject || session?.subject || null,
    topic: q?.topic || q?.topicKey || session?.topic || null,
    skill: q?.skill || q?.skillKey || q?.unitKey || null,
    questionId: q?.questionId || q?.id || null,
    intendedCorrect:
      typeof q?.intendedCorrect === "boolean" ? q.intendedCorrect : null,
    wasCorrect:
      typeof q?.observedCorrect === "boolean"
        ? q.observedCorrect
        : typeof q?.wasCorrect === "boolean"
        ? q.wasCorrect
        : null,
    source: "run-summary",
  };
}

function stripLogPrefix(line) {
  return String(line).replace(/^\[[^\]]+\]\s*/, "");
}

export function parseQuestionSequenceFromDriverLog(logText, studentLabel) {
  if (!logText || !studentLabel) return { sessions: [], source: "none" };

  const lines = String(logText).split(/\r?\n/);
  let inStudent = false;
  let currentSession = null;
  const sessions = [];

  for (const rawLine of lines) {
    const line = stripLogPrefix(rawLine);
    const studentMatch = line.match(STUDENT_BLOCK);
    if (studentMatch) {
      if (studentMatch[1] === studentLabel) {
        inStudent = true;
        sessions.length = 0;
        currentSession = null;
      } else {
        inStudent = false;
        currentSession = null;
      }
      continue;
    }
    if (!inStudent) continue;

    if (line.includes("phase-d2: ===== after-snapshot pass")) {
      inStudent = false;
      currentSession = null;
      continue;
    }

    const sessMatch = line.match(SESSION_LINE);
    if (sessMatch && sessMatch[1] === studentLabel) {
      currentSession = {
        sessionIndex: num(sessMatch[2]) - 1,
        subject: sessMatch[4],
        topic: sessMatch[6],
        profile: sessMatch[5],
        questions: [],
      };
      sessions.push(currentSession);
      continue;
    }

    const qMatch = line.match(QUESTION_LINE);
    if (qMatch && currentSession) {
      const driver = qMatch[1];
      currentSession.questions.push({
        questionIndex: num(qMatch[2]),
        subject: DRIVER_SUBJECT[driver] || currentSession.subject,
        topic: currentSession.topic,
        skill: null,
        questionId: null,
        intendedCorrect: qMatch[4] === "true",
        wasCorrect: null,
        shape: qMatch[3],
        source: "driver-log",
      });
    }
  }

  return {
    sessions,
    source: sessions.some((s) => s.questions.length) ? "driver-log" : "none",
  };
}

function resolveAnalysisLevel(questions) {
  if (!questions.length) return "unknown";
  if (questions.some((q) => q.skill)) return "skill";
  if (questions.some((q) => q.topic)) return "topic";
  if (questions.some((q) => q.subject)) return "subject";
  return "unknown";
}

function compareFollowupMatch(wrongQ, followQ, analysisLevel) {
  if (!followQ) return "none";
  if (analysisLevel === "skill" && wrongQ.skill && followQ.skill) {
    return wrongQ.skill === followQ.skill ? "sameSkill" : "none";
  }
  if (
    (analysisLevel === "skill" || analysisLevel === "topic") &&
    wrongQ.topic &&
    followQ.topic
  ) {
    return wrongQ.topic === followQ.topic ? "sameTopic" : "none";
  }
  if (wrongQ.subject && followQ.subject) {
    return wrongQ.subject === followQ.subject ? "sameSubject" : "none";
  }
  return "unknown";
}

function isFollowupCovered(match) {
  return match === "sameSkill" || match === "sameTopic" || match === "sameSubject";
}

function buildWrongAnswerEvents(flatQuestions, analysisLevel) {
  const events = [];
  for (let i = 0; i < flatQuestions.length; i++) {
    const q = flatQuestions[i];
    const isWrong =
      q.intendedCorrect === false ||
      (q.wasCorrect === false && q.intendedCorrect !== true);
    if (!isWrong) continue;

    const followupWindowQuestions = [];
    for (let j = 1; j <= FOLLOWUP_WINDOW && i + j < flatQuestions.length; j++) {
      const fq = flatQuestions[i + j];
      if (fq.sessionIndex !== q.sessionIndex) break;
      followupWindowQuestions.push({
        questionIndex: fq.questionIndex,
        subject: fq.subject,
        topic: fq.topic,
        skill: fq.skill,
        questionId: fq.questionId,
      });
    }

    const matches = followupWindowQuestions.map((fq) =>
      compareFollowupMatch(q, fq, analysisLevel)
    );
    const bestMatch = matches.find((m) => isFollowupCovered(m)) || matches[0] || "none";
    const covered = isFollowupCovered(bestMatch);

    events.push({
      studentLabel: q.studentLabel,
      sessionIndex: q.sessionIndex,
      subject: q.subject,
      questionIndex: q.questionIndex,
      questionId: q.questionId,
      topic: q.topic,
      skill: q.skill,
      wasCorrect: false,
      followupWindowQuestions,
      followupMatch: followupWindowQuestions.length === 0 ? "none" : bestMatch,
      covered,
      details:
        followupWindowQuestions.length === 0
          ? "no questions remaining in session after wrong answer"
          : `next ${followupWindowQuestions.length} question(s): match=${bestMatch}`,
    });
  }
  return events;
}

function computeStudentMatchStatus({
  analysisLevel,
  followupCoverageRate,
  wrongAnswersCount,
  followupEventsCount,
  isWeakPersona,
  isFullNightlyRun,
}) {
  if (analysisLevel === "unknown" || followupEventsCount === 0) {
    if (wrongAnswersCount === 0) return "pass";
    return wrongAnswersCount != null && wrongAnswersCount < 3 ? "thin_data" : "unknown";
  }
  if (followupEventsCount > 0 && followupEventsCount < 3) return "thin_data";
  if (followupCoverageRate === 0 && wrongAnswersCount >= 3) return "miss";
  if (analysisLevel === "skill" && followupCoverageRate >= 0.8 && isFullNightlyRun) {
    return "pass";
  }
  if (followupCoverageRate >= 0.8 && (analysisLevel === "topic" || analysisLevel === "subject")) {
    return "partial";
  }
  if (followupCoverageRate > 0 && followupCoverageRate < 0.8) return "partial";
  if (followupCoverageRate >= 0.8 && !isFullNightlyRun) return "partial";
  if (isWeakPersona && followupCoverageRate === 0) return "miss";
  return "partial";
}

export function buildSimilarQuestionAudit({
  date,
  sourceDir,
  runSummary,
  stateSnapshot = null,
  coverageSummary = null,
  diagnosticGroundTruth = null,
  driverLogText = null,
}) {
  if (!runSummary) {
    return {
      date,
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      sourceDir,
      runKind: "unknown",
      isFullNightlyRun: false,
      filterReason: null,
      overallStatus: "not_run",
      blockers: [],
      warnings: [
        {
          severity: "P1",
          detail: `לא נמצא run-summary.json — ביקורת similar/adaptive follow-up לא בוצעה.`,
          source: sourceDir,
          action: "העתק artifact של nightly.",
        },
      ],
      students: [],
      events: [],
      summary: "אין run-summary — similar-question audit לא חושב.",
    };
  }

  const { runKind, isFullNightlyRun, filterReason } = classifyRunKind(runSummary);
  const suiteStudents = Array.isArray(runSummary.suite?.students)
    ? runSummary.suite.students
    : [];
  const planStudents = runSummary.plan?.students || {};

  const blockers = [];
  const warnings = [];
  const students = [];
  const allEvents = [];

  warnings.push({
    severity: "P1",
    detail:
      "Similar / Adaptive Follow-up MVP — לא נבדק מנוע adaptive, skill-level units, או cross-session follow-up מלא.",
    source: sourceDir,
    action: "שכבה מלאה תדרוש question-level JSON artifacts + nightly מלאה.",
  });

  if (!isFullNightlyRun) {
    warnings.push({
      severity: "P1",
      detail:
        `מקור מסונן (runKind=${runKind}) — נבדקו ${suiteStudents.length} תלמיד(ים) בלבד; אין הוכחת follow-up לכל 12 personas.`,
      source: sourceDir,
      action: "הרץ nightly מלאה לפני readiness adaptive.",
    });
  }

  if (suiteStudents.length === 1) {
    warnings.push({
      severity: "P1",
      detail: "רק תלמיד אחד ב-suite — אין הוכחת follow-up adaptive לכל הטבלה.",
      source: sourceDir,
      action: "הרץ nightly מלאה.",
    });
  }

  for (const student of suiteStudents) {
    const label = student.label;
    if (!label) continue;

    const persona = getPersona(label);
    const planEntry = planStudents[label] || {};
    const sessions = Array.isArray(student.sessions) ? student.sessions : [];
    const studied =
      planEntry.studied === true ||
      sessions.length > 0 ||
      sumAnswered(sessions) > 0;
    const answeredQuestions = sumAnswered(sessions);
    const subjectsSeen = subjectsFromSessions(sessions);

    const studentBlockers = [];
    const studentWarnings = [];

    let flatQuestions = [];
    let sequenceSource = "none";

    for (const sess of sessions) {
      const fromSummary = extractQuestionsFromRunSummarySession(sess);
      if (fromSummary?.length) {
        sequenceSource = "run-summary";
        for (const q of fromSummary) {
          flatQuestions.push({
            ...q,
            sessionIndex: sess.index ?? 0,
            studentLabel: label,
          });
        }
      }
    }

    if (flatQuestions.length === 0 && driverLogText) {
      const parsed = parseQuestionSequenceFromDriverLog(driverLogText, label);
      if (parsed.source === "driver-log") {
        sequenceSource = "driver-log";
        studentWarnings.push({
          severity: "P1",
          detail: `${label}: question sequence parsed from nightly driver log (not structured JSON in run-summary).`,
          source: `${sourceDir}/logs`,
          action: "הוסף answeredQuestions[] ל-run-summary לניתוח skill-level עתידי.",
        });
        for (const sess of parsed.sessions) {
          for (const q of sess.questions) {
            flatQuestions.push({
              ...q,
              sessionIndex: sess.sessionIndex,
              studentLabel: label,
            });
          }
        }
      }
    }

    flatQuestions.sort((a, b) => {
      if (a.sessionIndex !== b.sessionIndex) return a.sessionIndex - b.sessionIndex;
      return a.questionIndex - b.questionIndex;
    });

    const analysisLevel = resolveAnalysisLevel(flatQuestions);
    let wrongAnswersCount = flatQuestions.filter((q) => q.intendedCorrect === false).length;
    if (wrongAnswersCount === 0) {
      for (const sess of sessions) {
        const inferred = inferWrongCountFromSession(sess);
        if (inferred != null) wrongAnswersCount += inferred;
      }
    }

    if (flatQuestions.length === 0) {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: no per-question sequence in artifacts — follow-up analysis unknown.`,
        source: sourceDir,
        action: "ספק answeredQuestions[] ב-run-summary או driver log.",
      });
    } else if (analysisLevel === "subject") {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: only subject-level metadata — cannot prove topic/skill adaptive follow-up.`,
        source: sourceDir,
        action: "הוסף topic/skill per question ל-artifacts.",
      });
    } else if (analysisLevel === "topic") {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: topic-level only — skill-level adaptive proof not available.`,
        source: sourceDir,
        action: "הוסף skill/unit metadata per question.",
      });
    }

    if (wrongAnswersCount === 0 && studied) {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: no wrong-answer events found in available artifacts.`,
        source: sourceDir,
        action: "וודא persona עם שגיאות מכוונות או artifacts מלאים.",
      });
    }

    const events = buildWrongAnswerEvents(
      flatQuestions.map((q) => ({ ...q, studentLabel: label })),
      analysisLevel
    );
    allEvents.push(...events);

    const followupEventsCount = events.length;
    const coveredCount = events.filter((e) => e.covered).length;
    const followupCoverageRate =
      followupEventsCount > 0 ? coveredCount / followupEventsCount : null;

    const isWeakPersona =
      (persona?.weaknesses && Object.keys(persona.weaknesses).length > 0) ||
      String(persona?.kind || "").startsWith("weak-");

    if (
      isWeakPersona &&
      wrongAnswersCount >= 3 &&
      followupEventsCount > 0 &&
      followupCoverageRate === 0 &&
      analysisLevel !== "unknown"
    ) {
      studentBlockers.push({
        severity: "P0",
        detail:
          `${label}: weak persona with ${wrongAnswersCount} wrong answers but followupCoverageRate=0 ` +
          `(analysisLevel=${analysisLevel}).`,
        source: sourceDir,
        action: "בדוק adaptive follow-up — שאלות לא קשורות אחרי טעות.",
      });
    }

    if (
      analysisLevel !== "unknown" &&
      events.some((e) => e.followupMatch === "none" && e.followupWindowQuestions.length > 0)
    ) {
      const unrelated = events.filter(
        (e) => e.followupMatch === "none" && e.followupWindowQuestions.length > 0
      );
      if (unrelated.length >= 3 && followupCoverageRate != null && followupCoverageRate < 0.2) {
        studentBlockers.push({
          severity: "P0",
          detail: `${label}: wrong answers consistently followed by unrelated follow-up (${unrelated.length} events).`,
          source: sourceDir,
          action: "בדוק מנוע בחירת שאלות — follow-up לא קשור.",
        });
      }
    }

    const matchStatus = computeStudentMatchStatus({
      analysisLevel,
      followupCoverageRate: followupCoverageRate ?? 0,
      wrongAnswersCount,
      followupEventsCount,
      isWeakPersona,
      isFullNightlyRun,
    });

    if (persona?.weaknesses && Object.keys(persona.weaknesses).length > 0) {
      const weakSubjects = Object.keys(persona.weaknesses);
      const hasWeakSubjectSession = subjectsSeen.some((s) => weakSubjects.includes(s));
      if (!hasWeakSubjectSession && studied) {
        studentWarnings.push({
          severity: "P1",
          detail: `${label}: expected weak subject(s) ${weakSubjects.join(",")} not in sessions seen.`,
          source: sourceDir,
          action: "הרץ session במקצוע החולשה.",
        });
      }
    }

    for (const b of studentBlockers) blockers.push(b);
    for (const w of studentWarnings) warnings.push(w);

    students.push({
      label,
      grade: student.grade ?? planEntry.grade ?? null,
      runStatus: student.status || "unknown",
      studied,
      subjectsSeen,
      answeredQuestions,
      wrongAnswersCount,
      followupEventsCount,
      followupCoverageRate,
      analysisLevel,
      questionSequenceSource: sequenceSource,
      matchStatus,
      blockers: studentBlockers,
      warnings: studentWarnings,
      details:
        followupEventsCount === 0
          ? "No per-question wrong-answer events parsed — cannot claim adaptive follow-up pass/fail."
          : `Follow-up window=${FOLLOWUP_WINDOW} same-session; ` +
            `coverage=${followupCoverageRate != null ? Math.round(followupCoverageRate * 100) : "?"}% ` +
            `at ${analysisLevel}-level (${coveredCount}/${followupEventsCount} events covered).`,
    });
  }

  let overallStatus = "pass";
  if (students.length === 0) {
    overallStatus = "not_run";
    warnings.push({
      severity: "P1",
      detail: "אין תלמידים ב-suite.students.",
      source: sourceDir,
      action: "הרץ nightly.",
    });
  } else if (blockers.length > 0) {
    overallStatus = "fail";
  } else if (
    warnings.length > 0 ||
    !isFullNightlyRun ||
    students.some((s) => ["unknown", "thin_data", "partial"].includes(s.matchStatus))
  ) {
    overallStatus = "warn";
  }

  const checked = students.map((s) => s.label).join(", ");
  const totalWrong = students.reduce((n, s) => n + num(s.wrongAnswersCount), 0);
  const summary = isFullNightlyRun
    ? `Similar follow-up MVP: ${students.length} students (${checked}), ${totalWrong} wrong-answer events, overallStatus=${overallStatus}.`
    : `ריצה מסוננת — נבדקו ${students.length} students (${checked}), ${totalWrong} wrong events. ` +
      `אין הוכחת adaptive readiness מלא. overallStatus=${overallStatus}.`;

  return {
    date,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceDir,
    runKind,
    isFullNightlyRun,
    filterReason,
    overallStatus,
    blockers,
    warnings,
    students,
    events: allEvents,
    summary,
    meta: {
      followupWindow: FOLLOWUP_WINDOW,
      crossSessionSupported: false,
      stateSnapshotUsed: Boolean(stateSnapshot),
      coverageSummaryUsed: Boolean(coverageSummary),
      diagnosticGroundTruthUsed: Boolean(diagnosticGroundTruth),
    },
  };
}

export function buildSimilarQuestionMarkdown(report) {
  const lines = [];
  lines.push(`# Similar / Adaptive Follow-up Audit — ${report.date}`);
  lines.push("");
  lines.push(`> Schema: \`${report.schemaVersion}\` · נוצר ב-${report.generatedAt}`);
  lines.push(`> מקור: \`${report.sourceDir}\``);
  lines.push("");
  lines.push(`## סטטוס כולל: \`${report.overallStatus}\``);
  lines.push("");
  lines.push(`**סיכום:** ${report.summary}`);
  lines.push("");
  lines.push(
    `**סוג ריצה:** \`${report.runKind}\` · \`isFullNightlyRun = ${report.isFullNightlyRun}\``
  );
  if (report.filterReason) lines.push(`**סיבת סינון:** ${report.filterReason}`);
  lines.push("");
  lines.push("> MVP: same-session window only; לא skill-engine proof; לא cross-session.");
  lines.push("");

  lines.push(`## חוסמים (P0) — ${report.blockers.length}`);
  if (report.blockers.length === 0) lines.push("אין.");
  else for (const b of report.blockers) lines.push(`- ${b.detail}`);
  lines.push("");

  lines.push(`## אזהרות (P1) — ${report.warnings.length}`);
  if (report.warnings.length === 0) lines.push("אין.");
  else for (const w of report.warnings) lines.push(`- ${w.detail}`);
  lines.push("");

  lines.push(`## תלמידים (${report.students.length})`);
  lines.push("");
  lines.push(
    "| label | wrong | follow-up events | coverage | analysis | matchStatus |"
  );
  lines.push("|-------|-------|------------------|----------|----------|-------------|");
  for (const s of report.students) {
    const cov =
      s.followupCoverageRate != null
        ? `${Math.round(s.followupCoverageRate * 100)}%`
        : "—";
    lines.push(
      `| ${s.label} | ${s.wrongAnswersCount} | ${s.followupEventsCount} | ${cov} | ${s.analysisLevel} | ${s.matchStatus} |`
    );
  }
  lines.push("");

  const sampleEvents = (report.events || []).slice(0, 8);
  lines.push(`## דוגמאות אירועים (${sampleEvents.length}/${(report.events || []).length})`);
  lines.push("");
  for (const e of sampleEvents) {
    lines.push(
      `- **${e.studentLabel}** sess${e.sessionIndex} q${e.questionIndex} ` +
        `(${e.subject}/${e.topic || "—"}): follow-up=${e.followupMatch}, covered=${e.covered}`
    );
  }
  if (sampleEvents.length === 0) lines.push("אין אירועי wrong-answer.");
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("> Read-only aggregation. Full adaptive proof requires full nightly + skill metadata.");
  lines.push("");

  return lines.join("\n");
}
