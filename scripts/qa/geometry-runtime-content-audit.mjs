import { generateQuestion } from "../../utils/geometry-question-generator.js";
import { LEVELS } from "../../utils/geometry-constants.js";
import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec.js";
import {
  assignedActivityQuestionUsesChoiceUi,
  geometryQuestionUsesChoiceUi,
} from "../../utils/geometry-activity-answer-ui.js";
import { generateActivityQuestionSetClient } from "../../lib/classroom-activities/generate-activity-questions-client.js";

const GRID_WORDS_RE = /(משבצות|רשת|לוח ריבועים|ריבועים קטנים|תאים)/u;
const TRUE_FALSE_RE = /נכון\s+או\s+לא\s+נכון/u;
const BAD_TEXT_RE = /\?:|\bundefined\b|\bnull\b|\bNaN\b/u;
const FORBIDDEN_STEM_RE = /במישור|שטח הפנים|=\s*\?|(?:^|[^\d])\d+\s+על\s+\d+(?:[^\d]|$)|בחרו\.\s*$/u;

const REQUIRED_SAMPLES = [
  { id: "g2-area", gradeKey: "g2", topics: ["area"], count: 30 },
  { id: "g2-shapes-solids", gradeKey: "g2", topics: ["shapes_basic", "solids"], count: 20 },
  { id: "g3-rotation-angles", gradeKey: "g3", topics: ["rotation", "angles"], count: 30 },
  { id: "g3-classification", gradeKey: "g3", topics: ["parallel_perpendicular", "triangles", "quadrilaterals"], count: 45 },
  { id: "g4-area-perimeter-solids", gradeKey: "g4", topics: ["area", "perimeter", "solids"], count: 30 },
  { id: "g5-heights-tiling", gradeKey: "g5", topics: ["heights", "tiling"], count: 30 },
  { id: "g6-solids-volume-advanced", gradeKey: "g6", topics: ["solids", "volume", "circles", "pythagoras"], count: 30 },
];

const LEVEL_KEYS = ["easy", "medium", "hard"];
const NUMERIC_KIND_RE =
  /^(?:story_)?(?:square_area|rectangle_area|triangle_area|parallelogram_area|trapezoid_area|circle_area|square_perimeter|rectangle_perimeter|triangle_perimeter|circle_perimeter|cube_volume|rectangular_prism_volume|box_volume|cylinder_volume|sphere_volume|cone_volume|pyramid_volume_square|pyramid_volume_rectangular|prism_volume_rectangular|prism_volume_triangle|triangle_angles|rotation|symmetry|diagonal_square|diagonal_rectangle|diagonal_parallelogram|heights_triangle|heights_parallelogram|heights_trapezoid|tiling|tiling_count|solids_faces|solids_vertices|solids_edges|pythagoras_hyp|pythagoras_leg)$/;

function failure(label, q, detail) {
  const kind = q?.params?.kind || "(no kind)";
  return `${label}: ${detail} | grade=${q?.gradeKey || "?"} topic=${q?.topic || "?"} kind=${kind} | ${q?.question}`;
}

function asActivityQuestion(q) {
  return {
    ...q,
    subject: "geometry",
    choices: Array.isArray(q.answers) ? q.answers.map(String) : undefined,
  };
}

