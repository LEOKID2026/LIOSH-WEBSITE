/**
 * Profile stress harness — synthetic profiles + cell selection (simulator-only).
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { CANONICAL_PROFILE_TYPES } from "./profile-taxonomy.mjs";

export const SCENARIOS_PER_TYPE = 8;

const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
const SUBJECTS = ["math", "geometry", "science", "english", "hebrew", "moledet_geography"];

/** @param {string} root */
export async function loadBaseProfiles(root) {
  const url = pathToFileURL(join(root, "tests", "fixtures", "learning-simulator", "profiles", "base-profiles.mjs")).href;
  const mod = await import(url);
  return mod.BASE_PROFILES || mod.default;
}

/**
 * @param {object[]} catalogRows
 * @param {Set<string>} backlogKeys
 */
export function buildEligiblePool(catalogRows, backlogKeys) {
  return catalogRows.filter(
    (r) =>
      r.coverageStatus === "covered" &&
      String(r.topic || "") !== "mixed" &&
      !backlogKeys.has(r.cellKey)
  );
}

/**
 * @param {string} root
 * @returns {Promise<Set<string>>}
 */
export async function loadBacklogCellKeys(root) {
  const { readFile } = await import("node:fs/promises");
  try {
    const raw = JSON.parse(await readFile(join(root, "reports", "learning-simulator", "content-gap-backlog.json"), "utf8"));
    const set = new Set();
    for (const it of raw.items || []) {
      if (it.cellKey) set.add(it.cellKey);
    }
    return set;
  } catch {
    return new Set();
  }
}

function clone(p) {
  return structuredClone(p);
}

/** Default weak topics when picking cells */
export const SUBJECT_DEFAULT_WEAK_TOPIC = {
  math: "fractions",
  geometry: "area",
  science: "experiments",
  english: "grammar",
  hebrew: "comprehension",
  moledet_geography: "maps",
};

/**
 * @param {string} type
 * @param {object} BASE
 * @param {{ grade: string, subject: string, topic: string }} ctx
 */
export function buildProfileForStressType(type, BASE, ctx) {
  const { grade, subject, topic } = ctx;

  switch (type) {
    case "strong_all_subjects":
      return clone(BASE.p_strong_all_subjects);
    case "weak_all_subjects":
      return clone(BASE.p_weak_all_subjects);
    case "average_student": {
      const p = clone(BASE.p_strong_all_subjects);
      p.accuracyPolicy = { kind: "band", default: 0.66, spread: 0.09 };
      p.dataVolumePolicy = "normal";
      return p;
    }
    case "thin_data":
      return clone(BASE.p_thin_data);
    case "random_guessing":
      return clone(BASE.p_random_guessing_student);
    case "inconsistent":
      return clone(BASE.p_inconsistent_student);
    case "fast_wrong": {
      /* Low accuracy (random-guess base) + deliberately short RT vs slow_correct (simulator-only). */
      const p = clone(BASE.p_random_guessing_student);
      p.responseTimePolicy = { model: "normal", secondsMean: 9, secondsStd: 3.5 };
      return p;
    }
    case "slow_correct": {
      /* High accuracy band + deliberately long RT vs fast_wrong (simulator-only). */
      const p = clone(BASE.p_strong_all_subjects);
      p.responseTimePolicy = { model: "normal", secondsMean: 66, secondsStd: 12 };
      p.accuracyPolicy = { kind: "band", default: 0.89, spread: 0.035 };
      return p;
    }
    case "improving":
      return clone(BASE.p_improving_student);
    case "declining":
      return clone(BASE.p_declining_student);
    case "subject_specific_weak":
    case "topic_specific_weak": {
      /* Always align weakness to the selected matrix cell topic (bucket), not a fixed fixture profile. */
      const p = clone(BASE.p_weak_all_subjects);
      p.subjectWeights = { [subject]: 1 };
      p.topicWeaknesses = { [subject]: { [topic]: type === "topic_specific_weak" ? 0.92 : 0.88 } };
      p.accuracyPolicy = {
        kind: "byTopic",
        default: 0.68,
        lowTopics: { [topic]: 0.38 },
      };
      return p;
    }
    case "subject_specific_strong": {
      const p = clone(BASE.p_strong_all_subjects);
      p.subjectWeights = { [subject]: 1 };
      p.topicStrengths = { [subject]: { [topic]: 0.88 } };
      p.accuracyPolicy = { kind: "band", default: 0.87, spread: 0.04 };
      p.topicWeaknesses = {};
      return p;
    }
    case "mixed_strengths": {
      const p = clone(BASE.p_strong_all_subjects);
      p.subjectWeights = { math: 0.5, hebrew: 0.5 };
      p.topicWeaknesses = { hebrew: { comprehension: 0.72 } };
      p.topicStrengths = { math: { word_problems: 0.82 } };
      p.accuracyPolicy = {
        kind: "byTopic",
        default: 0.72,
        lowTopics: { comprehension: 0.45 },
      };
      return p;
    }
    default:
      return null;
  }
}

