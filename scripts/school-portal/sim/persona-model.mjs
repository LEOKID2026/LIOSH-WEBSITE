/**
 * 6-type student personas for full-school simulation.
 */
import { SUBJECTS } from "../demo-school-data.mjs";
import {
  ATTENDANCE_BY_PERSONA,
  PERSONA_SHARES,
  SCORE_RANGES,
  WEAK_SUBJECT_ASSIGN_RATE,
  WEAK_SUBJECT_PENALTY,
} from "./school-sim-config.mjs";

const PERSONA_ORDER = [
  "struggling",
  "average",
  "good",
  "excellent",
  "inconsistent",
  "improving",
];

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function assignPersonaType(globalIndex, total = 398) {
  const counts = {};
  let assigned = 0;
  for (const p of PERSONA_ORDER) {
    counts[p] = Math.floor(total * PERSONA_SHARES[p]);
    assigned += counts[p];
  }
  let remainder = total - assigned;
  let i = 0;
  while (remainder > 0) {
    counts[PERSONA_ORDER[i % PERSONA_ORDER.length]] += 1;
    remainder -= 1;
    i += 1;
  }
  const types = [];
  for (const p of PERSONA_ORDER) {
    for (let c = 0; c < counts[p]; c++) types.push(p);
  }
  while (types.length < total) types.push("average");
  const rng = mulberry32(9001 + globalIndex);
  for (let j = types.length - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    [types[j], types[k]] = [types[k], types[j]];
  }
  return types[globalIndex % types.length] || "average";
}

export function buildStudentProfiles(studentIds) {
  const profiles = {};
  const weakSubjects = {};
  const improvingDayBoost = {};
  const rng = mulberry32(4242);

  studentIds.forEach((id, index) => {
    const persona = assignPersonaType(index, studentIds.length);
    profiles[id] = persona;
    if (rng() < WEAK_SUBJECT_ASSIGN_RATE) {
      weakSubjects[id] = SUBJECTS[Math.floor(rng() * SUBJECTS.length)];
    }
    if (persona === "improving") {
      improvingDayBoost[id] = 0;
    }
  });

  return { profiles, weakSubjects, improvingDayBoost };
}

export function attendanceRoll(persona, rng = Math.random) {
  const p = ATTENDANCE_BY_PERSONA[persona] ?? 0.8;
  return rng() < p;
}

export function scoreForStudent({
  persona,
  isWeakTopic = false,
  schoolDay = 1,
  improvingBoost = 0,
  rng = Math.random,
}) {
  let [lo, hi] = SCORE_RANGES[persona] || SCORE_RANGES.average;
  if (persona === "inconsistent") {
    lo = 10 + Math.floor(rng() * 40);
    hi = lo + 20 + Math.floor(rng() * 30);
  }
  if (persona === "improving") {
    const boost = Math.min(25, (schoolDay - 1) * 2 + improvingBoost);
    lo = Math.min(95, lo + boost);
    hi = Math.min(100, hi + boost);
  }
  let base = lo + Math.floor(rng() * (hi - lo + 1));
  if (isWeakTopic) base = Math.max(5, base - WEAK_SUBJECT_PENALTY);
  return Math.min(100, Math.max(0, base));
}

export function mergeImprovingBoost(improvingDayBoost, studentId, delta = 1) {
  if (improvingDayBoost[studentId] == null) return improvingDayBoost;
  return {
    ...improvingDayBoost,
    [studentId]: (improvingDayBoost[studentId] || 0) + delta,
  };
}
