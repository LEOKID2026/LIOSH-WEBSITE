/**
 * Grade-based color themes for the learning book reader.
 * One bright accent per grade (g1–g6) — identical across all subjects.
 * Accent drives subtitle, progress dots, card glow, next-page nav, and topic cards.
 */

/** @typedef {typeof BOOK_GRADE_THEMES.g1} BookGradeTheme */

/** Shared class tokens — colors come from per-grade CSS variables on `.book-grade-theme-root`. */
const SHARED_GRADE_CLASSES = Object.freeze({
  // Header controls
  tocButton:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent-fill)] text-[color:var(--book-button-text)] hover:bg-[color:var(--book-accent-hover)]",
  activePageTitle: "text-[color:var(--book-accent)]",
  indexFooterLink:
    "text-[color:var(--book-accent)] hover:opacity-80 hover:underline",
  // Main content card — grade-tinted surface, accent border, visible shadow
  cardArticle:
    "border-[color:var(--book-accent-border)] bg-gradient-to-b from-[color:var(--book-bg-card-from)] via-[color:var(--book-bg-card-via)] to-[color:var(--book-bg-card-to)] shadow-[0_8px_36px_var(--book-accent-card-glow)]",
  dotActive: "bg-[color:var(--book-accent)]",
  sectionHeading: "text-[color:var(--book-accent)]",
  // Practice CTA — solid accent button, dark button-text
  practiceCta:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent)] text-[color:var(--book-button-text)] hover:opacity-90 shadow-[0_6px_20px_var(--book-accent-card-glow)]",
  practiceCtaSub: "text-[color:var(--book-button-text)]/75",
  // Section navigation
  navPrevButton:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-surface-soft)] text-[color:var(--book-text)] hover:bg-[color:var(--book-accent-muted)] disabled:bg-[color:var(--book-surface-soft)] disabled:text-[color:var(--book-text-muted)]",
  navNextButton:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent)] text-[color:var(--book-button-text)] hover:opacity-90 shadow-[0_6px_22px_var(--book-accent-card-glow)] disabled:bg-[color:var(--book-surface-soft)] disabled:text-[color:var(--book-text-muted)] disabled:shadow-none",
  headerChipButton:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-surface)] text-[color:var(--book-text)] hover:bg-[color:var(--book-surface-soft)]",
  tocCloseButton:
    "border-[color:var(--book-divider)] bg-[color:var(--book-surface)] text-[color:var(--book-text)] hover:bg-[color:var(--book-surface-soft)]",
  audioPlayerButton:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent-muted)] text-[color:var(--book-text)] hover:bg-[color:var(--book-accent-fill)] disabled:text-[color:var(--book-text-muted)]",
  // Topic prev/next cards — light surface, dark text, accent border
  topicPrevLink:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-surface)] text-[color:var(--book-text)] hover:border-[color:var(--book-accent)] hover:bg-[color:var(--book-accent-muted)]",
  topicPrevLabel: "text-[color:var(--book-accent)]",
  topicNextLink:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-surface)] text-[color:var(--book-text)] hover:border-[color:var(--book-accent)] hover:bg-[color:var(--book-accent-muted)]",
  topicNextLabel: "text-[color:var(--book-accent)]",
  // TOC modal — light panel, accent border
  tocModalPanel:
    "border-[color:var(--book-accent-border)] bg-gradient-to-b from-[color:var(--book-surface)] to-[color:var(--book-surface-soft)]",
  tocBatchHeading: "text-[color:var(--book-accent)]",
  tocActiveItem:
    "bg-[color:var(--book-accent)] border border-[color:var(--book-accent-border)] text-[color:var(--book-button-text)] font-semibold",
  tocFooterLink: "text-[color:var(--book-accent)] hover:opacity-80",
  // Index page
  indexBatchHeading: "text-[color:var(--book-accent)]",
  indexTopicTile:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-surface)] hover:border-[color:var(--book-accent)] hover:bg-[color:var(--book-accent-muted)]",
  indexTopicIcon: "text-[color:var(--book-accent)]",
  indexMasterTile:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent)] shadow-[0_4px_18px_var(--book-accent-card-glow)] hover:opacity-90 active:scale-[0.98]",
  indexMasterTileLine1: "text-[color:var(--book-button-text)] font-bold",
  indexMasterTileLine2: "text-[color:var(--book-button-text)]/80 font-semibold",
  // Diagrams — accent for highlights, dark text for body content
  diagramPanel:
    "border-[color:var(--book-accent-border)] bg-gradient-to-b from-[color:var(--book-accent-muted)] via-[color:var(--book-surface-soft)] to-[color:var(--book-surface-soft)]",
  diagramDot: "bg-[color:var(--book-accent)] shadow-[0_0_8px_var(--book-dot-glow)]",
  diagramAccentStrong: "text-[color:var(--book-accent)]",
  diagramAccent: "text-[color:var(--book-accent)]/95",
  diagramAccentMuted: "text-[color:var(--book-accent)]/85",
  diagramAccentSoft: "text-[color:var(--book-accent)]/80",
  diagramSecondary: "text-[color:var(--book-text)]",
  diagramSecondaryMuted: "text-[color:var(--book-text-muted)]",
  diagramHighlightCell:
    "bg-[color:var(--book-accent-fill)] text-[color:var(--book-button-text)] ring-1 ring-[color:var(--book-accent-border)]",
  diagramHighlightBorder:
    "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent-muted)] text-[color:var(--book-text)]",
  diagramColumn: "border-[color:var(--book-accent-border)] bg-[color:var(--book-accent-muted)]",
  diagramColumnLabel: "text-[color:var(--book-accent)]",
  inlineCodeBg: "bg-[color:var(--book-accent-muted)]",
  mathText: "text-[color:var(--book-accent)]",
  inlineCodeText: "text-[color:var(--book-accent)]",
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
 *   Page background gradient stops + per-grade tinted card surface colors.
 */
