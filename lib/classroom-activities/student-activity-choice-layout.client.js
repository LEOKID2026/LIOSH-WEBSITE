/** Max characters per choice to allow a 2-column grid on mobile. */
export const ACTIVITY_CHOICE_TWO_COLUMN_MAX_LEN = 16;

/**
 * Short choices (e.g. 4 numeric options) render 2×2; long text stays one column.
 *
 * @param {unknown[]|null|undefined} choices
 */
export function shouldUseTwoColumnActivityChoices(choices) {
  if (!Array.isArray(choices) || choices.length < 2) return false;
  return choices.every((c) => String(c ?? "").trim().length <= ACTIVITY_CHOICE_TWO_COLUMN_MAX_LEN);
}

/**
 * @param {unknown[]|null|undefined} choices
 */
export function activityChoiceGridClassName(choices) {
  return shouldUseTwoColumnActivityChoices(choices)
    ? "grid grid-cols-2 gap-2"
    : "flex flex-col gap-2";
}
