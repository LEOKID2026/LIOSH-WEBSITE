/** Step-by-step exercise panel tokens — classic (dark) vs bright modal. */

export const STEP_EXERCISE_UI_CLASSIC = Object.freeze({
  panel:
    "rounded-lg bg-emerald-900/50 px-3 py-2 max-w-full overflow-x-hidden overflow-y-visible",
  monoText: "text-emerald-100",
  accent: "text-emerald-300 font-bold",
  accentMuted: "text-emerald-300/75",
  divider: "bg-white",
  dividerThin: "bg-white",
});

export const STEP_EXERCISE_UI_BRIGHT = Object.freeze({
  panel:
    "rounded-xl border-2 border-sky-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(214,255,246,0.45))] shadow-sm px-4 py-3.5 max-w-full overflow-x-hidden overflow-y-visible",
  monoText: "text-slate-900",
  accent: "text-sky-800 font-bold",
  accentMuted: "text-sky-700",
  divider: "bg-sky-400",
  dividerThin: "bg-sky-300",
});
