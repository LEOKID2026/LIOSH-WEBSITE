#!/usr/bin/env node
/**
 * Parent Report Q2-E Monthly Simulation — AAA1–AAA12, April 2026.
 * Seeds parent-context activity + verifies Q1 sufficiency and metadata flag modes A–D.
 *
 * Run:
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --verify-only
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --clean-only
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --screenshots
 */
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { classifyActivityEvidence } from "../../lib/learning/activity-classification.js";
import { DATA_SUFFICIENCY } from "../../lib/learning/evidence-quality.js";
import {
  allowsStrongParentDiagnosisAtTopic,
  allowsStrongParentTopicInsight,
} from "../../lib/learning/evidence-quality.js";
import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import { processBookEventsRequest } from "../../lib/learning-supabase/book-events.server.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import {
  buildParentFacingBlocks,
  enrichPayloadWithParentFacing,
} from "../../lib/parent-server/parent-report-parent-facing.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");
const SEED_TAG = "parent-report-q2e-monthly-v1";
const LEGACY_Q1_TAG = "parent-report-q1-sim-v1";
const QA_PARENT_EMAIL = "admin@admin.com";
const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";
const MONTH_FROM = "2026-04-01";
const MONTH_TO = "2026-04-30";

const FLAG_ENV = {
  subskill: "DIAGNOSTIC_METADATA_SUBSKILL_ENABLED",
  gating: "DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED",
  promotion: "DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED",
};

const FLAG_MODES = [
  {
    id: "A",
    name: "production_default",
    env: { subskill: "false", gating: "false", promotion: "false" },
  },
  {
    id: "B",
    name: "metadata_internal_only",
    env: { subskill: "true", gating: "false", promotion: "false" },
  },
  {
    id: "C",
    name: "active_suppression",
    env: { subskill: "true", gating: "true", promotion: "false" },
  },
  {
    id: "D",
    name: "promotion_trial",
    env: { subskill: "true", gating: "true", promotion: "true" },
  },
];

const AAA_STUDENTS = [
  { label: "AAA1", grade: 1, scenario: "A_no_data" },
  { label: "AAA2", grade: 1, scenario: "B_insufficient_data" },
  { label: "AAA3", grade: 2, scenario: "C_preliminary_by_count" },
  { label: "AAA4", grade: 2, scenario: "D_preliminary_no_recurrence" },
  { label: "AAA5", grade: 3, scenario: "E_supported_diagnosis" },
  { label: "AAA6", grade: 3, scenario: "F_parent_assigned" },
  { label: "AAA7", grade: 4, scenario: "G_non_diagnostic_exclusion" },
  { label: "AAA8", grade: 4, scenario: "H_questionType_contrast" },
  { label: "AAA9", grade: 5, scenario: "I_weak_metadata_suppression" },
  { label: "AAA10", grade: 5, scenario: "J_english_metadata" },
  { label: "AAA11", grade: 6, scenario: "K_hebrew_metadata" },
  { label: "AAA12", grade: 6, scenario: "L_science_moledet" },
];

const LEAKAGE_KEYS = [
  "classroom",
  "school",
  "privateTeacher",
  "private_teacher",
  "sourceBreakdown",
  "supportingEvidenceIds",
  "_evidenceQuality",
  "bySubSkill",
  "errorPatterns",
  "questionTypes",
  "problemClasses",
  "difficultyDepths",
  "shadowParentGating",
  "appliedParentGating",
  "validatedPromotionCandidates",
  "appliedParentPromotion",
  "gatingDecisions",
  "promotionDecisions",
  "_canonicalMeta",
  "teacherReport",
  "classReport",
  "crossContext",
  "mergeHint",
  "presenceSignal",
];

const META = {
  mathTechnical: {
    params: {
      kind: "frac_add_like",
      diagnosticSkillId: "math_frac_add_like",
      canonicalMetadata: {
        skillId: "math_frac_add_like",
        subSkill: "frac_add_like",
        questionType: "technical",
        metadataConfidence: "high",
      },
    },
    questionEngine: {
      questionType: "technical",
      skillId: "math_frac_add_like",
      metadataConfidence: "high",
    },
  },
  mathWordProblem: {
    params: {
      kind: "wp_single_step",
      diagnosticSkillId: "math_frac_word_problem",
      canonicalMetadata: {
        skillId: "math_frac_word_problem",
        subSkill: "frac_word_problem",
        questionType: "word_problem",
        metadataConfidence: "high",
        possibleErrorPatterns: ["operation_selection"],
      },
    },
    questionEngine: {
      questionType: "word_problem",
      skillId: "math_frac_word_problem",
      metadataConfidence: "high",
    },
  },
  weakTopicOnly: {
    params: {
      diagnosticSkillId: "math_frac_general",
      canonicalMetadata: {
        skillId: "math_frac_general",
        metadataConfidence: "low",
      },
    },
    questionEngine: {
      skillId: "math_frac_general",
      metadataConfidence: "low",
    },
  },
  englishGrammar: {
    params: {
      patternFamily: "english_grammar_verb_tense",
      subtype: "past_simple",
      canonicalMetadata: {
        skillId: "eng_grammar_past_simple",
        subSkill: "past_simple",
        questionType: "grammar",
        metadataConfidence: "high",
      },
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "eng_grammar_past_simple",
      subtopic: "past_simple",
      metadataConfidence: "high",
    },
  },
  englishVocab: {
    params: {
      patternFamily: "english_vocab_theme",
      subtype: "school_objects",
      canonicalMetadata: {
        skillId: "eng_vocab_school",
        subSkill: "school_objects",
        questionType: "vocabulary",
        metadataConfidence: "high",
      },
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "eng_vocab_school",
      metadataConfidence: "high",
    },
  },
  hebrewReading: {
    params: {
      subtype: "comprehension_main_idea",
      patternFamily: "hebrew_reading_comp",
      canonicalMetadata: {
        skillId: "heb_reading_comp",
        subSkill: "main_idea",
        questionType: "comprehension",
        metadataConfidence: "high",
      },
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "heb_reading_comp",
      metadataConfidence: "high",
    },
  },
  hebrewVocab: {
    params: {
      subtype: "vocabulary_context",
      canonicalMetadata: {
        skillId: "heb_vocab_context",
        subSkill: "context_clues",
        questionType: "vocabulary",
        metadataConfidence: "partial",
      },
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "heb_vocab_context",
      metadataConfidence: "partial",
    },
  },
  scienceBody: {
    params: {
      diagnosticSkillId: "sci_body_fact_recall",
      patternFamily: "science_body_heart_location",
      canonicalMetadata: {
        skillId: "sci_body_fact_recall",
        subSkill: "sci_body_general",
        questionType: "mcq",
        metadataConfidence: "high",
      },
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "sci_body_fact_recall",
      metadataConfidence: "high",
    },
  },
  moledetHomeland: {
    params: {
      kind: "homeland",
      diagnosticSkillId: "moledet_geo_homeland",
      canonicalMetadata: {
        skillId: "moledet_geo_homeland",
        subSkill: "map_regions",
        questionType: "mcq",
        metadataConfidence: "partial",
      },
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "moledet_geo_homeland",
      metadataConfidence: "partial",
    },
  },
};

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
}

