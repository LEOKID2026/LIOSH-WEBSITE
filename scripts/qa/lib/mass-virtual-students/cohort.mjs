import { SCIENCE_GRADES } from "../../../../data/science-curriculum.js";
import { HISTORY_GRADES } from "../../../../data/history-curriculum.js";
import { GRADES as MOLEDET_GRADES } from "../../../../utils/moledet-geography-constants.js";
import { GRADES as GEOMETRY_GRADES } from "../../../../utils/geometry-constants.js";
import { defaultTopicForSubject } from "../../../virtual-student-qa/scenarios/student-personas.mjs";
import { BEHAVIOR_PROFILES } from "./constants.mjs";
import { studentDisplayName } from "./config.mjs";
import { MOLEDET_GEOGRAPHY_SUBJECT, isMassSimSubjectGradeAllowed } from "./subject-registry.mjs";

const TOPIC_POOL = {
  math: ["addition", "subtraction", "multiplication", "division", "fractions", "word_problems", "compare"],
  geometry: ["shapes_basic", "angles", "area", "symmetry", "coordinates"],
  hebrew: ["reading", "comprehension", "writing", "grammar", "vocabulary"],
  english: ["vocabulary", "grammar", "phonics", "translation", "sentences"],
  science: ["body", "experiments", "materials", "plants", "energy"],
  history: ["what_is_history", "classical_greece", "hellenism_jews", "hasmonaeans", "rome_jews"],
  [MOLEDET_GEOGRAPHY_SUBJECT]: ["homeland", "community", "citizenship", "geography", "values", "maps"],
};

function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFromSeed(seed) {
  let s = fnv1a(String(seed)) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function topicsForSubjectGrade(subject, grade) {
  const pool = TOPIC_POOL[subject] || ["general"];
  if (subject === "science") {
    const gradeTopics = SCIENCE_GRADES[`g${grade}`]?.topics || [];
    if (gradeTopics.length) return gradeTopics.filter((t) => t !== "mixed");
  }
  if (subject === "history") {
    const gradeTopics = HISTORY_GRADES[`g${grade}`]?.topics || [];
    if (gradeTopics.length) return gradeTopics.filter((t) => t !== "mixed");
  }
  if (subject === MOLEDET_GEOGRAPHY_SUBJECT) {
    const gradeTopics = MOLEDET_GRADES[`g${grade}`]?.topics || [];
    if (gradeTopics.length) return gradeTopics.filter((t) => t !== "mixed");
  }
  if (subject === "geometry") {
    const gradeTopics = GEOMETRY_GRADES[`g${grade}`]?.topics || [];
    if (gradeTopics.length) return gradeTopics.filter((t) => t !== "mixed");
  }
  return pool.filter((t) => t !== "mixed");
}

function pickPrimarySubject(subjects, grade, index) {
  for (let j = 0; j < subjects.length; j += 1) {
    const candidate = subjects[(index + j) % subjects.length];
    if (isMassSimSubjectGradeAllowed(candidate, grade)) return candidate;
  }
  return subjects[index % subjects.length];
}

/**
 * Build a planned cohort — deterministic, not random.
 * Ensures subject×grade coverage and distributes behavior profiles.
 */
export function buildPlannedCohort({ students, parents, subjects, grades, runId, focusProfile }) {
  const cohort = [];
  const profileIds = BEHAVIOR_PROFILES.map((p) => p.id);
  const studentsPerParent = Math.ceil(students / parents);
  const focusedProfile = focusProfile
    ? BEHAVIOR_PROFILES.find((p) => p.id === focusProfile)
    : null;
  if (focusProfile && !focusedProfile) {
    throw new Error(`Unknown --focus-profile=${focusProfile}`);
  }

  let seq = 0;
  for (let i = 0; i < students; i += 1) {
    seq += 1;
    const parentIndex = Math.floor(i / studentsPerParent) + 1;
    const studentIndex = (i % studentsPerParent) + 1;

    const grade = grades[i % grades.length];
    const primarySubject = pickPrimarySubject(subjects, grade, i);
    const profile = focusedProfile || BEHAVIOR_PROFILES[i % profileIds.length];
    const secondarySubjects = subjects.filter((s) => s !== primarySubject);
    const topicPool = topicsForSubjectGrade(primarySubject, grade);
    const defaultTopic = defaultTopicForSubject(primarySubject, grade);
    const weaknessCount = profile.weaknessTopics || 0;
    const weaknessTopics = topicPool.slice(0, Math.max(0, weaknessCount));

    const rng = rngFromSeed(`${runId}|${i}|${profile.id}`);

    cohort.push({
      seq,
      parentIndex,
      studentIndex,
      login: `qp${String(parentIndex).padStart(2, "0")}s${String(studentIndex).padStart(3, "0")}`,
      displayName: studentDisplayName({
        grade,
        subject: primarySubject,
        profileId: profile.id,
        profileLabelHe: profile.labelHe,
        seq,
      }),
      grade,
      primarySubject,
      secondarySubjects,
      profile,
      topics: {
        [primarySubject]: topicPool,
      },
      weaknessTopics: {
        [primarySubject]: weaknessTopics,
      },
      defaultTopic: {
        [primarySubject]: defaultTopic,
      },
      attendanceRoll: rng(),
      runId,
    });
  }

  return {
    cohort,
    studentsPerParent,
    coverageMatrix: buildCoverageMatrix(cohort, subjects, grades),
  };
}

function buildCoverageMatrix(cohort, subjects, grades) {
  const matrix = {};
  for (const subject of subjects) {
    matrix[subject] = {};
    for (const grade of grades) {
      matrix[subject][grade] = cohort.filter(
        (s) => s.grade === grade && (s.primarySubject === subject || s.secondarySubjects.includes(subject)),
      ).length;
    }
  }
  return matrix;
}

export function findProfile(profileId) {
  return BEHAVIOR_PROFILES.find((p) => p.id === profileId) || BEHAVIOR_PROFILES[2];
}
