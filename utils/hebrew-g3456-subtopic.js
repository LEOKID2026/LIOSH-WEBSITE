import * as g3ContentMod from "../data/hebrew-g3-content-map.js";
import * as g4ContentMod from "../data/hebrew-g4-content-map.js";
import * as g5ContentMod from "../data/hebrew-g5-content-map.js";
import * as g6ContentMod from "../data/hebrew-g6-content-map.js";
import { resolveModuleExport } from "./resolve-module-export.js";

const HEBREW_G3_CONTENT_MAP = resolveModuleExport(g3ContentMod, "HEBREW_G3_CONTENT_MAP");
const G3_FLAGS_DEFAULT = resolveModuleExport(g3ContentMod, "G3_FLAGS_DEFAULT");
const HEBREW_G4_CONTENT_MAP = resolveModuleExport(g4ContentMod, "HEBREW_G4_CONTENT_MAP");
const G4_FLAGS_DEFAULT = resolveModuleExport(g4ContentMod, "G4_FLAGS_DEFAULT");
const HEBREW_G5_CONTENT_MAP = resolveModuleExport(g5ContentMod, "HEBREW_G5_CONTENT_MAP");
const G5_FLAGS_DEFAULT = resolveModuleExport(g5ContentMod, "G5_FLAGS_DEFAULT");
const HEBREW_G6_CONTENT_MAP = resolveModuleExport(g6ContentMod, "HEBREW_G6_CONTENT_MAP");
const G6_FLAGS_DEFAULT = resolveModuleExport(g6ContentMod, "G6_FLAGS_DEFAULT");

const ALL_MODES_FALLBACK = ["learning", "challenge", "speed", "marathon", "practice"];

/** @type {Record<string, { map: typeof HEBREW_G3_CONTENT_MAP, defaults: typeof G3_FLAGS_DEFAULT, fallbackId: string }>} */
const UPPER_REGISTRY = {
  g3: { map: HEBREW_G3_CONTENT_MAP, defaults: G3_FLAGS_DEFAULT, fallbackId: "g3.multi_sentence" },
  g4: { map: HEBREW_G4_CONTENT_MAP, defaults: G4_FLAGS_DEFAULT, fallbackId: "g4.genre_mix" },
  g5: { map: HEBREW_G5_CONTENT_MAP, defaults: G5_FLAGS_DEFAULT, fallbackId: "g5.multi_layer_read" },
  g6: { map: HEBREW_G6_CONTENT_MAP, defaults: G6_FLAGS_DEFAULT, fallbackId: "g6.complex_text_analysis" },
};

function isUpperHebrewGradeKey(gradeKey) {
  const g = String(gradeKey || "").toLowerCase();
  return g === "g3" || g === "g4" || g === "g5" || g === "g6";
}

/**
 * @param {typeof HEBREW_G3_CONTENT_MAP} contentMap
 * @param {string} topicKey
 * @param {string} fallbackId
 */
function pickSubtopicIdFromMap(contentMap, topicKey, fallbackId) {
  const list = contentMap[topicKey]?.subtopics;
  if (!Array.isArray(list) || list.length === 0) return fallbackId;
  const total = list.reduce((sum, s) => sum + (Number(s.weight) > 0 ? Number(s.weight) : 1), 0);
  let r = Math.random() * total;
  for (const s of list) {
    const w = Number(s.weight) > 0 ? Number(s.weight) : 1;
    r -= w;
    if (r <= 0) return s.id;
  }
  return list[list.length - 1].id;
}

/**
 * @param {typeof HEBREW_G3_CONTENT_MAP} contentMap
 * @param {string} topicKey
 * @param {string} subtopicId
 */
function getSpecFromMap(contentMap, topicKey, subtopicId) {
  const list = contentMap[topicKey]?.subtopics;
  if (!Array.isArray(list)) return null;
  return list.find((s) => s.id === subtopicId) || null;
}

function inferG3SubtopicIdFromStem(stem, topicKey) {
  const low = String(stem || "").toLowerCase();
  if (topicKey === "reading") {
    if (/מידעי|עובדות|מידע\s+מול|ז׳אנר|סיפור\s+מול/.test(low)) return "g3.genre_tag_info_vs_story";
    if (/ספרותי|שיר|סיפור קצר/.test(low)) return "g3.genre_tag_info_vs_story";
    return "g3.multi_sentence";
  }
  if (topicKey === "comprehension") {
    if (/השוו|השוואה|מול\s/.test(low)) return "g3.compare_light";
    if (/בגלל|לכן|סיבה|תוצאה|השפעה/.test(low)) return "g3.cause_effect";
    if (/מפורש|בטקסט\s+נאמר|לפי\s+הטקסט\s+בלבד/.test(low)) return "g3.explicit_only";
    return "g3.explicit_only";
  }
  if (topicKey === "writing") {
    if (/מילות?\s+קישור|וגם|אבל|לכן|מחברים/.test(low)) return "g3.connector_use_choice";
    if (/מבנה|פתיחה|אמצע|סיום|פסקאות/.test(low)) return "g3.two_three_sentences_structure";
    return "g3.two_three_sentences_structure";
  }
  if (topicKey === "grammar") {
    if (/ביניין|שורש|גזרה/.test(low)) return "g3.binyan_light";
    if (/מילת\s+קישור|קישור/.test(low)) return "g3.connectors";
    if (/זמן|עבר|הווה|עתיד|נטיית/.test(low)) return "g3.tense_system_intro";
    return "g3.tense_system_intro";
  }
  if (topicKey === "vocabulary") {
    if (/משפחת|משפחה|שורש/.test(low)) return "g3.word_families";
    if (/הקשר|משמעות/.test(low)) return "g3.context_meaning";
    return "g3.context_meaning";
  }
  if (topicKey === "speaking") {
    return "g3.discussion_prompt_choice";
  }
  return "g3.multi_sentence";
}