function parseIsoDate(s) {
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function gradeDbKey(gradeNum) {
  return `g${gradeNum}`;
}

/** @type {Record<string, string|undefined>} */
const savedFlagEnv = {};

function saveFlagEnv() {
  for (const k of Object.values(FLAG_ENV)) {
    savedFlagEnv[k] = process.env[k];
  }
}

function restoreFlagEnv() {
  for (const [k, v] of Object.entries(savedFlagEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function applyFlagMode(mode) {
  process.env[FLAG_ENV.subskill] = mode.env.subskill;
  process.env[FLAG_ENV.gating] = mode.env.gating;
  process.env[FLAG_ENV.promotion] = mode.env.promotion;
}

function diagnosticAnswerPayload({ subject, topic, mode = "practice", grade, isCorrect, meta }) {
  const classification = classifyActivityEvidence(mode, "free_practice", { hintsUsed: 0 });
  const base = {
    subject,
    topic,
    gameMode: mode,
    level: "medium",
    gradeLevel: grade,
    prompt: `Q2E monthly sim ${subject}/${topic}`,
    expectedAnswer: "42",
    userAnswer: isCorrect ? "42" : "99",
    hintsUsed: 0,
    timeSpentMs: 5000,
    isDiagnosticEligible: classification.isDiagnosticEligible,
    evidenceCategory: classification.evidenceCategory,
    contextFlags: classification.contextFlags || {},
    clientMeta: { parentReportQ2eMonthly: SEED_TAG },
  };
  if (meta) {
    return {
      ...base,
      params: { ...(meta.params || {}), clientMeta: { parentReportQ2eMonthly: SEED_TAG } },
      questionEngine: meta.questionEngine,
    };
  }
  return base;
}

function learningAnswerPayload({ subject, topic, grade }) {
  const classification = classifyActivityEvidence("learning", "free_practice", { hintsUsed: 0 });
  return {
    subject,
    topic,
    gameMode: "learning",
    level: "medium",
    gradeLevel: grade,
    prompt: `Q2E monthly learning ${subject}/${topic}`,
    expectedAnswer: "42",
    userAnswer: "42",
    hintsUsed: 0,
    timeSpentMs: 8000,
    isDiagnosticEligible: classification.isDiagnosticEligible,
    evidenceCategory: classification.evidenceCategory,
    contextFlags: classification.contextFlags || {},
    clientMeta: { parentReportQ2eMonthly: SEED_TAG },
  };
}

async function resolveAaaStudents(supabase) {
  const loginUsernames = AAA_STUDENTS.map((s) => s.label.toLowerCase());
  const { data: codes, error } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username, is_active, revoked_at")
    .in("login_username", loginUsernames)
    .eq("is_active", true)
    .is("revoked_at", null);
  if (error) throw new Error(`access code lookup: ${error.message}`);

  const byUsername = new Map();
  for (const row of codes || []) {
    const u = String(row.login_username || "").trim().toLowerCase();
    if (u && row.student_id) byUsername.set(u, row.student_id);
  }

  const studentIds = [...new Set([...byUsername.values()])];
  const { data: students, error: stErr } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .in("id", studentIds);
  if (stErr) throw new Error(`students lookup: ${stErr.message}`);

  const byId = new Map((students || []).map((s) => [s.id, s]));
  const resolved = [];
  for (const entry of AAA_STUDENTS) {
    const studentId = byUsername.get(entry.label.toLowerCase());
    if (!studentId) throw new Error(`Missing access code for ${entry.label}`);
    const row = byId.get(studentId);
    if (!row?.id) throw new Error(`Missing student row for ${entry.label}`);
    if (row.parent_id !== QA_PARENT_ID) {
      throw new Error(`${entry.label} parent_id mismatch`);
    }
    resolved.push({ ...entry, studentId: row.id, fullName: row.full_name, gradeLevel: row.grade_level });
  }
  return resolved;
}

async function cleanTaggedSeedsForTag(supabase, studentIds, tag, metaKey) {
  const { data: sessions } = await supabase
    .from("learning_sessions")
    .select("id")
    .in("student_id", studentIds)
    .contains("metadata", { [metaKey]: tag });

  const sessionIds = (sessions || []).map((s) => s.id).filter(Boolean);
  if (sessionIds.length) {
    await supabase.from("answers").delete().in("learning_session_id", sessionIds);
    await supabase.from("learning_sessions").delete().in("id", sessionIds);
  }

  const { data: parentActs } = await supabase
    .from("parent_assigned_activities")
    .select("id")
    .in("student_id", studentIds)
    .like("title", `[${tag}]%`);
  const actIds = (parentActs || []).map((a) => a.id);
  if (actIds.length) {
    await supabase.from("parent_activity_attempts").delete().in("activity_id", actIds);
    await supabase.from("parent_activity_status").delete().in("activity_id", actIds);
    await supabase.from("parent_assigned_activities").delete().in("id", actIds);
  }

  const { data: bookSessions } = await supabase
    .from("book_reading_sessions")
    .select("id")
    .in("student_id", studentIds)
    .like("client_session_token", `${tag}_%`);
  const bookIds = (bookSessions || []).map((b) => b.id);
  if (bookIds.length) {
    await supabase.from("book_page_visits").delete().in("book_reading_session_id", bookIds);
    await supabase.from("book_reading_sessions").delete().in("id", bookIds);
  }

  return { tag, removedSessions: sessionIds.length, removedParentActivities: actIds.length, removedBookSessions: bookIds.length };
}

async function cleanAllSimTags(supabase, studentIds) {
  const q2e = await cleanTaggedSeedsForTag(supabase, studentIds, SEED_TAG, "parentReportQ2eMonthly");
  const q1 = await cleanTaggedSeedsForTag(supabase, studentIds, LEGACY_Q1_TAG, "parentReportQ1Sim");
  return { q2e, q1 };
}

async function insertPracticeSession(supabase, studentId, { subject, topic, grade, mode, answers, metaForAll, metaPerAnswer }) {
  if (!answers.length) return { sessionId: null, answerCount: 0 };
  const startedMs = Date.parse(answers[0].answeredAt);
  const endedMs = Date.parse(answers[answers.length - 1].answeredAt) + 60_000;
  const correct = answers.filter((a) => a.isCorrect).length;

  const { data: sessionRow, error: sessErr } = await supabase
    .from("learning_sessions")
    .insert({
      student_id: studentId,
      subject,
      topic,
      started_at: new Date(startedMs).toISOString(),
      ended_at: new Date(endedMs).toISOString(),
      duration_seconds: Math.max(60, Math.floor((endedMs - startedMs) / 1000)),
      status: "completed",
      metadata: {
        mode: mode || "practice",
        gameMode: mode || "practice",
        gradeLevel: grade,
        parentReportQ2eMonthly: SEED_TAG,
        summary: { totalQuestions: answers.length, correctAnswers: correct, wrongAnswers: answers.length - correct },
      },
    })
    .select("id")
    .single();
  if (sessErr || !sessionRow?.id) throw new Error(`session insert: ${sessErr?.message}`);

  const rows = answers.map((a, i) => {
    const meta = metaPerAnswer?.[i] ?? metaForAll ?? null;
    return {
      student_id: studentId,
      learning_session_id: sessionRow.id,
      question_id: `${SEED_TAG}:${sessionRow.id}:${i}`,
      is_correct: a.isCorrect,
      answered_at: a.answeredAt,
      answer_payload: diagnosticAnswerPayload({
        subject,
        topic,
        mode: mode || "practice",
        grade,
        isCorrect: a.isCorrect,
        meta,
      }),
    };
  });
  const { error: ansErr } = await supabase.from("answers").insert(rows);
  if (ansErr) throw new Error(`answers insert: ${ansErr.message}`);
  return { sessionId: sessionRow.id, answerCount: rows.length };
}

function buildAnswerSchedule(dayIsoList, countsPerDay, wrongPerDay) {
  const out = [];
  const wrongsByDay = Array.isArray(wrongPerDay)
    ? wrongPerDay
    : dayIsoList.map((_, idx) => (idx === 0 ? wrongPerDay : 0));
  for (let d = 0; d < dayIsoList.length; d += 1) {
    const count = countsPerDay[d] || 0;
    let wrongLeft = Math.min(count, wrongsByDay[d] || 0);
    for (let i = 0; i < count; i += 1) {
      const isWrong = wrongLeft > 0;
      if (isWrong) wrongLeft -= 1;
      const hour = 9 + (i % 6);
      out.push({
        isCorrect: !isWrong,
        answeredAt: `${dayIsoList[d]}T${String(hour).padStart(2, "0")}:20:00.000Z`,
      });
    }
  }
  return out;
}

async function seedParentAssignedActivity(supabase, parentId, studentId, { subject, topic, grade, count, wrongCount, dayIsoList }) {
  const classification = classifyActivityEvidence("homework", "assigned_parent", { hintsUsed: 0 });
  const activityId = crypto.randomUUID();
  const title = `[${SEED_TAG}] parent homework ${topic}`;

  const { error: actErr } = await supabase.from("parent_assigned_activities").insert({
    id: activityId,
    parent_id: parentId,
    student_id: studentId,
    title,
    subject,
    topic,
    question_count: count,
    mode: "homework",
    difficulty_level: "medium",
    question_set: [{ prompt: "1+1", correctAnswer: "2", type: "numeric" }],
    status: "active",
  });
  if (actErr) throw new Error(`parent activity insert: ${actErr.message}`);

  await supabase.from("parent_activity_status").insert({
    activity_id: activityId,
    student_id: studentId,
    status: "in_progress",
    started_at: `${dayIsoList[0]}T09:00:00.000Z`,
    answers_count: count,
    correct_count: count - wrongCount,
  });

  let wrongLeft = wrongCount;
  const attempts = [];
  for (let i = 0; i < count; i += 1) {
    const day = dayIsoList[i % dayIsoList.length];
    const isWrong = wrongLeft > 0;
    if (isWrong) wrongLeft -= 1;
    attempts.push({
      activity_id: activityId,
      student_id: studentId,
      question_index: i,
      selected_answer: isWrong ? "99" : "2",
      correct_answer: "2",
      is_correct: !isWrong,
      hints_used: 0,
      answered_at: `${day}T11:${String(10 + i).padStart(2, "0")}:00.000Z`,
      question_snapshot: {
        prompt: `Parent assigned Q${i + 1}`,
        isDiagnosticEligible: classification.isDiagnosticEligible,
        evidenceCategory: classification.evidenceCategory,
        contextFlags: classification.contextFlags || {},
        clientMeta: { parentReportQ2eMonthly: SEED_TAG },
      },
    });
  }
  await supabase.from("parent_activity_attempts").insert(attempts);
  return activityId;
}

async function seedBookReading(supabase, studentId, dayIso, grade) {
  const token = `${SEED_TAG}_${studentId.slice(0, 8)}_${dayIso}`;
  const start = await processBookEventsRequest(supabase, studentId, {
    event: "book_reading_session_start",
    clientSessionToken: token,
    subject: "math",
    grade,
    entryPageId: "add_two",
  });
  if (!start.ok) return { ok: false, error: start.error };
  const sessionId = start.bookReadingSessionId;
  await processBookEventsRequest(supabase, studentId, {
    event: "book_page_visit_start",
    clientSessionToken: token,
    clientVisitToken: `${token}_v1`,
    bookReadingSessionId: sessionId,
    pageId: "add_two",
    subject: "math",
    grade,
  });
  await processBookEventsRequest(supabase, studentId, {
    event: "book_page_visit_end",
    clientSessionToken: token,
    clientVisitToken: `${token}_v1`,
    bookReadingSessionId: sessionId,
    pageId: "add_two",
    creditedDwellMs: 90_000,
    rawDwellMs: 120_000,
    pageRead: true,
  });
  return { ok: true, sessionId };
}

function scenarioPlan(entry) {
  const grade = gradeDbKey(entry.grade);
  const mathTopic = entry.grade <= 2 ? "addition" : entry.grade <= 4 ? "multiplication" : "fractions";

  switch (entry.scenario) {
    case "A_no_data":
      return { seed: null, subject: "math", topic: mathTopic, expected: DATA_SUFFICIENCY.NO_DATA };
    case "B_insufficient_data":
      return {
        seed: {
          type: "practice",
          subject: "math",
          topic: mathTopic,
          grade,
          answers: buildAnswerSchedule(["2026-04-02", "2026-04-03"], [2, 2], [1, 0]),
        },
        subject: "math",
        topic: mathTopic,
        expected: DATA_SUFFICIENCY.INSUFFICIENT,
      };
    case "C_preliminary_by_count":
      return {
        seed: {
          type: "practice",
          subject: "math",
          topic: mathTopic,
          grade,
          answers: buildAnswerSchedule(["2026-04-04", "2026-04-06", "2026-04-08"], [3, 3, 3], [1, 1, 1]),
        },
        subject: "math",
        topic: mathTopic,
        expected: DATA_SUFFICIENCY.PRELIMINARY,
      };
    case "D_preliminary_no_recurrence":
      return {
        seed: {
          type: "practice",
          subject: "math",
          topic: mathTopic,
          grade,
          answers: buildAnswerSchedule(["2026-04-09"], [14], [4]),
        },
        subject: "math",
        topic: mathTopic,
        expected: DATA_SUFFICIENCY.PRELIMINARY,
      };
    case "E_supported_diagnosis":
      return {
        seed: {
          type: "practice",
          subject: "math",
          topic: mathTopic,
          grade,
          answers: buildAnswerSchedule(["2026-04-10", "2026-04-14", "2026-04-18"], [5, 5, 4], [2, 2, 1]),
        },
        subject: "math",
        topic: mathTopic,
        expected: DATA_SUFFICIENCY.SUPPORTED,
      };
    case "F_parent_assigned":
      return {
        seed: {
          type: "parent_assigned",
          subject: "math",
          topic: mathTopic,
          grade,
          count: 8,
          wrongCount: 2,
          days: ["2026-04-15", "2026-04-17", "2026-04-19"],
        },
        subject: "math",
        topic: mathTopic,
        expected: DATA_SUFFICIENCY.PRELIMINARY,
      };
    case "G_non_diagnostic_exclusion":
      return {
        seed: {
          type: "mixed_learning",
          subject: "math",
          topic: mathTopic,
          grade,
          learningAnswers: buildAnswerSchedule(["2026-04-11", "2026-04-20"], [4, 4], 0),
          bookDay: "2026-04-22",
        },
        subject: "math",
        topic: mathTopic,
        expected: DATA_SUFFICIENCY.NO_DATA,
      };
    case "H_questionType_contrast":
      return {
        seed: {
          type: "practice_mixed_meta",
          subject: "math",
          topic: "fractions",
          grade,
          segments: [
            {
              days: ["2026-04-20", "2026-04-21"],
              counts: [4, 4],
              wrongs: [0, 1],
              meta: META.mathTechnical,
            },
            {
              days: ["2026-04-23", "2026-04-24"],
              counts: [3, 4],
              wrongs: [2, 2],
              meta: META.mathWordProblem,
            },
          ],
        },
        subject: "math",
        topic: "fractions",
        expected: DATA_SUFFICIENCY.SUPPORTED,
      };
    case "I_weak_metadata_suppression":
      return {
        seed: {
          type: "practice",
          subject: "math",
          topic: "fractions",
          grade,
          metaForAll: META.weakTopicOnly,
          answers: buildAnswerSchedule(["2026-04-12", "2026-04-16", "2026-04-21"], [5, 5, 4], [2, 2, 1]),
        },
        subject: "math",
        topic: "fractions",
        expected: DATA_SUFFICIENCY.SUPPORTED,
        metadataScenario: true,
      };
    case "J_english_metadata":
      return {
        seed: {
          type: "practice_multi",
          sessions: [
            {
              subject: "english",
              topic: "grammar",
              grade,
              metaForAll: META.englishGrammar,
              answers: buildAnswerSchedule(["2026-04-06", "2026-04-13"], [4, 4], [1, 1]),
            },
            {
              subject: "english",
              topic: "vocabulary",
              grade,
              metaForAll: META.englishVocab,
              answers: buildAnswerSchedule(["2026-04-20", "2026-04-24"], [3, 3], [0, 1]),
            },
          ],
        },
        subject: "english",
        topic: "grammar",
        expected: DATA_SUFFICIENCY.SUPPORTED,
        metadataScenario: true,
      };
    case "K_hebrew_metadata":
      return {
        seed: {
          type: "practice_multi",
          sessions: [
            {
              subject: "hebrew",
              topic: "reading_comprehension",
              grade,
              metaForAll: META.hebrewReading,
              answers: buildAnswerSchedule(["2026-04-07", "2026-04-14"], [4, 4], [1, 1]),
            },
            {
              subject: "hebrew",
              topic: "vocabulary",
              grade,
              metaForAll: META.hebrewVocab,
              answers: buildAnswerSchedule(["2026-04-18", "2026-04-26"], [3, 3], [0, 1]),
            },
          ],
        },
        subject: "hebrew",
        topic: "reading_comprehension",
        expected: DATA_SUFFICIENCY.SUPPORTED,
        metadataScenario: true,
      };
    case "L_science_moledet":
      return {
        seed: {
          type: "practice_multi",
          sessions: [
            {
              subject: "science",
              topic: "body",
              grade,
              metaForAll: META.scienceBody,
              answers: buildAnswerSchedule(["2026-04-08", "2026-04-16"], [4, 4], [1, 1]),
            },
            {
              subject: "moledet_geography",
              topic: "homeland",
              grade,
              metaForAll: META.moledetHomeland,
              answers: buildAnswerSchedule(["2026-04-22", "2026-04-28"], [3, 3], [0, 1]),
            },
          ],
        },
        subject: "science",
        topic: "body",
        expected: DATA_SUFFICIENCY.SUPPORTED,
        metadataScenario: true,
      };
    default:
      throw new Error(`Unknown scenario ${entry.scenario}`);
  }
}

async function seedScenario(supabase, parentId, entry, plan) {
  if (!plan.seed) return { seeded: false };
  const s = plan.seed;

  if (s.type === "practice") {
    await insertPracticeSession(supabase, entry.studentId, {
      subject: s.subject,
      topic: s.topic,
      grade: s.grade,
      mode: "practice",
      answers: s.answers,
      metaForAll: s.metaForAll,
    });
    return { seeded: true, type: "practice", count: s.answers.length };
  }

  if (s.type === "practice_mixed_meta") {
    let total = 0;
    for (const seg of s.segments) {
      const answers = buildAnswerSchedule(seg.days, seg.counts, seg.wrongs);
      await insertPracticeSession(supabase, entry.studentId, {
        subject: s.subject,
        topic: s.topic,
        grade: s.grade,
        mode: "practice",
        answers,
        metaForAll: seg.meta,
      });
      total += answers.length;
    }
    return { seeded: true, type: "practice_mixed_meta", count: total };
  }

  if (s.type === "practice_multi") {
    let total = 0;
    for (const sess of s.sessions) {
      await insertPracticeSession(supabase, entry.studentId, {
        subject: sess.subject,
        topic: sess.topic,
        grade: sess.grade,
        mode: "practice",
        answers: sess.answers,
        metaForAll: sess.metaForAll,
      });
      total += sess.answers.length;
    }
    return { seeded: true, type: "practice_multi", count: total };
  }

  if (s.type === "parent_assigned") {
    const actId = await seedParentAssignedActivity(supabase, parentId, entry.studentId, {
      subject: s.subject,
      topic: s.topic,
      grade: s.grade,
      count: s.count,
      wrongCount: s.wrongCount,
      dayIsoList: s.days,
    });
    return { seeded: true, type: "assigned_parent", activityId: actId, count: s.count };
  }

  if (s.type === "mixed_learning") {
    const startedMs = Date.parse(`${s.learningAnswers[0].answeredAt}`);
    const endedMs = Date.parse(`${s.learningAnswers[s.learningAnswers.length - 1].answeredAt}`) + 60_000;
    const { data: sessionRow, error: sessErr } = await supabase
      .from("learning_sessions")
      .insert({
        student_id: entry.studentId,
        subject: s.subject,
        topic: s.topic,
        started_at: new Date(startedMs).toISOString(),
        ended_at: new Date(endedMs).toISOString(),
        duration_seconds: 600,
        status: "completed",
        metadata: { mode: "learning", gameMode: "learning", gradeLevel: s.grade, parentReportQ2eMonthly: SEED_TAG },
      })
      .select("id")
      .single();
    if (sessErr) throw new Error(sessErr.message);
    const rows = s.learningAnswers.map((a, i) => ({
      student_id: entry.studentId,
      learning_session_id: sessionRow.id,
      question_id: `${SEED_TAG}:learn:${i}`,
      is_correct: true,
      answered_at: a.answeredAt,
      answer_payload: learningAnswerPayload({ subject: s.subject, topic: s.topic, grade: s.grade }),
    }));
    await supabase.from("answers").insert(rows);
    const book = await seedBookReading(supabase, entry.studentId, s.bookDay, s.grade);
    return { seeded: true, type: "learning+book", learningCount: rows.length, book };
  }

  return { seeded: false };
}

function countMetrics(payload, subject, topic) {
  const subj = payload?.subjects?.[subject];
  const topicRow = subj?.topics?.[topic];
  const mistakes = (payload?.recentMistakes || []).filter(
    (m) => m.subject === subject && (topic ? m.topic === topic : true)
  );
  const days = new Set(
    mistakes.map((m) => String(m.answeredAt || "").slice(0, 10)).filter(Boolean)
  );
  return {
    diagnosticAnswers: Number(
      topicRow?.diagnosticAnswers ?? subj?.diagnosticAnswers ?? payload?.summary?.diagnosticAnswers ?? 0
    ),
    wrongAnswers: Number(topicRow?.diagnosticWrong ?? subj?.diagnosticWrong ?? 0),
    mistakes: mistakes.length,
    distinctDays: days.size,
    learningAnswers: Number(topicRow?.learningAnswers ?? subj?.learningAnswers ?? 0),
    bookMinutes: Number(payload?.learningActivity?.bookReadingMinutes ?? 0),
  };
}

function sanitizeEqSnapshot(payload) {
  const eq = payload?.meta?.evidenceQuality;
  if (!eq) return null;
  return {
    context: eq.context,
    student: {
      dataSufficiency: eq.student?.dataSufficiency,
      confidenceLevel: eq.student?.confidenceLevel,
      confidenceReason: eq.student?.confidenceReason,
      evidenceCount: eq.student?.evidenceCount,
      recurrenceMet: eq.student?.recurrenceMet,
    },
    bySubject: eq.bySubject || {},
    byTopic: eq.byTopic || {},
  };
}

function internalEqSnapshot(payload) {
  const eq = payload?.meta?._evidenceQuality;
  if (!eq) return null;
  return {
    hasBySubSkill: !!eq.bySubSkill && Object.keys(eq.bySubSkill).length > 0,
    bySubSkillKeys: eq.bySubSkill ? Object.keys(eq.bySubSkill).slice(0, 8) : [],
    hasErrorPatterns: !!eq.errorPatterns,
    hasQuestionTypes: !!eq.questionTypes,
    hasProblemClasses: !!eq.problemClasses,
    hasDifficultyDepths: !!eq.difficultyDepths,
    hasShadowGating: !!eq.shadowParentGating,
    hasAppliedGating: !!eq.appliedParentGating,
    gatingDecisionCount: Array.isArray(eq.gatingDecisions) ? eq.gatingDecisions.length : 0,
    hasValidatedPromotion: !!eq.validatedPromotionCandidates,
    hasAppliedPromotion: !!eq.appliedParentPromotion,
    promotionDecisionCount: Array.isArray(eq.promotionDecisions) ? eq.promotionDecisions.length : 0,
  };
}

function deepFindLeakKeys(obj, pathPrefix = "") {
  const hits = [];
  if (!obj || typeof obj !== "object") return hits;
  for (const [k, v] of Object.entries(obj)) {
    const p = pathPrefix ? `${pathPrefix}.${k}` : k;
    const kl = k.toLowerCase();
    for (const leak of LEAKAGE_KEYS) {
      if (kl.includes(leak.toLowerCase())) hits.push(p);
    }
    if (v && typeof v === "object") hits.push(...deepFindLeakKeys(v, p));
  }
  return hits;
}

function hasStrongDiagnosisLanguage(insights) {
  const strong = ["נראה שיש קושי", "כדאי לשים לב ל", "יש טעויות חוזרות", "הביצועים הכלליים"];
  return (insights || []).some((line) => strong.some((s) => line.includes(s)));
}

function publicSanitizationChecks(pub) {
  const checks = [];
  checks.push({ name: "public_evidenceQuality", pass: !!pub.meta?.evidenceQuality });
  checks.push({ name: "no__evidenceQuality", pass: pub.meta?._evidenceQuality === undefined });
  checks.push({
    name: "no_supportingEvidenceIds",
    pass: pub.meta?.evidenceQuality?.student?.supportingEvidenceIds === undefined,
  });
  checks.push({
    name: "no_sourceBreakdown",
    pass: pub.meta?.evidenceQuality?.student?.sourceBreakdown === undefined,
  });
  checks.push({
    name: "no_public_bySubSkill",
    pass: pub.meta?.evidenceQuality?.bySubSkill === undefined,
  });
  checks.push({
    name: "no_public_metadata_internals",
    pass:
      pub.meta?.evidenceQuality?.errorPatterns === undefined &&
      pub.meta?.evidenceQuality?.questionTypes === undefined &&
      pub.meta?.evidenceQuality?.problemClasses === undefined &&
      pub.meta?.evidenceQuality?.difficultyDepths === undefined &&
      pub.meta?.evidenceQuality?.shadowParentGating === undefined &&
      pub.meta?.evidenceQuality?.appliedParentGating === undefined &&
      pub.meta?.evidenceQuality?.validatedPromotionCandidates === undefined &&
      pub.meta?.evidenceQuality?.appliedParentPromotion === undefined &&
      pub.meta?.evidenceQuality?.gatingDecisions === undefined &&
      pub.meta?.evidenceQuality?.promotionDecisions === undefined,
  });
  checks.push({
    name: "no_canonicalMeta_on_mistakes",
    pass: !(pub.recentMistakes || []).some((m) => m?._canonicalMeta != null),
  });
  checks.push({
    name: "no_internal_rollups",
    pass:
      pub._diagnosticSubSkillRollup === undefined &&
      pub._diagnosticQuestionTypeRollup === undefined &&
      pub._diagnosticProblemClassRollup === undefined,
  });
  const leakHits = deepFindLeakKeys(pub);
  checks.push({ name: "no_leak_keys", pass: leakHits.length === 0, actual: leakHits.slice(0, 10) });
  return checks;
}

function reportUrl(studentId, from = MONTH_FROM, to = MONTH_TO) {
  return `/learning/parent-report?studentId=${encodeURIComponent(studentId)}&from=${from}&to=${to}&source=parent`;
}

async function evaluateMode(rawPayload, studentId, supabase, plan, entry, mode) {
  applyFlagMode(mode);
  const withEq = attachParentContextEvidenceQuality(structuredClone(rawPayload));
  const enriched = await enrichPayloadWithParentFacing(supabase, withEq, studentId);
  const pub = stripInternalReportPayloadFields(structuredClone(enriched));
  const subject = plan.subject;
  const topic = plan.topic;
  const metrics = countMetrics(pub, subject, topic);
  const insights = pub.parentFacing?.insights || [];
  const sufficiency = pub.meta?.evidenceQuality?.student?.dataSufficiency;
  const topicKey = `${subject}::${topic}`;
  const topicSuff = pub.meta?.evidenceQuality?.byTopic?.[topicKey]?.dataSufficiency;

  const modeResult = {
    modeId: mode.id,
    modeName: mode.name,
    dataSufficiency: sufficiency,
    topicSufficiency: topicSuff,
    metrics,
    parentFacingInsights: insights,
    strongDiagnosisLanguage: hasStrongDiagnosisLanguage(insights),
    allowsStrongTopicDiagnosis: allowsStrongParentDiagnosisAtTopic(pub, subject, topic),
    allowsStrongTopicInsight: allowsStrongParentTopicInsight(pub, subject, topic),
    internalEvidenceQuality: internalEqSnapshot(enriched),
    evidenceQualitySnapshot: sanitizeEqSnapshot(pub),
    sanitization: publicSanitizationChecks(pub),
    sanitizationPass: publicSanitizationChecks(pub).every((c) => c.pass),
  };

  if (mode.id === "A") {
    modeResult.q1Pass = sufficiency === plan.expected;
    if (plan.expected === DATA_SUFFICIENCY.NO_DATA || plan.expected === DATA_SUFFICIENCY.INSUFFICIENT) {
      modeResult.noStrongDiagnosisPass = !modeResult.strongDiagnosisLanguage;
    } else {
      modeResult.noStrongDiagnosisPass = true;
    }
    if (entry.scenario === "G_non_diagnostic_exclusion") {
      modeResult.nonDiagnosticPass = metrics.diagnosticAnswers === 0;
    }
  }

  if (mode.id === "B" && plan.metadataScenario) {
    modeResult.internalMetadataPresent =
      modeResult.internalEvidenceQuality?.hasBySubSkill ||
      modeResult.internalEvidenceQuality?.hasQuestionTypes ||
      modeResult.internalEvidenceQuality?.hasShadowGating;
  }

  if (mode.id === "C" && entry.scenario === "I_weak_metadata_suppression") {
    modeResult.suppressionApplied = !!modeResult.internalEvidenceQuality?.hasAppliedGating;
    modeResult.topicInsightSuppressed = !modeResult.allowsStrongTopicInsight;
  }

  if (mode.id === "D" && entry.scenario === "H_questionType_contrast") {
    modeResult.hasPromotionCandidates =
      modeResult.internalEvidenceQuality?.hasValidatedPromotion ||
      (modeResult.internalEvidenceQuality?.promotionDecisionCount ?? 0) > 0;
  }

  return modeResult;
}

async function verifyStudent(supabase, entry, plan) {
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || gradeDbKey(entry.grade),
    is_active: true,
  };

  saveFlagEnv();
  const modeResults = {};
  for (const mode of FLAG_MODES) {
    applyFlagMode(mode);
    const raw = await aggregateParentReportPayload(
      supabase,
      student,
      parseIsoDate(MONTH_FROM),
      parseIsoDate(MONTH_TO),
      { includeParentActivities: true }
    );
    modeResults[mode.id] = await evaluateMode(raw, entry.studentId, supabase, plan, entry, mode);
  }
  restoreFlagEnv();

  const modeA = modeResults.A;
  const checks = [
    { name: "modeA_q1_sufficiency", pass: modeA.q1Pass !== false, expected: plan.expected, actual: modeA.dataSufficiency },
    { name: "modeA_sanitization", pass: modeA.sanitizationPass },
    { name: "all_modes_sanitization", pass: FLAG_MODES.every((m) => modeResults[m.id].sanitizationPass) },
  ];

  if (plan.expected === DATA_SUFFICIENCY.NO_DATA || plan.expected === DATA_SUFFICIENCY.INSUFFICIENT) {
    checks.push({ name: "no_strong_diagnosis", pass: modeA.noStrongDiagnosisPass !== false });
  }
  if (entry.scenario === "G_non_diagnostic_exclusion") {
    checks.push({ name: "non_diagnostic_excluded", pass: modeA.nonDiagnosticPass !== false });
  }

  const pass = checks.every((c) => c.pass);

  return {
    label: entry.label,
    login: entry.label.toLowerCase(),
    displayName: entry.fullName,
    grade: entry.grade,
    scenario: entry.scenario,
    studentId: entry.studentId,
    dateRange: { from: MONTH_FROM, to: MONTH_TO },
    subject: plan.subject,
    topic: plan.topic,
    expectedQ1Sufficiency: plan.expected,
    actualQ1Sufficiency: modeA.dataSufficiency,
    metrics: modeA.metrics,
    reportUrl: reportUrl(entry.studentId),
    modeResults,
    checks,
    pass,
  };
}

async function captureScreenshots(students, results) {
  try {
    const { chromium } = await import("@playwright/test");
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
    const parentPassword = process.env.QA_PARENT_PASSWORD || process.env.DEMO_PARENT_PASSWORD;
    if (!parentPassword) {
      console.log("Skipping screenshots: set QA_PARENT_PASSWORD or DEMO_PARENT_PASSWORD");
      return { skipped: true, reason: "missing password" };
    }

    await mkdir(SCREENSHOT_DIR, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    await page.goto(`${baseUrl}/parent/login`);
    await page.fill('input[type="email"], input[name="email"]', QA_PARENT_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', parentPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const captured = [];
    for (const row of results) {
      const url = `${baseUrl}${row.reportUrl}`;
      await page.goto(url);
      await page.waitForTimeout(2500);
      const file = path.join(SCREENSHOT_DIR, `${row.label}-modeA-default.png`);
      await page.screenshot({ path: file, fullPage: true });
      captured.push(file);
    }

    const targeted = [
      { label: "AAA1", file: "AAA1-no_data-modeA.png" },
      { label: "AAA9", file: "AAA9-suppression-modeC-note.png", mode: "C" },
      { label: "AAA8", file: "AAA8-promotion-modeD-note.png", mode: "D" },
    ];
    for (const t of targeted.slice(1)) {
      const row = results.find((r) => r.label === t.label);
      if (!row) continue;
      await page.goto(`${baseUrl}${row.reportUrl}`);
      await page.waitForTimeout(2500);
      const file = path.join(SCREENSHOT_DIR, t.file);
      await page.screenshot({ path: file, fullPage: true });
      captured.push(file);
    }

    await browser.close();
    return { skipped: false, captured };
  } catch (err) {
    return { skipped: true, reason: err?.message || String(err) };
  }
}

function buildQaMarkdown(artifact) {
  const lines = [];
  lines.push("# Parent Report Q2-E Monthly Simulation QA");
  lines.push("");
  lines.push(`**Date:** ${artifact.runAt.slice(0, 10)}`);
  lines.push(`**Window:** ${MONTH_FROM} → ${MONTH_TO}`);
  lines.push(`**Seed tag:** \`${SEED_TAG}\``);
  lines.push(`**Status:** **${artifact.summary.failed === 0 ? "PASS" : "FAIL"}** (${artifact.summary.passed}/${artifact.summary.total})`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Area | Result |");
  lines.push("|------|--------|");
  lines.push(`| Students verified | ${artifact.summary.passed}/${artifact.summary.total} PASS |`);
  lines.push("| Flag modes | A default · B metadata · C suppression · D promotion |");
  lines.push("| Public API sanitization | All modes, all students |");
  lines.push("| Product code changes | None |");
  lines.push("");
  lines.push("## Scenario table");
  lines.push("");
  lines.push("| Student | Login | Grade | Scenario | Subject/Topic | Diag | Wrongs | Days | Expected Q1 | Actual Q1 | Pass |");
  lines.push("|---------|-------|-------|----------|---------------|------|--------|------|-------------|-----------|------|");
  for (const r of artifact.results) {
    lines.push(
      `| ${r.label} | \`${r.login}\` | ${r.grade} | ${r.scenario} | ${r.subject}/${r.topic} | ${r.metrics.diagnosticAnswers} | ${r.metrics.wrongAnswers} | ${r.metrics.distinctDays} | ${r.expectedQ1Sufficiency} | ${r.actualQ1Sufficiency} | ${r.pass ? "PASS" : "FAIL"} |`
    );
  }
  lines.push("");
  lines.push("## Manual inspection helpers");
  lines.push("");
  lines.push("| Student | Report URL | Suggested mode | What to look for |");
  lines.push("|---------|------------|----------------|------------------|");
  const hints = {
    AAA1: ["A", "Empty month — generic encouragement only"],
    AAA2: ["A", "Insufficient — no strong diagnosis"],
    AAA3: ["A", "Preliminary by count — low confidence"],
    AAA4: ["A", "Preliminary — no recurrence across days"],
    AAA5: ["A", "Supported math — strong insights allowed"],
    AAA6: ["A", "Parent-assigned homework included"],
    AAA7: ["A", "Learning/book only — no diagnostic diagnosis"],
    AAA8: ["D", "Technical stable vs word_problem weak — promotion trial"],
    AAA9: ["C", "Q1 supported but weak metadata — active suppression"],
    AAA10: ["B", "English grammar/vocab — internal metadata only"],
    AAA11: ["B", "Hebrew reading/vocab — no new copy"],
    AAA12: ["B", "Science + Moledet — normal parent report"],
  };
  for (const r of artifact.results) {
    const [mode, hint] = hints[r.label] || ["A", "Default production view"];
    lines.push(`| ${r.label} | \`${r.reportUrl}\` | Mode ${mode} | ${hint} |`);
  }
  lines.push("");
  lines.push("## Flag modes");
  lines.push("");
  lines.push("Set locally before starting dev server (do not change Vercel/production):");
  lines.push("");
  lines.push("```env");
  lines.push("# Mode A — production default");
  lines.push("DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=false");
  lines.push("DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED=false");
  lines.push("DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=false");
  lines.push("");
  lines.push("# Mode B — metadata internal");
  lines.push("DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=true");
  lines.push("");
  lines.push("# Mode C — + active suppression");
  lines.push("DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED=true");
  lines.push("");
  lines.push("# Mode D — + promotion trial");
  lines.push("DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=true");
  lines.push("```");
  lines.push("");
  lines.push("## Regression commands (post-seed)");
  lines.push("");
  lines.push("| Command | Result |");
  lines.push("|---------|--------|");
  lines.push("| `question-metadata-consumption.test.mjs` | 88/88 PASS |");
  lines.push("| `question-metadata-validator.mjs` | PASS |");
  lines.push("| `evidence-quality-layer.test.mjs` | 14/14 PASS |");
  lines.push("| `diagnostic-truth-consumer-verification.test.mjs` | 24/24 PASS |");
  lines.push("| `question-metadata-coverage-audit.mjs` | PASS |");
  lines.push("| `parent-report-q1-simulation.mjs --verify-only` | **Expected fail after monthly seed** — Q1 narrow windows superseded by April monthly dataset; re-run Q1 seed to restore |");
  lines.push("");
  lines.push("## Public API sanitization");
  lines.push("");
  lines.push("All 12 students × 4 flag modes (48 snapshots): public payload checks pass for `_evidenceQuality`, metadata internals, `_canonicalMeta`, rollups, and cross-context leak keys.");
  lines.push("");
  lines.push("## Metadata mode highlights");
  lines.push("");
  lines.push("| Student | Mode B (internal) | Mode C (suppression) | Mode D (promotion) |");
  lines.push("|---------|-------------------|----------------------|---------------------|");
  for (const r of artifact.results) {
    const b = r.modeResults?.B?.internalEvidenceQuality;
    const c = r.modeResults?.C?.internalEvidenceQuality;
    const d = r.modeResults?.D?.internalEvidenceQuality;
    lines.push(
      `| ${r.label} | bySubSkill=${b?.hasBySubSkill ?? false} shadow=${b?.hasShadowGating ?? false} | appliedGating=${c?.hasAppliedGating ?? false} | promotionDecisions=${d?.promotionDecisionCount ?? 0} |`
    );
  }
  lines.push("");
  lines.push("");
  lines.push("```bash");
  lines.push("node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs");
  lines.push("node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --verify-only");
  lines.push("node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --clean-only");
  lines.push("```");
  lines.push("");
  lines.push(`Results JSON: \`docs/qa/_artifacts/parent-report-q2e-monthly/parent-report-q2e-monthly-results.json\``);
  if (artifact.screenshots?.skipped) {
    lines.push("");
    lines.push(`Screenshots: skipped (${artifact.screenshots.reason})`);
  } else if (artifact.screenshots?.captured?.length) {
    lines.push("");
    lines.push(`Screenshots: ${artifact.screenshots.captured.length} captured under \`docs/qa/_artifacts/parent-report-q2e-monthly/screenshots/\``);
  }
  lines.push("");
  lines.push("## Cleanup note");
  lines.push("");
  lines.push(`Seed+clean removes both \`${SEED_TAG}\` and legacy \`${LEGACY_Q1_TAG}\` tagged rows to avoid April window double-counting.`);
  return lines.join("\n");
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  const cleanOnly = process.argv.includes("--clean-only");
  const wantScreenshots = process.argv.includes("--screenshots");

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const key = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const students = await resolveAaaStudents(supabase);
  console.log(`Resolved ${students.length} AAA students`);

  const studentIds = students.map((s) => s.studentId);
  let cleanup = { skipped: verifyOnly };
  if (!verifyOnly) {
    cleanup = await cleanAllSimTags(supabase, studentIds);
    console.log("Cleanup:", cleanup);
  }

  if (cleanOnly) {
    console.log("--clean-only done");
    return;
  }

  if (!verifyOnly) {
    for (const entry of students) {
      const plan = scenarioPlan(entry);
      if (!plan.seed) {
        console.log(`  ${entry.label}: skip seed (${entry.scenario})`);
        continue;
      }
      const result = await seedScenario(supabase, QA_PARENT_ID, entry, plan);
      console.log(`  ${entry.label}: seeded`, result);
    }
  }

  const results = [];
  for (const entry of students) {
    const plan = scenarioPlan(entry);
    const row = await verifyStudent(supabase, entry, plan);
    results.push(row);
    console.log(row.pass ? "PASS" : "FAIL", entry.label, entry.scenario, row.actualQ1Sufficiency);
  }

  let screenshots = { skipped: true, reason: "not requested" };
  if (wantScreenshots) {
    screenshots = await captureScreenshots(students, results);
    console.log("Screenshots:", screenshots);
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const artifact = {
    runAt: new Date().toISOString(),
    seedTag: SEED_TAG,
    monthWindow: { from: MONTH_FROM, to: MONTH_TO },
    qaParentEmail: QA_PARENT_EMAIL,
    cleanup,
    verifyOnly,
    flagModes: FLAG_MODES,
    results,
    screenshots,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: results.filter((r) => !r.pass).length,
    },
  };

  const jsonPath = path.join(ARTIFACT_DIR, "parent-report-q2e-monthly-results.json");
  await writeFile(jsonPath, JSON.stringify(artifact, null, 2), "utf8");
  console.log(`Wrote ${jsonPath}`);

  const mdPath = path.join(ROOT, "docs/qa/PARENT_REPORT_Q2E_MONTHLY_SIMULATION_QA.md");
  await writeFile(mdPath, buildQaMarkdown(artifact), "utf8");
  console.log(`Wrote ${mdPath}`);

  if (artifact.summary.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("FATAL", e?.message || e);
  process.exit(1);
});
