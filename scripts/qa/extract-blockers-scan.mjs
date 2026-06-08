#!/usr/bin/env node
/** One-off blocker extraction for worklog — read-only scan */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { curriculumTopicsFor } from "../lib/qa-curriculum-matrix.mjs";
import { generateForMatrixCell, modUrl } from "../learning-simulator/lib/question-generator-adapters.mjs";
import { normalizeQuestionPayload, runIntegrityChecks } from "../learning-simulator/lib/question-integrity-checks.mjs";
const { mcqCellValue } = await import(modUrl("utils/mcq-option-cell.js"));
const { normalizeOptionForCompare } = await import(modUrl("utils/question-quality.js"));

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GEN_SAMPLES = 6;
const LEVELS = ["easy", "medium", "hard"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

function preprocessRaw(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const out = { ...raw };
  const answers = raw.answers ?? raw.options;
  if (Array.isArray(answers)) {
    const flat = answers.map((a) => {
      const v = mcqCellValue(a);
      return v == null ? "" : typeof v === "number" ? v : String(v);
    });
    out.answers = flat;
    out.options = flat;
  }
  return out;
}

function auditMathHebrew(ref) {
  const raw = preprocessRaw(ref.raw);
  const norm = normalizeQuestionPayload(raw);
  const integrity = runIntegrityChecks(norm, { subject: ref.subject, topic: ref.topic, grade: ref.grade, level: ref.level });
  const issues = [...integrity.failures];
  const answers = norm?.answers || [];
  for (let i = 0; i < answers.length; i++) {
    for (let j = i + 1; j < answers.length; j++) {
      if (normalizeOptionForCompare(answers[i]) === normalizeOptionForCompare(answers[j])) {
        issues.push({ code: "duplicate_options", i, j, a: answers[i], b: answers[j] });
      }
    }
  }
  const objectOpts = (ref.raw?.answers || []).some((a) => a != null && typeof a === "object");
  return { pass: issues.length === 0, issues, objectOpts, kind: ref.raw?.params?.kind };
}

async function scanMath() {
  const fails = [];
  for (const grade of GRADES) {
    for (const topic of curriculumTopicsFor("math", grade)) {
      for (const level of LEVELS) {
        for (let i = 0; i < GEN_SAMPLES; i++) {
          const gen = await generateForMatrixCell({ grade, subjectCanonical: "math", level, topic }, i);
          if (gen.unsupported || !gen.ok || !gen.raw) continue;
          const ref = { subject: "math", grade, topic, level, source: `sample${i}`, raw: gen.raw };
          const r = auditMathHebrew(ref);
          if (!r.pass) {
            fails.push({
              grade,
              topic,
              level,
              sample: i,
              kind: r.kind,
              objectOpts: r.objectOpts,
              issues: r.issues,
              stem: String(gen.raw.question || gen.raw.exerciseText || "").slice(0, 80),
              answers: preprocessRaw(gen.raw).answers,
              correct: gen.raw.correctAnswer,
            });
          }
        }
      }
    }
  }
  return fails;
}

async function scanHebrew() {
  const fails = [];
  const rich = await import(modUrl("utils/hebrew-rich-question-bank.js"));
  const pool = rich.HEBREW_RICH_POOL || [];
  pool.forEach((q, idx) => {
    const ref = { subject: "hebrew", source: `rich:${idx}`, raw: q, id: q.id };
    const r = auditMathHebrew(ref);
    if (!r.pass) {
      fails.push({ idx, id: q.id, topic: q.topic, issues: r.issues, answers: q.answers, correct: q.correct });
    }
  });
  for (const grade of GRADES) {
    for (const topic of curriculumTopicsFor("hebrew", grade)) {
      for (const level of LEVELS) {
        for (let i = 0; i < GEN_SAMPLES; i++) {
          const gen = await generateForMatrixCell({ grade, subjectCanonical: "hebrew", level, topic }, i);
          if (gen.unsupported || !gen.ok || !gen.raw) continue;
          const ref = { subject: "hebrew", grade, topic, level, sample: i, raw: gen.raw };
          const r = auditMathHebrew(ref);
          if (!r.pass) {
            fails.push({
              grade,
              topic,
              level,
              sample: i,
              issues: r.issues,
              stem: String(gen.raw.question || "").slice(0, 80),
              answers: preprocessRaw(gen.raw).answers,
            });
          }
        }
      }
    }
  }
  return fails;
}

const mathFails = await scanMath();
const hebrewFails = await scanHebrew();
const out = { mathFails, hebrewFails, mathCount: mathFails.length, hebrewCount: hebrewFails.length };
writeFileSync(join(ROOT, "docs/qa/_artifacts/blocker-scan-pre-fix.json"), JSON.stringify(out, null, 2));
console.log("math fails", mathFails.length);
console.log("hebrew fails", hebrewFails.length);
mathFails.forEach((f) => console.log("MATH", f.grade, f.topic, f.level, f.sample, f.kind, f.objectOpts, f.issues.map((x) => x.code).join(",")));
hebrewFails.forEach((f) => console.log("HEB", f.id || f.grade, f.topic, f.issues?.map((x) => x.code).join(",")));
