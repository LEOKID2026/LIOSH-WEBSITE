import {
  LANGUAGE_MIN_POOL_PER_LEVEL,
  LANGUAGE_SESSION_TASKS,
} from "../educational-games/language-game-config.js";
import { planLanguageSession } from "../educational-games/language-session-planner.js";
import {
  WORD_TRAIN_TASKS,
  auditWordTrainContent,
  pickWordTrainSession,
  validateTrainTask,
} from "../../components/educational-games/leo-word-train/leo-word-train-data.js";
import {
  WORD_DETECTIVE_TASKS,
  auditWordDetectiveContent,
  pickWordDetectiveSession,
  validateDetectiveTask,
} from "../../components/educational-games/leo-word-detective/leo-word-detective-data.js";

let failed = 0;

function fail(msg) {
  console.error(msg);
  failed += 1;
}

function assertTrainAnswersInPieces(task) {
  for (const expected of Object.values(task.solution)) {
    const label = String(expected).toLowerCase();
    const inPieces = task.pieces.some((p) => p.label.toLowerCase() === label);
    if (!inPieces && task.pieces.every((p) => !p.label.includes("_"))) {
      const pieceMatch = task.pieces.find((p) => p.id === expected);
      if (!pieceMatch && !task.pieces.some((p) => p.label === expected)) {
        // piece-id solutions (detective) handled separately
      }
    }
  }
}

function auditSessionPlanner(pool, pickFn, level) {
  const session = pickFn(level);
  if (session.length !== LANGUAGE_SESSION_TASKS) {
    fail(`${level}: session length ${session.length} != ${LANGUAGE_SESSION_TASKS}`);
  }
  const ids = new Set(session.map((t) => t.id));
  if (ids.size !== session.length) {
    fail(`${level}: duplicate task ids in session`);
  }
  for (let i = 2; i < session.length; i += 1) {
    const a = session[i - 2];
    const b = session[i - 1];
    const c = session[i];
    const type = c.taskType || c.type;
    if (
      (a.taskType || a.type) === type &&
      (b.taskType || b.type) === type &&
      (c.taskType || c.type) === type
    ) {
      fail(`${level}: 3 same taskType in a row at ${i}`);
    }
  }
}

console.log("=== Word Train audit ===");
const trainAudit = auditWordTrainContent();
console.log("totals:", trainAudit.totals);
console.log("byType:", trainAudit.byType);
for (const gap of trainAudit.gaps) fail(`train: ${gap}`);

for (const level of ["easy", "medium", "hard"]) {
  auditSessionPlanner(WORD_TRAIN_TASKS[level], pickWordTrainSession, level);
  for (const task of WORD_TRAIN_TASKS[level]) {
    if (!task.correctAnswer) fail(`train ${task.id}: missing correctAnswer`);
    const slotIds = task.carriages.filter((c) => c.kind === "slot").map((c) => c.id);
    const mockFills = {};
    for (const [sid, ans] of Object.entries(task.solution)) {
      mockFills[sid] = ans;
    }
    if (slotIds.length && !validateTrainTask(task, mockFills)) {
      fail(`train ${task.id}: validateTrainTask failed for solution`);
    }
  }
}

console.log("=== Word Detective audit ===");
const detAudit = auditWordDetectiveContent();
console.log("totals:", detAudit.totals);
console.log("byType:", detAudit.byType);
for (const gap of detAudit.gaps) fail(`detective: ${gap}`);

for (const level of ["easy", "medium", "hard"]) {
  auditSessionPlanner(WORD_DETECTIVE_TASKS[level], pickWordDetectiveSession, level);
  for (const task of WORD_DETECTIVE_TASKS[level]) {
    if (!task.correctAnswer) fail(`detective ${task.id}: missing correctAnswer`);
    if (!validateDetectiveTask(task, task.solution)) {
      fail(`detective ${task.id}: validateDetectiveTask failed for solution`);
    }
  }
}

console.log(`min pool per level: ${LANGUAGE_MIN_POOL_PER_LEVEL}`);
console.log(`session tasks: ${LANGUAGE_SESSION_TASKS}`);

if (failed > 0) {
  console.error(`language games selftest: ${failed} failure(s)`);
  process.exit(1);
}

console.log("language games selftest: OK");