function validateQuestion(q, label, { activity = false } = {}) {
  const fails = [];
  const stem = String(q?.question || "").trim();
  const params = q?.params || {};
  const kind = String(params.kind || "").replace(/^story_/, "");
  const choices = Array.isArray(q?.choices)
    ? q.choices.map(String)
    : Array.isArray(q?.answers)
      ? q.answers.map(String)
      : [];
  const choiceUi = activity
    ? assignedActivityQuestionUsesChoiceUi(asActivityQuestion(q))
    : geometryQuestionUsesChoiceUi(params);

  if (!stem) fails.push(failure(label, q, "empty stem"));
  if (BAD_TEXT_RE.test(stem)) fails.push(failure(label, q, "bad visible text token"));
  if (FORBIDDEN_STEM_RE.test(stem)) {
    fails.push(failure(label, q, "forbidden or worksheet-style stem wording"));
  }

  const isTrueFalse =
    TRUE_FALSE_RE.test(stem) ||
    (choices.length > 0 && choices.every((c) => c === "נכון" || c === "לא נכון"));
  if (isTrueFalse) {
    if (!choiceUi) fails.push(failure(label, q, "true/false does not use choice UI"));
    const tfSet = new Set(choices);
    if (!(tfSet.has("נכון") && tfSet.has("לא נכון") && tfSet.size === 2)) {
      fails.push(failure(label, q, "true/false choices must be נכון/לא נכון only"));
    }
    if (choices.length !== 2) fails.push(failure(label, q, "true/false must have exactly 2 choices"));
  }

  if (kind.startsWith("concept_") && !choiceUi) {
    fails.push(failure(label, q, "conceptual question does not use choice UI"));
  }

  if (/בחרו/u.test(stem) && choices.length > 0 && !choiceUi) {
    fails.push(failure(label, q, "choice wording rendered as numeric/text input"));
  }

  if (["triangles", "parallel_perpendicular"].includes(kind)) {
    const answerText = String(q.correctAnswer || "").trim();
    if (answerText && stem.includes(answerText)) {
      fails.push(failure(label, q, "classification stem leaks the correct answer text"));
    }
  }
  if (kind === "quadrilaterals") {
    const typeText = String(params.type || "").trim();
    if (typeText && stem.includes(typeText)) {
      fails.push(failure(label, q, "quadrilateral stem leaks the target type"));
    }
  }

  if (NUMERIC_KIND_RE.test(kind) && choiceUi) {
    fails.push(failure(label, q, "computational/count question should use numeric input, not choice UI"));
  }

  const spec = getGeometryDiagramSpec(q, { hideUnknownValues: true });
  if (q.topic === "area" && GRID_WORDS_RE.test(stem)) {
    if (spec?.grid !== true) {
      fails.push(failure(label, q, "area grid wording without grid diagram"));
    }
    if (kind === "square_area" && params.side !== spec?.gridCols) {
      fails.push(failure(label, q, "square grid columns do not match side"));
    }
    if (kind === "square_area" && params.side !== spec?.gridRows) {
      fails.push(failure(label, q, "square grid rows do not match side"));
    }
    if (kind === "rectangle_area" && params.length !== spec?.gridCols) {
      fails.push(failure(label, q, "rectangle grid columns do not match length"));
    }
    if (kind === "rectangle_area" && params.width !== spec?.gridRows) {
      fails.push(failure(label, q, "rectangle grid rows do not match width"));
    }
  }

  if (kind === "tiling_count" && spec != null) {
    fails.push(failure(label, q, "tiling_count should not show an imprecise diagram"));
  }

  return fails;
}

function sampleRuntimeQuestions(group) {
  const out = [];
  const seen = new Set();
  const maxAttempts = group.count * 120;
  for (let attempt = 0; attempt < maxAttempts && out.length < group.count; attempt += 1) {
    const topic = group.topics[attempt % group.topics.length];
    const levelKey = LEVEL_KEYS[attempt % LEVEL_KEYS.length];
    const q = generateQuestion(LEVELS[levelKey], topic, group.gradeKey, null);
    if (!q?.question || q.correctAnswer == null || q.params?.kind === "no_question") continue;
    const fp = `${q.question}|${q.correctAnswer}`;
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push({ ...q, gradeKey: group.gradeKey, difficulty: levelKey, topic: q.topic || topic });
  }
  return out;
}

async function sampleParentActivityQuestions(group) {
  const out = [];
  for (const topic of group.topics) {
    const take = Math.min(5, Math.max(1, Math.ceil(group.count / group.topics.length)));
    try {
      const items = await generateActivityQuestionSetClient({
        subject: "geometry",
        gradeLevel: group.gradeKey,
        topic,
        difficulty: "easy",
        count: take,
      });
      out.push(...items.map((q) => ({ ...q, gradeKey: group.gradeKey, topic: q.topic || topic })));
    } catch (err) {
      out.push({
        question: `PARENT_ACTIVITY_GENERATION_FAILED: ${String(err?.message || err)}`,
        correctAnswer: "0",
        params: { kind: "qa_generation_failed" },
        gradeKey: group.gradeKey,
        topic,
      });
    }
  }
  return out;
}

const runtimeSamples = [];
const parentSamples = [];
const failures = [];

for (const group of REQUIRED_SAMPLES) {
  const questions = sampleRuntimeQuestions(group);
  if (questions.length !== group.count) {
    failures.push(`${group.id}: expected ${group.count} runtime samples, got ${questions.length}`);
  }
  runtimeSamples.push(...questions);
  for (const q of questions) failures.push(...validateQuestion(q, `runtime:${group.id}`));

  const parentQuestions = await sampleParentActivityQuestions(group);
  parentSamples.push(...parentQuestions);
  for (const q of parentQuestions) {
    failures.push(...validateQuestion(q, `parent:${group.id}`, { activity: true }));
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      runtimeSamples: runtimeSamples.length,
      parentActivitySamples: parentSamples.length,
      groups: REQUIRED_SAMPLES.map(({ id, count }) => ({ id, requiredRuntimeSamples: count })),
    },
    null,
    2
  )
);
