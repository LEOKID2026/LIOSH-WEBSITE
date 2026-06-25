import * as g1ContentMod from "../data/hebrew-g1-content-map.js";
import { resolveModuleExport } from "./resolve-module-export.js";

const G1_FLAGS_DEFAULT = resolveModuleExport(g1ContentMod, "G1_FLAGS_DEFAULT");
const HEBREW_G1_CONTENT_MAP = resolveModuleExport(g1ContentMod, "HEBREW_G1_CONTENT_MAP");
const pickG1SubtopicId = resolveModuleExport(g1ContentMod, "pickG1SubtopicId");
const getG1SubtopicSpec = resolveModuleExport(g1ContentMod, "getG1SubtopicSpec");

/** כיתה א׳–ב׳ קל: אם צמצום לתת נושא משאיר בריכה קטנה מדי — מרחיבים לפי סדר תתי נושאים או חוזרים למלא. */
export const EARLY_G12_SUBTOPIC_POOL_MIN = 18;

/**
 * היסק תת נושא לשאלת legacy / עשירה ללא שדה subtopicId (כיתה א׳ בלבד).
 * @param {string} stem
 * @param {string} topicKey
 * @returns {string}
 */
export function inferG1SubtopicIdFromStem(stem, topicKey) {
  const s = String(stem || "").trim();
  const low = s.toLowerCase();

  if (topicKey === "reading") {
    if (/פונול|צלילים|הבחנה|שומעים|נשמעים/.test(low)) return "g1.phoneme_awareness";
    if (/הברה\s+פתוחה|הברה\s+סגורה|סוגרת|פתוחה/.test(low)) return "g1.open_close_syllable";
    if (/חרוז|מחרוזת/.test(low)) return "g1.rhyme";
    if (/מספר\s+הברות|הברות\s+במילה/.test(low)) return "g1.syllables";
    if (/[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C7]/.test(s)) return "g1.basic_niqqud";
    if (/ניקוד|תנועה|קמץ|פתח|צירה|חולם|שורוק|חיריק/.test(low)) return "g1.basic_niqqud";
    if (/צליל.*אות|אות.*צליל|התאמ.*צליל/.test(low)) return "g1.sound_letter_match";
    if (/אות\s+סופית|סופית|ך|ם|ן|ף|ץ/.test(low)) return "g1.final_letters";
    if (/איזה\s+אות\s+חסרה|אות\s+חסרה|מה\s+האות\s+הראשונה|האות\s+הראשונה|מה\s+האות\s+האחרונה|איזה\s+אות\s+רואים/.test(low))
      return "g1.letters";
    if (/קרא\s+את\s+המילה|קראו\s+את\s+המילה/.test(low)) return "g1.simple_words_read";
    if (/מה\s+המילה\s+הנכונה|המילה\s+הנכונה|בחרו\s+מילה|השלם\s+את\s+המילה/.test(low)) return "g1.simple_words_read";
    return "g1.simple_words_read";
  }

  if (topicKey === "comprehension") {
    if (/עקוב|סמן|הקף|לפי\s+ההוראה|הוראה\s+פשוטה|ענו\s+לפי/.test(low)) return "g1.simple_instruction";
    if (/משמעות\s+של|מה\s+המשמעות/.test(low)) return "g1.word_meaning_concrete";
    if (/מה\s+ההפך|ההפך\s+של|נכון\s*\/\s*לא|האם\s+נכון|אמת\s+או\s+שקר/.test(low)) return "g1.one_sentence_who_what";
    if (/^מי\s|^מה\s+זה\s|^מה\s+זו\s|^איפה\s|^מתי\s|^למה\s|^איך\s/.test(s.trim()) && s.length > 10) return "g1.one_sentence_who_what";
    if (/^מה\s+(?!המשמעות|ההפך)/.test(s.trim()) && s.length > 18 && /\?/.test(s)) return "g1.one_sentence_who_what";
    return "g1.word_meaning_concrete";
  }

  if (topicKey === "writing") {
    if (/איך\s+כותבים\s+את\s+המילה|איך\s+כותבים/.test(low)) return "g1.copy_word";
    if (/בחרו\s+משפט|ניסוח\s+תקין|איזה\s+משפט/.test(low)) return "g1.spell_word_choice";
    return "g1.spell_word_choice";
  }

  if (topicKey === "grammar") {
    const low = String(stem || "").toLowerCase();
    if (/חלק הדיבר|איזו מילה היא (הפועל|התואר)|מה חלק הדיבר/.test(low)) return "g1.grammar_pos_roles";
    if (/איזה משפט לא תקין|לא תקין\?|משפט לא מתאים/.test(low)) return "g1.grammar_wellformed";
    if (/סדר מילים|סדר המילים/.test(low)) return "g1.grammar_word_order";
    if (/לא שייכת לקבוצה|לא שייכת/.test(low)) return "g1.grammar_odd_category";
    if (/סימן|פיסוק|\?|\.|נקודה|שאלה/.test(low)) return "g1.grammar_punctuation";
    if (/___|מלאו|השלימו את המילה|בחרו מילה שמשלימה/.test(low)) return "g1.grammar_cloze_deixis";
    if (/מחר|אתמול|עכשיו|ו׳|וגם|מי מתאים לשאלה/.test(low)) return "g1.grammar_connectors_time";
    if (/ילד\/ילדה|התאמ|נכון לגבי|רבים|יחיד|נקבה|זכר|משפט תקין ל/.test(low)) return "g1.grammar_agreement_light";
    return "g1.grammar_pos_roles";
  }

  if (topicKey === "vocabulary") {
    if (/תמונה|תמונות|קשרו\s+מילה\s+לתמונה|מה\s+רואים\s+בתמונה/.test(low)) return "g1.word_picture";
    if (/מה\s+המשמעות|משמעות\s+של/.test(low)) return "g1.word_meaning_concrete";
    return "g1.word_meaning_concrete";
  }

  if (topicKey === "speaking") {
    return "g1.phrase_appropriateness";
  }

  return "g1.simple_words_read";
}

