/**
 * Grade-based color themes for the learning book reader.
 * One bright accent per grade (g1–g6) — identical across all subjects.
 * Accent drives subtitle, progress dots, card glow, next-page nav, and topic cards.
 */

/** @typedef {typeof BOOK_GRADE_THEMES.g1} BookGradeTheme */

/** Shared class tokens — colors come from per-grade CSS variables on `.book-grade-theme-root`. */
const SHARED_GRADE_CLASSES = Object.freeze({
  tocButton:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent-fill)] text-white hover:bg-[color:var(--book-accent-hover)]",
  activePageTitle: "text-[color:var(--book-accent)]",
  indexFooterLink:
    "text-[color:var(--book-accent)]/90 hover:text-[color:var(--book-accent)] hover:underline",
  cardArticle:
    "border-[color:var(--book-accent-border)] bg-gradient-to-b from-[color:var(--book-bg-card-from)] via-[color:var(--book-bg-card-via)] to-[color:var(--book-bg-card-to)] shadow-[0_8px_32px_var(--book-accent-card-glow)]",
  dotActive: "bg-[color:var(--book-accent)]",
  sectionHeading: "text-[color:var(--book-accent)]",
  practiceCta:
    "border-[color:var(--book-accent-border)] bg-gradient-to-b from-[color:var(--book-accent-fill)] to-[color:var(--book-accent-muted)] text-white hover:from-[color:var(--book-accent-hover)] hover:to-[color:var(--book-accent-fill)] shadow-[0_8px_24px_var(--book-accent-card-glow)]",
  practiceCtaSub: "text-white/90",
  navPrevButton:
    "border-white/25 bg-white/10 text-white hover:bg-white/18",
  navNextButton:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent-fill)] text-white hover:bg-[color:var(--book-accent-hover)] shadow-[0_4px_16px_var(--book-accent-card-glow)]",
  topicPrevLink:
    "border-[color:var(--book-accent-border)] bg-gradient-to-l from-[color:var(--book-bg-card-from)] to-[color:var(--book-accent-muted)] text-white/95 hover:border-[color:var(--book-accent)] hover:to-[color:var(--book-accent-fill)]",
  topicPrevLabel: "text-[color:var(--book-accent)]/75",
  topicNextLink:
    "border-[color:var(--book-accent-border)] bg-gradient-to-l from-[color:var(--book-bg-card-from)] to-[color:var(--book-accent-muted)] text-white/95 hover:border-[color:var(--book-accent)] hover:to-[color:var(--book-accent-fill)]",
  topicNextLabel: "text-[color:var(--book-accent)]/75",
  tocModalPanel:
    "border-white/15 bg-gradient-to-b from-[color:var(--book-bg-via)] to-[color:var(--book-bg-to)]",
  tocBatchHeading: "text-[color:var(--book-accent)]/95",
  tocActiveItem:
    "bg-[color:var(--book-accent-fill)] border border-[color:var(--book-accent-border)] text-white font-semibold",
  tocFooterLink: "text-[color:var(--book-accent)] hover:text-[color:var(--book-accent)]/90",
  indexBatchHeading: "text-[color:var(--book-accent)]",
  indexTopicTile:
    "border-[color:var(--book-accent-border)] bg-gradient-to-l from-[color:var(--book-bg-card-from)] to-white/[0.04] hover:border-[color:var(--book-accent)] hover:from-[color:var(--book-accent-muted)] hover:to-[color:var(--book-accent-fill)]",
  indexTopicIcon: "text-[color:var(--book-accent)]",
  indexMasterTile:
    "border-[color:var(--book-accent-border)] bg-gradient-to-b from-[color:var(--book-accent-fill)] to-[color:var(--book-bg-to)] shadow-[0_4px_18px_var(--book-accent-card-glow)] hover:from-[color:var(--book-accent-hover)] hover:to-[color:var(--book-accent-muted)] active:scale-[0.98]",
  indexMasterTileLine1: "text-white font-bold",
  indexMasterTileLine2: "text-white/90 font-semibold",
  diagramPanel:
    "border-[color:var(--book-accent-border)] bg-gradient-to-b from-[color:var(--book-accent-muted)] via-[color:var(--book-bg-card-via)] to-[color:var(--book-bg-card-to)]",
  diagramDot: "bg-[color:var(--book-accent)] shadow-[0_0_8px_var(--book-dot-glow)]",
  diagramAccentStrong: "text-[color:var(--book-accent)]",
  diagramAccent: "text-[color:var(--book-accent)]/95",
  diagramAccentMuted: "text-[color:var(--book-accent)]/85",
  diagramAccentSoft: "text-[color:var(--book-accent)]/80",
  diagramSecondary: "text-white/95",
  diagramSecondaryMuted: "text-white/90",
  diagramHighlightCell:
    "bg-[color:var(--book-accent-fill)] text-white ring-1 ring-[color:var(--book-accent-border)]",
  diagramHighlightBorder:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent-muted)] text-white",
  diagramColumn: "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent-muted)]",
  diagramColumnLabel: "text-[color:var(--book-accent)]/95",
  inlineCodeBg: "bg-[color:var(--book-accent-muted)]",
  mathText: "text-[color:var(--book-accent)]",
  inlineCodeText: "text-[color:var(--book-accent)]/95",
});

