/**
 * E2E helper: run Science classroom preview generator (same path as teacher UI).
 * stdout: JSON array of frozen question objects.
 */
import { generateActivityQuestionSetClient } from "../../../lib/classroom-activities/generate-activity-questions-client.js";

const count = Math.min(50, Math.max(1, Number(process.env.E2E_SCIENCE_COUNT || 3)));
const qs = await generateActivityQuestionSetClient({
  subject: "science",
  gradeLevel: process.env.E2E_SCIENCE_GRADE || "g3",
  topic: process.env.E2E_SCIENCE_TOPIC || "body",
  difficulty: process.env.E2E_SCIENCE_DIFFICULTY || "easy",
  count,
});

process.stdout.write(JSON.stringify(qs));