/**
 * @param {Record<string, unknown>} raw
 * @param {string} topicKey
 */
export function resolveG1ItemSubtopicId(raw, topicKey) {
  if (raw && typeof raw === "object" && raw.subtopicId != null && String(raw.subtopicId).trim()) {
    return String(raw.subtopicId).trim();
  }
  return inferG1SubtopicIdFromStem(String(raw?.question ?? ""), topicKey);
}

/**
 * מצר את הבריכה לתת נושא שנבחר; אם אין התאמות — מחזיר את המקור.
 * @param {unknown[]} merged
 * @param {string} topicKey
 * @param {string} pickedSubtopicId
 * @returns {unknown[]}
 */
export function narrowHebrewG1Pool(merged, topicKey, pickedSubtopicId) {
  if (!Array.isArray(merged) || merged.length === 0) return merged;
  const match = merged.filter(
    (row) => resolveG1ItemSubtopicId(row, topicKey) === pickedSubtopicId
  );
  return match.length > 0 ? match : merged;
}

/**
 * מרחיב את הבריכה אם הצמצום לתת נושא יחיד קטן מדי (מפחית חזרות בסשן ארוך).
 */
export function widenHebrewG1PoolIfSmall(
  merged,
  topicKey,
  pickedSubtopicId,
  minFloor = EARLY_G12_SUBTOPIC_POOL_MIN
) {
  if (!Array.isArray(merged) || merged.length === 0) return merged;
  const narrowed = narrowHebrewG1Pool(merged, topicKey, pickedSubtopicId);
  if (narrowed.length >= minFloor || narrowed.length >= merged.length) return narrowed;

  const list = HEBREW_G1_CONTENT_MAP[topicKey]?.subtopics;
  if (!Array.isArray(list) || list.length <= 1) return merged;

  const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const ids = sorted.map((s) => s.id);
  const pickedIdx = ids.indexOf(pickedSubtopicId);
  if (pickedIdx < 0) return merged;

  const allow = new Set([pickedSubtopicId]);
  let pool = merged.filter((row) => allow.has(resolveG1ItemSubtopicId(row, topicKey)));

  for (let offset = 1; pool.length < minFloor && offset < ids.length; offset++) {
    allow.add(ids[(pickedIdx - offset + ids.length) % ids.length]);
    allow.add(ids[(pickedIdx + offset) % ids.length]);
    pool = merged.filter((row) => allow.has(resolveG1ItemSubtopicId(row, topicKey)));
  }

  return pool.length >= minFloor ? pool : merged;
}

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {unknown[]} mergedList
 * @returns {{ merged: unknown[], pickedSubtopicId: string|null }}
 */
export function withG1SubtopicPreference(gradeKey, topicKey, mergedList) {
  if (String(gradeKey || "").toLowerCase() !== "g1" || !Array.isArray(mergedList) || mergedList.length === 0) {
    return { merged: mergedList, pickedSubtopicId: null };
  }
  const picked = pickG1SubtopicId(topicKey);
  const widened = widenHebrewG1PoolIfSmall(mergedList, topicKey, picked, EARLY_G12_SUBTOPIC_POOL_MIN);
  return { merged: widened, pickedSubtopicId: picked };
}

/**
 * שדות params נוספים לכיתה א׳ בלבד (לפי נושא UI + גזע השאלה).
 * @param {string} topicKey
 * @param {Record<string, unknown>} rawPick
 */
export function attachG1SubtopicParams(topicKey, rawPick) {
  const subtopicId = resolveG1ItemSubtopicId(rawPick, topicKey);
  const spec = getG1SubtopicSpec(topicKey, subtopicId);
  const flags = spec?.flags ? { ...spec.flags } : { ...G1_FLAGS_DEFAULT };
  return {
    subtopicId,
    subtopicFlags: flags,
    modesAllowed: spec?.modesAllowed
      ? [...spec.modesAllowed]
      : ["learning", "challenge", "speed", "marathon", "practice"],
  };
}
