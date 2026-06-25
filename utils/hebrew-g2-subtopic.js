import * as g2ContentMod from "../data/hebrew-g2-content-map.js";
import { resolveModuleExport } from "./resolve-module-export.js";

const G2_FLAGS_DEFAULT = resolveModuleExport(g2ContentMod, "G2_FLAGS_DEFAULT");
const HEBREW_G2_CONTENT_MAP = resolveModuleExport(g2ContentMod, "HEBREW_G2_CONTENT_MAP");
const pickG2SubtopicId = resolveModuleExport(g2ContentMod, "pickG2SubtopicId");
const getG2SubtopicSpec = resolveModuleExport(g2ContentMod, "getG2SubtopicSpec");

/** כמו `EARLY_G12_SUBTOPIC_POOL_MIN` ב g1 — ערך זהה בלי ייבוא מוצלב. */
const EARLY_G12_SUBTOPIC_POOL_MIN = 18;

/**
 * @param {string} stem
 * @param {string} topicKey
 * @returns {string}
 */
export function inferG2SubtopicIdFromStem(stem, topicKey) {
  const s = String(stem || "").trim();
  const low = s.toLowerCase();

  if (topicKey === "reading") {
    if (/סימן\s+פיסוק|פסיק|נקודה|סוף\s+משפט/.test(low)) return "g2.simple_punctuation_read";
    if (/קראו?\s+את\s+המשפט|קרא\s+את\s+המשפט/.test(low)) return "g2.short_sentence";
    if (/קראו?\s+את\s+המילה|קרא\s+את\s+המילה|מה\s+המילה\s+הנכונה/.test(low)) return "g2.fluent_words";
    return "g2.short_sentence";
  }

  if (topicKey === "comprehension") {
    if (/סדר|רצף|קודם|אחרי|לפני/.test(low)) return "g2.simple_sequence";
    if (/הפוך|ניגוד|אם\s+מישהו|הסק|מסקנה|לפי\s+הטקסט/.test(low)) return "g2.light_inference";
    if (/מה\s+המשמעות|משמעות\s+של|מה\s+הרעיון|עיקר/.test(low)) return "g2.detail_main_idea";
    return "g2.detail_main_idea";
  }

  if (topicKey === "writing") {
    if (/סימן\s+פיסוק|\?|!/.test(low) && /משפט/.test(low)) return "g2.punctuation_choice";
    if (/פסקה|כמה\s+משפטים|ניסוח\s+ארוך/.test(low)) return "g2.short_paragraph_choice";
    if (/איך\s+כותבים|איזה\s+משפט\s+נכון|ניסוח\s+תקין|משפט\s+תקין/.test(low))
      return "g2.sentence_wellformed";
    return "g2.sentence_wellformed";
  }

  if (topicKey === "grammar") {
    if (/מה\s+הזמן|באיזה\s+זמן|איזה\s+זמן|זמן\s+של\s+המילה|זמן\s+של\s+הפועל|קראתי|אתמול|אמש|מחר|להבא/.test(low))
      return "g2.simple_tense";
    if (/זמן|עבר|הווה|עתיד|נטיית|נטיות/.test(low)) return "g2.simple_tense";
    if (/גוף|מין|יחיד|רבים|התאמ|נכון\s+לגבי\s+הילד/.test(low)) return "g2.number_gender_light";
    if (/חלק\s+הדיבר|שם\s+עצם|פועל|תואר/.test(low)) return "g2.pos_basic";
    return "g2.pos_basic";
  }

  if (topicKey === "vocabulary") {
    if (/נרדפ[ות]?|נרדף|מילה\s+דומה|במקום\s+מילה/.test(low)) return "g2.synonyms_basic";
    if (/הקשר|לפי\s+המשפט\s+הבא|השלים\s+לפי/.test(low)) return "g2.context_clue_easy";
    if (/מה\s+המשמעות/.test(low)) return "g2.context_clue_easy";
    return "g2.context_clue_easy";
  }

  if (topicKey === "speaking") {
    if (/מתארים|שמתאר|משפט\s+קצר\s+שמתאר|מה\s+אני\s+רואה|תיאור/.test(low)) return "g2.describe_prompt_choice";
    if (/איך\s+אומרים|מה\s+נאמר|בשיעור|מצב|נימוס|שיח/.test(low)) return "g2.situation_register";
    return "g2.situation_register";
  }

  return "g2.fluent_words";
}

