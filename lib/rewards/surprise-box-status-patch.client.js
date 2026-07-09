/**
 * Derive immediate surprise-box UI status from an open API result (no refetch required).
 * @param {Record<string, unknown> | null | undefined} json
 * @returns {{ ready: boolean, pendingBoxCount: number } | null}
 */
export function patchSurpriseBoxStatusFromOpenResult(json) {
  if (!json || typeof json !== "object") return null;
  if (json.ok === true) {
    const pending = Math.max(0, Number(json.pendingBoxCountAfter) || 0);
    return { ready: pending > 0, pendingBoxCount: pending };
  }
  if (json.code === "no_pending_box") {
    return { ready: false, pendingBoxCount: 0 };
  }
  return null;
}
