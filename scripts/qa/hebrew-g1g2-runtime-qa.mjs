#!/usr/bin/env node
/**
 * Hebrew G1/G2 MCQ runtime QA.
 *
 * Checks for the known failure modes discovered in the Wave-2 audit:
 *   1. Punctuation answers replaced by unrelated Hebrew fallback distractors
 *      (caused by normalizeOptionForCompare stripping them to "").
 *   2. Duplicate "האזינו ובחרו" appearing in both questionLabel and exerciseText.
 *   3. Missing / empty answers or stem.
 *   4. Correct answer not present in the options list.
 *   5. Generic frequency/hedging distractors leaking into non-comprehension topics.
 *
 * Usage:
 *   node scripts/qa/hebrew-g1g2-runtime-qa.mjs
 *   node scripts/qa/hebrew-g1g2-runtime-qa.mjs --verbose
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const VERBOSE = process.argv.includes("--verbose");

// ── helpers ──────────────────────────────────────────────────────────────────

/** Known Hebrew fallback-distractor strings (from mcq-four-options.js). */
const FALLBACK_DISTRACTOR_PHRASES = new Set([
  "לא תמיד",
  "רק לפעמים",
  "בדרך כלל לא",
  "תלוי במצב",
  "אפשר גם אחרת",
  "לא בהכרח",
  "לעיתים קרובות",
  "לרוב לא",
]);

