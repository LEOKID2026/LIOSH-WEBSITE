/**
 * Node: rebuild base report from a localStorage snapshot (mleo_* keys).
 */

function makeStorageShim(store) {
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

/**
 * @param {Record<string, string>} snapshot
 * @param {{ period?: string; days?: number }} [opts]
 */
export async function buildBaseReportFromLocalStorageSnapshot(snapshot, opts = {}) {
  const store = new Map();
  for (const [k, v] of Object.entries(snapshot || {})) {
    if (v != null && v !== undefined) store.set(k, String(v));
  }
  globalThis.localStorage = makeStorageShim(store);
  globalThis.window = globalThis;

  const playerName = store.get("mleo_player_name") || "SignoffExport";
  const period = opts.period === "month" ? "month" : "week";
  const days = period === "month" ? 30 : Number(opts.days) || 7;
  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const { generateParentReportV2 } = await import("../../utils/parent-report-v2.js");
  const base = generateParentReportV2(
    playerName,
    period,
    startDate.toISOString().slice(0, 10),
    endDate.toISOString().slice(0, 10),
  );
  return base && typeof base === "object" ? base : null;
}

export default { buildBaseReportFromLocalStorageSnapshot };
