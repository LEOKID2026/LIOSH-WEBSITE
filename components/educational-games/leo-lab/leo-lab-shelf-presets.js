/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/** @type {Record<DifficultyId, number>} */
export const SHELF_SIZE_BY_DIFFICULTY = {
  easy: 8,
  medium: 10,
  hard: 12,
};

/** 8 — צבעים בלבד */
export const COLOR_SHELF = [
  "paint_red",
  "paint_yellow",
  "paint_blue",
  "paint_green",
  "paint_orange",
  "paint_purple",
  "paint_pink",
  "paint_white",
];

/** 8 — בדיקת מגנט (ללא מגנט על המדף) */
export const MAGNET_SHELF_EASY = [
  "nail",
  "metal_spoon",
  "can",
  "wood",
  "plant",
  "water",
  "plastic",
  "paper",
];

/** 8 — משקל / חומרים / מגנט */
export const PHYSICAL_SHELF_EASY = MAGNET_SHELF_EASY;

/** 8 — ציפה / שקיעה */
export const FLOAT_SHELF_EASY = [
  "wood",
  "plant",
  "nail",
  "metal_spoon",
  "can",
  "plastic",
  "paper",
  "key",
];

/** 8 — צמח / גינה / טבע */
export const PLANT_SHELF_EASY = [
  "plant",
  "water",
  "sun",
  "wood",
  "soil",
  "bowl",
  "stone",
  "paper",
];

/** 8 — אור / צל */
export const LIGHT_SHELF_EASY = [
  "sun",
  "wood",
  "plant",
  "can",
  "wall",
  "paper",
  "plastic",
  "nail",
];

/** 8 — חום */
export const HEAT_SHELF_EASY = [
  "sun",
  "nail",
  "metal_spoon",
  "can",
  "wood",
  "plant",
  "stone",
  "water",
];

/** 10 — חשמל / הולכה */
export const ELECTRIC_SHELF_MEDIUM = [
  "battery",
  "bulb",
  "wire",
  "nail",
  "metal_spoon",
  "plastic",
  "paper",
  "wood",
  "stone",
  "key",
];

/** 10 — מגנט + כלי בדיקה */
export const MAGNET_TOOL_SHELF_MEDIUM = [
  "magnet",
  "nail",
  "metal_spoon",
  "can",
  "plant",
  "water",
  "ice",
  "bowl",
  "plastic",
  "paper",
];

/** 10 — לא נמשך למגנט */
export const MAGNET_NON_SHELF_MEDIUM = [
  "plant",
  "water",
  "ice",
  "bowl",
  "wood",
  "plastic",
  "paper",
  "stone",
  "nail",
  "can",
];

/** 10 — צמח */
export const PLANT_SHELF_MEDIUM = [
  "plant",
  "water",
  "sun",
  "soil",
  "wood",
  "bowl",
  "stone",
  "paper",
  "plastic",
  "ice",
];

/** 10 — קרח / שינוי מצב */
export const ICE_STATE_SHELF_MEDIUM = [
  "ice",
  "sun",
  "bowl",
  "water",
  "plant",
  "plastic",
  "paper",
  "wood",
  "stone",
  "nail",
];

/** 10 — קרח במים */
export const ICE_WATER_SHELF_MEDIUM = [
  "ice",
  "water",
  "bowl",
  "sun",
  "plant",
  "plastic",
  "paper",
  "wood",
  "stone",
  "nail",
];

/** 10 — קור */
export const COLD_SHELF_MEDIUM = [
  "ice",
  "bowl",
  "water",
  "sun",
  "plant",
  "plastic",
  "paper",
  "wood",
  "stone",
  "nail",
];

/** 10 — אור */
export const LIGHT_SHELF_MEDIUM = [
  "sun",
  "plant",
  "bowl",
  "wood",
  "stone",
  "water",
  "plastic",
  "paper",
  "ice",
  "nail",
];

/** 10 — מים */
export const WATER_SHELF_MEDIUM = [
  "water",
  "bowl",
  "ice",
  "plant",
  "sun",
  "plastic",
  "paper",
  "wood",
  "stone",
  "nail",
];

