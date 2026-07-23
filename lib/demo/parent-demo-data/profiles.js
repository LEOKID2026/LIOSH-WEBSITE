/** @typedef {import('./children.js').DemoParentChild} DemoParentChild */

/**
 * @typedef {{
 *   weekdayActivityRate: number,
 *   weekendActivityRate: number,
 *   sessionsMin: number,
 *   sessionsMax: number,
 *   questionsMin: number,
 *   questionsMax: number,
 *   accuracyBias: Record<string, number>,
 *   strongSubjects: string[],
 *   weakSubjects: string[],
 *   assignedActivityEveryDays: number,
 * }} DemoChildProfile
 */

/** @type {Record<string, DemoChildProfile>} */
export const DEMO_CHILD_PROFILES = Object.freeze({
  young_balanced: {
    weekdayActivityRate: 0.55,
    weekendActivityRate: 0.25,
    sessionsMin: 1,
    sessionsMax: 2,
    questionsMin: 8,
    questionsMax: 15,
    accuracyBias: {
      math: -0.12,
      hebrew: 0.08,
      english: 0.06,
      geometry: -0.05,
      science: 0.02,
    },
    strongSubjects: ["hebrew", "english"],
    weakSubjects: ["math"],
    assignedActivityEveryDays: 7,
  },
  strong_stem: {
    weekdayActivityRate: 0.62,
    weekendActivityRate: 0.35,
    sessionsMin: 1,
    sessionsMax: 3,
    questionsMin: 10,
    questionsMax: 20,
    accuracyBias: {
      math: 0.12,
      hebrew: -0.04,
      english: 0.05,
      geometry: 0.1,
      science: 0.14,
    },
    strongSubjects: ["math", "science"],
    weakSubjects: ["hebrew"],
    assignedActivityEveryDays: 6,
  },
  needs_writing: {
    weekdayActivityRate: 0.58,
    weekendActivityRate: 0.3,
    sessionsMin: 2,
    sessionsMax: 3,
    questionsMin: 12,
    questionsMax: 22,
    accuracyBias: {
      math: 0.06,
      hebrew: 0.04,
      english: -0.2,
      geometry: 0.12,
      science: 0.05,
    },
    strongSubjects: ["geometry", "science"],
    weakSubjects: ["english"],
    assignedActivityEveryDays: 7,
  },
});

/**
 * @param {DemoParentChild} child
 * @returns {DemoChildProfile}
 */
export function getDemoChildProfile(child) {
  return DEMO_CHILD_PROFILES[child.profileKey] || DEMO_CHILD_PROFILES.young_balanced;
}

/**
 * @param {DemoChildProfile} profile
 * @param {() => number} rnd
 */
export function pickDemoSubject(profile, rnd) {
  const roll = rnd();
  if (roll < 0.35 && profile.weakSubjects.length) {
    return profile.weakSubjects[Math.floor(rnd() * profile.weakSubjects.length)];
  }
  if (roll < 0.7 && profile.strongSubjects.length) {
    return profile.strongSubjects[Math.floor(rnd() * profile.strongSubjects.length)];
  }
  const pool = ["math", "hebrew", "english", "geometry", "science"];
  return pool[Math.floor(rnd() * pool.length)];
}
