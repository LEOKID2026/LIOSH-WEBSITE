/**
 * Per-game pastel tile colors for /student/arcade game cards.
 * Lives under components/ so Tailwind content scan includes all utility classes.
 *
 * @typedef {object} ArcadeGameTileTheme
 * @property {string} bg
 * @property {string} border
 * @property {string} bar
 * @property {string} title
 * @property {string} blurb
 * @property {string} meta
 * @property {string} btn
 * @property {string} btnSelected
 * @property {string} selected
 */

/** @type {ArcadeGameTileTheme} */
const SKY_TILE = {
  bg: "bg-sky-100",
  border: "border-sky-300",
  bar: "bg-sky-500",
  title: "text-sky-700",
  blurb: "text-sky-600",
  meta: "text-teal-600",
  btn: "border-sky-400 bg-sky-50 text-sky-900 hover:bg-sky-200/80",
  btnSelected: "border-sky-600 bg-sky-600 text-white shadow-sm",
  selected: "border-sky-500 bg-sky-200 ring-2 ring-inset ring-sky-600 shadow-md",
};

/** @type {Record<string, ArcadeGameTileTheme>} */
export const ARCADE_GAME_TILE_THEMES = {
  fourline: SKY_TILE,
  ludo: {
    bg: "bg-violet-100",
    border: "border-violet-300",
    bar: "bg-violet-500",
    title: "text-violet-700",
    blurb: "text-sky-600",
    meta: "text-teal-600",
    btn: "border-violet-400 bg-violet-50 text-violet-900 hover:bg-violet-200/80",
    btnSelected: "border-violet-600 bg-violet-600 text-white shadow-sm",
    selected: "border-violet-500 bg-violet-200 ring-2 ring-inset ring-violet-600 shadow-md",
  },
  "snakes-and-ladders": {
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    bar: "bg-emerald-500",
    title: "text-emerald-700",
    blurb: "text-sky-600",
    meta: "text-teal-600",
    btn: "border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-200/80",
    btnSelected: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
    selected: "border-emerald-500 bg-emerald-200 ring-2 ring-inset ring-emerald-600 shadow-md",
  },
  checkers: {
    bg: "bg-orange-100",
    border: "border-orange-300",
    bar: "bg-orange-500",
    title: "text-orange-700",
    blurb: "text-sky-600",
    meta: "text-teal-600",
    btn: "border-orange-400 bg-orange-50 text-orange-900 hover:bg-orange-200/80",
    btnSelected: "border-orange-600 bg-orange-600 text-white shadow-sm",
    selected: "border-orange-500 bg-orange-200 ring-2 ring-inset ring-orange-600 shadow-md",
  },
  chess: {
    bg: "bg-indigo-100",
    border: "border-indigo-300",
    bar: "bg-indigo-500",
    title: "text-indigo-700",
    blurb: "text-sky-600",
    meta: "text-teal-600",
    btn: "border-indigo-400 bg-indigo-50 text-indigo-900 hover:bg-indigo-200/80",
    btnSelected: "border-indigo-600 bg-indigo-600 text-white shadow-sm",
    selected: "border-indigo-500 bg-indigo-200 ring-2 ring-inset ring-indigo-600 shadow-md",
  },
  dominoes: {
    bg: "bg-amber-100",
    border: "border-amber-300",
    bar: "bg-amber-500",
    title: "text-amber-700",
    blurb: "text-sky-600",
    meta: "text-teal-600",
    btn: "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-200/80",
    btnSelected: "border-amber-600 bg-amber-600 text-white shadow-sm",
    selected: "border-amber-500 bg-amber-200 ring-2 ring-inset ring-amber-600 shadow-md",
  },
  bingo: {
    bg: "bg-pink-100",
    border: "border-pink-300",
    bar: "bg-pink-500",
    title: "text-pink-700",
    blurb: "text-sky-600",
    meta: "text-teal-600",
    btn: "border-pink-400 bg-pink-50 text-pink-900 hover:bg-pink-200/80",
    btnSelected: "border-pink-600 bg-pink-600 text-white shadow-sm",
    selected: "border-pink-500 bg-pink-200 ring-2 ring-inset ring-pink-600 shadow-md",
  },
};

/** @param {string} [gameKey] @returns {ArcadeGameTileTheme} */
export function arcadeGameTileTheme(gameKey) {
  const key = String(gameKey || "").trim().toLowerCase();
  return ARCADE_GAME_TILE_THEMES[key] || SKY_TILE;
}

export const ARCADE_TILE_BADGE_ACTIVE =
  "border border-emerald-400 bg-emerald-200 text-emerald-900";
export const ARCADE_TILE_BADGE_INACTIVE =
  "border border-slate-300 bg-slate-100 text-slate-600";
