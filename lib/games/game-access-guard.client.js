/**
 * Sync game-access checks (no fetch) — used by GameAccessGuard after gate prefetch.
 * @param {object | null | undefined} data — /api/student/game-access payload
 * @param {{ gameKey?: string, category?: string }} opts
 * @returns {{ adminDisabled: boolean } | null}
 */
export function evaluateGameAccessBlock(data, { gameKey, category } = {}) {
  if (!data) return null;

  if (gameKey) {
    const row = (data.games || []).find((g) => g.gameKey === gameKey);
    if (!row || row.accessState === "admin_disabled") {
      return { adminDisabled: true };
    }
    if (row.accessState === "parent_locked") {
      return { adminDisabled: false };
    }
    return null;
  }

  if (category) {
    const cat = data.categories?.[category];
    if (!cat?.visible) {
      return { adminDisabled: true };
    }
    if (cat.locked && cat.state !== "guest_locked") {
      return { adminDisabled: false };
    }
  }

  return null;
}