function inferG4SubtopicIdFromStem(stem, topicKey) {
  const low = String(stem || "").toLowerCase();
  if (topicKey === "reading") {
    if (/מידעי|עובדות|מידע/.test(low)) return "g4.info_lit_intro";
    if (/שיר|סיפור|ז׳אנר/.test(low)) return "g4.genre_mix";
    return "g4.genre_mix";
  }
  if (topicKey === "comprehension") {
    if (/מבנה|פסקה|פתיחה|גוף|סיום/.test(low)) return "g4.text_structure";
    if (/מסכמים|סיכום|לסכם/.test(low)) return "g4.summary_intro";
    return "g4.summary_intro";
  }
  if (topicKey === "writing") {
    if (/ז׳אנר|סגנון|לשון\s+מתאימה/.test(low)) return "g4.genre_appropriate_language";
    if (/פתיחה|גוף|סיום|מובנה/.test(low)) return "g4.intro_body_conclusion_choice";
    return "g4.intro_body_conclusion_choice";
  }
  if (topicKey === "grammar") {
    if (/שורש|גזרה|תבנית/.test(low)) return "g4.root_pattern_intro";
    if (/הכתבה|שגיאת\s+כתיב|כתיב/.test(low)) return "g4.dictation_spot_error";
    return "g4.root_pattern_intro";
  }
  if (topicKey === "vocabulary") {
    if (/ביטוי|ניב|פתגם/.test(low)) return "g4.idiom_light";
    if (/ספרות|מילים\s+עשירות/.test(low)) return "g4.literary_lexicon_light";
    return "g4.literary_lexicon_light";
  }
  if (topicKey === "speaking") {
    return "g4.present_text_based_choice";
  }
  return "g4.genre_mix";
}

function inferG5SubtopicIdFromStem(stem, topicKey) {
  const low = String(stem || "").toLowerCase();
  if (topicKey === "reading") {
    if (/עמדה|מיקום|איפה\s+בטקסט|בפסקה/.test(low)) return "g5.position_in_text";
    if (/שכבות|עומק|מרובד/.test(low)) return "g5.multi_layer_read";
    return "g5.multi_layer_read";
  }
  if (topicKey === "comprehension") {
    if (/פרספקטיב|נקודות?\s+מבט|כמה\s+צדדים/.test(low)) return "g5.multiple_perspectives_light";
    if (/הסק|מסקנה|מה\s+ניתן\s+להסיק/.test(low)) return "g5.inference";
    return "g5.inference";
  }
  if (topicKey === "writing") {
    if (/ז׳אנר|סוגי\s+טקסטים|מגוון/.test(low)) return "g5.genre_variety";
    if (/חיבור|טיעון|מבנה\s+חיבור|פתיחה\s+טיעונית/.test(low)) return "g5.full_composition_scaffold_choice";
    return "g5.full_composition_scaffold_choice";
  }
  if (topicKey === "grammar") {
    if (/נטיית|בניין|דפוסי\s+פועל/.test(low)) return "g5.verb_patterns";
    if (/תחביר|התאמה|סינטקס/.test(low)) return "g5.syntax_agreement";
    return "g5.syntax_agreement";
  }
  if (topicKey === "vocabulary") {
    if (/אקדמי|מילים\s+מתקדמות/.test(low)) return "g5.academic_starter_words";
    if (/שדה\s+סמנטי|תחום\s+דעת/.test(low)) return "g5.semantic_fields";
    return "g5.semantic_fields";
  }
  if (topicKey === "speaking") {
    return "g5.argument_scaffold_choice";
  }
  return "g5.multi_layer_read";
}

