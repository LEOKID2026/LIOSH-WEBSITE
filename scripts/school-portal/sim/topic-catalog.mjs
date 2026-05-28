/**
 * Real topic keys per subject × grade (aligned with demo-school-data + product catalog).
 */

const TOPICS_BY_SUBJECT_GRADE = {
  math: {
    1: ["addition", "subtraction"],
    2: ["addition", "subtraction"],
    3: ["multiplication", "division", "fractions"],
    4: ["multiplication", "division", "fractions"],
    5: ["fractions", "ratio", "word_problems"],
    6: ["fractions", "ratio", "word_problems"],
  },
  geometry: {
    2: ["shapes"],
    3: ["shapes", "angles"],
    4: ["shapes", "angles"],
    5: ["shapes", "angles", "area", "perimeter"],
    6: ["shapes", "angles", "area", "perimeter"],
  },
  hebrew: {
    1: ["vowels_reading", "plurals"],
    2: ["vowels_reading", "plurals"],
    3: ["plurals", "verb_forms"],
    4: ["plurals", "verb_forms"],
    5: ["verb_forms", "sentence_structure"],
    6: ["verb_forms", "sentence_structure"],
  },
  english: {
    1: ["vocabulary", "simple_sentences"],
    2: ["vocabulary", "simple_sentences"],
    3: ["vocabulary", "grammar_basics"],
    4: ["vocabulary", "grammar_basics"],
    5: ["vocabulary", "reading_comprehension"],
    6: ["vocabulary", "reading_comprehension"],
  },
  science: {
    1: ["living_things", "animals"],
    2: ["living_things", "animals"],
    3: ["animals", "plants", "matter"],
    4: ["animals", "plants", "matter"],
    5: ["environment", "matter", "forces"],
    6: ["environment", "matter", "forces"],
  },
  moledet_geography: {
    3: ["community", "maps_basic"],
    4: ["community", "maps_basic"],
    5: ["maps", "regions", "history"],
    6: ["maps", "regions", "history"],
  },
};

export function pickTopic(subject, grade, seed = 0) {
  const g = Math.min(6, Math.max(1, Number(grade) || 1));
  const list = TOPICS_BY_SUBJECT_GRADE[subject]?.[g];
  if (!list?.length) return subject;
  return list[seed % list.length];
}

export function buildQuestionSet(topic, count = 10) {
  const items = [];
  for (let i = 1; i <= count; i++) {
    const difficulty = i <= 3 ? "easy" : i <= 7 ? "medium" : "hard";
    items.push({
      questionId: `${topic}-q${String(i).padStart(2, "0")}`,
      topic: topic || "general",
      difficulty,
      questionText: `שאלה ${i}`,
      options: ["א", "ב", "ג", "ד"],
      correctAnswer: "ב",
      skillKey: `${topic || "general"}_skill`,
    });
  }
  return items;
}