/**
 * @param {string} id
 * @param {string} label
 * @param {string} accent hex
 * @param {{ pageBg: string, headerBg: string, footerBg: string, cssVars: Record<string, string> }} shell
 */
function gradeTheme(id, label, accent, shell) {
  return Object.freeze({
    id,
    label,
    accent,
    cssVars: Object.freeze(shell.cssVars),
    classes: Object.freeze({
      ...SHARED_GRADE_CLASSES,
      pageBg: shell.pageBg,
      headerBg: shell.headerBg,
      footerBg: shell.footerBg,
    }),
  });
}

/** @param {string} hex #RRGGBB */
function rgbaFromHex(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * @param {string} accent
 * @param {{ from: string, via: string, to: string, cardFrom: string, cardVia: string, cardTo: string }} bg
 */
function accentCssVars(accent, bg) {
  return {
    "--book-accent": accent,
    "--book-dot-glow": rgbaFromHex(accent, 0.55),
    "--book-accent-border": rgbaFromHex(accent, 0.42),
    "--book-accent-fill": rgbaFromHex(accent, 0.32),
    "--book-accent-muted": rgbaFromHex(accent, 0.18),
    "--book-accent-hover": rgbaFromHex(accent, 0.44),
    "--book-accent-card-glow": rgbaFromHex(accent, 0.2),
    "--book-bg-from": bg.from,
    "--book-bg-via": bg.via,
    "--book-bg-to": bg.to,
    "--book-bg-card-from": bg.cardFrom,
    "--book-bg-card-via": bg.cardVia,
    "--book-bg-card-to": bg.cardTo,
  };
}

export const BOOK_GRADE_ACCENT_HEX = Object.freeze({
  g1: "#34D399",
  g2: "#22D3EE",
  g3: "#FB923C",
  g4: "#FBBF24",
  g5: "#F472B6",
  g6: "#818CF8",
});

export const BOOK_GRADE_THEMES = Object.freeze({
  g1: gradeTheme("g1", "כיתה א׳ — ירוק טבע", BOOK_GRADE_ACCENT_HEX.g1, {
    pageBg: "bg-gradient-to-b from-[#1F6F58] via-[#278B6E] to-[#35A77F]",
    headerBg: "bg-[#1F6F58]/86",
    footerBg: "bg-[#1F6F58]/86",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g1, {
      from: "#1F6F58",
      via: "#278B6E",
      to: "#35A77F",
      cardFrom: "rgba(20, 58, 44, 0.78)",
      cardVia: "rgba(25, 72, 54, 0.74)",
      cardTo: "rgba(16, 48, 36, 0.80)",
    }),
  }),
  g2: gradeTheme("g2", "כיתה ב׳ — כחול מים", BOOK_GRADE_ACCENT_HEX.g2, {
    pageBg: "bg-gradient-to-b from-[#176C88] via-[#2189A8] to-[#2DA6C6]",
    headerBg: "bg-[#176C88]/86",
    footerBg: "bg-[#176C88]/86",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g2, {
      from: "#176C88",
      via: "#2189A8",
      to: "#2DA6C6",
      cardFrom: "rgba(18, 72, 90, 0.78)",
      cardVia: "rgba(22, 90, 112, 0.74)",
      cardTo: "rgba(15, 60, 76, 0.80)",
    }),
  }),
  g3: gradeTheme("g3", "כיתה ג׳ — כתום מנגו", BOOK_GRADE_ACCENT_HEX.g3, {
    pageBg: "bg-gradient-to-b from-[#85501E] via-[#A86424] to-[#C77A2C]",
    headerBg: "bg-[#85501E]/86",
    footerBg: "bg-[#85501E]/86",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g3, {
      from: "#85501E",
      via: "#A86424",
      to: "#C77A2C",
      cardFrom: "rgba(90, 54, 20, 0.78)",
      cardVia: "rgba(112, 68, 24, 0.74)",
      cardTo: "rgba(74, 44, 16, 0.80)",
    }),
  }),
  g4: gradeTheme("g4", "כיתה ד׳ — זהב שמש", BOOK_GRADE_ACCENT_HEX.g4, {
    pageBg: "bg-gradient-to-b from-[#7A651E] via-[#9B8026] to-[#BFA13A]",
    headerBg: "bg-[#7A651E]/86",
    footerBg: "bg-[#7A651E]/86",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g4, {
      from: "#7A651E",
      via: "#9B8026",
      to: "#BFA13A",
      cardFrom: "rgba(82, 68, 18, 0.78)",
      cardVia: "rgba(104, 86, 22, 0.74)",
      cardTo: "rgba(68, 56, 14, 0.80)",
    }),
  }),
  g5: gradeTheme("g5", "כיתה ה׳ — ורוד פטל", BOOK_GRADE_ACCENT_HEX.g5, {
    pageBg: "bg-gradient-to-b from-[#7A2D58] via-[#9B3970] to-[#C24B8B]",
    headerBg: "bg-[#7A2D58]/86",
    footerBg: "bg-[#7A2D58]/86",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g5, {
      from: "#7A2D58",
      via: "#9B3970",
      to: "#C24B8B",
      cardFrom: "rgba(82, 30, 58, 0.78)",
      cardVia: "rgba(104, 38, 74, 0.74)",
      cardTo: "rgba(68, 24, 48, 0.80)",
    }),
  }),
  g6: gradeTheme("g6", "כיתה ו׳ — סגול חלל", BOOK_GRADE_ACCENT_HEX.g6, {
    pageBg: "bg-gradient-to-b from-[#49448D] via-[#5B56B0] to-[#716BE0]",
    headerBg: "bg-[#49448D]/86",
    footerBg: "bg-[#49448D]/86",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g6, {
      from: "#49448D",
      via: "#5B56B0",
      to: "#716BE0",
      cardFrom: "rgba(50, 46, 98, 0.78)",
      cardVia: "rgba(64, 58, 122, 0.74)",
      cardTo: "rgba(40, 36, 80, 0.80)",
    }),
  }),
});

/** @param {string} grade */
export function getBookGradeTheme(grade) {
  const key = String(grade || "g1").toLowerCase();
  return BOOK_GRADE_THEMES[key] ?? BOOK_GRADE_THEMES.g1;
}

/** @param {string} grade */
export function getBookGradeAccentHex(grade) {
  const key = String(grade || "g1").toLowerCase();
  return BOOK_GRADE_ACCENT_HEX[key] ?? BOOK_GRADE_ACCENT_HEX.g1;
}

export const DEFAULT_BOOK_GRADE = "g1";
