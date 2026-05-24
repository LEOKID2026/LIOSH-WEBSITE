/**
 * 20 fixed teacher-classroom simulation student personas (grade-agnostic metadata;
 * grade comes from CLI --grade).
 *
 * Profiles match virtual-student-qa answer-profiles keys:
 *   strong | average | weak | targeted
 */

export const PERSONA_SLOTS = Object.freeze(
  Array.from({ length: 20 }, (_, i) => i + 1)
);

/** @type {Record<number, object>} */
export const PERSONAS_BY_SLOT = Object.freeze({
  1: { kind: "strong-consistent", consistency: 0.95, defaultProfile: "strong", weaknesses: {}, evolution: "flat", dailyMinutesRange: [25, 45], maxSessions: 2 },
  2: { kind: "strong-consistent", consistency: 0.92, defaultProfile: "strong", weaknesses: {}, evolution: "flat", dailyMinutesRange: [20, 40], maxSessions: 2 },
  3: { kind: "strong-consistent", consistency: 0.9, defaultProfile: "strong", weaknesses: {}, evolution: "flat", dailyMinutesRange: [25, 45], maxSessions: 2 },
  4: { kind: "strong-consistent", consistency: 0.88, defaultProfile: "strong", weaknesses: {}, evolution: "flat", dailyMinutesRange: [20, 40], maxSessions: 2 },
  5: { kind: "average-stable", consistency: 0.82, defaultProfile: "average", weaknesses: {}, evolution: "flat", dailyMinutesRange: [20, 35], maxSessions: 2 },
  6: { kind: "average-stable", consistency: 0.8, defaultProfile: "average", weaknesses: {}, evolution: "flat", dailyMinutesRange: [20, 35], maxSessions: 2 },
  7: { kind: "average-stable", consistency: 0.78, defaultProfile: "average", weaknesses: {}, evolution: "flat", dailyMinutesRange: [18, 32], maxSessions: 2 },
  8: { kind: "average-stable", consistency: 0.75, defaultProfile: "average", weaknesses: {}, evolution: "flat", dailyMinutesRange: [18, 30], maxSessions: 2 },
  9: { kind: "average-stable", consistency: 0.72, defaultProfile: "average", weaknesses: {}, evolution: "flat", dailyMinutesRange: [15, 30], maxSessions: 2 },
  10: { kind: "weak-math", consistency: 0.75, defaultProfile: "average", weaknesses: { math: "targeted" }, evolution: "flat", dailyMinutesRange: [18, 35], maxSessions: 2 },
  11: { kind: "weak-hebrew", consistency: 0.75, defaultProfile: "average", weaknesses: { hebrew: "targeted" }, evolution: "flat", dailyMinutesRange: [18, 35], maxSessions: 2 },
  12: { kind: "weak-science", consistency: 0.72, defaultProfile: "average", weaknesses: { science: "targeted" }, evolution: "flat", dailyMinutesRange: [18, 32], maxSessions: 2 },
  13: { kind: "weak-english", consistency: 0.72, defaultProfile: "average", weaknesses: { english: "targeted" }, evolution: "flat", dailyMinutesRange: [18, 32], maxSessions: 2 },
  14: { kind: "low-activity", consistency: 0.35, defaultProfile: "average", weaknesses: {}, evolution: "flat", dailyMinutesRange: [5, 15], maxSessions: 1 },
  15: { kind: "low-activity", consistency: 0.32, defaultProfile: "average", weaknesses: {}, evolution: "flat", dailyMinutesRange: [5, 12], maxSessions: 1 },
  16: { kind: "repeated-mistake", consistency: 0.85, defaultProfile: "average", weaknesses: { math: "targeted", hebrew: "targeted" }, evolution: "flat", dailyMinutesRange: [20, 35], maxSessions: 2 },
  17: { kind: "repeated-mistake", consistency: 0.82, defaultProfile: "average", weaknesses: { geometry: "targeted", science: "targeted" }, evolution: "flat", dailyMinutesRange: [20, 35], maxSessions: 2 },
  18: { kind: "improving", consistency: 0.8, defaultProfile: "weak", weaknesses: {}, evolution: "improving", dailyMinutesRange: [25, 40], maxSessions: 2 },
  19: { kind: "improving", consistency: 0.78, defaultProfile: "weak", weaknesses: {}, evolution: "improving", dailyMinutesRange: [22, 38], maxSessions: 2 },
  20: { kind: "inconsistent", consistency: 0.3, defaultProfile: "average", weaknesses: {}, evolution: "inconsistent", dailyMinutesRange: [0, 25], maxSessions: 2 },
});

export function getPersona(slot) {
  return PERSONAS_BY_SLOT[slot] || PERSONAS_BY_SLOT[5];
}

export function resolveProfileForSession(persona, subject, topic, stateStudent) {
  let profile = stateStudent?.defaultProfile || persona.defaultProfile;
  const weaknessMap = persona.weaknesses || {};
  if (weaknessMap[subject] === "targeted") {
    profile = "targeted";
  }
  return profile;
}

export function evolveProfileAfterRun(persona, stateStudent, sessionAccuracy) {
  const next = { ...stateStudent };
  if (persona.evolution === "improving" && sessionAccuracy >= 0.55) {
    if (next.defaultProfile === "weak") next.defaultProfile = "average";
  } else if (persona.evolution === "declining" && sessionAccuracy < 0.5) {
    if (next.defaultProfile === "average") next.defaultProfile = "weak";
  } else if (persona.evolution === "inconsistent") {
    next.defaultProfile = sessionAccuracy >= 0.7 ? "strong" : sessionAccuracy < 0.45 ? "weak" : "average";
  }
  return next;
}
