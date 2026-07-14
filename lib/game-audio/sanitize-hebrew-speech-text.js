/**
 * Prepare Hebrew TTS text — strips decorative symbols only; UI display stays unchanged.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeHebrewSpeechText(text) {
  if (text == null) return "";
  let s = String(text);

  s = s.replace(
    /(?:\p{Regional_Indicator}{2})|(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/gu,
    "",
  );
  s = s.replace(/[\u200D\uFE0E\uFE0F]/g, "");

  s = s.replace(/\s·\s/g, ", ");
  s = s.replace(/\s+ו-/g, " ו");

  s = s.replace(/\s+([,.;:!?])/g, "$1");
  s = s.replace(/([,.;:!?])([^\s\d])/g, "$1 $2");

  s = s.replace(/([\u0590-\u05FF])\s+(?=בחרו\s+\d)/g, "$1. ");

  s = s.replace(/\s+/g, " ").trim();
  return s;
}
