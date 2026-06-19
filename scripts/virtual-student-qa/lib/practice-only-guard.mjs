/**
 * Practice-only gates for Virtual Student QA (simulation only).
 *
 * Production QA runs MUST use Practice (תרגול) — never Learning / guided / book.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isProductionQaBaseUrl, resolveTimestampStampingEnabled } from "./config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRIVERS_DIR = join(__dirname, "subject-drivers");

function readSessionStartRequestBody(sessionStartResponse) {
  if (!sessionStartResponse) return null;
  try {
    const postData = sessionStartResponse.request()?.postData();
    if (!postData) return null;
    return JSON.parse(postData);
  } catch {
    return null;
  }
}

function readAnswerRequestBody(answerResponse) {
  if (!answerResponse) return null;
  try {
    const postData = answerResponse.request()?.postData();
    if (!postData) return null;
    return JSON.parse(postData);
  } catch {
    return null;
  }
}

/** Session modes the simulator must never persist on production QA. */
export const FORBIDDEN_SESSION_MODES = new Set([
  "learning",
  "learning_guided",
  "learning_book",
  "mistakes",
  "challenge",
  "speed",
  "marathon",
  "book",
  "guided",
]);

/** Answer gameMode / mode values that indicate driver opened wrong product mode. */
export const FORBIDDEN_ANSWER_MODES = new Set([
  "learning",
  "learning_guided",
  "learning_book",
  "book",
  "guided",
]);

export const REQUIRED_SESSION_MODE = "practice";
export const REQUIRED_GAME_MODE = "practice";

