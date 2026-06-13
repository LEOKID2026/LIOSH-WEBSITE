/** Classic (dark) theme — game hub parent screens only. */

export const GAMES_HUB_CLASSIC = Object.freeze({
  pageWrap: "min-h-screen bg-gradient-to-b from-[#0f111a] to-[#1b1f2b] text-white",
  container: "max-w-5xl mx-auto px-3 sm:px-4 py-4 md:py-8 pb-6 overflow-x-hidden",
  backBtn:
    "inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white transition",
  hubTitle: "text-2xl md:text-4xl font-black text-white",
  hubSub: "text-sm md:text-base text-white/70 max-w-2xl mx-auto",
  badge:
    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-emerald-300",
  card:
    "flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4 shadow-lg shadow-black/20 backdrop-blur-sm hover:border-white/20 transition",
  cardTitle: "text-lg font-bold text-white",
  cardBlurb: "text-sm text-white/70 leading-relaxed",
  cardMeta: "text-xs text-white/50",
  cardEmoji: "text-4xl",
  cardCta:
    "mt-auto inline-flex items-center justify-center rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-sm px-4 py-2 transition",
  sectionTitle: "text-lg font-bold text-white mb-3",
  muted: "text-white/60",
});