/**
 * @param {Record<string, unknown>} raw
 * @param {string} topicKey
 */
export function resolveG2ItemSubtopicId(raw, topicKey) {
  if (raw && typeof raw === "object" && raw.subtopicId != null && String(raw.subtopicId).trim()) {
    const id = String(raw.subtopicId).trim();
    if (/^g2\./.test(id)) return id;
  }
  return inferG2SubtopicIdFromStem(String(raw?.question ?? ""), topicKey);
}

/**
 * @param {unknown[]} merged
 * @param {string} topicKey
 * @param {string} pickedSubtopicId
 * @returns {unknown[]}
 */
export function narrowHebrewG2Pool(merged, topicKey, pickedSubtopicId) {
  if (!Array.isArray(merged) || merged.length === 0) return merged;
  const match = merged.filter(
    (row) => resolveG2ItemSubtopicId(row, topicKey) === pickedSubtopicId
  );
  return match.length > 0 ? match : merged;
}

export function widenHebrewG2PoolIfSmall(
  merged,
  topicKey,
  pickedSubtopicId,
  minFloor = EARLY_G12_SUBTOPIC_POOL_MIN
) {
  if (!Array.isArray(merged) || merged.length === 0) return merged;
  const narrowed = narrowHebrewG2Pool(merged, topicKey, pickedSubtopicId);
  if (narrowed.length >= minFloor || narrowed.length >= merged.length) return narrowed;

  const list = HEBREW_G2_CONTENT_MAP[topicKey]?.subtopics;
  if (!Array.isArray(list) || list.length <= 1) return merged;

  const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const ids = sorted.map((s) => s.id);
  const pickedIdx = ids.indexOf(pickedSubtopicId);
  if (pickedIdx < 0) return merged;

  const allow = new Set([pickedSubtopicId]);
  let pool = merged.filter((row) => allow.has(resolveG2ItemSubtopicId(row, topicKey)));

  for (let offset = 1; pool.length < minFloor && offset < ids.length; offset++) {
    allow.add(ids[(pickedIdx - offset + ids.length) % ids.length]);
    allow.add(ids[(pickedIdx + offset) % ids.length]);
    pool = merged.filter((row) => allow.has(resolveG2ItemSubtopicId(row, topicKey)));
  }

  return pool.length >= minFloor ? pool : merged;
}

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {unknown[]} mergedList
 * @returns {{ merged: unknown[], pickedSubtopicId: string|null }}
 */
export function withG2SubtopicPreference(gradeKey, topicKey, mergedList) {
  if (String(gradeKey || "").toLowerCase() !== "g2" || !Array.isArray(mergedList) || mergedList.length === 0) {
    return { merged: mergedList, pickedSubtopicId: null };
  }
  const picked = pickG2SubtopicId(topicKey);
  const widened = widenHebrewG2PoolIfSmall(mergedList, topicKey, picked, EARLY_G12_SUBTOPIC_POOL_MIN);
  return { merged: widened, pickedSubtopicId: picked };
}

/**
 * @param {string} topicKey
 * @param {Record<string, unknown>} rawPick
 */
export function attachG2SubtopicParams(topicKey, rawPick) {
  const subtopicId = resolveG2ItemSubtopicId(rawPick, topicKey);
  const spec = getG2SubtopicSpec(topicKey, subtopicId);
  const flags = spec?.flags ? { ...spec.flags } : { ...G2_FLAGS_DEFAULT };
  return {
    subtopicId,
    subtopicFlags: flags,
    modesAllowed: spec?.modesAllowed
      ? [...spec.modesAllowed]
      : ["learning", "challenge", "speed", "marathon", "practice"],
  };
}