/** Forbidden UI / code tokens drivers must not invoke on production QA. */
const FORBIDDEN_DRIVER_SOURCE_PATTERNS = [
  /\bclick\s*\(\s*['"]למידה['"]/,
  /\bgetByRole\s*\(\s*['"]button['"]\s*,\s*\{\s*name:\s*['"]למידה['"]/,
  /\bselectOption\s*\(\s*\{\s*value:\s*['"]learning['"]/,
  /\bmode:\s*['"]learning['"]/,
  /\bmode:\s*['"]learning_guided['"]/,
  /\bstart-game.*learning/i,
  /\blearning_book\b/,
  /\bstep-by-step\b/i,
  /\bstepByStep\b.*click/i,
];

function stripJsComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function walkJsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJsFiles(p, out);
    else if (name.endsWith(".mjs") || name.endsWith(".js")) out.push(p);
  }
  return out;
}

/**
 * Static guard: scan subject driver sources for forbidden learning/guided paths.
 * Simulation-only — does not touch product code.
 */
export function assertDriverSourcesPracticeOnly({ log } = {}) {
  const violations = [];
  for (const filePath of walkJsFiles(DRIVERS_DIR)) {
    const rel = filePath.replace(__dirname + "\\", "").replace(__dirname + "/", "");
    const src = stripJsComments(readFileSync(filePath, "utf8"));
    for (const pattern of FORBIDDEN_DRIVER_SOURCE_PATTERNS) {
      if (pattern.test(src)) {
        violations.push({ file: rel, pattern: String(pattern) });
      }
    }
  }
  if (violations.length) {
    throw new Error(
      "practice-only static guard: forbidden learning/guided patterns in drivers: " +
        JSON.stringify(violations.slice(0, 5))
    );
  }
  log?.("practice-only static guard: driver source scan OK");
  return { ok: true };
}

/**
 * Fail before any UI if production QA is not practice-only enforced.
 */
export function assertProductionPracticeOnlyGuard({
  baseUrl,
  dryRun = false,
  preflightOnly = false,
  practiceOnlyEnabled = true,
  log,
}) {
  if (dryRun || preflightOnly) return;
  if (!practiceOnlyEnabled) {
    throw new Error(
      "practice-only guard: VIRTUAL_STUDENT_PRACTICE_ONLY=0 on production QA is forbidden"
    );
  }
  if (isProductionQaBaseUrl(baseUrl)) {
    assertDriverSourcesPracticeOnly({ log });
    log?.(
      "practice-only guard: production QA requires Practice (תרגול) only — " +
        "runtime session/answer guards active"
    );
  }
}

/**
 * Runtime guard — call immediately after session/start response.
 * FAIL fast; do not continue the session.
 */
export function assertPracticeSessionStart({
  sessionStartResponse,
  subjectLabel,
  log,
}) {
  const startBody = readSessionStartRequestBody(sessionStartResponse);
  const sessionMode = String(startBody?.mode || "")
    .trim()
    .toLowerCase();

  if (!sessionMode) {
    throw new Error(
      `${subjectLabel}: practice-only FAIL — session/start missing mode`
    );
  }
  if (FORBIDDEN_SESSION_MODES.has(sessionMode)) {
    throw new Error(
      `${subjectLabel}: practice-only FAIL — session.mode=${sessionMode} ` +
        `(forbidden; required ${REQUIRED_SESSION_MODE})`
    );
  }
  if (sessionMode !== REQUIRED_SESSION_MODE) {
    throw new Error(
      `${subjectLabel}: practice-only FAIL — session.mode=${sessionMode} ` +
        `(required exactly ${REQUIRED_SESSION_MODE})`
    );
  }

  log?.(`${subjectLabel}: practice-only session.mode=${sessionMode} OK`);
  return { ok: true, sessionMode };
}

/**
 * Answer evidence guard for one /api/learning/answer response.
 */
export function classifyPracticeAnswerEvidence({
  answerResponse,
  subjectLabel,
  log,
}) {
  const answerBody = readAnswerRequestBody(answerResponse);
  const clientMeta =
    answerBody?.clientMeta && typeof answerBody.clientMeta === "object"
      ? answerBody.clientMeta
      : {};
  const payloadFlags =
    answerBody?.contextFlags && typeof answerBody.contextFlags === "object"
      ? answerBody.contextFlags
      : {};

  const gameMode = String(
    clientMeta.gameMode ||
      answerBody?.gameMode ||
      answerBody?.mode ||
      ""
  )
    .trim()
    .toLowerCase();

  const evidenceCategory = String(
    answerBody?.evidenceCategory || clientMeta.evidenceCategory || ""
  )
    .trim()
    .toLowerCase();

  if (FORBIDDEN_ANSWER_MODES.has(gameMode)) {
    throw new Error(
      `${subjectLabel}: practice-only FAIL — driver created forbidden gameMode=${gameMode}`
    );
  }

  if (gameMode && gameMode !== REQUIRED_GAME_MODE) {
    throw new Error(
      `${subjectLabel}: practice-only FAIL — gameMode=${gameMode} ` +
        `(required ${REQUIRED_GAME_MODE})`
    );
  }

  const afterStepByStep =
    clientMeta.afterStepByStep === true ||
    payloadFlags.afterStepByStep === true;
  const contextAfterBookReading =
    clientMeta.contextAfterBookReading === true ||
    payloadFlags.contextAfterBookReading === true;

  if (afterStepByStep || contextAfterBookReading) {
    const submittedCorrect = answerBody?.isCorrect === true;
    if (
      resolveTimestampStampingEnabled() &&
      afterStepByStep &&
      !contextAfterBookReading &&
      submittedCorrect === false
    ) {
      log?.(
        `${subjectLabel}: simulation pending repair — wrong answer mis-tagged ` +
          `afterStepByStep; counting for session gate (DB repair follows stamp)`
      );
      return {
        countable: true,
        excluded: false,
        pendingEvidenceRepair: true,
        learningRowCreated: false,
        gameMode: gameMode || REQUIRED_GAME_MODE,
        evidenceCategory: evidenceCategory || "diagnostic_independent",
      };
    }
    log?.(
      `${subjectLabel}: excluded answer (afterStepByStep=${afterStepByStep}, ` +
        `contextAfterBookReading=${contextAfterBookReading}) — not countable`
    );
    return {
      countable: false,
      excluded: true,
      learningRowCreated: false,
      gameMode: gameMode || REQUIRED_GAME_MODE,
      evidenceCategory,
    };
  }

  if (
    evidenceCategory &&
    evidenceCategory !== "diagnostic_independent" &&
    evidenceCategory.includes("learning")
  ) {
    throw new Error(
      `${subjectLabel}: practice-only FAIL — evidenceCategory=${evidenceCategory}`
    );
  }

  log?.(`${subjectLabel}: practice-only countable answer OK (gameMode=practice)`);
  return {
    countable: true,
    excluded: false,
    learningRowCreated: false,
    gameMode: REQUIRED_GAME_MODE,
    evidenceCategory: evidenceCategory || "diagnostic_independent",
  };
}

export function resolvePracticeOnlyEnabled(explicit) {
  if (explicit === false) return false;
  if (explicit === true) return true;
  const raw = String(process.env.VIRTUAL_STUDENT_PRACTICE_ONLY || "1").trim();
  return !(
    raw === "0" ||
    raw.toLowerCase() === "false" ||
    raw.toLowerCase() === "off"
  );
}