/** Punctuation-only patterns that should appear verbatim as MCQ options. */
const PUNCTUATION_ONLY_RE = /^[.?!,;:…\-–—"'()\[\]]+$/;

function isPunctuationOnly(str) {
  return PUNCTUATION_ONLY_RE.test(String(str ?? "").trim());
}

function isFallbackDistractor(str) {
  return FALLBACK_DISTRACTOR_PHRASES.has(String(str ?? "").trim());
}

function extractAnswers(q) {
  if (Array.isArray(q?.answers)) return q.answers.map((a) => String(a ?? "").trim());
  if (Array.isArray(q?.options)) return q.options.map((a) => String(a ?? "").trim());
  if (Array.isArray(q?.choices)) return q.choices.map((a) => String(a ?? "").trim());
  return [];
}

function getCorrectAnswer(q) {
  if (q?.correctAnswer != null && String(q.correctAnswer).trim()) return String(q.correctAnswer).trim();
  const ci = Number.isFinite(Number(q?.correct)) ? Number(q.correct) :
             Number.isFinite(Number(q?.correctIndex)) ? Number(q.correctIndex) : 0;
  const answers = extractAnswers(q);
  return answers[ci] ?? "";
}

function getStem(q) {
  return String(q?.question ?? q?.exerciseText ?? q?.stem ?? "").trim();
}

function checkQuestion(q, gradeKey, topic, level, idx) {
  const failures = [];
  const warnings = [];
  const stem = getStem(q);
  const answers = extractAnswers(q);
  const correct = getCorrectAnswer(q);
  const questionLabel = String(q?.questionLabel ?? "").trim();
  const exerciseText = String(q?.exerciseText ?? "").trim();

  // 1. Empty stem
  if (!stem) {
    failures.push({ code: "EMPTY_STEM", msg: "שאלה ריקה — אין stem" });
  }

  // 2. Less than 4 answers
  if (answers.length < 4) {
    failures.push({ code: "TOO_FEW_ANSWERS", msg: `רק ${answers.length} תשובות (נדרשות 4)` });
  }

  // 3. Correct answer missing from options
  if (correct && answers.length >= 4) {
    const found = answers.some((a) => a === correct || a.toLowerCase() === correct.toLowerCase());
    if (!found) {
      failures.push({
        code: "CORRECT_NOT_IN_OPTIONS",
        msg: `התשובה הנכונה "${correct}" לא נמצאת בתשובות: [${answers.join(" | ")}]`,
      });
    }
  }

  // 4. Punctuation question with fallback distractors
  const hasPunctuationInStem = /איזה סימן|סימן פיסוק|סימן בסוף|סימן מפריד/u.test(stem);
  if (hasPunctuationInStem) {
    for (const a of answers) {
      if (isFallbackDistractor(a)) {
        failures.push({
          code: "PUNCTUATION_QUESTION_FALLBACK_DISTRACTOR",
          msg: `שאלת פיסוק מכילה distractor לא-פיסוק: "${a}" — stem: "${stem.slice(0, 80)}"`,
        });
      }
    }
    // Also check correct answer is a punctuation mark
    if (correct && !isPunctuationOnly(correct)) {
      warnings.push({
        code: "PUNCTUATION_QUESTION_NON_PUNCT_CORRECT",
        msg: `שאלת פיסוק עם תשובה נכונה לא-פיסוק: "${correct}"`,
      });
    }
  }

  // 5. Fallback distractors in reading/grammar non-comprehension questions
  if (topic === "reading" || topic === "grammar") {
    for (const a of answers) {
      if (isFallbackDistractor(a)) {
        warnings.push({
          code: "FALLBACK_DISTRACTOR_IN_TOPIC",
          msg: `distractor fallback "${a}" ב-${topic} — stem: "${stem.slice(0, 80)}"`,
        });
      }
    }
  }

  // 6. Duplicate "האזינו ובחרו" in label + exerciseText
  if (
    questionLabel &&
    questionLabel.includes("האזינו") &&
    exerciseText.startsWith("האזינו")
  ) {
    failures.push({
      code: "DUPLICATE_AZINU_UVCHERU",
      msg: `כפילות "האזינו ובחרו" — questionLabel: "${questionLabel}" ו-exerciseText פותח ב: "${exerciseText.slice(0, 60)}"`,
    });
  }

  // 7. Empty answers in the list
  for (let i = 0; i < answers.length; i++) {
    if (!answers[i]) {
      failures.push({ code: "EMPTY_ANSWER", msg: `תשובה ריקה במיקום ${i}` });
    }
  }

  return { failures, warnings };
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== בדיקת QA — עברית G1-G2 ===\n");

  const { generateQuestion } = await import(
    pathToFileURL(path.join(ROOT, "utils/hebrew-question-generator.js")).href
  );

  const GRADES = ["g1", "g2"];
  const TOPICS = ["reading", "comprehension", "grammar", "vocabulary", "writing", "speaking"];
  const LEVELS = ["easy", "medium", "hard"];
  const SAMPLES_PER_CELL = 25; // per grade×topic×level

  const LEVEL_CONFIG = {
    easy: { name: "קל" },
    medium: { name: "בינוני" },
    hard: { name: "קשה" },
  };

  let totalQuestions = 0;
  let totalFailures = 0;
  let totalWarnings = 0;

  /** @type {Array<{grade:string, topic:string, level:string, idx:number, failures:object[], warnings:object[], q:object}>} */
  const allIssues = [];

  for (const gradeKey of GRADES) {
    for (const topic of TOPICS) {
      for (const level of LEVELS) {
        const cellFailures = [];
        const cellWarnings = [];

        for (let i = 0; i < SAMPLES_PER_CELL; i++) {
          let q;
          try {
            q = generateQuestion(LEVEL_CONFIG[level], topic, gradeKey);
          } catch (err) {
            cellFailures.push({ code: "GENERATOR_ERROR", msg: String(err?.message ?? err) });
            continue;
          }
          if (!q) {
            cellWarnings.push({ code: "NULL_QUESTION", msg: "generateQuestion החזיר null/undefined" });
            continue;
          }

          totalQuestions++;
          const { failures, warnings } = checkQuestion(q, gradeKey, topic, level, i);
          if (failures.length > 0) {
            allIssues.push({ grade: gradeKey, topic, level, idx: i, failures, warnings, q });
            totalFailures += failures.length;
          }
          if (warnings.length > 0) {
            totalWarnings += warnings.length;
            if (VERBOSE) {
              allIssues.push({ grade: gradeKey, topic, level, idx: i, failures: [], warnings, q });
            }
          }
        }
      }
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log(`סה"כ שאלות שנבדקו: ${totalQuestions}`);
  console.log(`סה"כ כשלות: ${totalFailures}`);
  console.log(`סה"כ אזהרות: ${totalWarnings}\n`);

  if (allIssues.length === 0) {
    console.log("✅ PASS — לא נמצאו כשלות.");
    return;
  }

  // Group by failure code
  const byCode = {};
  for (const issue of allIssues) {
    for (const f of issue.failures) {
      if (!byCode[f.code]) byCode[f.code] = [];
      byCode[f.code].push({ ...issue, msg: f.msg });
    }
    if (VERBOSE) {
      for (const w of issue.warnings) {
        const code = "WARN_" + w.code;
        if (!byCode[code]) byCode[code] = [];
        byCode[code].push({ ...issue, msg: w.msg });
      }
    }
  }

  for (const [code, items] of Object.entries(byCode)) {
    console.log(`\n─── ${code} (${items.length} מקרים) ───`);
    const shown = items.slice(0, 5);
    for (const item of shown) {
      const stem = getStem(item.q).slice(0, 100);
      const answers = extractAnswers(item.q).join(" | ");
      console.log(`  [${item.grade}/${item.topic}/${item.level}] ${item.msg}`);
      if (VERBOSE) {
        console.log(`    stem: "${stem}"`);
        console.log(`    answers: [${answers}]`);
        console.log(`    correct: "${getCorrectAnswer(item.q)}"`);
      }
    }
    if (items.length > 5) {
      console.log(`  ... ועוד ${items.length - 5} מקרים`);
    }
  }

  console.log(
    `\n${totalFailures > 0 ? "❌ FAIL" : "⚠️ PASS עם אזהרות"} — ראו פירוט למעלה.`
  );

  if (totalFailures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("QA script נכשל:", err);
  process.exit(1);
});
