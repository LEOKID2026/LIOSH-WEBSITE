/**
 * Aggregate-style learning simulation: planned sessions → storage via deep-learning-sim-storage builder.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

import { computeSessionMetrics } from "./answer-policy-engine.mjs";
import { buildSessionPlan } from "./session-plan-builder.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");

const DAY_MS = 24 * 60 * 60 * 1000;

/** @param {object} scenario */
export function isThinEvidenceScenario(scenario) {
  if (scenario?.criticalDeepProfileType === "thin_data_on_target_cell") return true;
  const id = String(scenario?.scenarioId || "");
  if (id.includes("thin_data")) return true;
  if (/_thin$/.test(id) || id.includes("_thin_")) return true;
  return false;
}

async function loadDeepLearningSim() {
  const url = pathToFileURL(join(ROOT, "scripts", "lib", "deep-learning-sim-storage.mjs")).href;
  return import(url);
}

/**
 * @param {object} scenario
 * @param {object} profile
 * @param {object[]} matrixRows
 * @param {{ mulberry32: Function, hashStringToSeed: Function }} mg
 */
export function materializeSessions(scenario, profile, matrixRows, mg) {
  const rng = mg.mulberry32((Number(scenario.seed) >>> 0) ^ mg.hashStringToSeed(scenario.scenarioId));
  const planResult = buildSessionPlan(scenario, profile, matrixRows, rng);
  if (planResult.errors.length) {
    return {
      ok: false,
      errors: planResult.errors,
      warnings: planResult.warnings,
      sessions: [],
      planned: [],
    };
  }

  const anchorMs = Date.parse(scenario.anchorDate);
  if (!Number.isFinite(anchorMs)) {
    return {
      ok: false,
      errors: [`invalid anchorDate for ${scenario.scenarioId}`],
      warnings: planResult.warnings,
      sessions: [],
      planned: [],
    };
  }

  const horizon = Number(scenario.timeHorizonDays) || 7;
  const oldestMs = anchorMs - (horizon - 1) * DAY_MS;

  const planned = planResult.sessions;
  const totalSessions = planned.length;
  const sessions = [];

  for (let i = 0; i < planned.length; i += 1) {
    const p = planned[i];
    const sessionRng = mg.mulberry32(
      (Number(scenario.seed) >>> 0) ^
        mg.hashStringToSeed(`${scenario.scenarioId}:sess:${i}`) ^
        i * 2654435761
    );

    const metrics = computeSessionMetrics(profile, scenario, {
      sessionIndex: i,
      totalSessions,
      subject: p.subject,
      bucket: p.bucket,
      rng: sessionRng,
    });

    const thin = isThinEvidenceScenario(scenario);
    const qMin = thin ? 5 : 10;
    const qMax = thin ? 9 : 22;
    const total = Math.max(qMin, Math.min(qMax, Math.round(qMin + sessionRng() * (qMax - qMin))));
    const correct = Math.max(0, Math.min(total, Math.round(total * metrics.accuracy)));

    const dayIndex = p.dayIndex;
    const tsBase = oldestMs + dayIndex * DAY_MS + Math.floor(sessionRng() * 0.72 * DAY_MS) + i * 1337;
    const date = new Date(tsBase).toISOString().split("T")[0];

    sessions.push({
      subject: p.subject,
      bucket: p.bucket,
      timestamp: tsBase,
      date,
      total,
      correct,
      duration: metrics.durationSec,
      grade: p.grade,
      level: p.level,
      mode: metrics.mode,
    });
  }

  const plannedSubjects = [...new Set(planned.map((x) => x.subject))];
  const plannedBuckets = planned.reduce((acc, x) => {
    acc[x.subject] = acc[x.subject] || new Set();
    acc[x.subject].add(x.bucket);
    return acc;
  }, {});

  return {
    ok: true,
    errors: [],
    warnings: planResult.warnings,
    sessions,
    planned,
    plannedSubjects,
    plannedBuckets,
  };
}

