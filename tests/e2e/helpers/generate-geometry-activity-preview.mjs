/**
 * E2E helper: Geometry classroom preview generator.
 */
import { generateActivityQuestionSetClient } from "../../../lib/classroom-activities/generate-activity-questions-client.js";

const count = Math.min(50, Math.max(1, Number(process.env.E2E_GEOMETRY_COUNT || 3)));
const qs = await generateActivityQuestionSetClient({
  subject: "geometry",
  gradeLevel: process.env.E2E_GEOMETRY_GRADE || "g3",
  topic: process.env.E2E_GEOMETRY_TOPIC || "area",
  difficulty: process.env.E2E_GEOMETRY_DIFFICULTY || "easy",
  count,
});

process.stdout.write(JSON.stringify(qs));