function inferG6SubtopicIdFromStem(stem, topicKey) {
  const low = String(stem || "").toLowerCase();
  if (topicKey === "reading") {
    if (/השוו|ז׳אנרים|סוגי\s+טקסטים/.test(low)) return "g6.compare_genres";
    if (/ניתוח|מורכב|עומק/.test(low)) return "g6.complex_text_analysis";
    return "g6.complex_text_analysis";
  }
  if (topicKey === "comprehension") {
    if (/ראיה|ציטוט|מקור\s+בטקסט/.test(low)) return "g6.evidence_from_text";
    if (/ביקורת|הערכה|מנומק/.test(low)) return "g6.critical_evaluation_light";
    return "g6.critical_evaluation_light";
  }
  if (topicKey === "writing") {
    if (/מחקר|מקורות|ציטוט\s+ביבליוגרפי/.test(low)) return "g6.research_literacy_choice";
    if (/טיעון|חיבור\s+טיעוני|נימוק/.test(low)) return "g6.argumentative_full_scaffold";
    return "g6.argumentative_full_scaffold";
  }
  if (topicKey === "grammar") {
    if (/שייכות|של\s+של|מילות\s+יחס/.test(low)) return "g6.possession_prep";
    if (/פועל[\s\-]נושא|התאמת\s+פועל/.test(low)) return "g6.subject_verb_advanced";
    if (/תחביר\s+מורכב|מבנה\s+מורכב/.test(low)) return "g6.complex_syntax_spot";
    return "g6.complex_syntax_spot";
  }
  if (topicKey === "vocabulary") {
    if (/תחום\s+דעת|מקצועי|דיסציפלינה/.test(low)) return "g6.discipline_words_light";
    if (/אקדמי|מונחים/.test(low)) return "g6.academic_vocab";
    return "g6.academic_vocab";
  }
  if (topicKey === "speaking") {
    return "g6.debate_scaffold_choice";
  }
  return "g6.complex_text_analysis";
}

/**
 * @param {string} gradeKey
 * @param {string} stem
 * @param {string} topicKey
 */
function inferSubtopicForGrade(gradeKey, stem, topicKey) {
  const g = String(gradeKey || "").toLowerCase();
  if (g === "g3") return inferG3SubtopicIdFromStem(stem, topicKey);
  if (g === "g4") return inferG4SubtopicIdFromStem(stem, topicKey);
  if (g === "g5") return inferG5SubtopicIdFromStem(stem, topicKey);
  if (g === "g6") return inferG6SubtopicIdFromStem(stem, topicKey);
  return UPPER_REGISTRY.g3.fallbackId;
}

/**
 * @param {string} gradeKey
 * @param {Record<string, unknown>} raw
 * @param {string} topicKey
 */
export function resolveUpperGradeItemSubtopicId(gradeKey, raw, topicKey) {
  const g = String(gradeKey || "").toLowerCase();
  const prefix = `${g}.`;
  if (raw && typeof raw === "object" && raw.subtopicId != null) {
    const id = String(raw.subtopicId).trim();
    if (id.startsWith(prefix)) return id;
  }
  return inferSubtopicForGrade(g, String(raw?.question ?? ""), topicKey);
}

/**
 * @param {string} gradeKey
 * @param {unknown[]} merged
 * @param {string} topicKey
 * @param {string} pickedSubtopicId
 */
export function narrowHebrewUpperGradePool(gradeKey, merged, topicKey, pickedSubtopicId) {
  if (!Array.isArray(merged) || merged.length === 0) return merged;
  const match = merged.filter(
    (row) => resolveUpperGradeItemSubtopicId(gradeKey, row, topicKey) === pickedSubtopicId
  );
  return match.length > 0 ? match : merged;
}

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {unknown[]} mergedList
 * @returns {{ merged: unknown[], pickedSubtopicId: string|null }}
 */
export function withUpperGradeSubtopicPreference(gradeKey, topicKey, mergedList) {
  if (!isUpperHebrewGradeKey(gradeKey) || !Array.isArray(mergedList) || mergedList.length === 0) {
    return { merged: mergedList, pickedSubtopicId: null };
  }
  const g = String(gradeKey).toLowerCase();
  const cfg = UPPER_REGISTRY[g];
  if (!cfg) return { merged: mergedList, pickedSubtopicId: null };
  const picked = pickSubtopicIdFromMap(cfg.map, topicKey, cfg.fallbackId);
  const narrowed = narrowHebrewUpperGradePool(g, mergedList, topicKey, picked);
  return { merged: narrowed, pickedSubtopicId: picked };
}

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {Record<string, unknown>} rawPick
 */
export function attachUpperGradeSubtopicParams(gradeKey, topicKey, rawPick) {
  const g = String(gradeKey || "").toLowerCase();
  const cfg = UPPER_REGISTRY[g];
  if (!cfg) return {};
  const subtopicId = resolveUpperGradeItemSubtopicId(g, rawPick, topicKey);
  const spec = getSpecFromMap(cfg.map, topicKey, subtopicId);
  const flags = spec?.flags ? { ...spec.flags } : { ...cfg.defaults };
  return {
    subtopicId,
    subtopicFlags: flags,
    modesAllowed: spec?.modesAllowed ? [...spec.modesAllowed] : [...ALL_MODES_FALLBACK],
  };
}
