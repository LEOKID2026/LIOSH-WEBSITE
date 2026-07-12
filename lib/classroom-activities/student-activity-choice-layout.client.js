/** Max characters per choice to allow a 2-column grid (math/geometry legacy only). */
export const ACTIVITY_CHOICE_TWO_COLUMN_MAX_LEN = 16;

/**
 * Short choices (e.g. 4 numeric options) render 2×2; long text stays one column.
 * Used only for math/geometry (when textualAssigned is false).
 *
 * @param {unknown[]|null|undefined} choices
 */
export function shouldUseTwoColumnActivityChoices(choices) {
  if (!Array.isArray(choices) || choices.length < 2) return false;
  return choices.every(
    (c) => String(c ?? "").trim().length <= ACTIVITY_CHOICE_TWO_COLUMN_MAX_LEN
  );
}

/**
 * @param {unknown[]|null|undefined} choices
 * @param {{ textualAssigned?: boolean }} [options]
 */
export function activityChoiceGridClassName(choices, options = {}) {
  const textualAssigned = Boolean(options.textualAssigned);

  if (!Array.isArray(choices) || choices.length < 2) {
    return "flex flex-col gap-2";
  }

  if (textualAssigned) {
    // Always 2 columns at every width — including 360px. Long text wraps inside buttons.
    return "grid grid-cols-2 gap-3 sm:gap-3.5 items-stretch";
  }

  return shouldUseTwoColumnActivityChoices(choices)
    ? "grid grid-cols-2 gap-2"
    : "flex flex-col gap-2";
}