/** 10 — טמפרטורה */
export const TEMP_SHELF_MEDIUM = [
  "ice",
  "sun",
  "bowl",
  "water",
  "plant",
  "plastic",
  "paper",
  "wood",
  "stone",
  "nail",
];

/** 10 — השוואת חומרים */
export const MATERIALS_COMPARE_SHELF_MEDIUM = [
  "nail",
  "plant",
  "metal_spoon",
  "wood",
  "water",
  "ice",
  "bowl",
  "plastic",
  "paper",
  "stone",
];

/** 12 — חשמל / הולכה */
export const ELECTRIC_SHELF_HARD = [
  "battery",
  "bulb",
  "wire",
  "switch",
  "nail",
  "metal_spoon",
  "plastic",
  "paper",
  "wood",
  "stone",
  "key",
  "can",
];

/** 12 — מגנט + כלי בדיקה */
export const MAGNET_TOOL_SHELF_HARD = [
  "magnet",
  "nail",
  "metal_spoon",
  "can",
  "plant",
  "water",
  "stone",
  "wood",
  "plastic",
  "paper",
  "key",
  "bowl",
];

/** 12 — לא נמשך למגנט */
export const MAGNET_NON_SHELF_HARD = [
  "plant",
  "water",
  "stone",
  "magnet",
  "nail",
  "metal_spoon",
  "wood",
  "plastic",
  "paper",
  "bowl",
  "can",
  "key",
];

/** 12 — צמח / גינה / אדמה */
export const PLANT_SHELF_HARD = [
  "plant",
  "soil",
  "water",
  "sun",
  "wood",
  "bowl",
  "stone",
  "paper",
  "plastic",
  "ice",
  "wall",
  "key",
];

/** 12 — חום */
export const HEAT_SHELF_HARD = [
  "sun",
  "soil",
  "stone",
  "water",
  "plant",
  "bowl",
  "wood",
  "paper",
  "plastic",
  "nail",
  "ice",
  "metal_spoon",
];

/** 12 — ציפה / שקיעה */
export const FLOAT_SHELF_HARD = [
  "water",
  "stone",
  "nail",
  "metal_spoon",
  "wood",
  "plant",
  "can",
  "plastic",
  "paper",
  "bowl",
  "ice",
  "key",
];

/** 12 — טבע */
export const NATURE_SHELF_HARD = [
  "stone",
  "soil",
  "water",
  "sun",
  "plant",
  "wood",
  "bowl",
  "paper",
  "plastic",
  "ice",
  "wall",
  "key",
];

/** 12 — אור / צל */
export const LIGHT_SHELF_HARD = [
  "sun",
  "stone",
  "plant",
  "wood",
  "bowl",
  "water",
  "soil",
  "wall",
  "paper",
  "plastic",
  "ice",
  "nail",
];

/** @type {Record<string, string[]>} */
export const SHELF_PRESETS = {
  color: COLOR_SHELF,
  magnet_easy: MAGNET_SHELF_EASY,
  physical_easy: PHYSICAL_SHELF_EASY,
  float_easy: FLOAT_SHELF_EASY,
  plant_easy: PLANT_SHELF_EASY,
  light_easy: LIGHT_SHELF_EASY,
  heat_easy: HEAT_SHELF_EASY,
  electric_medium: ELECTRIC_SHELF_MEDIUM,
  magnet_tool_medium: MAGNET_TOOL_SHELF_MEDIUM,
  magnet_non_medium: MAGNET_NON_SHELF_MEDIUM,
  plant_medium: PLANT_SHELF_MEDIUM,
  ice_state_medium: ICE_STATE_SHELF_MEDIUM,
  ice_water_medium: ICE_WATER_SHELF_MEDIUM,
  cold_medium: COLD_SHELF_MEDIUM,
  light_medium: LIGHT_SHELF_MEDIUM,
  water_medium: WATER_SHELF_MEDIUM,
  temp_medium: TEMP_SHELF_MEDIUM,
  materials_compare_medium: MATERIALS_COMPARE_SHELF_MEDIUM,
  electric_hard: ELECTRIC_SHELF_HARD,
  magnet_tool_hard: MAGNET_TOOL_SHELF_HARD,
  magnet_non_hard: MAGNET_NON_SHELF_HARD,
  plant_hard: PLANT_SHELF_HARD,
  heat_hard: HEAT_SHELF_HARD,
  float_hard: FLOAT_SHELF_HARD,
  nature_hard: NATURE_SHELF_HARD,
  light_hard: LIGHT_SHELF_HARD,
};

