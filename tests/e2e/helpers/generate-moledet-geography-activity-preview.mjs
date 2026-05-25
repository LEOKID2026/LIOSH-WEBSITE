/**
 * E2E helper: Moledet/Geography classroom preview generator (teacher UI path).
 */
import { generateActivityQuestionSetClient } from "../../../lib/classroom-activities/generate-activity-questions-client.js";

const count = Math.min(50, Math.max(1, Number(process.env.E2E_MOLEDET_COUNT || 3)));
const qs = await generateActivityQuestionSetClient({
  subject: "moledet_geography",
  gradeLevel: process.env.E2E_MOLEDET_GRADE || "g4",
  topic: process.env.E2E_MOLEDET_TOPIC || "homeland",
  difficulty: process.env.E2E_MOLEDET_DIFFICULTY || "easy",
  count,
});

process.stdout.write(JSON.stringify(qs));
