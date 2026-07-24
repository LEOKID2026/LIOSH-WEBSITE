import { mcqCellValue } from "./mcq-option-cell.js";

const CONCEPTUAL_TOPIC_TAG = Object.freeze({
  parallel_perpendicular: "shape_property_confusion",
  heights: "area_formula_error",
  tiling: "angle_range_error",
  solids: "shape_property_confusion",
  pythagoras: "pythagorean_relation_error",
});

function key(value) {
  return String(mcqCellValue(value) ?? "").trim();
}

/**
 * Conceptual geometry bank rows expose a real distractor family but historically
 * did not attach it to the selected option. Mark one concrete wrong option and
 * leave the remaining options generic for random-error falsification.
 */
export function attachGeometryTopicDiagnosticEvidence(question) {
  if (!question || typeof question !== "object") return question;
  const topic = String(question.topic || "");
  const tag = CONCEPTUAL_TOPIC_TAG[topic];
  const answers = Array.isArray(question.answers) ? question.answers : [];
  if (!tag || answers.length < 2) return question;

  const correct = key(question.correctAnswer);
  const wrongIndex = answers.findIndex((answer) => key(answer) !== correct);
  if (wrongIndex < 0) return question;

  const cells = answers.map((answer, index) => ({
    value: mcqCellValue(answer),
    distractorFamily:
      key(answer) === correct
        ? null
        : index === wrongIndex
          ? tag
          : "generic_proximity",
    misconceptionTag: index === wrongIndex ? tag : null,
    index,
  }));

  return {
    ...question,
    params: {
      ...(question.params || {}),
      mcqOptionCells: cells,
      topicDiagnosticEvidence: {
        version: "geometry-topic-diagnostic-evidence-v1",
        tag,
        wrongAnswer: mcqCellValue(answers[wrongIndex]),
        topicLevelOnly: true,
      },
    },
  };
}
