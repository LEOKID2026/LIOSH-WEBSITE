/**
 * Display-level UI helpers — רגיל / מתקדם only (never קל/בינוני/קשה as user selection).
 */
import { displayLevelLabelHe } from "../../../../lib/learning/display-level.js";

export const DISPLAY_LEVEL_HE = Object.freeze({
  regular: displayLevelLabelHe("regular"),
  advanced: displayLevelLabelHe("advanced"),
});

/** Legacy 3-level UI labels/values — must NOT appear as selectable user levels. */
const LEGACY_UI_LABELS = new Set(["קל", "בינוני", "קשה"]);
const LEGACY_UI_VALUES = new Set(["easy", "medium", "hard"]);

/**
 * @param {import("@playwright/test").Page} page
 */
export async function findRegularOnlyDisplayBadge(page) {
  return page.getByTestId("student-display-level-regular-only");
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {object} plan
 */
export async function findLevelSelect(page, plan) {
  if (plan.levelSelectTestId) {
    return page.getByTestId(plan.levelSelectTestId);
  }

  const displaySelect = page.getByTestId("student-display-level-select");
  if (await displaySelect.isVisible().catch(() => false)) {
    return displaySelect;
  }

  const regularOnlyBadge = await findRegularOnlyDisplayBadge(page);
  if (await regularOnlyBadge.isVisible().catch(() => false)) {
    return null;
  }

  if (plan.gradeSelectTestId) {
    return page.getByTestId(plan.gradeSelectTestId).locator("xpath=following-sibling::select[1]");
  }
  if (plan.gradeSelectAfterPlayer) {
    return page
      .locator(`[data-testid="${plan.playerTestId}"]`)
      .locator("xpath=following-sibling::select[2]");
  }
  throw new Error("cannot locate level select for plan");
}

/**
 * @param {import("@playwright/test").Locator} select
 */
export async function readLevelSelectOptions(select) {
  await select.waitFor({ state: "visible", timeout: 30_000 });
  return select.locator("option").evaluateAll((opts) =>
    opts
      .map((o) => ({ value: String(o.value || "").trim(), label: String(o.textContent || "").trim() }))
      .filter((o) => o.value !== "")
  );
}

/**
 * @param {{ value: string, label: string }[]} options
 */
export function detectLegacyUiLevels(options) {
  return options.filter(
    (o) => LEGACY_UI_LABELS.has(o.label) || LEGACY_UI_VALUES.has(o.value.toLowerCase())
  );
}

/**
 * @param {{ value: string, label: string }[]} options
 * @param {{ regularOnly?: boolean }} cfg
 */
export function validateDisplayLevelOptions(options, { regularOnly = false } = {}) {
  const legacy = detectLegacyUiLevels(options);
  if (legacy.length) {
    return {
      ok: false,
      reason: `legacy UI levels detected (${legacy.map((o) => o.label || o.value).join(", ")}) — expected רגיל/מתקדם`,
    };
  }

  const labels = new Set(options.map((o) => o.label));
  const hasRegular = labels.has(DISPLAY_LEVEL_HE.regular);
  const hasAdvanced = labels.has(DISPLAY_LEVEL_HE.advanced);

  if (!hasRegular) {
    return { ok: false, reason: `missing "${DISPLAY_LEVEL_HE.regular}" option` };
  }

  if (regularOnly) {
    if (hasAdvanced) {
      return { ok: false, reason: `"${DISPLAY_LEVEL_HE.advanced}" must not appear for science` };
    }
    return { ok: true, regularOnly: true, hasRegular: true, hasAdvanced: false };
  }

  if (!hasAdvanced) {
    return { ok: false, reason: `missing "${DISPLAY_LEVEL_HE.advanced}" option` };
  }

  return { ok: true, regularOnly: false, hasRegular: true, hasAdvanced: true };
}

/**
 * Select display level by Hebrew label only (רגיל / מתקדם).
 * @param {import("@playwright/test").Page} page
 * @param {object} plan
 * @param {"regular"|"advanced"} displayLevel
 */
export async function selectDisplayLevel(page, plan, displayLevel) {
  const heLabel = DISPLAY_LEVEL_HE[displayLevel];
  if (!heLabel) throw new Error(`unknown displayLevel "${displayLevel}"`);

  const regularOnlyBadge = await findRegularOnlyDisplayBadge(page);
  if (await regularOnlyBadge.isVisible().catch(() => false)) {
    if (displayLevel !== "regular") {
      throw new Error(`regular-only subject; cannot select "${heLabel}"`);
    }
    return { value: "regular", label: DISPLAY_LEVEL_HE.regular, displayLevel: "regular", heLabel };
  }

  const select = await findLevelSelect(page, plan);
  if (!select) throw new Error("cannot locate level select for plan");
  const options = await readLevelSelectOptions(select);
  const legacy = detectLegacyUiLevels(options);
  if (legacy.length) {
    throw new Error(
      `refusing legacy UI level selection: ${legacy.map((o) => o.label || o.value).join(", ")}`
    );
  }

  const match = options.find((o) => o.label === heLabel);
  if (!match) {
    throw new Error(
      `cannot select "${heLabel}" — available: ${options.map((o) => o.label).join(", ") || "(none)"}`
    );
  }

  await select.selectOption(match.value);
  return { ...match, displayLevel, heLabel };
}

/**
 * Read level options without selecting — for science advanced-absence check.
 * @param {{ regularOnly?: boolean }} [cfg]
 */
export async function readDisplayLevelOptions(page, plan, { regularOnly = false } = {}) {
  const regularOnlyBadge = await findRegularOnlyDisplayBadge(page);
  if (regularOnly || (await regularOnlyBadge.isVisible().catch(() => false))) {
    await regularOnlyBadge.waitFor({ state: "visible", timeout: 30_000 });
    const label = (await regularOnlyBadge.innerText()).trim() || DISPLAY_LEVEL_HE.regular;
    return {
      select: regularOnlyBadge,
      options: [{ value: "regular", label }],
      regularOnlyUi: true,
    };
  }

  const select = await findLevelSelect(page, plan);
  if (!select) throw new Error("cannot locate level select for plan");
  const options = await readLevelSelectOptions(select);
  return { select, options, regularOnlyUi: false };
}
