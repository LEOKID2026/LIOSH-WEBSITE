/**
 * Real content-source lookup for registered curriculum-skill prerequisites
 * (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md, Part 2).
 *
 * A registered skill id (utils/curriculum-skill-entity-registry.js) is only
 * useful for `exact_skill` prerequisite routing if a real question bank can
 * actually serve content for it. This module is the single place that knows
 * how to query each subject's bank by `diagnosticSkillId` — no per-master
 * duplication, and no `exact_skill` claim can be honored anywhere without
 * going through here first.
 */
import {
  GEOMETRY_CONCEPTUAL_ITEMS,
  renderGeometryConceptualRowToQuestion,
} from "../../utils/geometry-conceptual-bank.js";
import { SCIENCE_QUESTIONS } from "../../data/science-questions.js";
import { HEBREW_RICH_POOL } from "../../utils/hebrew-rich-question-bank.js";
import { curriculumSkillEntity } from "../../utils/curriculum-skill-entity-registry.js";

function geometryRowsForSkill(skillId) {
  return GEOMETRY_CONCEPTUAL_ITEMS.filter((row) => row.diagnosticSkillId === skillId);
}

function scienceRowsForSkill(skillId) {
  return SCIENCE_QUESTIONS.filter(
    (row) => row.skillId === skillId || row.params?.diagnosticSkillId === skillId,
  );
}

function hebrewRowsForSkill(skillId) {
  return HEBREW_RICH_POOL.filter((row) => row.diagnosticSkillId === skillId);
}

const BANK_QUERIES = Object.freeze({
  geometry: geometryRowsForSkill,
  science: scienceRowsForSkill,
  hebrew: hebrewRowsForSkill,
});

/**
 * @param {string} skillId
 * @param {string} subjectId
 * @returns {boolean}
 */
export function hasContentForSkill(skillId, subjectId) {
  const query = BANK_QUERIES[String(subjectId || "")];
  if (!query || !skillId) return false;
  return query(skillId).length > 0;
}

/**
 * Subjects whose master page actually wires `contentOverrideTarget` into its
 * question-generation loop (i.e. genuinely renders an exact-skill question,
 * not just resolves one). This is deliberately a SEPARATE, narrower set than
 * `BANK_QUERIES` above: a subject can have real bank content for a skill
 * (hasContentForSkill === true) while its master's UI still doesn't consume
 * it yet — see docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md
 * (round 4, exact_skill gating). `resolvePrerequisitePrecision`
 * (utils/action-decision-contract/prerequisite-precision.js) checks this set
 * before ever producing `precision: "exact_skill"` — a contract must never
 * promise an action that has no runtime consumer. Add a subject here only
 * once its master file actually reads `usePrerequisiteContentOverride` /
 * `pickQuestionForSkill` in its question-generation loop.
 */
export const EXACT_SKILL_CONSUMER_SUBJECTS = new Set(["geometry"]);

/**
 * @param {string} subjectId
 * @returns {boolean}
 */
export function hasExactSkillConsumer(subjectId) {
  return EXACT_SKILL_CONSUMER_SUBJECTS.has(String(subjectId || ""));
}

/**
 * The single place that turns a validated `routePolicy.prerequisite` skill
 * id into a real content-selection target. Returns null (never invents a
 * fallback) if the skill isn't registered for this subject or has no real
 * bank content — callers must fall back to normal topic-level selection.
 * @param {{ subjectId: string, skillId: string }} input
 * @returns {{ subject: string, topic: string|null, skillId: string, bankSize: number }|null}
 */
export function resolveContentOverrideTarget({ subjectId, skillId }) {
  const sid = String(subjectId || "");
  const id = String(skillId || "").trim();
  if (!sid || !id) return null;
  const entity = curriculumSkillEntity(id);
  if (!entity || entity.subjectId !== sid) return null;
  const query = BANK_QUERIES[sid];
  const rows = query ? query(id) : [];
  if (rows.length === 0) return null;
  return {
    subject: sid,
    topic: entity.topicKey || null,
    skillId: id,
    bankSize: rows.length,
  };
}

export function emptyContentOverrideState() {
  return { decisionKey: null, target: null };
}

function overrideDecisionKeyFor(directive) {
  // createdAt lives at directive.lifecycle.createdAt (see
  // lib/learning/action-decision-executor.js's baseDirective) — NOT
  // directive.createdAt.
  return `${String(directive?.sourceContractVersion || "")}:${String(directive?.lifecycle?.createdAt || "")}`;
}

/**
 * Pure state machine backing hooks/usePrerequisiteContentOverride.js —
 * directly testable without a React renderer. Never mutates `prevState`.
 * @param {ReturnType<typeof emptyContentOverrideState>} prevState
 * @param {object|null|undefined} directive
 * @param {string} subjectId
 */
export function advanceContentOverride(prevState, directive, subjectId) {
  const active = directive?.active === true && directive?.action === "strengthen_prerequisite";
  if (!active) {
    return prevState.decisionKey === null ? prevState : emptyContentOverrideState();
  }
  const key = overrideDecisionKeyFor(directive);
  if (key === prevState.decisionKey) return prevState;
  const skillId = directive?.routePolicy?.prerequisite || null;
  const target = skillId ? resolveContentOverrideTarget({ subjectId, skillId }) : null;
  return { decisionKey: key, target };
}

/**
 * Deterministic pick of a real question for a validated skill id — used by
 * masters to actually render the prerequisite content, and by tests to
 * prove a real question (not a placeholder) comes back.
 * @param {string} subjectId
 * @param {string} skillId
 * @param {number} [index]
 */
export function pickQuestionForSkill(subjectId, skillId, index = 0) {
  const query = BANK_QUERIES[String(subjectId || "")];
  const rows = query ? query(skillId) : [];
  if (rows.length === 0) return null;
  const row = rows[Math.abs(index) % rows.length];
  if (subjectId === "geometry") {
    return renderGeometryConceptualRowToQuestion(row, {
      gradeKey: "g4",
      levelKey: "medium",
      topic: Array.isArray(row.topics) ? row.topics[0] : row.topic,
    });
  }
  return row;
}