/**
 * @param {string} profileStressType
 */
export function expectedAssertionsForStressType(profileStressType) {
  const commonMustNot = ["DEBUG", "[object Object]", "NaN"];
  const nonGeneric = { noGenericOnlyReport: true };

  const base = {
    mustNotMention: commonMustNot,
    noContradiction: true,
    ...nonGeneric,
  };

  switch (profileStressType) {
    case "thin_data":
      return {
        ...base,
        noFalseStrongConclusion: true,
        confidenceShouldBeCautious: true,
        evidenceLevelExpected: ["thin", "insufficient", "low", "medium", "any"],
      };
    case "random_guessing":
    case "fast_wrong":
      return {
        ...base,
        noFalseStrongConclusion: true,
        evidenceLevelExpected: ["any"],
      };
    case "weak_all_subjects":
    case "subject_specific_weak":
    case "topic_specific_weak":
      return {
        ...base,
        noFalseStrongConclusion: true,
        evidenceLevelExpected: ["any"],
      };
    case "strong_all_subjects":
    case "subject_specific_strong":
    case "slow_correct":
      return {
        ...base,
        noFalseWeakConclusion: true,
        noFalseStrongConclusion: true,
        evidenceLevelExpected: ["any"],
      };
    case "average_student":
    case "inconsistent":
    case "mixed_strengths":
      return {
        ...base,
        noFalseStrongConclusion: true,
        noFalseWeakConclusion: true,
        evidenceLevelExpected: ["any"],
      };
    case "improving":
    case "declining":
      return {
        ...base,
        noFalseStrongConclusion: true,
        evidenceLevelExpected: ["any"],
      };
    default:
      return { ...base, evidenceLevelExpected: ["any"] };
  }
}

/**
 * Pick grade/subject for slot index and type index (spread coverage).
 */
export function slotGradeSubject(slotIndex, typeIndex) {
  const grade = GRADES[(slotIndex + typeIndex) % GRADES.length];
  const subject = SUBJECTS[(slotIndex * 2 + typeIndex * 3) % SUBJECTS.length];
  return { grade, subject };
}

/**
 * Find best pool row for grade+subject; prefer including default weak topic when relevant.
 * @param {object[]} pool
 */
export function pickCellForSlot(pool, grade, subject, preferredTopic) {
  if (preferredTopic != null && preferredTopic !== "") {
    const exact = pool.find((r) => r.grade === grade && r.subject === subject && r.topic === preferredTopic);
    if (exact) return exact;
  }
  const sub = pool.filter((r) => r.grade === grade && r.subject === subject);
  if (sub.length) return sub[Math.floor(sub.length / 2)];
  const g = pool.filter((r) => r.grade === grade);
  if (g.length) return g[0];
  return pool[0] || null;
}

