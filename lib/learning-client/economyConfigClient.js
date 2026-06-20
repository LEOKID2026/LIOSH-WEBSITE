/**
 * Client helper for student economy config (Admin/DB source of truth).
 */

/**
 * @returns {Promise<{ ok: boolean, economyConfig?: object, unavailable?: boolean }>}
 */
export async function fetchStudentEconomyConfig() {
  const res = await fetch("/api/student/economy-config", {
    credentials: "include",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, unavailable: body?.unavailable === true, error: body?.error };
  }
  return { ok: true, economyConfig: body.economyConfig };
}

/**
 * Map entry cost options to arcade UI select shape.
 * @param {Array<{ amount: number, labelHe?: string }>|null|undefined} options
 */
export function mapEntryCostOptionsForUi(options) {
  if (!Array.isArray(options) || !options.length) return [];
  return options.map((o) => ({
    label: o.labelHe || String(o.amount),
    value: o.amount,
  }));
}