/** @type {Record<string, keyof typeof SHELF_PRESETS>} */
export const EXPERIMENT_SHELF_PRESET = {
  "easy-color-orange-clean": "color",
  "easy-color-green-clean": "color",
  "easy-color-purple-clean": "color",
  "easy-color-grass-clean": "color",
  "easy-color-carrot-clean": "color",
  "easy-color-grape-clean": "color",
  "easy-magnet-attracts-clean": "magnet_easy",
  "easy-not-magnetic-clean": "magnet_easy",
  "easy-heavy-clean": "physical_easy",
  "easy-light-clean": "physical_easy",
  "easy-float-clean": "float_easy",
  "easy-sink-clean": "float_easy",
  "easy-plant-grow-clean": "plant_easy",
  "easy-nail-can-clean": "physical_easy",
  "easy-nail-spoon-clean": "physical_easy",
  "easy-wood-plant-clean": "float_easy",
  "easy-nature-pair-clean": "plant_easy",
  "easy-metal-pair-clean": "physical_easy",
  "easy-warm-clean": "heat_easy",
  "easy-garden-clean": "plant_easy",
  "medium-circuit-basic-clean": "electric_medium",
  "medium-electric-source-clean": "electric_medium",
  "medium-light-test-clean": "electric_medium",
  "medium-magnet-test-clean": "magnet_tool_medium",
  "medium-not-magnetic-clean": "magnet_non_medium",
  "medium-plant-grow-clean": "plant_medium",
  "medium-ice-melt-clean": "ice_state_medium",
  "medium-ice-water-clean": "ice_water_medium",
  "medium-cold-clean": "cold_medium",
  "medium-shadow-clean": "light_medium",
  "medium-water-container-clean": "water_medium",
  "medium-plant-water-clean": "plant_medium",
  "medium-warm-cold-clean": "temp_medium",
  "medium-conduct-check-clean": "electric_medium",
  "medium-test-metal-clean": "magnet_tool_medium",
  "medium-water-change-clean": "ice_state_medium",
  "medium-safe-light-clean": "light_medium",
  "medium-compare-materials-clean": "materials_compare_medium",
  "medium-ice-bowl-clean": "cold_medium",
  "medium-small-lab-clean": "ice_water_medium",
  "hard-full-circuit-clean": "electric_hard",
  "hard-basic-circuit-clean": "electric_hard",
  "hard-conductors-clean": "electric_hard",
  "hard-magnet-metals-clean": "magnet_tool_hard",
  "hard-not-magnetic-clean": "magnet_non_hard",
  "hard-plant-full-clean": "plant_hard",
  "hard-plant-soil-water-clean": "plant_hard",
  "hard-dry-soil-clean": "heat_hard",
  "hard-heat-stone-clean": "heat_hard",
  "hard-stone-sink-clean": "float_hard",
  "hard-metal-sink-clean": "float_hard",
  "hard-natural-set-clean": "nature_hard",
  "hard-compare-metal-stone-clean": "magnet_tool_hard",
  "hard-circuit-switch-clean": "electric_hard",
  "hard-conductor-lamp-clean": "electric_hard",
  "hard-soil-water-clean": "plant_hard",
  "hard-shadow-clean": "light_hard",
  "hard-garden-day-clean": "plant_hard",
  "hard-magnet-compare-clean": "magnet_tool_hard",
  "hard-electric-control-clean": "electric_hard",
};

/**
 * @param {string} experimentId
 * @returns {string[]}
 */
export function shelfItemsForExperimentId(experimentId) {
  const presetKey = EXPERIMENT_SHELF_PRESET[experimentId];
  if (!presetKey) {
    throw new Error(`missing shelf preset for experiment: ${experimentId}`);
  }
  const shelf = SHELF_PRESETS[presetKey];
  if (!shelf) {
    throw new Error(`missing shelf preset array: ${presetKey}`);
  }
  return [...shelf];
}