function countAllMistakes(storage) {
  let n = 0;
  for (const [k, v] of Object.entries(storage || {})) {
    if (k.includes("mistakes") && Array.isArray(v)) n += v.length;
  }
  return n;
}

export function validateScenarioOutput(scenario, sessions, stats, storage) {
  const errors = [];
  const warnings = [];

  try {
    JSON.stringify(storage);
  } catch {
    errors.push("storage not JSON-serializable");
  }

  const mleoKeys = Object.keys(storage || {}).filter((k) => k.startsWith("mleo_"));
  if (!mleoKeys.length) {
    errors.push("no mleo_* keys in storage");
  }

  if (scenario.scenarioId === "thin_data_g3_1d") {
    if (stats.sessionCount > 4) errors.push("thin_data should have very low session count");
    if (stats.questionTotal > 45) warnings.push("thin_data questionTotal higher than expected thin volume");
  }

  if (isThinEvidenceScenario(scenario)) {
    if (stats.sessionCount > 6) {
      errors.push(`thin evidence scenario should have <=6 sessions, got ${stats.sessionCount}`);
    }
    if (stats.questionTotal > 55) {
      errors.push(`thin evidence scenario should have <=55 questions, got ${stats.questionTotal}`);
    }
  }

  const targets = (scenario.topicTargets || []).filter((t) => !t.optional);
  for (const tt of targets) {
    const hit = sessions.some((s) => s.subject === tt.subjectCanonical && s.bucket === tt.topic);
    if (!hit) {
      errors.push(`weak topic not represented in sessions: ${tt.subjectCanonical}/${tt.topic}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * @param {object} scenario
 * @param {object} profile
 * @param {object[]} matrixRows
 */
export async function buildStorageForScenario(scenario, profile, matrixRows) {
  const dl = await loadDeepLearningSim();
  const mg = { mulberry32: dl.mulberry32, hashStringToSeed: dl.hashStringToSeed };

  const built = materializeSessions(scenario, profile, matrixRows, mg);
  if (!built.ok) {
    return {
      ok: false,
      errors: built.errors,
      warnings: built.warnings,
      sessions: [],
      storage: null,
      stats: null,
      meta: null,
    };
  }

  const { buildStorageSnapshotFromSessions } = dl;
  const playerName = `Sim:${scenario.scenarioId}`;
  const storage = buildStorageSnapshotFromSessions(built.sessions, playerName);

  const questionTotal = built.sessions.reduce((a, s) => a + (Number(s.total) || 0), 0);
  const mistakeTotal = countAllMistakes(storage);

  const stats = {
    scenarioId: scenario.scenarioId,
    sessionCount: built.sessions.length,
    questionTotal,
    correctTotal: built.sessions.reduce((a, s) => a + (Number(s.correct) || 0), 0),
    mistakeEventCount: mistakeTotal,
    subjectsTouched: built.plannedSubjects,
    topicsBySubject: Object.fromEntries(
      Object.entries(built.plannedBuckets || {}).map(([k, set]) => [k, [...set].sort()])
    ),
  };

  const validation = validateScenarioOutput(scenario, built.sessions, stats, storage);

  const meta = {
    scenarioId: scenario.scenarioId,
    profileRef: scenario.profileRef,
    mode: scenario.mode,
    tier: scenario.tier,
    seed: scenario.seed,
    anchorDate: scenario.anchorDate,
    timeHorizonDays: scenario.timeHorizonDays,
    generator: "aggregate-runner-v1",
    stats,
    validation,
    warnings: [...built.warnings, ...validation.warnings],
    errors: validation.errors,
  };

  return {
    ok: validation.errors.length === 0,
    errors: [...built.errors, ...validation.errors],
    warnings: meta.warnings,
    sessions: built.sessions,
    storage,
    stats,
    meta,
  };
}
