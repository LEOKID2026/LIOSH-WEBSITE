/**
 * Shared fallback skill-id detection (no Node/fs deps — safe for client import chains).
 */

/** Topic-level / general fallback skill ids — must not be high confidence alone. */
const FALLBACK_SKILL_PATTERNS = [
  /^eng_[a-z]+_general$/,
  /^eng_translation_general$/,
  /^heb_[a-z]+_general$/,
  /^moledet_geo_[a-z]+_general$/,
];

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {string|null|undefined} skillId
 * @returns {boolean}
 */
export function isFallbackOnlySkillId(skillId) {
  const s = pickStr(skillId);
  if (!s) return true;
  if (FALLBACK_SKILL_PATTERNS.some((re) => re.test(s))) return true;
  if (/^heb_[a-z0-9_]+$/.test(s) && !/^he_[a-z]/.test(s)) return true;
  return false;
}