function pickCellForGradeSubject(pool, grade, subject, preferredTopics = []) {
  for (const topic of preferredTopics) {
    if (!topic) continue;
    const exact = pool.find((r) => r.grade === grade && r.subject === subject && r.topic === topic);
    if (exact) return exact;
  }
  const sameGradeSubject = pool.filter((r) => r.grade === grade && r.subject === subject);
  if (sameGradeSubject.length) return sameGradeSubject[Math.floor(sameGradeSubject.length / 2)];
  return null;
}

function pickMixedStrengthsGrade(pool, preferredGrade) {
  const grades = [...new Set(pool.map((r) => r.grade))];
  const eligible = grades.filter(
    (g) => pool.some((r) => r.grade === g && r.subject === "math") && pool.some((r) => r.grade === g && r.subject === "hebrew")
  );
  if (!eligible.length) return null;
  if (eligible.includes(preferredGrade)) return preferredGrade;
  return eligible.sort()[0];
}

/**
 * Compact matrix refs (easy/medium/hard when possible). `mixed_strengths` uses math+hebrew.
 * @returns {{ matrixCoverageRefs: object[], rows: object[], stressSubject: string, stressTopic: string|null }}
 */
export function collectMatrixRefsForStress(pool, profileStressType, grade, subject) {
  if (profileStressType === "mixed_strengths") {
    const mixedGrade = pickMixedStrengthsGrade(pool, grade);
    if (!mixedGrade) {
      return { matrixCoverageRefs: [], rows: [], stressSubject: "mixed", stressTopic: null };
    }
    const mathRow = pickCellForGradeSubject(pool, mixedGrade, "math", [
      "word_problems",
      SUBJECT_DEFAULT_WEAK_TOPIC.math,
    ]);
    const hebrewRow = pickCellForGradeSubject(pool, mixedGrade, "hebrew", [
      "comprehension",
      SUBJECT_DEFAULT_WEAK_TOPIC.hebrew,
    ]);
    const rows = [mathRow, hebrewRow].filter(Boolean);
    if (rows.length < 2) {
      return { matrixCoverageRefs: [], rows: [], stressSubject: "mixed", stressTopic: null };
    }
    const uniq = [...new Map(rows.map((r) => [r.cellKey, r])).values()];
    return {
      matrixCoverageRefs: uniq.map((r) => ({
        subjectCanonical: r.subject,
        topic: r.topic,
        level: r.level,
      })),
      rows: uniq,
      stressSubject: "mixed",
      stressTopic: null,
    };
  }

  const weakTypes = new Set(["subject_specific_weak", "topic_specific_weak"]);
  const prefTopic = weakTypes.has(profileStressType) ? SUBJECT_DEFAULT_WEAK_TOPIC[subject] || null : null;

  let primary = prefTopic
    ? pickCellForSlot(pool, grade, subject, prefTopic)
    : pickCellForSlot(pool, grade, subject);
  if (!primary) primary = pool.find((r) => r.subject === subject) || pool[0] || null;
  if (!primary) {
    return { matrixCoverageRefs: [], rows: [], stressSubject: subject, stressTopic: prefTopic };
  }

  const g = primary.grade;
  const sub = primary.subject;
  const sameGS = pool.filter(
    (r) => r.grade === g && r.subject === sub && r.topic === primary.topic
  );
  const byLevel = new Map();
  for (const r of sameGS.length ? sameGS : [primary]) {
    if (!byLevel.has(r.level)) byLevel.set(r.level, r);
  }
  const order = ["easy", "medium", "hard"];
  /** @type {object[]} */
  const picked = [];
  for (const lv of order) {
    if (byLevel.has(lv)) picked.push(byLevel.get(lv));
  }
  if (!picked.length) picked.push(primary);
  const uniq = [...new Map(picked.map((r) => [r.cellKey, r])).values()].slice(0, 3);

  return {
    matrixCoverageRefs: uniq.map((r) => ({
      subjectCanonical: r.subject,
      topic: r.topic,
      level: r.level,
    })),
    rows: uniq,
    stressSubject: sub,
    stressTopic: primary.topic,
  };
}

