/**
 * Moledet / geography / homeland / civics diagnostics — exact TEPs
 * (direction, map symbols, location, citizenship, landforms, values).
 * Structural edit-distance only after exact under spelling gate; far wrongs → null (0 FP).
 */

import {
  asNormHumanitiesList,
  collectWrongForms,
  humanitiesEditDistance,
  humanitiesHit,
  isHumanitiesSpellingGate,
  matchesConfusionPair,
  normalizeHumanitiesText,
  resolveListedTag,
} from "./fuzzy-tolerance-humanities-shared.js";

/** @type {Record<string, string>} */
export const MOLEDET_PATTERN_TO_TAG = Object.freeze({
  geography_map: "map_reading_error",
  geography_location: "location_error",
  geography_landform: "landform_confusion",
  moledet_citizenship: "citizenship_error",
  moledet_heritage: "homeland_identity_error",
  moledet_values: "values_error",
  moledet_community: "community_error",
  moledet_geo_maps: "map_reading_error",
  moledet_geo_geography: "landform_confusion",
  moledet_geo_citizenship: "citizenship_error",
  moledet_geo_homeland: "homeland_identity_error",
  moledet_geo_community: "community_error",
  moledet_geo_values: "values_error",
});

/** Cardinal / Hebrew direction opposites — only used when both sides match. */
const DIRECTION_OPPOSITES = Object.freeze({
  north: "south",
  south: "north",
  east: "west",
  west: "east",
  n: "s",
  s: "n",
  e: "w",
  w: "e",
  צפון: "דרום",
  דרום: "צפון",
  מזרח: "מערב",
  מערב: "מזרח",
});

function moledetGateBlob(p) {
  return [
    p?.patternFamily,
    p?.kind,
    p?.topic,
    p?.conceptTag,
    p?.diagnosticSkillId,
    ...(Array.isArray(p?.expectedErrorTags) ? p.expectedErrorTags : []),
  ]
    .map((x) => String(x || "").toLowerCase())
    .join(" ");
}

/**
 * Direction opposite slip (map reading).
 * @param {object} p
 */
export function proveMoledetDirectionOpposite(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const blob = moledetGateBlob(p);
  const dirGate =
    blob.includes("direction") ||
    blob.includes("map") ||
    blob.includes("compass") ||
    blob.includes("scale") ||
    Array.isArray(p?.directionOpposites) ||
    p?.isDirectionQuestion === true;
  if (!dirGate) return null;

  const custom = p?.directionOpposites;
  if (custom && typeof custom === "object" && !Array.isArray(custom)) {
    const expOpp = normalizeHumanitiesText(custom[expected] ?? custom[p?.expectedAnswer]);
    if (expOpp && expOpp === user) {
      return humanitiesHit(
        "direction_error",
        { user, expected, mode: "direction_opposite_map" },
        "moledet_exact:direction_error",
        0.94,
      );
    }
  }

  const opp = DIRECTION_OPPOSITES[expected];
  if (opp && opp === user) {
    return humanitiesHit(
      "direction_error",
      { user, expected, mode: "direction_opposite" },
      "moledet_exact:direction_error",
      0.94,
    );
  }

  const wrong = collectWrongForms(p, expected);
  if (wrong.includes(user) && (blob.includes("direction") || p?.isDirectionQuestion === true)) {
    return humanitiesHit(
      resolveListedTag(p, "direction_error", MOLEDET_PATTERN_TO_TAG),
      { user, expected, mode: "direction_listed" },
      "moledet_exact:direction_error:list",
      0.9,
    );
  }
  return null;
}

/**
 * Map symbol / legend confusion.
 * @param {object} p
 */
export function proveMoledetMapSymbolSlot(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const blob = moledetGateBlob(p);
  const symbolGate =
    blob.includes("symbol") ||
    blob.includes("legend") ||
    blob.includes("מקרא") ||
    Array.isArray(p?.legendWrongForms);
  if (!symbolGate) return null;

  const wrong = [
    ...asNormHumanitiesList(p?.legendWrongForms),
    ...collectWrongForms(p, expected),
  ];
  if (!wrong.includes(user) && !matchesConfusionPair(p, user, expected)) return null;

  return humanitiesHit(
    "map_symbol_error",
    { user, expected, mode: "map_symbol_slot" },
    "moledet_exact:map_symbol_error",
    0.92,
  );
}

/**
 * Citizenship / rights-duties / values / community rule slot.
 * @param {object} p
 */
export function proveMoledetCivicsSlot(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const blob = moledetGateBlob(p);
  const civicsGate =
    blob.includes("citizenship") ||
    blob.includes("rights") ||
    blob.includes("duties") ||
    blob.includes("values") ||
    blob.includes("community") ||
    blob.includes("homeland") ||
    blob.includes("heritage") ||
    blob.includes("civic");
  if (!civicsGate) return null;

  const hasList =
    matchesConfusionPair(p, user, expected) || collectWrongForms(p, expected).includes(user);
  if (!hasList) return null;

  const tag = resolveListedTag(p, "citizenship_error", MOLEDET_PATTERN_TO_TAG);
  return humanitiesHit(
    tag,
    { user, expected, mode: "civics_slot", tag },
    `moledet_exact:${tag}`,
    0.9,
  );
}

/**
 * Location / landform / map-reading concept slot.
 * @param {object} p
 */
export function proveMoledetGeographySlot(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const hasList =
    matchesConfusionPair(p, user, expected) ||
    collectWrongForms(p, expected).includes(user) ||
    asNormHumanitiesList(p?.knownMisconceptions).includes(user);
  if (!hasList) return null;

  const blob = moledetGateBlob(p);
  const geoGate =
    blob.includes("map") ||
    blob.includes("location") ||
    blob.includes("region") ||
    blob.includes("landform") ||
    blob.includes("geography") ||
    blob.includes("scale") ||
    Array.isArray(p?.wrongForms) ||
    Array.isArray(p?.confusionPair) ||
    Array.isArray(p?.expectedErrorTags);
  if (!geoGate) return null;

  const tag = resolveListedTag(p, "location_error", MOLEDET_PATTERN_TO_TAG);
  return humanitiesHit(
    tag,
    { user, expected, mode: "geography_slot", tag },
    `moledet_exact:${tag}`,
    0.9,
  );
}

/**
 * Structural spelling for typed place / civic labels.
 * @param {object} p
 */
export function proveMoledetSpellingStructural(p) {
  if (!isHumanitiesSpellingGate(p)) return null;
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer ?? p?.expectedWord);
  if (!user || !expected || user === expected) return null;
  const dist = humanitiesEditDistance(user, expected);
  const len = Math.max(user.length, expected.length);
  if (dist === 1 && len >= 2 && len <= 28) {
    return humanitiesHit(
      "location_error",
      { user, expected, editDistance: dist, tier: "structural" },
      "moledet_structural:location_error",
      0.8,
    );
  }
  return null;
}

/**
 * @param {object} p
 */
export function classifyMoledetAnswer(p) {
  const exact = [
    proveMoledetDirectionOpposite,
    proveMoledetMapSymbolSlot,
    proveMoledetCivicsSlot,
    proveMoledetGeographySlot,
  ];
  for (const fn of exact) {
    const r = fn(p);
    if (r) return r;
  }
  return proveMoledetSpellingStructural(p);
}

/** Aliases for subject routing */
export const classifyGeographyAnswer = classifyMoledetAnswer;
export const classifyHomelandAnswer = classifyMoledetAnswer;
