/**
 * Coloring page A4 layout — shared by pilot script and future generator.
 * 300 DPI portrait A4: 2480 × 3508 px.
 */

export const COLORING_PAGE_DPI = 300;
export const COLORING_PAGE_WIDTH_PX = 2480;
export const COLORING_PAGE_HEIGHT_PX = 3508;

/** Side margins @ ~10 mm */
export const COLORING_PAGE_MARGIN_SIDE_PX = Math.round((10 / 25.4) * COLORING_PAGE_DPI);

/** Top margin @ ~10 mm */
export const COLORING_PAGE_MARGIN_TOP_PX = Math.round((10 / 25.4) * COLORING_PAGE_DPI);

/** Bottom print-safe margin — non-printable area on most home printers. */
export const COLORING_PAGE_MARGIN_BOTTOM_PX = Math.round((18 / 25.4) * COLORING_PAGE_DPI);

/** Title size for home print — 22–28 pt @ 300 DPI */
export const COLORING_PAGE_TITLE_PT = 24;

export function ptToPxAtDpi(pt, dpi = COLORING_PAGE_DPI) {
  return Math.round((pt * dpi) / 72);
}

export const COLORING_PAGE_TITLE_FONT_PX = ptToPxAtDpi(COLORING_PAGE_TITLE_PT);

/** Title strip — font + vertical padding above bottom margin. */
export const COLORING_PAGE_TITLE_BAND_PX =
  COLORING_PAGE_TITLE_FONT_PX + Math.round((8 / 25.4) * COLORING_PAGE_DPI);

/** Gap between illustration bottom and title strip. */
export const COLORING_PAGE_TITLE_GAP_PX = 12;

/** Inner breathing room so line art is not clipped at edges. */
export const COLORING_PAGE_ILLUSTRATION_INSET_PX = 20;

/** Fit scale — full use of illustration zone (A4 already has margins). */
export const COLORING_PAGE_ILLUSTRATION_SCALE = 1;

/** @deprecated use side margin */
export const COLORING_PAGE_MARGIN_PX = COLORING_PAGE_MARGIN_SIDE_PX;

/** Illustration fit box — title reserved at bottom; art is bottom-aligned above it. */
export function getColoringPageIllustrationBox() {
  const titleBox = getColoringPageTitleBox();
  return {
    x: COLORING_PAGE_MARGIN_SIDE_PX,
    y: COLORING_PAGE_MARGIN_TOP_PX,
    width: COLORING_PAGE_WIDTH_PX - COLORING_PAGE_MARGIN_SIDE_PX * 2,
    height: titleBox.y - COLORING_PAGE_TITLE_GAP_PX - COLORING_PAGE_MARGIN_TOP_PX,
  };
}

/** Title strip above bottom print margin. */
export function getColoringPageTitleBox() {
  return {
    x: COLORING_PAGE_MARGIN_SIDE_PX,
    y:
      COLORING_PAGE_HEIGHT_PX -
      COLORING_PAGE_MARGIN_BOTTOM_PX -
      COLORING_PAGE_TITLE_BAND_PX,
    width: COLORING_PAGE_WIDTH_PX - COLORING_PAGE_MARGIN_SIDE_PX * 2,
    height: COLORING_PAGE_TITLE_BAND_PX,
  };
}

/** Vertical placement for art — centered inside inset box above title. */
export function getColoringPageArtPlacement(placedW, placedH) {
  const box = getColoringPageIllustrationBox();
  const inset = COLORING_PAGE_ILLUSTRATION_INSET_PX;
  const innerW = box.width - inset * 2;
  const innerH = box.height - inset * 2;
  return {
    left: box.x + inset + Math.round((innerW - placedW) / 2),
    top: box.y + inset + Math.round((innerH - placedH) / 2),
  };
}

/** Max fit dimensions for art inside the inset illustration zone. */
export function getColoringPageIllustrationFitSize() {
  const box = getColoringPageIllustrationBox();
  const inset = COLORING_PAGE_ILLUSTRATION_INSET_PX;
  return {
    width: Math.round((box.width - inset * 2) * COLORING_PAGE_ILLUSTRATION_SCALE),
    height: Math.round((box.height - inset * 2) * COLORING_PAGE_ILLUSTRATION_SCALE),
  };
}

/** Baseline Y for title text inside the title strip SVG — vertically centered. */
export function getColoringPageTitleTextBaselineY() {
  const band = COLORING_PAGE_TITLE_BAND_PX;
  const font = COLORING_PAGE_TITLE_FONT_PX;
  return Math.round(band / 2 + font * 0.34);
}