function hashSeed(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

/**
 * Build one profile-stress scenario deterministically (for engine-truth audit / reuse).
 * Requires `reports/learning-simulator/coverage-catalog.json` (run qa:learning-simulator:coverage).
 *
 * @param {string} root — repo root
 * @param {string} profileStressType — member of CANONICAL_PROFILE_TYPES
 * @param {number} [slot]
 * @returns {Promise<{ ok: boolean, scenario?: object, profile?: object, error?: string }>}
 */
export async function buildStressScenarioForEngineTruth(root, profileStressType, slot = 0) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const ti = CANONICAL_PROFILE_TYPES.indexOf(profileStressType);
  if (ti < 0) return { ok: false, error: `unknown profileStressType: ${profileStressType}` };

  let catalogRaw;
  try {
    catalogRaw = JSON.parse(await readFile(join(root, "reports", "learning-simulator", "coverage-catalog.json"), "utf8"));
  } catch (e) {
    return { ok: false, error: `coverage-catalog.json: ${e?.message || e}` };
  }

  const backlogKeys = await loadBacklogCellKeys(root);
  const pool = buildEligiblePool(catalogRaw.rows || [], backlogKeys);
  if (!pool.length) return { ok: false, error: "empty eligible pool (catalog + backlog)" };

  const { grade, subject } = slotGradeSubject(slot, ti);
  const { matrixCoverageRefs, rows, stressSubject, stressTopic } = collectMatrixRefsForStress(
    pool,
    profileStressType,
    grade,
    subject
  );
  if (!matrixCoverageRefs.length || !rows.length) {
    return { ok: false, error: "no matrix refs for stress scenario" };
  }

  const gradeEffective = rows[0]?.grade || grade;
  const idSubj = profileStressType === "mixed_strengths" ? "mixed" : subject;
  const scenarioId = `engine_truth_${profileStressType}_${gradeEffective}_${idSubj}_s${slot}`;
  const levels = [...new Set(rows.map((r) => r.level))].sort();
  const topics = [...new Set(rows.map((r) => r.topic))].sort();

  const refCount = matrixCoverageRefs.length;
  const isThin = profileStressType === "thin_data";
  const horizonDays = isThin ? 3 : 14;
  const targetSessions = isThin ? Math.max(refCount * 2, 14) : Math.max(refCount * 3, 36);

  const subjects =
    profileStressType === "mixed_strengths"
      ? [...new Set(rows.map((r) => r.subject))].sort()
      : [rows[0].subject];

  const scenario = {
    scenarioId,
    mode: "aggregate",
    tier: "quick",
    grade: gradeEffective,
    subjects,
    levels,
    topicTargets: [],
    profileRef: `synthetic_profile_stress_${profileStressType}`,
    timeHorizonDays: horizonDays,
    sessionPlan: {
      targetSessions,
      spanDaysApprox: horizonDays,
      notes: "Engine truth harness — profile stress clone.",
    },
    matrixCoverageRefs,
    expected: expectedAssertionsForStressType(profileStressType),
    seed: hashSeed(scenarioId),
    anchorDate: "2026-05-02T08:00:00.000Z",
    artifactOptions: {},
    profileStressType,
    stressMatrixSubject: stressSubject === "mixed" ? null : stressSubject,
    stressMatrixTopic: stressTopic,
    engineTruthKind: profileStressType,
  };

  const BASE = await loadBaseProfiles(root);
  const profile = buildProfileForStressType(profileStressType, BASE, {
    grade,
    subject: subjects[0],
    topic: stressTopic || SUBJECT_DEFAULT_WEAK_TOPIC[subjects[0]] || "fractions",
  });

  if (!profile) return { ok: false, error: `buildProfileForStressType returned null for ${profileStressType}` };

  return { ok: true, scenario, profile };
}

export { CANONICAL_PROFILE_TYPES };