function accentCssVars(accent, bg) {
  return {
    // Accent palette
    "--book-accent": accent,
    "--book-dot-glow": rgbaFromHex(accent, 0.55),
    "--book-accent-border": rgbaFromHex(accent, 0.58),
    "--book-accent-fill": rgbaFromHex(accent, 0.70),
    "--book-accent-muted": rgbaFromHex(accent, 0.14),
    "--book-accent-hover": rgbaFromHex(accent, 0.85),
    "--book-accent-card-glow": rgbaFromHex(accent, 0.28),
    // Page background (pastel, per-grade)
    "--book-bg-from": bg.from,
    "--book-bg-via": bg.via,
    "--book-bg-to": bg.to,
    // Card surface — lightly tinted by grade accent, not pure white
    "--book-bg-card-from": bg.cardFrom,
    "--book-bg-card-via":  bg.cardVia,
    "--book-bg-card-to":   bg.cardTo,
    // Semantic surface tokens — same tinted palette as card
    "--book-surface":       bg.cardFrom,
    "--book-surface-soft":  bg.cardVia,
    "--book-text":          "#1E293B",
    "--book-text-muted":    "#475569",
    "--book-button-text":   "#1E293B",
    "--book-divider":       rgbaFromHex(accent, 0.22),
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
  // G1 — soft green / nature
  g1: gradeTheme("g1", "כיתה א׳ - ירוק טבע", BOOK_GRADE_ACCENT_HEX.g1, {
    pageBg: "bg-gradient-to-b from-[#D8FFE9] via-[#B8F4D6] to-[#8FEAC0]",
    headerBg: "bg-[#EDFFF8]/82",
    footerBg: "bg-[#EDFFF8]/82",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g1, {
      from: "#D8FFE9", via: "#B8F4D6", to: "#8FEAC0",
      cardFrom: "#EDFFF8", cardVia: "#E3FEF3", cardTo: "#D9FDEE",
    }),
  }),
  // G2 — sky blue / water
  g2: gradeTheme("g2", "כיתה ב׳ - כחול מים", BOOK_GRADE_ACCENT_HEX.g2, {
    pageBg: "bg-gradient-to-b from-[#D9F7FF] via-[#B8EEFA] to-[#8EDFF0]",
    headerBg: "bg-[#EDFAFF]/82",
    footerBg: "bg-[#EDFAFF]/82",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g2, {
      from: "#D9F7FF", via: "#B8EEFA", to: "#8EDFF0",
      cardFrom: "#EDFAFF", cardVia: "#E3F7FF", cardTo: "#D9F4FF",
    }),
  }),
  // G3 — peach / mango
  g3: gradeTheme("g3", "כיתה ג׳ - כתום מנגו", BOOK_GRADE_ACCENT_HEX.g3, {
    pageBg: "bg-gradient-to-b from-[#FFE5C7] via-[#FFD0A0] to-[#FFB873]",
    headerBg: "bg-[#FFF8F3]/82",
    footerBg: "bg-[#FFF8F3]/82",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g3, {
      from: "#FFE5C7", via: "#FFD0A0", to: "#FFB873",
      cardFrom: "#FFF8F3", cardVia: "#FFF3EB", cardTo: "#FFEDE3",
    }),
  }),
  // G4 — sunny gold
  g4: gradeTheme("g4", "כיתה ד׳ - זהב שמש", BOOK_GRADE_ACCENT_HEX.g4, {
    pageBg: "bg-gradient-to-b from-[#FFF3B8] via-[#FFE38A] to-[#FFD45C]",
    headerBg: "bg-[#FFFDF3]/82",
    footerBg: "bg-[#FFFDF3]/82",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g4, {
      from: "#FFF3B8", via: "#FFE38A", to: "#FFD45C",
      cardFrom: "#FFFDF3", cardVia: "#FFFAE8", cardTo: "#FFF7DE",
    }),
  }),
  // G5 — soft raspberry pink
  g5: gradeTheme("g5", "כיתה ה׳ - ורוד פטל", BOOK_GRADE_ACCENT_HEX.g5, {
    pageBg: "bg-gradient-to-b from-[#FFE0F0] via-[#FFC1DF] to-[#FFA3CE]",
    headerBg: "bg-[#FFF5FA]/82",
    footerBg: "bg-[#FFF5FA]/82",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g5, {
      from: "#FFE0F0", via: "#FFC1DF", to: "#FFA3CE",
      cardFrom: "#FFF5FA", cardVia: "#FFECF5", cardTo: "#FFE5F0",
    }),
  }),
  // G6 — lilac / space
  g6: gradeTheme("g6", "כיתה ו׳ - סגול לילך", BOOK_GRADE_ACCENT_HEX.g6, {
    pageBg: "bg-gradient-to-b from-[#E8E0FF] via-[#D2C3FF] to-[#B8A7FF]",
    headerBg: "bg-[#F8F5FF]/82",
    footerBg: "bg-[#F8F5FF]/82",
    cssVars: accentCssVars(BOOK_GRADE_ACCENT_HEX.g6, {
      from: "#E8E0FF", via: "#D2C3FF", to: "#B8A7FF",
      cardFrom: "#F8F5FF", cardVia: "#F2EEFF", cardTo: "#ECE7FF",
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
