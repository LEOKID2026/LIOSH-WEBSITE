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
});

/** @param {string} grade */
export function getBookGradeTheme(grade) {
  const key = String(grade || "g1").toLowerCase();
  return BOOK_GRADE_THEMES[key] ?? BOOK_GRADE_THEMES.g1;
}

export const DEFAULT_BOOK_GRADE = "g1";
