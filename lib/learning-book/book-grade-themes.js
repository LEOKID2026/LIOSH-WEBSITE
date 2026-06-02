/**
 * Grade-based color themes for the learning book reader.
 * Each grade gets one consistent theme across all subjects (Math, הנדסה, etc.).
 */

/** @typedef {typeof BOOK_GRADE_THEMES.g1} BookGradeTheme */

export const BOOK_GRADE_THEMES = Object.freeze({
  g1: Object.freeze({
    id: "g1",
    label: "Grade 1 — purple/violet",
    cssVars: Object.freeze({
      "--book-dot-glow": "rgba(52, 211, 153, 0.55)",
    }),
    classes: Object.freeze({
      pageBg: "bg-gradient-to-b from-[#120b1f] via-[#161028] to-[#1b1430]",
      headerBg: "bg-[#120b1f]/95",
      footerBg: "bg-[#120b1f]/96",
      tocButton:
        "border-violet-300/35 bg-violet-500/25 text-violet-50 hover:bg-violet-500/35",
      activePageTitle: "text-emerald-200/95",
      indexFooterLink: "text-emerald-300/80 hover:text-emerald-200 hover:underline",
      cardArticle:
        "border-violet-300/25 bg-gradient-to-b from-violet-950/35 via-[#1a1430]/90 to-[#120b1f]/95",
      dotActive: "bg-emerald-400",
      sectionHeading: "text-emerald-100",
      practiceCta:
        "border-sky-300/40 bg-gradient-to-b from-sky-500/35 to-cyan-600/30 text-sky-50 hover:from-sky-500/45 hover:to-cyan-600/40 hover:border-sky-200/50 shadow-[0_8px_24px_rgba(14,165,233,0.18)]",
      practiceCtaSub: "text-sky-100/85",
      navPrevButton:
        "border-violet-400/35 bg-violet-500/25 text-violet-50 hover:bg-violet-500/35",
      navNextButton:
        "border-emerald-400/35 bg-emerald-500/30 text-emerald-50 hover:bg-emerald-500/40",
      topicPrevLink:
        "border-violet-300/25 bg-gradient-to-l from-violet-950/50 to-violet-500/10 text-violet-100/90 hover:border-violet-300/40 hover:from-violet-900/55 hover:to-violet-500/15",
      topicPrevLabel: "text-violet-200/65",
      topicNextLink:
        "border-emerald-400/25 bg-gradient-to-l from-emerald-950/45 to-emerald-500/10 text-emerald-100/90 hover:border-emerald-400/40 hover:from-emerald-900/50 hover:to-emerald-500/15",
      topicNextLabel: "text-emerald-200/65",
      tocModalPanel:
        "border-white/15 bg-gradient-to-b from-[#1a1230] to-[#120b1f]",
      tocBatchHeading: "text-emerald-300/90",
      tocActiveItem:
        "bg-emerald-500/30 border border-emerald-400/40 text-emerald-50 font-semibold",
      tocFooterLink: "text-emerald-300 hover:text-emerald-200",
      indexBatchHeading: "text-emerald-200",
      indexTopicTile:
        "border-violet-300/20 bg-gradient-to-l from-violet-950/50 to-white/[0.04] hover:border-emerald-400/35 hover:from-emerald-950/40 hover:to-emerald-500/10",
      indexTopicIcon: "text-emerald-400",
      diagramPanel:
        "border-emerald-300/20 bg-gradient-to-b from-emerald-950/30 via-violet-950/25 to-[#1a1430]/80",
      diagramDot:
        "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)]",
      diagramAccentStrong: "text-emerald-300/90",
      diagramAccent: "text-emerald-100",
      diagramAccentMuted: "text-emerald-100/85",
      diagramAccentSoft: "text-emerald-200/80",
      diagramSecondary: "text-violet-50",
      diagramSecondaryMuted: "text-violet-50/95",
      diagramHighlightCell:
        "bg-emerald-500/35 text-emerald-50 ring-1 ring-emerald-400/40",
      diagramHighlightBorder:
        "border-emerald-400/45 bg-emerald-500/25 text-emerald-50",
      diagramColumn:
        "border-emerald-300/30 bg-emerald-950/20",
      diagramColumnLabel: "text-emerald-100",
      inlineCodeBg: "bg-violet-900/40",
      mathText: "text-emerald-50",
      inlineCodeText: "text-emerald-100",
    }),
  }),
  g2: Object.freeze({
    id: "g2",
    label: "Grade 2 — blue/cyan/teal",
    cssVars: Object.freeze({
      "--book-dot-glow": "rgba(34, 211, 238, 0.55)",
    }),
    classes: Object.freeze({
      pageBg: "bg-gradient-to-b from-[#0a1520] via-[#0c1e32] to-[#0e2438]",
      headerBg: "bg-[#0a1520]/95",
      footerBg: "bg-[#0a1520]/96",
      tocButton:
        "border-cyan-400/35 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30",
      activePageTitle: "text-cyan-200/95",
      indexFooterLink: "text-cyan-300/80 hover:text-cyan-200 hover:underline",
      cardArticle:
        "border-cyan-400/25 bg-gradient-to-b from-slate-900/45 via-[#0c2238]/90 to-[#0a1520]/95",
      dotActive: "bg-cyan-400",
      sectionHeading: "text-cyan-100",
      practiceCta:
        "border-teal-300/40 bg-gradient-to-b from-cyan-500/30 to-teal-600/28 text-cyan-50 hover:from-cyan-500/40 hover:to-teal-600/35 hover:border-teal-200/45 shadow-[0_8px_24px_rgba(6,182,212,0.18)]",
      practiceCtaSub: "text-cyan-100/85",
      navPrevButton:
        "border-cyan-400/35 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30",
      navNextButton:
        "border-teal-400/35 bg-teal-500/25 text-teal-50 hover:bg-teal-500/35",
      topicPrevLink:
        "border-cyan-400/25 bg-gradient-to-l from-slate-900/55 to-cyan-500/10 text-cyan-100/90 hover:border-cyan-400/40 hover:from-slate-800/60 hover:to-cyan-500/15",
      topicPrevLabel: "text-cyan-200/65",
      topicNextLink:
        "border-teal-400/25 bg-gradient-to-l from-teal-950/45 to-teal-500/10 text-teal-100/90 hover:border-teal-400/40 hover:from-teal-900/50 hover:to-teal-500/15",
      topicNextLabel: "text-teal-200/65",
      tocModalPanel:
        "border-white/15 bg-gradient-to-b from-[#0c1e32] to-[#0a1520]",
      tocBatchHeading: "text-cyan-300/90",
      tocActiveItem:
        "bg-cyan-500/28 border border-cyan-400/40 text-cyan-50 font-semibold",
      tocFooterLink: "text-cyan-300 hover:text-cyan-200",
      indexBatchHeading: "text-cyan-200",
      indexTopicTile:
        "border-cyan-400/20 bg-gradient-to-l from-slate-900/50 to-white/[0.04] hover:border-teal-400/35 hover:from-teal-950/35 hover:to-cyan-500/10",
      indexTopicIcon: "text-cyan-400",
      diagramPanel:
        "border-cyan-400/20 bg-gradient-to-b from-slate-900/35 via-[#0c2238]/80 to-[#0a1520]/85",
      diagramDot:
        "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.45)]",
      diagramAccentStrong: "text-cyan-300/90",
      diagramAccent: "text-cyan-100",
      diagramAccentMuted: "text-cyan-100/85",
      diagramAccentSoft: "text-cyan-200/80",
      diagramSecondary: "text-slate-200",
      diagramSecondaryMuted: "text-slate-200/95",
      diagramHighlightCell:
        "bg-cyan-500/30 text-cyan-50 ring-1 ring-cyan-400/40",
      diagramHighlightBorder:
        "border-cyan-400/45 bg-cyan-500/22 text-cyan-50",
      diagramColumn:
        "border-cyan-400/30 bg-slate-900/25",
      diagramColumnLabel: "text-cyan-100",
      inlineCodeBg: "bg-slate-800/50",
      mathText: "text-cyan-50",
      inlineCodeText: "text-cyan-100",
    }),
  }),
  g3: Object.freeze({
    id: "g3",
    label: "Grade 3 — orange/coral",
    cssVars: Object.freeze({
      "--book-dot-glow": "rgba(251, 146, 60, 0.5)",
    }),
    classes: Object.freeze({
      pageBg: "bg-gradient-to-b from-[#1a1008] via-[#221408] to-[#2a180a]",
      headerBg: "bg-[#1a1008]/95",
      footerBg: "bg-[#1a1008]/96",
      tocButton:
        "border-orange-400/35 bg-orange-500/20 text-orange-50 hover:bg-orange-500/30",
      activePageTitle: "text-orange-200/95",
      indexFooterLink: "text-orange-300/80 hover:text-orange-200 hover:underline",
      cardArticle:
        "border-orange-400/25 bg-gradient-to-b from-orange-950/40 via-[#241408]/90 to-[#1a1008]/95",
      dotActive: "bg-orange-400",
      sectionHeading: "text-orange-100",
      practiceCta:
        "border-amber-300/40 bg-gradient-to-b from-orange-500/28 to-amber-600/26 text-orange-50 hover:from-orange-500/38 hover:to-amber-600/32 hover:border-amber-200/45 shadow-[0_8px_24px_rgba(249,115,22,0.16)]",
      practiceCtaSub: "text-orange-100/85",
      navPrevButton:
        "border-orange-400/35 bg-orange-500/20 text-orange-50 hover:bg-orange-500/30",
      navNextButton:
        "border-amber-400/35 bg-amber-500/25 text-amber-50 hover:bg-amber-500/35",
      topicPrevLink:
        "border-orange-400/25 bg-gradient-to-l from-orange-950/50 to-orange-500/10 text-orange-100/90 hover:border-orange-400/40 hover:from-orange-900/55 hover:to-orange-500/15",
      topicPrevLabel: "text-orange-200/65",
      topicNextLink:
        "border-amber-400/25 bg-gradient-to-l from-amber-950/45 to-amber-500/10 text-amber-100/90 hover:border-amber-400/40 hover:from-amber-900/50 hover:to-amber-500/15",
      topicNextLabel: "text-amber-200/65",
      tocModalPanel:
        "border-white/15 bg-gradient-to-b from-[#221408] to-[#1a1008]",
      tocBatchHeading: "text-orange-300/90",
      tocActiveItem:
        "bg-orange-500/28 border border-orange-400/40 text-orange-50 font-semibold",
      tocFooterLink: "text-orange-300 hover:text-orange-200",
      indexBatchHeading: "text-orange-200",
      indexTopicTile:
        "border-orange-400/20 bg-gradient-to-l from-orange-950/45 to-white/[0.04] hover:border-amber-400/35 hover:from-amber-950/35 hover:to-orange-500/10",
      indexTopicIcon: "text-orange-400",
      diagramPanel:
        "border-orange-400/20 bg-gradient-to-b from-orange-950/30 via-[#241408]/80 to-[#1a1008]/85",
      diagramDot:
        "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.45)]",
      diagramAccentStrong: "text-orange-300/90",
      diagramAccent: "text-orange-100",
      diagramAccentMuted: "text-orange-100/85",
      diagramAccentSoft: "text-orange-200/80",
      diagramSecondary: "text-amber-100",
      diagramSecondaryMuted: "text-amber-100/95",
      diagramHighlightCell:
        "bg-orange-500/30 text-orange-50 ring-1 ring-orange-400/40",
      diagramHighlightBorder:
        "border-orange-400/45 bg-orange-500/22 text-orange-50",
      diagramColumn:
        "border-orange-400/30 bg-orange-950/22",
      diagramColumnLabel: "text-orange-100",
      inlineCodeBg: "bg-orange-950/45",
      mathText: "text-orange-50",
      inlineCodeText: "text-orange-100",
    }),
  }),
  g4: Object.freeze({
    id: "g4",
    label: "Grade 4 — amber/gold",
    cssVars: Object.freeze({
      "--book-dot-glow": "rgba(251, 191, 36, 0.5)",
    }),
    classes: Object.freeze({
      pageBg: "bg-gradient-to-b from-[#1a1408] via-[#201808] to-[#281c0a]",
      headerBg: "bg-[#1a1408]/95",
      footerBg: "bg-[#1a1408]/96",
      tocButton:
        "border-amber-400/35 bg-amber-500/18 text-amber-50 hover:bg-amber-500/28",
      activePageTitle: "text-amber-200/95",
      indexFooterLink: "text-amber-300/80 hover:text-amber-200 hover:underline",
      cardArticle:
        "border-amber-400/25 bg-gradient-to-b from-amber-950/35 via-[#241a0c]/90 to-[#1a1408]/95",
      dotActive: "bg-amber-400",
      sectionHeading: "text-amber-100",
      practiceCta:
        "border-yellow-300/35 bg-gradient-to-b from-amber-500/26 to-yellow-600/24 text-amber-50 hover:from-amber-500/36 hover:to-yellow-600/30 hover:border-yellow-200/40 shadow-[0_8px_24px_rgba(245,158,11,0.16)]",
      practiceCtaSub: "text-amber-100/85",
      navPrevButton:
        "border-amber-400/35 bg-amber-500/18 text-amber-50 hover:bg-amber-500/28",
      navNextButton:
        "border-yellow-400/35 bg-yellow-600/22 text-yellow-50 hover:bg-yellow-600/32",
      topicPrevLink:
        "border-amber-400/25 bg-gradient-to-l from-amber-950/50 to-amber-500/10 text-amber-100/90 hover:border-amber-400/40 hover:from-amber-900/55 hover:to-amber-500/15",
      topicPrevLabel: "text-amber-200/65",
      topicNextLink:
        "border-yellow-400/25 bg-gradient-to-l from-yellow-950/40 to-yellow-600/10 text-yellow-100/90 hover:border-yellow-400/40 hover:from-yellow-900/50 hover:to-yellow-600/15",
      topicNextLabel: "text-yellow-200/65",
      tocModalPanel:
        "border-white/15 bg-gradient-to-b from-[#201808] to-[#1a1408]",
      tocBatchHeading: "text-amber-300/90",
      tocActiveItem:
        "bg-amber-500/26 border border-amber-400/40 text-amber-50 font-semibold",
      tocFooterLink: "text-amber-300 hover:text-amber-200",
      indexBatchHeading: "text-amber-200",
      indexTopicTile:
        "border-amber-400/20 bg-gradient-to-l from-amber-950/45 to-white/[0.04] hover:border-yellow-400/35 hover:from-yellow-950/30 hover:to-amber-500/10",
      indexTopicIcon: "text-amber-400",
      diagramPanel:
        "border-amber-400/20 bg-gradient-to-b from-amber-950/28 via-[#241a0c]/80 to-[#1a1408]/85",
      diagramDot:
        "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.45)]",
      diagramAccentStrong: "text-amber-300/90",
      diagramAccent: "text-amber-100",
      diagramAccentMuted: "text-amber-100/85",
      diagramAccentSoft: "text-amber-200/80",
      diagramSecondary: "text-orange-100",
      diagramSecondaryMuted: "text-orange-100/95",
      diagramHighlightCell:
        "bg-amber-500/28 text-amber-50 ring-1 ring-amber-400/40",
      diagramHighlightBorder:
        "border-amber-400/45 bg-amber-500/20 text-amber-50",
      diagramColumn:
        "border-amber-400/30 bg-amber-950/20",
      diagramColumnLabel: "text-amber-100",
      inlineCodeBg: "bg-amber-950/40",
      mathText: "text-amber-50",
      inlineCodeText: "text-amber-100",
    }),
  }),
  g5: Object.freeze({
    id: "g5",
    label: "Grade 5 — rose/pink",
    cssVars: Object.freeze({
      "--book-dot-glow": "rgba(244, 114, 182, 0.5)",
    }),
    classes: Object.freeze({
      pageBg: "bg-gradient-to-b from-[#1a0f14] via-[#201218] to-[#28141c]",
      headerBg: "bg-[#1a0f14]/95",
      footerBg: "bg-[#1a0f14]/96",
      tocButton:
        "border-rose-400/35 bg-rose-500/18 text-rose-50 hover:bg-rose-500/28",
      activePageTitle: "text-rose-200/95",
      indexFooterLink: "text-rose-300/80 hover:text-rose-200 hover:underline",
      cardArticle:
        "border-rose-400/25 bg-gradient-to-b from-rose-950/35 via-[#241018]/90 to-[#1a0f14]/95",
      dotActive: "bg-rose-400",
      sectionHeading: "text-rose-100",
      practiceCta:
        "border-pink-300/35 bg-gradient-to-b from-rose-500/26 to-pink-600/24 text-rose-50 hover:from-rose-500/36 hover:to-pink-600/30 hover:border-pink-200/40 shadow-[0_8px_24px_rgba(244,63,94,0.16)]",
      practiceCtaSub: "text-rose-100/85",
      navPrevButton:
        "border-rose-400/35 bg-rose-500/18 text-rose-50 hover:bg-rose-500/28",
      navNextButton:
        "border-pink-400/35 bg-pink-500/22 text-pink-50 hover:bg-pink-500/32",
      topicPrevLink:
        "border-rose-400/25 bg-gradient-to-l from-rose-950/50 to-rose-500/10 text-rose-100/90 hover:border-rose-400/40 hover:from-rose-900/55 hover:to-rose-500/15",
      topicPrevLabel: "text-rose-200/65",
      topicNextLink:
        "border-pink-400/25 bg-gradient-to-l from-pink-950/40 to-pink-500/10 text-pink-100/90 hover:border-pink-400/40 hover:from-pink-900/50 hover:to-pink-500/15",
      topicNextLabel: "text-pink-200/65",
      tocModalPanel:
        "border-white/15 bg-gradient-to-b from-[#201218] to-[#1a0f14]",
      tocBatchHeading: "text-rose-300/90",
      tocActiveItem:
        "bg-rose-500/26 border border-rose-400/40 text-rose-50 font-semibold",
      tocFooterLink: "text-rose-300 hover:text-rose-200",
      indexBatchHeading: "text-rose-200",
      indexTopicTile:
        "border-rose-400/20 bg-gradient-to-l from-rose-950/45 to-white/[0.04] hover:border-pink-400/35 hover:from-pink-950/30 hover:to-rose-500/10",
      indexTopicIcon: "text-rose-400",
      diagramPanel:
        "border-rose-400/20 bg-gradient-to-b from-rose-950/28 via-[#241018]/80 to-[#1a0f14]/85",
      diagramDot:
        "bg-rose-400 shadow-[0_0_8px_rgba(244,114,182,0.45)]",
      diagramAccentStrong: "text-rose-300/90",
      diagramAccent: "text-rose-100",
      diagramAccentMuted: "text-rose-100/85",
      diagramAccentSoft: "text-rose-200/80",
      diagramSecondary: "text-pink-100",
      diagramSecondaryMuted: "text-pink-100/95",
      diagramHighlightCell:
        "bg-rose-500/28 text-rose-50 ring-1 ring-rose-400/40",
      diagramHighlightBorder:
        "border-rose-400/45 bg-rose-500/20 text-rose-50",
      diagramColumn:
        "border-rose-400/30 bg-rose-950/20",
      diagramColumnLabel: "text-rose-100",
      inlineCodeBg: "bg-rose-950/40",
      mathText: "text-rose-50",
      inlineCodeText: "text-rose-100",
    }),
  }),
  g6: Object.freeze({
    id: "g6",
    label: "Grade 6 — indigo/slate",
    cssVars: Object.freeze({
      "--book-dot-glow": "rgba(129, 140, 248, 0.5)",
    }),
    classes: Object.freeze({
      pageBg: "bg-gradient-to-b from-[#0f1020] via-[#121828] to-[#141c30]",
      headerBg: "bg-[#0f1020]/95",
      footerBg: "bg-[#0f1020]/96",
      tocButton:
        "border-indigo-400/35 bg-indigo-500/20 text-indigo-50 hover:bg-indigo-500/30",
      activePageTitle: "text-indigo-200/95",
      indexFooterLink: "text-indigo-300/80 hover:text-indigo-200 hover:underline",
      cardArticle:
        "border-indigo-400/25 bg-gradient-to-b from-slate-900/45 via-[#141c30]/90 to-[#0f1020]/95",
      dotActive: "bg-indigo-400",
      sectionHeading: "text-indigo-100",
      practiceCta:
        "border-violet-300/35 bg-gradient-to-b from-indigo-500/26 to-violet-600/24 text-indigo-50 hover:from-indigo-500/36 hover:to-violet-600/30 hover:border-violet-200/40 shadow-[0_8px_24px_rgba(99,102,241,0.16)]",
      practiceCtaSub: "text-indigo-100/85",
      navPrevButton:
        "border-indigo-400/35 bg-indigo-500/20 text-indigo-50 hover:bg-indigo-500/30",
      navNextButton:
        "border-violet-400/35 bg-violet-500/22 text-violet-50 hover:bg-violet-500/32",
      topicPrevLink:
        "border-indigo-400/25 bg-gradient-to-l from-slate-900/55 to-indigo-500/10 text-indigo-100/90 hover:border-indigo-400/40 hover:from-slate-800/60 hover:to-indigo-500/15",
      topicPrevLabel: "text-indigo-200/65",
      topicNextLink:
        "border-violet-400/25 bg-gradient-to-l from-violet-950/45 to-violet-500/10 text-violet-100/90 hover:border-violet-400/40 hover:from-violet-900/50 hover:to-violet-500/15",
      topicNextLabel: "text-violet-200/65",
      tocModalPanel:
        "border-white/15 bg-gradient-to-b from-[#121828] to-[#0f1020]",
      tocBatchHeading: "text-indigo-300/90",
      tocActiveItem:
        "bg-indigo-500/26 border border-indigo-400/40 text-indigo-50 font-semibold",
      tocFooterLink: "text-indigo-300 hover:text-indigo-200",
      indexBatchHeading: "text-indigo-200",
      indexTopicTile:
        "border-indigo-400/20 bg-gradient-to-l from-slate-900/50 to-white/[0.04] hover:border-violet-400/35 hover:from-violet-950/30 hover:to-indigo-500/10",
      indexTopicIcon: "text-indigo-400",
      diagramPanel:
        "border-indigo-400/20 bg-gradient-to-b from-slate-900/35 via-[#141c30]/80 to-[#0f1020]/85",
      diagramDot:
        "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.45)]",
      diagramAccentStrong: "text-indigo-300/90",
      diagramAccent: "text-indigo-100",
      diagramAccentMuted: "text-indigo-100/85",
      diagramAccentSoft: "text-indigo-200/80",
      diagramSecondary: "text-slate-200",
      diagramSecondaryMuted: "text-slate-200/95",
      diagramHighlightCell:
        "bg-indigo-500/28 text-indigo-50 ring-1 ring-indigo-400/40",
      diagramHighlightBorder:
        "border-indigo-400/45 bg-indigo-500/20 text-indigo-50",
      diagramColumn:
        "border-indigo-400/30 bg-slate-900/25",
      diagramColumnLabel: "text-indigo-100",
      inlineCodeBg: "bg-slate-800/50",
      mathText: "text-indigo-50",
      inlineCodeText: "text-indigo-100",
    }),
  }),
});

/** @param {string} grade */
export function getBookGradeTheme(grade) {
  const key = String(grade || "g1").toLowerCase();
  return BOOK_GRADE_THEMES[key] ?? BOOK_GRADE_THEMES.g1;
}

export const DEFAULT_BOOK_GRADE = "g1";
