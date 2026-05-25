/**
 * E2E helper: run Hebrew classroom preview generator (same path as teacher UI).
 * stdout: JSON array of frozen question objects.
 */
import { generateActivityQuestionSetClient } from "../../../lib/classroom-activities/generate-activity-questions-client.js";

const count = Math.min(50, Math.max(1, Number(process.env.E2E_HEBREW_COUNT || 3)));
const qs = await generateActivityQuestionSetClient({
  subject: "hebrew",
  gradeLevel: process.env.E2E_HEBREW_GRADE || "g4",
  topic: process.env.E2E_HEBREW_TOPIC || "comprehension",
  difficulty: process.env.E2E_HEBREW_DIFFICULTY || "easy",
  count,
});

process.stdout.write(JSON.stringify(qs));
