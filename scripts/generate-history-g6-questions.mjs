#!/usr/bin/env node
/**
 * Generate History G6 MCQ bank from Hebrew-only seeds.
 * Run: node scripts/generate-history-g6-questions.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HISTORY_G6_CONTENT_MAP as HISTORY_G6_CONTENT_MAP_SOURCE } from "../data/history-g6-content-map.js";
import { HISTORY_G6_QUESTION_SEEDS } from "../data/history-g6-question-seeds-he.js";

const HISTORY_G6_CONTENT_MAP = HISTORY_G6_CONTENT_MAP_SOURCE || {};

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data", "history-questions");
const OUT_FILE = join(OUT_DIR, "g6-generated.js");

const LEVELS = ["easy", "medium", "hard"];
const LEVEL_HE = { easy: "קלה", medium: "בינונית", hard: "מתקדמת" };
const DIFF = { easy: "basic", medium: "standard", hard: "advanced" };
const COG = { easy: "recall", medium: "understanding", hard: "application" };

const LATIN = /[a-zA-Z]/;
const INTERNAL_IN_STEM = [
  /\bhist_[a-z0-9_]+/i,
  /מוקד\s+[a-z0-9_]/i,
  /primary_source|secondary_source|concept_tag/i,
];

function assertChildHebrew(label, text) {
  const s = String(text || "");
  if (LATIN.test(s)) {
    throw new Error(`${label}: Latin letters in child text: ${s.slice(0, 80)}`);
  }
  if (INTERNAL_IN_STEM.some((re) => re.test(s))) {
    throw new Error(`${label}: internal fragment in child text: ${s.slice(0, 80)}`);
  }
}

function validateSeedItem(item, subtopicKey) {
  assertChildHebrew(`${subtopicKey}.stem`, item.stem);
  assertChildHebrew(`${subtopicKey}.explanation`, item.explanation);
  if (!Array.isArray(item.options) || item.options.length !== 4) {
    throw new Error(`${subtopicKey}: expected 4 options`);
  }
  item.options.forEach((opt, i) => {
    assertChildHebrew(`${subtopicKey}.options[${i}]`, opt);
  });
}

function normStem(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function childStem(lvl, core) {
  void lvl;
  return String(core || "").trim();
}

function errorTypesForSkill(skillId) {
  const map = {
    hist_concepts: ["concept_confusion", "fact_recall_gap"],
    hist_timeline_sequence: ["timeline_error", "sequence_confusion"],
    hist_cause_effect: ["cause_effect_reversal", "concept_confusion"],
    hist_comparison: ["comparison_error", "concept_confusion"],
    hist_figures_roles: ["figure_role_confusion", "fact_recall_gap"],
    hist_governance_institutions: ["institution_confusion", "concept_confusion"],
    hist_culture_heritage: ["heritage_confusion", "fact_recall_gap"],
    hist_simple_source: ["source_type_confusion", "reading_comprehension_error"],
    hist_past_present_link: ["past_present_confusion", "concept_confusion"],
  };
  return map[skillId] || ["concept_confusion", "fact_recall_gap"];
}

function resolveSubtopicMeta(subtopicKey) {
  for (const [topicKey, cfg] of Object.entries(HISTORY_G6_CONTENT_MAP)) {
    for (const st of cfg.subtopics) {
      if (st.id === subtopicKey) {
        return { topicKey, skillId: st.skillId, weight: st.weight };
      }
    }
  }
  return { topicKey: "mixed", skillId: "hist_concepts", weight: 5 };
}

function inferLevelStem(lvl, bankItem) {
  const easy = String(bankItem.stem || "").trim();
  if (lvl === "medium" && bankItem.stemMedium) return String(bankItem.stemMedium).trim();
  if (lvl === "hard" && bankItem.stemHard) return String(bankItem.stemHard).trim();
  if (lvl === "easy") return easy;

  const skillId = bankItem.skillId || "";
  if (lvl === "medium") {
    if (easy.startsWith("מהו ") || easy.startsWith("מהי ")) {
      return easy.replace(/^מה[וי]\s+/, "איזו הגדרה מתאימה ל");
    }
    if (easy.startsWith("למה ")) return easy;
    if (easy.startsWith("איזה ") || easy.startsWith("איזו ")) return easy;
    return `בחרו את התשובה המדויקת ביותר: ${easy}`;
  }

  if (skillId === "hist_cause_effect" || String(bankItem.concept || "").includes("cause")) {
    if (easy.startsWith("למה ")) return easy.replace(/^למה /, "מהי התוצאה העיקרית של ");
    return `מהי הקשר הסיבתי הנכון בין האירועים: ${easy.replace(/\?$/, "")}?`;
  }
  if (skillId === "hist_comparison") {
    return `השוו והסבירו: ${easy.replace(/\?$/, "")}?`;
  }
  if (skillId === "hist_timeline_sequence") {
    return `סדרו לפי הזמן — ${easy.replace(/\?$/, "")}?`;
  }
  if (skillId === "hist_simple_source") {
    return `על סמך מקור היסטורי — ${easy.replace(/\?$/, "")}?`;
  }
  if (easy.startsWith("מה ")) {
    return easy.replace(/^מה /, "הסבירו מדוע חשוב לדעת: מה ");
  }
  return `הסבירו והוכיחו: ${easy.replace(/\?$/, "")}?`;
}

function stemForLevel(lvl, bankItem) {
  return inferLevelStem(lvl, bankItem);
}

function emitQuestion(subtopicKey, lvl, bankItem, idx) {
  const { topicKey, skillId: mapSkillId } = resolveSubtopicMeta(subtopicKey);
  const skillId = bankItem.skillId || mapSkillId;
  const diff = DIFF[lvl];
  const cog = COG[lvl];
  const id = `hist_g6_${subtopicKey}_${lvl}_${String(idx + 1).padStart(2, "0")}`;
  const stem = childStem(lvl, stemForLevel(lvl, bankItem));
  const errTypes = bankItem.errorTypes || errorTypesForSkill(skillId);

  assertChildHebrew(`${id}.stem`, stem);

  return {
    id,
    topic: topicKey,
    subtopicKey,
    grades: ["g6"],
    minLevel: lvl,
    maxLevel: lvl,
    type: "mcq",
    questionType: "mcq",
    stem,
    options: bankItem.options,
    correctIndex: bankItem.correctIndex,
    explanation: bankItem.explanation,
    params: {
      subtopicKey,
      subskillId: subtopicKey,
      patternFamily: `hist_g6_${subtopicKey}_${bankItem.concept}`,
      subtype: subtopicKey,
      conceptTag: `hist_${subtopicKey}_${bankItem.concept}`,
      diagnosticSkillId: skillId,
      probePower: lvl === "hard" ? "high" : "medium",
      expectedErrorTags: errTypes,
      expectedErrorTypes: errTypes,
      cognitiveLevel: cog,
      difficulty: diff,
      kind: "g6_generated",
    },
  };
}

// Validate all seeds before generation
const expectedSubtopics = Object.values(HISTORY_G6_CONTENT_MAP).flatMap((t) =>
  t.subtopics.map((s) => s.id)
);
for (const subtopicKey of expectedSubtopics) {
  const bank = HISTORY_G6_QUESTION_SEEDS[subtopicKey];
  if (!bank || bank.length !== 14) {
    throw new Error(`Missing or incomplete seeds for ${subtopicKey} (need 14, got ${bank?.length ?? 0})`);
  }
  bank.forEach((item) => validateSeedItem(item, subtopicKey));
}

const generated = [];
const usedStems = new Set();

for (const subtopicKey of expectedSubtopics) {
  const bank = HISTORY_G6_QUESTION_SEEDS[subtopicKey];
  for (const lvl of LEVELS) {
    bank.forEach((item, idx) => {
      const q = emitQuestion(subtopicKey, lvl, item, idx);
      const ns = `${lvl}|${subtopicKey}|${item.concept}|${normStem(q.stem)}`;
      if (usedStems.has(ns)) return;
      usedStems.add(ns);
      generated.push(q);
    });
  }
}

// Final pass on all child-facing fields
for (const q of generated) {
  assertChildHebrew(q.id, q.stem);
  q.options.forEach((opt, i) => assertChildHebrew(`${q.id}.opt${i}`, opt));
  assertChildHebrew(`${q.id}.expl`, q.explanation);
}

mkdirSync(OUT_DIR, { recursive: true });

const header = `/** Auto-generated by scripts/generate-history-g6-questions.mjs — do not edit by hand */
export const HISTORY_QUESTIONS_G6_RAW = `;

writeFileSync(
  OUT_FILE,
  `${header}${JSON.stringify(generated, null, 2)};\n\nexport const HISTORY_QUESTIONS_G6_COUNT = ${generated.length};\n`,
  "utf8"
);

console.log(`Generated ${generated.length} unique history G6 questions → ${OUT_FILE}`);
if (generated.length < 650) {
  console.error(`FAIL: expected >=650, got ${generated.length}`);
  process.exit(1);
}
