/**
 * E2E helper: run English classroom preview generator (same path as teacher UI).
 */
import { generateActivityQuestionSetClient } from "../../../lib/classroom-activities/generate-activity-questions-client.js";

const count = Math.min(50, Math.max(1, Number(process.env.E2E_ENGLISH_COUNT || 3)));
const qs = await generateActivityQuestionSetClient({
  subject: "english",
  gradeLevel: process.env.E2E_ENGLISH_GRADE || "g3",
  topic: process.env.E2E_ENGLISH_TOPIC || "grammar",
  difficulty: process.env.E2E_ENGLISH_DIFFICULTY || "easy",
  count,
});

process.stdout.write(JSON.stringify(qs));
