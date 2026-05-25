import { LEVELS } from "../../utils/math-constants.js";
import {
  ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS,
  isActivityPreviewSubjectSupported,
} from "./classroom-activities-preview.js";

export { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS, isActivityPreviewSubjectSupported };

/**
 * Map teacher difficulty to math generator level config.
 * @param {string|null|undefined} difficulty
 */
function mathLevelConfig(difficulty) {
  const key = String(difficulty || "medium").toLowerCase();
  if (key === "easy" || key === "hard" || key === "mixed") {
    return { ...LEVELS[key === "mixed" ? "medium" : key], name: LEVELS[key === "mixed" ? "medium" : key].name };
  }
  return { ...LEVELS.medium };
}

/**
 * Pick math operation from topic hint.
 * @param {string} topic
 */
function mathOperationFromTopic(topic) {
  const t = String(topic || "").toLowerCase();
  if (t.includes("fraction") || t.includes("שבר")) return "fractions";
  if (t.includes("mult") || t.includes("כפל")) return "multiplication";
  if (t.includes("div") || t.includes("חילוק")) return "division";
  if (t.includes("sub") || t.includes("חיסור")) return "subtraction";
  return "addition";
}

/**
 * Normalize grade key for generators (g1..g6).
 * @param {string|null|undefined} gradeLevel
 */
function normalizeGradeKey(gradeLevel) {
  const raw = String(gradeLevel || "g3").trim().toLowerCase();
  if (/^g[1-6]$/.test(raw)) return raw;
  const num = parseInt(raw.replace(/\D/g, ""), 10);
  if (num >= 1 && num <= 6) return `g${num}`;
  return "g3";
}

/**
 * Phase A: only math and science have real preview generators.
 * @param {string} subject
 * @param {string} gradeLevel
 * @param {string} topic
 * @param {string|null} difficulty
 * @param {number} count
 */
export async function generateActivityQuestionSetClient({
  subject,
  gradeLevel,
  topic,
  difficulty,
  count,
}) {
  const n = Math.min(50, Math.max(1, Math.floor(Number(count) || 5)));
  const sub = String(subject || "math").trim().toLowerCase();

  if (!isActivityPreviewSubjectSupported(sub)) {
    throw new Error(
      "בשלב זה ניתן ליצור פעילויות בתצוגה מקדימה רק במתמטיקה או במדע. בחרו מקצוע נתמך."
    );
  }

  if (sub === "math") {
    const { generateQuestion } = await import("../../utils/math-question-generator.js");
    const grade = normalizeGradeKey(gradeLevel);
    const levelConfig = mathLevelConfig(difficulty);
    const op = mathOperationFromTopic(topic);
    const questions = [];
    const seen = new Set();

    for (let i = 0; i < n; i += 1) {
      let q = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        q = generateQuestion(levelConfig, op, grade, null, {});
        const key = `${q?.question}|${q?.correctAnswer}`;
        if (!seen.has(key)) {
          seen.add(key);
          break;
        }
      }
      if (!q?.question || q.correctAnswer == null) continue;
      questions.push({
        question: String(q.question),
        correctAnswer: String(q.correctAnswer),
        explanation: q.explanation != null ? String(q.explanation) : undefined,
        hint: q.hint != null ? String(q.hint) : undefined,
        params: q.params,
        subject: "math",
        topic,
      });
    }

    if (questions.length < n) {
      throw new Error("לא ניתן ליצור מספיק שאלות מתמטיקה — נסו נושא או רמה אחרת");
    }
    return questions;
  }

  if (sub === "science") {
    const bank = await import("../../data/science-questions.js");
    const pool = Array.isArray(bank?.SCIENCE_QUESTIONS) ? bank.SCIENCE_QUESTIONS : [];

    const filtered = pool.filter((q) => {
      if (!q) return false;
      const t = String(q.topic || q.category || "").toLowerCase();
      const hint = String(topic || "").toLowerCase();
      return !hint || t.includes(hint) || hint.includes(t);
    });

    const source = filtered.length >= n ? filtered : pool;
    if (!source.length) {
      throw new Error("אין שאלות מדע זמינות לתצוגה מקדימה");
    }

    const questions = [];
    for (let i = 0; i < n; i += 1) {
      const q = source[i % source.length];
      const options = Array.isArray(q.options) ? q.options : [];
      const correctIdx =
        q.correctIndex != null
          ? Number(q.correctIndex)
          : q.correctOptionIndex != null
            ? Number(q.correctOptionIndex)
            : 0;
      const correct =
        q.correctAnswer != null
          ? String(q.correctAnswer)
          : options[correctIdx] != null
            ? String(options[correctIdx])
            : null;
      const prompt = String(q.stem || q.question || q.prompt || "").trim();
      if (!prompt || !correct) continue;
      questions.push({
        question: prompt,
        correctAnswer: correct,
        choices: options.length ? options : undefined,
        explanation: q.explanation,
        subject: "science",
        topic: q.topic || topic,
      });
    }
    if (questions.length < n) {
      throw new Error("לא ניתן ליצור מספיק שאלות מדע");
    }
    return questions;
  }

  throw new Error("מקצוע לא נתמך לתצוגה מקדימה");
}
